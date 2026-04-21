const db = require('../config/db');

// Guardar una nueva medición
exports.addMeasurement = (req, res) => {
    const { glucose_value, date, time } = req.body;
    const userId = req.user.id; // Extraído del token JWT por el middleware

    const sql = `INSERT INTO measurements (user_id, glucose_value, date, time) VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [userId, glucose_value, date, time], function(err) {
        if (err) {
            return res.status(500).json({ error: "Error al guardar la medición" });
        }
        res.status(201).json({ 
            message: "Medición guardada", 
            measurementId: this.lastID 
        });
    });
};

// Obtener todas las mediciones del usuario logueado
exports.getHistory = (req, res) => {
    const userId = req.user.id;
    const sql = `SELECT * FROM measurements WHERE user_id = ? ORDER BY date DESC, time DESC`;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Error al obtener el historial" });
        }
        res.json(rows);
    });
};