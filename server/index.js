const express = require('express');
const cors = require('cors');
const path = require('path');

const imageRoutes = require('./routes/image');
const audioRoutes = require('./routes/audio');
const metaRoutes = require('./routes/meta');
const analysisRoutes = require('./routes/analysis');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/image', imageRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/analysis', analysisRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`ShadowPress running at http://localhost:${PORT}`);
});
