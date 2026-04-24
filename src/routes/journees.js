const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const auth = require('../middleware/auth.middleware');

// POST /api/journees/demarrer
router.post('/demarrer', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const collectriceId = req.collectrice.id;

    // Vérifier si une journée est déjà en cours
    const existante = await pool.query(`
      SELECT id FROM journees_collecte
      WHERE collectrice_id = $1
        AND date = CURRENT_DATE
        AND statut = 'en_cours'
    `, [collectriceId]);

    if (existante.rows.length > 0) {
      return res.json({
        message: 'Journée déjà démarrée',
        journee_id: existante.rows[0].id
      });
    }

    const result = await pool.query(`
      INSERT INTO journees_collecte
        (collectrice_id, date, heure_debut, gps_debut, statut)
      VALUES ($1, CURRENT_DATE, NOW(), $2, 'en_cours')
      RETURNING id, heure_debut
    `, [collectriceId, JSON.stringify({ latitude, longitude })]);

    res.json({
      message: 'Journée démarrée avec succès',
      journee_id: result.rows[0].id,
      heure_debut: result.rows[0].heure_debut
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST /api/journees/terminer
router.post('/terminer', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const collectriceId = req.collectrice.id;

    const result = await pool.query(`
      UPDATE journees_collecte
      SET heure_fin = NOW(),
          gps_fin = $1,
          statut = 'terminee'
      WHERE collectrice_id = $2
        AND date = CURRENT_DATE
        AND statut = 'en_cours'
      RETURNING id, heure_debut, heure_fin
    `, [JSON.stringify({ latitude, longitude }), collectriceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucune journée en cours' });
    }

    // Résumé de la journée
    const resume = await pool.query(`
      SELECT 
    	COUNT(*) as total_clients,
    	COALESCE(SUM(montant_total), 0) as total_montant
      FROM transactions
      WHERE journee_id = $1
    `, [result.rows[0].id]);

    const detailsClients = await pool.query(`
      SELECT 
    	c.nom as client_nom,
    	COALESCE(SUM(t.montant_total), 0) as total_client
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      WHERE t.journee_id = $1
      GROUP BY c.nom
      ORDER BY c.nom
    `, [result.rows[0].id]);

    res.json({
      message: 'Journée terminée avec succès',
      journee_id: result.rows[0].id,
      heure_debut: result.rows[0].heure_debut,
      heure_fin: result.rows[0].heure_fin,
      resume: {
  	total_clients: resume.rows[0].total_clients,
  	total_montant: resume.rows[0].total_montant || 0,
  	details_clients: detailsClients.rows
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/journees/aujourd-hui
router.get('/aujourd-hui', auth, async (req, res) => {
  try {
    const collectriceId = req.collectrice.id;

    const journee = await pool.query(`
      SELECT * FROM journees_collecte
      WHERE collectrice_id = $1 AND date = CURRENT_DATE
    `, [collectriceId]);

    if (journee.rows.length === 0) {
      return res.json({ journee: null, message: 'Pas de journée démarrée' });
    }

    const transactions = await pool.query(`
      SELECT t.*, c.nom as client_nom
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      WHERE t.journee_id = $1
      ORDER BY t.heure
    `, [journee.rows[0].id]);

    res.json({
      journee: journee.rows[0],
      transactions: transactions.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/journees/dashboard/trajet
router.get('/dashboard/trajet', auth, async (req, res) => {
  try {
    const collectriceId = req.collectrice.id;

    const journee = await pool.query(`
      SELECT *
      FROM journees_collecte
      WHERE collectrice_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [collectriceId]);

    if (journee.rows.length === 0) {
      return res.json({ journee: null, points: [] });
    }

    const journeeId = journee.rows[0].id;

    const transactions = await pool.query(`
      SELECT 
        t.id,
        t.heure,
        t.gps_lieu,
        t.montant_total,
        t.type,
        c.nom as client_nom
      FROM transactions t
      JOIN clients c ON c.id = t.client_id
      WHERE t.journee_id = $1
      ORDER BY t.heure ASC
    `, [journeeId]);

    res.json({
      journee: journee.rows[0],
      transactions: transactions.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;