const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/measurementController');
const auth = require('../middleware/auth'); // Importamos el middleware

// Todas estas rutas requieren estar logueado
router.post('/', auth, measurementController.addMeasurement);
router.get('/', auth, measurementController.getHistory);
router.get('/report/pdf', auth, measurementController.downloadReport);
router.post('/photo/analyze', auth, measurementController.analyzePhoto);
router.put('/:id', auth, measurementController.updateMeasurement);
router.delete('/:id', auth, measurementController.deleteMeasurement);

module.exports = router;
