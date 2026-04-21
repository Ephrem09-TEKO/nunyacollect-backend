const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'NunyaCollect API est en ligne !' });
});

// Routes (on les ajoutera une par une)
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/journees',     require('./routes/journees'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/transactions', require('./routes/transactions'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur NunyaCollect démarré sur le port ${PORT}`);
});