const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Acceso denegado. No hay token." });

    try {
        const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = verified; // Guardamos los datos del usuario en la petición
        next(); // Continuamos a la siguiente función
    } catch (err) {
        res.status(400).json({ error: "Token no válido" });
    }
};