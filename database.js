// IndexedDB-based database setup for Kayanet Farm
let db = null;
const DB_NAME = 'KayanetFarmDB';
const DB_VERSION = 1;

// Initialize IndexedDB database
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB initialization failed:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Kayanet Farm IndexedDB database initialized successfully');
            window.dbReady = true;
            resolve();
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object stores (tables)
            if (!db.objectStoreNames.contains('animals')) {
                const animalsStore = db.createObjectStore('animals', { keyPath: 'id' });
                animalsStore.createIndex('animal_type', 'animalType', { unique: false });
                animalsStore.createIndex('status', 'status', { unique: false });
                animalsStore.createIndex('date_added', 'dateAdded', { unique: false });
            }

            if (!db.objectStoreNames.contains('transactions')) {
                const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id' });
                transactionsStore.createIndex('type', 'type', { unique: false });
                transactionsStore.createIndex('date', 'date', { unique: false });
                transactionsStore.createIndex('sheep_id', 'sheepId', { unique: false });
            }

            if (!db.objectStoreNames.contains('health_records')) {
                const healthStore = db.createObjectStore('health_records', { keyPath: 'id' });
                healthStore.createIndex('sheep_id', 'sheepId', { unique: false });
                healthStore.createIndex('date', 'date', { unique: false });
                healthStore.createIndex('type', 'type', { unique: false });
            }
        };
    });
}

// Generic function to get all records from a store
function getAllRecords(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Generic function to add/update a record
function saveRecord(storeName, record) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(record);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Generic function to delete a record
function deleteRecord(storeName, id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Animal data functions
async function getSheepData() {
    try {
        const animals = await getAllRecords('animals');
        // Ensure all animals have animalType set for backward compatibility
        return animals.map(animal => ({
            ...animal,
            animalType: animal.animalType || 'sheep'
        }));
    } catch (error) {
        console.error('Failed to get animal data:', error);
        return [];
    }
}

async function saveSheepData(animals) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['animals'], 'readwrite');
        const store = transaction.objectStore('animals');

        // Clear existing data
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            // Add all animals in the same transaction
            for (const animal of animals) {
                store.put(animal);
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// Transaction data functions
async function getTransactionData() {
    try {
        const transactions = await getAllRecords('transactions');
        return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Failed to get transaction data:', error);
        return [];
    }
}

async function saveTransactionData(transactions) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');

        // Clear existing data
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            // Add all transactions in the same transaction
            for (const transaction of transactions) {
                store.put(transaction);
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// Health record functions
async function getHealthData() {
    try {
        const records = await getAllRecords('health_records');
        return records.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Failed to get health data:', error);
        return [];
    }
}

async function saveHealthData(records) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction(['health_records'], 'readwrite');
        const store = transaction.objectStore('health_records');

        // Clear existing data
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            // Add all records in the same transaction
            for (const record of records) {
                store.put(record);
            }
        };

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// Migration function to import data from localStorage (for backward compatibility)
async function migrateFromLocalStorage() {
    const localStorageKeys = ['kayanet_farm_sheep', 'kayanet_farm_transactions', 'kayanet_farm_health'];

    for (const key of localStorageKeys) {
        const data = localStorage.getItem(key);
        if (data) {
            try {
                const parsedData = JSON.parse(data);
                if (parsedData.length > 0) {
                    if (key === 'kayanet_farm_sheep') {
                        await saveSheepData(parsedData);
                    } else if (key === 'kayanet_farm_transactions') {
                        await saveTransactionData(parsedData);
                    } else if (key === 'kayanet_farm_health') {
                        await saveHealthData(parsedData);
                    }
                    // Clear migrated data from localStorage
                    localStorage.removeItem(key);
                    console.log(`Migrated ${parsedData.length} records from ${key}`);
                }
            } catch (error) {
                console.error(`Failed to migrate ${key}:`, error);
            }
        }
    }
}

// Make functions globally available
window.initializeDatabase = async function() {
    try {
        console.log('Starting database initialization...');
        await initializeDatabase();
        console.log('IndexedDB initialized, starting migration...');
        await migrateFromLocalStorage();
        console.log('Database initialization and migration completed successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

window.getSheepData = getSheepData;
window.saveSheepData = saveSheepData;
window.getTransactionData = getTransactionData;
window.saveTransactionData = saveTransactionData;
window.getHealthData = getHealthData;
window.saveHealthData = saveHealthData;
