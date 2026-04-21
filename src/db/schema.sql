-- Table des collectrices
CREATE TABLE IF NOT EXISTS collectrices (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  identifiant VARCHAR(50) UNIQUE NOT NULL,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  contact VARCHAR(20),
  statut VARCHAR(20) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  contact VARCHAR(20),
  montant_journalier DECIMAL(10,2) NOT NULL,
  frequence_cotisation INT NOT NULL,
  jours_cotisation TEXT[] NOT NULL,
  collectrice_id INT REFERENCES collectrices(id),
  statut VARCHAR(20) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des journées de collecte
CREATE TABLE IF NOT EXISTS journees_collecte (
  id SERIAL PRIMARY KEY,
  collectrice_id INT REFERENCES collectrices(id),
  date DATE NOT NULL,
  heure_debut TIMESTAMP,
  gps_debut JSONB,
  heure_fin TIMESTAMP,
  gps_fin JSONB,
  statut VARCHAR(20) DEFAULT 'en_cours',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des transactions (collectes)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  journee_id INT REFERENCES journees_collecte(id),
  client_id INT REFERENCES clients(id),
  heure TIMESTAMP DEFAULT NOW(),
  gps_lieu JSONB,
  semaine_courante_jours TEXT[],
  rattrapage JSONB DEFAULT '[]',
  montant_total DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table des points GPS du trajet
CREATE TABLE IF NOT EXISTS trajet_points (
  id SERIAL PRIMARY KEY,
  journee_id INT REFERENCES journees_collecte(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  horodatage TIMESTAMP DEFAULT NOW()
);

-- Table des alertes
CREATE TABLE IF NOT EXISTS alertes (
  id SERIAL PRIMARY KEY,
  collectrice_id INT REFERENCES collectrices(id),
  type VARCHAR(50),
  message TEXT,
  statut VARCHAR(20) DEFAULT 'non_lue',
  created_at TIMESTAMP DEFAULT NOW()
);