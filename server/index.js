require('dotenv').config();

const app = require('./src/app');

const requiredEnv = ['JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
    console.error(`Faltan variables de entorno requeridas: ${missingEnv.join(', ')}`);
    process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
