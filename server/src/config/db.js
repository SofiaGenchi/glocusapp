require('dotenv').config();

const fs = require('fs');
const path = require('path');

const usePostgres = Boolean(process.env.DATABASE_URL);

const toPostgresQuery = (sql) => {
    let index = 0;
    return sql.replace(/\?/g, () => {
        index += 1;
        return `$${index}`;
    });
};

const normalizeRow = (row) => {
    if (!row) return row;
    return {
        ...row,
        glucose_value: row.glucose_value === undefined ? row.glucose_value : Number(row.glucose_value)
    };
};

const normalizeRows = (rows) => rows.map(normalizeRow);

const createSqliteAdapter = () => {
    const sqlite3 = require('sqlite3').verbose();
    const databasePath = process.env.DATABASE_PATH || './glucosa.db';
    const databaseDirectory = path.dirname(path.resolve(databasePath));

    try {
        fs.mkdirSync(databaseDirectory, { recursive: true });
    } catch (err) {
        console.error(`No se pudo crear el directorio de la base de datos (${databaseDirectory}):`, err.message);
        process.exit(1);
    }

    const sqlite = new sqlite3.Database(databasePath, (err) => {
        if (err) {
            console.error(`No se pudo abrir la base de datos en ${databasePath}:`, err.message);
            process.exit(1);
        }
    });

    const addColumnIfMissing = (tableName, columnName, definition) => {
        sqlite.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`No se pudo revisar la tabla ${tableName}:`, err.message);
                return;
            }

            const exists = columns.some((column) => column.name === columnName);
            if (!exists) {
                sqlite.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`, (alterErr) => {
                    if (alterErr) {
                        console.error(`No se pudo agregar ${columnName} a ${tableName}:`, alterErr.message);
                    }
                });
            }
        });
    };

    sqlite.serialize(() => {
        sqlite.run('PRAGMA foreign_keys = ON');

        sqlite.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            first_name TEXT,
            last_name TEXT,
            password TEXT
        )`);

        sqlite.run(`CREATE TABLE IF NOT EXISTS measurements (
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

        sqlite.run('CREATE INDEX IF NOT EXISTS idx_measurements_user_date_time ON measurements (user_id, date, time)');
    });

    return sqlite;
};

const createPostgresAdapter = () => {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    });

    const initPromise = (async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                first_name TEXT,
                last_name TEXT,
                password TEXT NOT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS measurements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                glucose_value NUMERIC NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                unit TEXT NOT NULL DEFAULT 'mg/dL',
                context TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'mg/dL'`);
        await pool.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS context TEXT`);
        await pool.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS notes TEXT`);
        await pool.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await pool.query(`ALTER TABLE measurements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_measurements_user_date_time ON measurements (user_id, date, time)`);
    })().catch((err) => {
        console.error('No se pudo inicializar PostgreSQL:', err.message);
        process.exit(1);
    });

    const query = async (sql, params = []) => {
        await initPromise;
        return pool.query(toPostgresQuery(sql), params);
    };

    return {
        get(sql, params, callback) {
            query(sql, params)
                .then((result) => callback(null, normalizeRow(result.rows[0])))
                .catch((err) => callback(err));
        },
        all(sql, params, callback) {
            query(sql, params)
                .then((result) => callback(null, normalizeRows(result.rows)))
                .catch((err) => callback(err));
        },
        run(sql, params, callback) {
            const trimmedSql = sql.trim();
            const shouldReturnId = /^INSERT\s+INTO\s+(users|measurements)\b/i.test(trimmedSql) && !/\bRETURNING\b/i.test(trimmedSql);
            const executableSql = shouldReturnId ? `${trimmedSql} RETURNING id` : sql;

            query(executableSql, params)
                .then((result) => {
                    const context = {
                        lastID: result.rows?.[0]?.id,
                        changes: result.rowCount
                    };
                    callback?.call(context, null);
                })
                .catch((err) => callback?.call({}, err));
        }
    };
};

module.exports = usePostgres ? createPostgresAdapter() : createSqliteAdapter();
