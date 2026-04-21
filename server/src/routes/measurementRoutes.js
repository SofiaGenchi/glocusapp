const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementController');
const auth = require('../middleware/auth'); // Importamos el middleware

// Todas estas rutas requieren estar logueado
router.post('/', auth, measurementController.addMeasurement);
router.get('/', auth, measurementController.getHistory);

module.exports = router;