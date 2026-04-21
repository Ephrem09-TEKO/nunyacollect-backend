const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  try {
    console.log('Insertion des données de test...');

    // Créer 2 collectrices
    const mdp = await bcrypt.hash('password123', 10);

    const c1 = await pool.query(`
      INSERT INTO collectrices (nom, prenom, identifiant, mot_de_passe_hash, contact)
      VALUES ('Amivi', 'Kossi', 'amivi01', $1, '90000001')
      ON CONFLICT (identifiant) DO NOTHING
      RETURNING id
    `, [mdp]);

    const c2 = await pool.query(`
      INSERT INTO collectrices (nom, prenom, identifiant, mot_de_passe_hash, contact)
      VALUES ('Efua', 'Ama', 'efua01', $1, '90000002')
      ON CONFLICT (identifiant) DO NOTHING
      RETURNING id
    `, [mdp]);

    const collectrice1Id = c1.rows[0]?.id;
    const collectrice2Id = c2.rows[0]?.id;

    if (!collectrice1Id) {
      console.log('Données déjà présentes, seed ignoré.');
      await pool.end();
      return;
    }

    // Créer 5 clients pour collectrice 1
    await pool.query(`
      INSERT INTO clients
        (nom, contact, montant_journalier, frequence_cotisation, jours_cotisation, collectrice_id)
      VALUES
        ('Akosua Mensah',  '91000001', 500,  5, ARRAY['lun','mar','mer','jeu','ven'], $1),
        ('Kofi Agbeko',    '91000002', 300,  3, ARRAY['lun','mer','ven'],             $1),
        ('Ama Dossou',     '91000003', 1000, 5, ARRAY['lun','mar','mer','jeu','ven'], $1),
        ('Yawa Kpodo',     '91000004', 200,  1, ARRAY['lun'],                         $1),
        ('Mawuli Atsu',    '91000005', 500,  3, ARRAY['mar','jeu','ven'],             $1)
    `, [collectrice1Id]);

    // Créer 3 clients pour collectrice 2
    await pool.query(`
      INSERT INTO clients
        (nom, contact, montant_journalier, frequence_cotisation, jours_cotisation, collectrice_id)
      VALUES
        ('Sena Koffi',    '92000001', 500,  5, ARRAY['lun','mar','mer','jeu','ven'], $1),
        ('Abla Fiagbe',   '92000002', 300,  3, ARRAY['lun','mer','ven'],             $1),
        ('Dzidzor Goka',  '92000003', 1000, 5, ARRAY['lun','mar','mer','jeu','ven'], $1)
    `, [collectrice2Id]);

    console.log('Données insérées avec succès !');
    console.log('Collectrice 1 : identifiant=amivi01  mdp=password123');
    console.log('Collectrice 2 : identifiant=efua01   mdp=password123');
    await pool.end();

  } catch (err) {
    console.error('Erreur :', err.message);
    await pool.end();
  }
}

seed();