const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    const { username, first_name, last_name, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (username, first_name, last_name, password) VALUES (?, ?, ?, ?)`;
        
        db.run(sql, [username, first_name, last_name, hashedPassword], function(err) {
            if (err) return res.status(400).json({ error: "El usuario ya existe." });
            res.status(201).json({ message: "Usuario creado", userId: this.lastID });
        });
    } catch (e) {
        res.status(500).json({ error: "Error interno" });
    }
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM users WHERE username = ?`;

    db.get(sql, [username], async (err, user) => {
        if (err || !user) return res.status(404).json({ error: "Usuario no encontrado" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: "Credenciales inválidas" });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    });
};