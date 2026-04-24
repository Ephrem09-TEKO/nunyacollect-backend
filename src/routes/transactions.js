const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth.middleware');

// POST /api/transactions
router.post('/', auth, async (req, res) => {
  try {
    const {
      journee_id,
      client_id,
      semaine_courante_jours,
      rattrapage,
      montant_total,
      latitude,
      longitude
    } = req.body;

    // Vérifier que la journée appartient à cette collectrice
    const journee = await pool.query(`
      SELECT id FROM journees_collecte
      WHERE id = $1 AND collectrice_id = $2 AND statut = 'en_cours'
    `, [journee_id, req.collectrice.id]);

    if (journee.rows.length === 0) {
      return res.status(403).json({ message: 'Journée invalide' });
    }

    // Calculer le type de transaction
    const hasRattrapage = rattrapage && rattrapage.length > 0;
    const hasCourant = semaine_courante_jours && semaine_courante_jours.length > 0;
    let type = 'normal';
    if (hasRattrapage && hasCourant) type = 'mixte';
    else if (hasRattrapage) type = 'rattrapage';

    const result = await pool.query(`
      INSERT INTO transactions
        (journee_id, client_id, gps_lieu, semaine_courante_jours,
         rattrapage, montant_total, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      journee_id,
      client_id,
      JSON.stringify({ latitude, longitude }),
      semaine_courante_jours || [],
      JSON.stringify(rattrapage || []),
      montant_total,
      type
    ]);

    // Mettre à jour le statut du client pour aujourd'hui
    res.json({
      message: 'Collecte enregistrée avec succès',
      transaction: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/transactions/journee/:journee_id
router.get('/journee/:journee_id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, c.nom as client_nom, c.montant_journalier
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      WHERE t.journee_id = $1
      ORDER BY t.heure
    `, [req.params.journee_id]);

    res.json({ transactions: result.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/transactions (liste avec filtre date)
router.get('/', auth, async (req, res) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT 
        t.id,
        t.heure,
        t.gps_lieu,
        t.semaine_courante_jours,
        t.rattrapage,
        t.montant_total,
        t.type,
        c.nom as client_nom,
        j.date as journee_date
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      JOIN journees_collecte j ON j.id = t.journee_id
      WHERE j.collectrice_id = $1
    `;

    const params = [req.collectrice.id];

    if (date) {
      query += ` AND j.date = $2`;
      params.push(date);
    }

    query += ` ORDER BY t.heure DESC`;

    const result = await pool.query(query, params);

    res.json({ transactions: result.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;