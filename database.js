// Database setup using SQLite (sql.js)
let db = null;

// Initialize SQLite database
async function initializeDatabase() {
    try {
        // Load sql.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        // Try to load existing database from IndexedDB
        const savedDbData = localStorage.getItem('kayanet_farm_sqlite_db');
        if (savedDbData) {
            const dbArray = new Uint8Array(JSON.parse(savedDbData));
            db = new SQL.Database(dbArray);
        } else {
            // Create new database
            db = new SQL.Database();
        }

        // Create tables if they don't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS animals (
                id TEXT PRIMARY KEY,
                animal_type TEXT NOT NULL DEFAULT 'sheep',
                gender TEXT NOT NULL,
                birth_date TEXT,
                purchase_cost REAL DEFAULT 0,
                notes TEXT,
                status TEXT DEFAULT 'active',
                addition_type TEXT DEFAULT 'purchase',
                date_added TEXT DEFAULT CURRENT_DATE
            )
        `);

        // Migrate from old sheep table if it exists
        try {
            const sheepExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='sheep'");
            if (sheepExists.length > 0) {
                // Copy data from sheep table to animals table
                db.run(`
                    INSERT OR IGNORE INTO animals (id, animal_type, gender, birth_date, purchase_cost, notes, status, addition_type, date_added)
                    SELECT id, 'sheep', gender, birth_date, purchase_cost, notes, status, addition_type, date_added FROM sheep
                `);
                // Drop old table
                db.run("DROP TABLE sheep");
            }
        } catch (e) {
            console.log('Migration from sheep table completed or not needed');
        }

        // Add addition_type column if it doesn't exist (for existing databases)
        try {
            db.run("ALTER TABLE animals ADD COLUMN addition_type TEXT DEFAULT 'purchase';");
        } catch (e) {
            // Column might already exist, ignore error
        }

        // Add animal_type column if it doesn't exist (for existing databases)
        try {
            db.run("ALTER TABLE animals ADD COLUMN animal_type TEXT DEFAULT 'sheep';");
        } catch (e) {
            // Column might already exist, ignore error
        }

        db.run(`
            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                sheep_id TEXT,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                description TEXT NOT NULL,
                date_added TEXT DEFAULT CURRENT_DATE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS health_records (
                id TEXT PRIMARY KEY,
                sheep_id TEXT NOT NULL,
                type TEXT NOT NULL,
                weight REAL,
                medication TEXT,
                date TEXT NOT NULL,
                notes TEXT,
                date_added TEXT DEFAULT CURRENT_DATE
            )
        `);

        // Migrate data from localStorage if it exists
        migrateFromLocalStorage();
        console.log('Kayanet Farm SQLite database initialized successfully');

        // Save database to IndexedDB periodically
        setInterval(saveDatabase, 5000);

        window.dbReady = true;
        console.log('SQLite database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Kayanet Farm SQLite database:', error);
        // Fallback to localStorage if SQLite fails
        alert('SQLite initialization failed. Falling back to localStorage. Some features may be limited.');
        initializeLocalStorageFallback();
    }
}

// Migrate data from localStorage to SQLite
function migrateFromLocalStorage() {
    const localStorageKeys = ['kayanet_farm_sheep', 'kayanet_farm_transactions', 'kayanet_farm_health'];

    localStorageKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
            const parsedData = JSON.parse(data);
            if (parsedData.length > 0) {
                try {
                    if (key === 'sheep_farm_sheep') {
                        migrateSheepData(parsedData);
                    } else if (key === 'sheep_farm_transactions') {
                        migrateTransactionData(parsedData);
                    } else if (key === 'sheep_farm_health') {
                        migrateHealthData(parsedData);
                    }
                    // Clear migrated data from localStorage
                    localStorage.removeItem(key);
                } catch (error) {
                    console.error(`Failed to migrate ${key}:`, error);
                }
            }
        }
    });
}

function migrateSheepData(sheepData) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO animals (id, animal_type, gender, birth_date, purchase_cost, notes, status, addition_type, date_added)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sheep of sheepData) {
        stmt.run([
            sheep.id,
            sheep.animalType || 'sheep',
            sheep.gender,
            sheep.birthDate,
            sheep.purchaseCost || 0,
            sheep.notes || '',
            sheep.status || 'active',
            sheep.additionType || 'purchase',
            sheep.dateAdded || new Date().toISOString().split('T')[0]
        ]);
    }

    stmt.free();
}

function migrateTransactionData(transactionData) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO transactions (id, type, sheep_id, amount, date, description, date_added)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    transactionData.forEach(transaction => {
        stmt.run([
            transaction.id,
            transaction.type,
            transaction.sheepId,
            transaction.amount,
            transaction.date,
            transaction.description,
            transaction.dateAdded || new Date().toISOString().split('T')[0]
        ]);
    });

    stmt.free();
}

function migrateHealthData(healthData) {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO health_records (id, sheep_id, type, weight, medication, date, notes, date_added)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const record of healthData) {
        stmt.run([
            record.id,
            record.sheepId,
            record.type,
            record.weight,
            record.medication || '',
            record.date,
            record.notes || '',
            record.dateAdded || new Date().toISOString().split('T')[0]
        ]);
    }

    stmt.free();
}

// Save database to localStorage (for persistence)
function saveDatabase() {
    if (db) {
        try {
            const data = db.export();
            const buffer = Array.from(data);
            localStorage.setItem('kayanet_farm_sqlite_db', JSON.stringify(buffer));
        } catch (error) {
            console.error('Failed to save Kayanet Farm database:', error);
        }
    }
}

// Fallback to localStorage if SQLite fails
function initializeLocalStorageFallback() {
    const DB_KEYS = {
        SHEEP: 'kayanet_farm_sheep',
        TRANSACTIONS: 'kayanet_farm_transactions',
        HEALTH: 'kayanet_farm_health'
    };

    // Initialize data if not exists
    if (!localStorage.getItem(DB_KEYS.SHEEP)) {
        localStorage.setItem(DB_KEYS.SHEEP, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.TRANSACTIONS)) {
        localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.HEALTH)) {
        localStorage.setItem(DB_KEYS.HEALTH, JSON.stringify([]));
    }

    // Override functions to use localStorage
    window.getSheepData = () => {
        const data = JSON.parse(localStorage.getItem(DB_KEYS.SHEEP)) || [];
        // Ensure all animals have animalType set
        return data.map(animal => ({
            ...animal,
            animalType: animal.animalType || 'sheep'
        }));
    };
    window.saveSheepData = (data) => localStorage.setItem(DB_KEYS.SHEEP, JSON.stringify(data));
    window.getTransactionData = () => JSON.parse(localStorage.getItem(DB_KEYS.TRANSACTIONS)) || [];
    window.saveTransactionData = (data) => localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(data));
    window.getHealthData = () => JSON.parse(localStorage.getItem(DB_KEYS.HEALTH)) || [];
    window.saveHealthData = (data) => localStorage.setItem(DB_KEYS.HEALTH, JSON.stringify(data));

    // Mark database as ready for localStorage fallback
    window.dbReady = true;
    console.log('LocalStorage fallback initialized successfully');
}

// SQLite data access functions
function getSheepData() {
    if (!db) return [];
    const result = db.exec("SELECT * FROM animals ORDER BY date_added DESC");
    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
            // Convert SQL column names to camelCase for compatibility
            let propName = col;
            if (col === 'birth_date') propName = 'birthDate';
            else if (col === 'purchase_cost') propName = 'purchaseCost';
            else if (col === 'date_added') propName = 'dateAdded';
            else if (col === 'animal_type') propName = 'animalType';
            obj[propName] = row[index];
        });
        return obj;
    });
}

function saveSheepData(sheepArray) {
    if (!db) return;

    // Clear existing data
    db.run("DELETE FROM animals");

    // Insert new data
    const stmt = db.prepare(`
        INSERT INTO animals (id, animal_type, gender, birth_date, purchase_cost, notes, status, addition_type, date_added)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sheep of sheepArray) {
        stmt.run([
            sheep.id,
            sheep.animal_type || sheep.animalType || 'sheep',
            sheep.gender,
            sheep.birth_date || sheep.birthDate,
            sheep.purchase_cost || sheep.purchaseCost || 0,
            sheep.notes || '',
            sheep.status || 'active',
            sheep.addition_type || sheep.additionType || 'purchase',
            sheep.date_added || sheep.dateAdded || new Date().toISOString().split('T')[0]
        ]);
    }

    stmt.free();
}

