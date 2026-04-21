const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth.middleware');

// GET /api/clients/mes-clients
// Retourne la liste des clients de la collectrice connectée
router.get('/mes-clients', auth, async (req, res) => {
  try {
    const collectriceId = req.collectrice.id;

    const result = await pool.query(`
      SELECT
        c.id,
        c.nom,
        c.contact,
        c.montant_journalier,
        c.frequence_cotisation,
        c.jours_cotisation,
        CASE
          WHEN t.id IS NOT NULL THEN 'collecte'
          ELSE 'en_attente'
        END AS statut_jour
      FROM clients c
      LEFT JOIN transactions t
        ON t.client_id = c.id
        AND DATE(t.heure) = CURRENT_DATE
      WHERE c.collectrice_id = $1
        AND c.statut = 'actif'
      ORDER BY c.nom
    `, [collectriceId]);

    res.json({
      collectrice: req.collectrice.nom + ' ' + req.collectrice.prenom,
      total: result.rows.length,
      clients: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/clients/:id/jours-manques
// Retourne les jours disponibles semaine courante + rattrapages
router.get('/:id/jours-manques', auth, async (req, res) => {
  try {
    const clientId = req.params.id;

    // Récupérer le client
    const clientResult = await pool.query(
      'SELECT * FROM clients WHERE id = $1',
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client introuvable' });
    }

    const client = clientResult.rows[0];

    // Jours déjà payés cette semaine
    const debutSemaine = new Date();
    const jour = debutSemaine.getDay();
    const diff = jour === 0 ? -6 : 1 - jour;
    debutSemaine.setDate(debutSemaine.getDate() + diff);
    debutSemaine.setHours(0, 0, 0, 0);

    const payesCetteSemaine = await pool.query(`
      SELECT semaine_courante_jours
      FROM transactions
      WHERE client_id = $1 AND heure >= $2
    `, [clientId, debutSemaine]);

    const joursPayesSemaineCourante = payesCetteSemaine.rows
      .flatMap(r => r.semaine_courante_jours || []);

    const joursDisponibles = client.jours_cotisation
      .filter(j => !joursPayesSemaineCourante.includes(j));

    // Rattrapages sur les 4 semaines précédentes
    const rattrapages = [];
    const joursNoms = ['lun','mar','mer','jeu','ven'];

    for (let i = 1; i <= 4; i++) {
      const debutSem = new Date(debutSemaine);
      debutSem.setDate(debutSem.getDate() - (i * 7));
      const finSem = new Date(debutSem);
      finSem.setDate(finSem.getDate() + 6);

      // Jours payés cette semaine-là
      const payesSem = await pool.query(`
        SELECT semaine_courante_jours, rattrapage
        FROM transactions
        WHERE client_id = $1
          AND heure >= $2 AND heure <= $3
      `, [clientId, debutSem, finSem]);

      const joursPayesSem = payesSem.rows
        .flatMap(r => r.semaine_courante_jours || []);

      // Jours rattrapés pour cette semaine
      const toutesTransactions = await pool.query(`
        SELECT rattrapage FROM transactions WHERE client_id = $1
      `, [clientId]);

      const semaineLabel = `${debutSem.getDate()}/${debutSem.getMonth()+1}`;
      const semaineKey = `${debutSem.getFullYear()}-W${i}`;

      const joursRattrapes = toutesTransactions.rows
        .flatMap(r => {
          if (!r.rattrapage) return [];
          return r.rattrapage
            .filter(rt => rt.semaine === semaineKey)
            .flatMap(rt => rt.jours || []);
        });

      const joursManques = client.jours_cotisation
        .filter(j => !joursPayesSem.includes(j) && !joursRattrapes.includes(j));

      if (joursManques.length > 0) {
        rattrapages.push({
          semaine: semaineKey,
          label: `Sem. du ${semaineLabel}`,
          jours_manques: joursManques
        });
      }
    }

    res.json({
      client: {
        id: client.id,
        nom: client.nom,
        montant_journalier: client.montant_journalier,
        frequence_cotisation: client.frequence_cotisation,
        jours_cotisation: client.jours_cotisation
      },
      semaine_courante: {
        jours_disponibles: joursDisponibles,
        jours_payes: joursPayesSemaineCourante
      },
      rattrapages
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;