const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const databasePath = process.env.DATABASE_PATH || './glucosa.db';
const databaseDirectory = path.dirname(path.resolve(databasePath));

try {
    fs.mkdirSync(databaseDirectory, { recursive: true });
} catch (err) {
    console.error(`No se pudo crear el directorio de la base de datos (${databaseDirectory}):`, err.message);
    process.exit(1);
}

const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
        console.error(`No se pudo abrir la base de datos en ${databasePath}:`, err.message);
        process.exit(1);
    }
});

const addColumnIfMissing = (tableName, columnName, definition) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            console.error(`No se pudo revisar la tabla ${tableName}:`, err.message);
            return;
        }

        const exists = columns.some((column) => column.name === columnName);
        if (!exists) {
            db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`, (alterErr) => {
                if (alterErr) {
                    console.error(`No se pudo agregar ${columnName} a ${tableName}:`, alterErr.message);
                }
            });
        }
    });
};

db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

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
        user_id INTEGER NOT NULL,
        glucose_value REAL NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'mg/dL',
        context TEXT,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    addColumnIfMissing('measurements', 'unit', "TEXT NOT NULL DEFAULT 'mg/dL'");
    addColumnIfMissing('measurements', 'context', 'TEXT');
    addColumnIfMissing('measurements', 'notes', 'TEXT');
    addColumnIfMissing('measurements', 'created_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');
    addColumnIfMissing('measurements', 'updated_at', 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP');

    db.run('CREATE INDEX IF NOT EXISTS idx_measurements_user_date_time ON measurements (user_id, date, time)');
});

module.exports = db;