function getTransactionData() {
    if (!db) return [];
    const result = db.exec("SELECT * FROM transactions ORDER BY date DESC");
    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
            // Convert SQL column names to camelCase for compatibility
            let propName = col;
            if (col === 'sheep_id') propName = 'sheepId';
            else if (col === 'date_added') propName = 'dateAdded';
            obj[propName] = row[index];
        });
        return obj;
    });
}

function saveTransactionData(transactionArray) {
    if (!db) return;

    // Clear existing data
    db.run("DELETE FROM transactions");

    // Insert new data
    const stmt = db.prepare(`
        INSERT INTO transactions (id, type, sheep_id, amount, date, description, date_added)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const transaction of transactionArray) {
        stmt.run([
            transaction.id,
            transaction.type,
            transaction.sheep_id || transaction.sheepId,
            transaction.amount,
            transaction.date,
            transaction.description,
            transaction.date_added || transaction.dateAdded || new Date().toISOString().split('T')[0]
        ]);
    }

    stmt.free();
}

function getHealthData() {
    if (!db) return [];
    const result = db.exec("SELECT * FROM health_records ORDER BY date DESC");
    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, index) => {
            // Convert SQL column names to camelCase for compatibility
            let propName = col;
            if (col === 'sheep_id') propName = 'sheepId';
            else if (col === 'date_added') propName = 'dateAdded';
            obj[propName] = row[index];
        });
        return obj;
    });
}

function saveHealthData(healthArray) {
    if (!db) return;

    // Clear existing data
    db.run("DELETE FROM health_records");

    // Insert new data
    const stmt = db.prepare(`
        INSERT INTO health_records (id, sheep_id, type, weight, medication, date, notes, date_added)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const record of healthArray) {
        stmt.run([
            record.id,
            record.sheep_id || record.sheepId,
            record.type,
            record.weight,
            record.medication || '',
            record.date,
            record.notes || '',
            record.date_added || record.dateAdded || new Date().toISOString().split('T')[0]
        ]);
    }

    stmt.free();
}

// Make functions globally available
window.initializeDatabase = initializeDatabase;
window.getSheepData = getSheepData;
window.saveSheepData = saveSheepData;
window.getTransactionData = getTransactionData;
window.saveTransactionData = saveTransactionData;
window.getHealthData = getHealthData;
window.saveHealthData = saveHealthData;
