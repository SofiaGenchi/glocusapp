require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes'); // Suponiendo que creaste este archivo

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));

// ... (código anterior)
const authRoutes = require('./src/routes/authRoutes');
const measurementRoutes = require('./src/routes/measurementRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes); // Nueva ruta añadida
// ...