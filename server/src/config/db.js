const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const db = new sqlite3.Database(process.env.DATABASE_PATH);

db.serialize(() => {
    // Tabla Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        password TEXT
    )`);

    // Tabla Measurements
    db.run(`CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        glucose_value REAL,
        date TEXT,
        time TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

module.exports = db;