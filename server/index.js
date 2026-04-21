require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importación de Rutas
const authRoutes = require('./src/routes/authRoutes');
const measurementRoutes = require('./src/routes/measurementRoutes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Definición de Rutas (Endpoints)
app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes);

// Ruta de prueba inicial
app.get('/', (req, res) => {
  res.send('Servidor de Glucosa funcionando correctamente 🚀');
});

// Configuración del Puerto
const PORT = process.env.PORT || 5000;
// Atrapa errores que no fueron manejados en las rutas
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('¡Algo salió mal en el servidor!');
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});