const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { identifiant, mot_de_passe } = req.body;

  try {
    // Chercher la collectrice dans la base
    const result = await pool.query(
      'SELECT * FROM collectrices WHERE identifiant = $1',
      [identifiant]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Identifiant incorrect' });
    }

    const collectrice = result.rows[0];

    // Vérifier le mot de passe
    const mdpValide = await bcrypt.compare(mot_de_passe, collectrice.mot_de_passe_hash);
    if (!mdpValide) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: collectrice.id, nom: collectrice.nom, prenom: collectrice.prenom },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      collectrice: {
        id: collectrice.id,
        nom: collectrice.nom,
        prenom: collectrice.prenom,
        identifiant: collectrice.identifiant
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;