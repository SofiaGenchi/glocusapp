const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const measurementRoutes = require('./routes/measurementRoutes');

const app = express();

const defaultOrigins = [
    'http://localhost:5173',
    'https://glucosapp.netlify.app'
];

const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(self), geolocation=(), microphone=()');
    next();
});

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origen no permitido por CORS'));
    }
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/auth', authRoutes);
app.use('/measurements', measurementRoutes);

app.get('/', (req, res) => {
    res.send('Servidor de Glucosa funcionando correctamente');
});

app.use((err, req, res, next) => {
    if (err.message === 'Origen no permitido por CORS') {
        return res.status(403).json({ error: 'Origen no permitido' });
    }

    console.error(err.stack);
    return res.status(500).json({ error: 'Algo salió mal en el servidor' });
});

module.exports = app;
