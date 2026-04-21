const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./glucosa.db');

db.serialize(() => {
  // Tabla de Usuarios
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    password TEXT
  )`);

  // Tabla de Mediciones (Relacionada por user_id)
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