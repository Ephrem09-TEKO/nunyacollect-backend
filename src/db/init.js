const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  try {
    console.log('Connexion à la base de données...');
    const sql = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('Tables créées avec succès !');
    await pool.end();
  } catch (err) {
    console.error('Erreur :', err.message);
    await pool.end();
  }
}

init();