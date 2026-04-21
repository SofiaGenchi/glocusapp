const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const db = new sqlite3.Database(process.env.DATABASE_PATH);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        password TEXT
    )`);
    // ... aquí las demás tablas
});

module.exports = db;