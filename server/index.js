const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json()); // Para que el servidor entienda JSON

const PORT = 5000;

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor de Glucosa funcionando 🚀');
});

// --- AQUÍ IRÁN LAS RUTAS DE USUARIO Y MEDICIONES ---

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});