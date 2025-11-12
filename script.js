

// Calculate age from birth date
function calculateAge(birthDate) {
    if (!birthDate) return 'Unknown';

    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

// Format date for display
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Format currency for display
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(amount);
}

// Show alert message
function showAlert(elementId, message, isSuccess = true) {
    const alert = document.getElementById(elementId);
    alert.textContent = message;
    alert.style.display = 'block';
    alert.className = isSuccess ? 'alert alert-success' : 'alert alert-danger';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// Tab functionality
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
        
        // Refresh data when switching tabs
        if (tab.dataset.tab === 'dashboard') {
            if (typeof window.dbReady !== 'undefined' && window.dbReady) {
                updateDashboard();
            }
            // Reset dashboard filters when switching to tab
            document.getElementById('dashboardAnimalType').value = 'all';
            document.getElementById('dashboardPeriod').value = 'all';
            document.getElementById('dashboardCustomDateRange').style.display = 'none';
        } else if (tab.dataset.tab === 'sheep') {
            if (typeof window.dbReady !== 'undefined' && window.dbReady) {
                renderSheepTable();
            }
            // Reset animal filters when switching to tab
            document.getElementById('animalTypeFilter').value = 'all';
        } else if (tab.dataset.tab === 'financial') {
            if (typeof window.dbReady !== 'undefined' && window.dbReady) {
                renderFinancialTable();
                updateFinancialSummary();
            }
            // Reset financial filters when switching to tab
            document.getElementById('financialAnimalType').value = 'all';
            document.getElementById('transactionPeriod').value = 'all';
            document.getElementById('customDateRange').style.display = 'none';
        } else if (tab.dataset.tab === 'health') {
            if (typeof window.dbReady !== 'undefined' && window.dbReady) {
                renderHealthTable();
            }
        }
    });
});

// Update current date
function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString(undefined, options);
}

// Animal Form Handling
document.getElementById('sheepForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    console.log('Form submitted, checking database status...');
    console.log('window.dbReady:', typeof window.dbReady, window.dbReady);

    // Check if database is ready
    if (typeof window.dbReady === 'undefined' || !window.dbReady) {
        console.log('Database not ready, showing alert');
        showAlert('sheepAlert', 'Database not ready. Please wait a moment and try again.', false);
        return;
    }

    console.log('Database is ready, proceeding with form submission');
    console.log('Submitting animal data...');

    const animalType = document.getElementById('animalType').value;
    const sheepId = document.getElementById('sheepId').value;
    const additionType = document.getElementById('additionType').value;
    const gender = document.getElementById('gender').value;
    const birthDate = document.getElementById('birthDate').value;
    const purchaseCost = parseFloat(document.getElementById('purchaseCost').value) || 0;
    const notes = document.getElementById('notes').value;

    try {
        // Check if animal ID already exists
        const animals = await getSheepData();
        if (animals.find(a => a.id === sheepId)) {
            showAlert('sheepAlert', `Animal with ID ${sheepId} already exists!`, false);
            return;
        }

        // Add new animal
        const newAnimal = {
            id: sheepId,
            animalType,
            gender,
            birthDate,
            purchaseCost: additionType === 'birth' ? 0 : purchaseCost,
            notes,
            status: 'active',
            additionType,
            dateAdded: new Date().toISOString().split('T')[0]
        };

        console.log('Adding new animal to array...');
        animals.push(newAnimal);
        console.log('Saving animal data to database...');
        await saveSheepData(animals);
        console.log('Animal data saved successfully');

        // Clear form
        this.reset();

        // Show success message
        const animalName = animalType === 'sheep' ? 'Sheep' : 'Goat';
        showAlert('sheepAlert', `${animalName} ${sheepId} added successfully via ${additionType}!`);

        // Update tables
        console.log('Updating UI tables...');
        await renderSheepTable();
        await updateDashboard();
        console.log('UI updated successfully');
    } catch (error) {
        console.error('Error adding animal:', error);
        showAlert('sheepAlert', 'Failed to add animal. Please try again.', false);
    }
});

// Clear sheep form
document.getElementById('clearForm').addEventListener('click', function() {
    document.getElementById('sheepForm').reset();
});

// Financial Form Handling
document.getElementById('financialForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Check if database is ready
    if (typeof window.dbReady === 'undefined' || !window.dbReady) {
        showAlert('financialAlert', 'Database not ready. Please wait a moment and try again.', false);
        return;
    }

    const transactionType = document.getElementById('transactionType').value;
    const sheepId = document.getElementById('sheepIdFinancial').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const transactionDate = document.getElementById('transactionDate').value;
    const description = document.getElementById('description').value;

    try {
        // For sales, check if animal exists and is active
        if (transactionType === 'sale' && sheepId) {
            const animals = await getSheepData();
            const animalRecord = animals.find(a => a.id === sheepId && a.status === 'active');

            if (!animalRecord) {
                showAlert('financialAlert', `Active animal with ID ${sheepId} not found!`, false);
                return;
            }

            // Mark animal as sold
            animalRecord.status = 'sold';
            await saveSheepData(animals);
        }

        // Add transaction
        const transactions = await getTransactionData();
        const newTransaction = {
            id: Date.now().toString(),
            type: transactionType,
            sheepId: sheepId || null,
            amount,
            date: transactionDate,
            description,
            dateAdded: new Date().toISOString().split('T')[0]
        };

        transactions.push(newTransaction);
        await saveTransactionData(transactions);

        // Clear form
        this.reset();

        // Show success message
        showAlert('financialAlert', 'Transaction added successfully!');

        // Update tables and summary
        await renderFinancialTable();
        await updateFinancialSummary();
        await updateDashboard();
        await renderSheepTable();
    } catch (error) {
        console.error('Error adding transaction:', error);
        showAlert('financialAlert', 'Failed to add transaction. Please try again.', false);
    }
});

// Health Form Handling
document.getElementById('healthForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Check if database is ready
    if (typeof window.dbReady === 'undefined' || !window.dbReady) {
        showAlert('healthAlert', 'Database not ready. Please wait a moment and try again.', false);
        return;
    }

    const sheepId = document.getElementById('sheepIdHealth').value;
    const recordType = document.getElementById('recordType').value;
    const weight = parseFloat(document.getElementById('weight').value) || null;
    const medication = document.getElementById('medication').value;
    const recordDate = document.getElementById('recordDate').value;
    const notes = document.getElementById('healthNotes').value;

    try {
        // Check if animal exists
        const animals = await getSheepData();
        const animalRecord = animals.find(a => a.id === sheepId);
        if (!animalRecord) {
            showAlert('healthAlert', `Animal with ID ${sheepId} not found!`, false);
            return;
        }

        // If record type is death, mark animal as dead
        if (recordType === 'death') {
            animalRecord.status = 'dead';
            await saveSheepData(animals);
        }

        // Add health record
        const healthRecords = await getHealthData();
        const newRecord = {
            id: Date.now().toString(),
            sheepId,
            type: recordType,
            weight,
            medication,
            date: recordDate,
            notes,
            dateAdded: new Date().toISOString().split('T')[0]
        };

        healthRecords.push(newRecord);
        await saveHealthData(healthRecords);

        // Clear form
        this.reset();

        // Show success message
        const message = recordType === 'death' ? `Animal ${sheepId} marked as deceased!` : 'Health record added successfully!';
        showAlert('healthAlert', message);

        // Update tables
        await renderHealthTable();
        await renderSheepTable();
        await updateDashboard();
    } catch (error) {
        console.error('Error adding health record:', error);
        showAlert('healthAlert', 'Failed to add health record. Please try again.', false);
    }
});

// Render animal table
async function renderSheepTable(filters = {}) {
    try {
        const animals = await getSheepData();
        const tableBody = document.querySelector('#sheepTable tbody');
        tableBody.innerHTML = '';

        // Apply filters if provided
        let filteredAnimals = animals;
        if (filters.animalType && filters.animalType !== 'all') {
            filteredAnimals = filterAnimalsByType(animals, filters.animalType);
        }

        filteredAnimals.forEach(a => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', a.id);
            row.innerHTML = `
                <td>${a.animalType === 'sheep' ? 'Sheep' : 'Goat'}</td>
                <td>${a.id}</td>
                <td>${a.gender}</td>
                <td>${calculateAge(a.birthDate)} years</td>
                <td>${formatCurrency(a.purchaseCost)}</td>
                <td>${a.status}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="startEditSheep('${a.id}')">Edit</button>
                    <button class="action-btn btn-danger" onclick="deleteSheep('${a.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering sheep table:', error);
        if (error.message === 'Database not initialized') {
            console.log('Database not ready, skipping renderSheepTable');
        }
    }
}

// Render financial table
async function renderFinancialTable(filters = {}) {
    try {
        const transactions = await getTransactionData();
        const tableBody = document.querySelector('#financialTable tbody');
        tableBody.innerHTML = '';

        // Apply filters if provided
        let filteredTransactions = transactions;
        if (filters.animalType && filters.animalType !== 'all') {
            filteredTransactions = filterTransactionsByAnimal(transactions, filters.animalType);
        }
        if (filters.period && filters.period !== 'all') {
            filteredTransactions = filterTransactionsByPeriod(filteredTransactions, filters);
        }

        // Sort by date (newest first)
        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredTransactions.forEach(t => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', t.id);
            row.innerHTML = `
                <td>${formatDate(t.date)}</td>
                <td>${t.type}</td>
                <td>${t.description} ${t.sheepId ? `(Sheep: ${t.sheepId})` : ''}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="startEditTransaction('${t.id}')">Edit</button>
                    <button class="action-btn btn-danger" onclick="deleteTransaction('${t.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering financial table:', error);
        if (error.message === 'Database not initialized') {
            console.log('Database not ready, skipping renderFinancialTable');
        }
    }
}

// Render health table
async function renderHealthTable() {
    try {
        const healthRecords = await getHealthData();
        const tableBody = document.querySelector('#healthTable tbody');
        tableBody.innerHTML = '';

        // Sort by date (newest first)
        healthRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        healthRecords.forEach(r => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', r.id);
            row.innerHTML = `
                <td>${r.sheepId}</td>
                <td>${formatDate(r.date)}</td>
                <td>${r.type}</td>
                <td>${r.weight ? `${r.weight} kg` : 'N/A'}</td>
                <td>${r.medication || r.notes || 'N/A'}</td>
                <td class="action-buttons">
                    <button class="action-btn btn-edit" onclick="startEditHealthRecord('${r.id}')">Edit</button>
                    <button class="action-btn btn-danger" onclick="deleteHealthRecord('${r.id}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error rendering health table:', error);
        if (error.message === 'Database not initialized') {
            console.log('Database not ready, skipping renderHealthTable');
        }
    }
}



// Update dashboard
async function updateDashboard(filters = {}) {
    try {
        const animals = await getSheepData();
        const transactions = await getTransactionData();

        // Apply filters to animals and transactions if provided
        let filteredAnimals = animals;
        let filteredTransactions = transactions;
        if (filters.animalType && filters.animalType !== 'all') {
            filteredAnimals = filterAnimalsByType(animals, filters.animalType);
            filteredTransactions = filterTransactionsByAnimal(transactions, filters.animalType);
        }
        if (filters.period && filters.period !== 'all') {
            filteredTransactions = filterTransactionsByPeriod(filteredTransactions, filters);
        }

        // Count animals by type and gender (from filtered animals)
        const totalAnimals = filteredAnimals.length;
        const totalSheep = filteredAnimals.filter(a => a.animalType === 'sheep').length;
        const totalGoats = filteredAnimals.filter(a => a.animalType === 'goat').length;
        const totalEwes = filteredAnimals.filter(a => a.gender === 'Ewe').length;
        const totalRams = filteredAnimals.filter(a => a.gender === 'Ram').length;
        const totalLambs = filteredAnimals.filter(a => a.gender === 'Lamb' || a.gender === 'Kid').length;

        // Calculate total value (active animals purchase cost from filtered animals)
        const totalValue = filteredAnimals
            .filter(a => a.status === 'active')
            .reduce((sum, a) => sum + (a.purchaseCost || 0), 0);

        // Calculate net profit from filtered transactions
        const totalSales = filteredTransactions
            .filter(t => t.type === 'sale')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPurchases = filteredTransactions
            .filter(t => t.type === 'purchase')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = totalSales - totalPurchases - totalExpenses;

        // Update dashboard values
        document.getElementById('totalAnimals').textContent = totalAnimals;
        document.getElementById('totalSheep').textContent = totalSheep;
        document.getElementById('totalGoats').textContent = totalGoats;
        document.getElementById('totalEwes').textContent = totalEwes;
        document.getElementById('totalRams').textContent = totalRams;
        document.getElementById('totalLambs').textContent = totalLambs;
        document.getElementById('totalValue').textContent = formatCurrency(totalValue);
        document.getElementById('netProfit').textContent = formatCurrency(netProfit);

        // Update recent transactions
        const recentTransactionsBody = document.querySelector('#recentTransactions tbody');
        recentTransactionsBody.innerHTML = '';

        // Get last 5 transactions from filtered data
        const recentTransactions = filteredTransactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        recentTransactions.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(t.date)}</td>
                <td>${t.type}</td>
                <td>${t.description} ${t.sheepId ? `(Sheep: ${t.sheepId})` : ''}</td>
                <td>${formatCurrency(t.amount)}</td>
            `;
            recentTransactionsBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating dashboard:', error);
        if (error.message === 'Database not initialized') {
            console.log('Database not ready, skipping updateDashboard');
        }
    }
}

// Update financial summary
async function updateFinancialSummary(filters = {}) {
    try {
        const transactions = await getTransactionData();

        // Apply filters if provided
        let filteredTransactions = transactions;
        if (filters.animalType && filters.animalType !== 'all') {
            filteredTransactions = filterTransactionsByAnimal(transactions, filters.animalType);
        }
        if (filters.period && filters.period !== 'all') {
            filteredTransactions = filterTransactionsByPeriod(filteredTransactions, filters);
        }

        const totalSales = filteredTransactions
            .filter(t => t.type === 'sale')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalPurchases = filteredTransactions
            .filter(t => t.type === 'purchase')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = totalSales - totalPurchases - totalExpenses;

        document.getElementById('totalSales').textContent = formatCurrency(totalSales);
        document.getElementById('totalPurchases').textContent = formatCurrency(totalPurchases);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('financialNetProfit').textContent = formatCurrency(netProfit);
    } catch (error) {
        console.error('Error updating financial summary:', error);
        if (error.message === 'Database not initialized') {
            console.log('Database not ready, skipping updateFinancialSummary');
        }
    }
}

// Delete sheep
async function deleteSheep(sheepId) {
    if (confirm(`Are you sure you want to delete sheep ${sheepId}?`)) {
        try {
            const sheep = await getSheepData();
            const updatedSheep = sheep.filter(s => s.id !== sheepId);
            await saveSheepData(updatedSheep);

            showAlert('sheepAlert', `Sheep ${sheepId} deleted successfully!`);
            await renderSheepTable();
            await updateDashboard();
        } catch (error) {
            console.error('Error deleting sheep:', error);
            showAlert('sheepAlert', 'Failed to delete sheep. Please try again.', false);
        }
    }
}

// Delete transaction
async function deleteTransaction(transactionId) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const transactions = await getTransactionData();
            const transaction = transactions.find(t => t.id === transactionId);
            const updatedTransactions = transactions.filter(t => t.id !== transactionId);
            await saveTransactionData(updatedTransactions);

            // If it was a sale, mark the animal as active again
            if (transaction.type === 'sale' && transaction.sheepId) {
                const animals = await getSheepData();
                const animalRecord = animals.find(a => a.id === transaction.sheepId);
                if (animalRecord) {
                    animalRecord.status = 'active';
                    await saveSheepData(animals);
                }
            }

            showAlert('financialAlert', 'Transaction deleted successfully!');
            await renderFinancialTable();
            await updateFinancialSummary();
            await updateDashboard();
            await renderSheepTable();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showAlert('financialAlert', 'Failed to delete transaction. Please try again.', false);
        }
    }
}

// Delete health record
async function deleteHealthRecord(recordId) {
    if (confirm('Are you sure you want to delete this health record?')) {
        try {
            const healthRecords = await getHealthData();
            const updatedRecords = healthRecords.filter(r => r.id !== recordId);
            await saveHealthData(updatedRecords);

            showAlert('healthAlert', 'Health record deleted successfully!');
            await renderHealthTable();
        } catch (error) {
            console.error('Error deleting health record:', error);
            showAlert('healthAlert', 'Failed to delete health record. Please try again.', false);
        }
    }
}

// Inline editing functions for animals
async function startEditSheep(sheepId) {
    try {
        const animals = await getSheepData();
        const animalRecord = animals.find(a => a.id === sheepId);
        if (!animalRecord) return;

        const row = document.querySelector(`#sheepTable tr[data-id="${sheepId}"]`);
        const cells = row.querySelectorAll('td');

        // Store original values
        row.setAttribute('data-original', JSON.stringify(animalRecord));

        // Make cells editable
        cells[0].innerHTML = `<select>
            <option value="sheep" ${animalRecord.animalType === 'sheep' ? 'selected' : ''}>Sheep</option>
            <option value="goat" ${animalRecord.animalType === 'goat' ? 'selected' : ''}>Goat</option>
        </select>`;

        cells[2].innerHTML = `<select>
            <option value="Ewe" ${animalRecord.gender === 'Ewe' ? 'selected' : ''}>Ewe (Female)</option>
            <option value="Ram" ${animalRecord.gender === 'Ram' ? 'selected' : ''}>Ram (Male)</option>
            <option value="Doe" ${animalRecord.gender === 'Doe' ? 'selected' : ''}>Doe (Female Goat)</option>
            <option value="Buck" ${animalRecord.gender === 'Buck' ? 'selected' : ''}>Buck (Male Goat)</option>
            <option value="Lamb" ${animalRecord.gender === 'Lamb' ? 'selected' : ''}>Lamb (Young Sheep)</option>
            <option value="Kid" ${animalRecord.gender === 'Kid' ? 'selected' : ''}>Kid (Young Goat)</option>
            <option value="Wether" ${animalRecord.gender === 'Wether' ? 'selected' : ''}>Wether (Castrated)</option>
        </select>`;

        cells[4].innerHTML = `<input type="number" value="${animalRecord.purchaseCost || 0}" min="0" step="0.01">`;
        cells[5].innerHTML = `<select>
            <option value="active" ${animalRecord.status === 'active' ? 'selected' : ''}>active</option>
            <option value="sold" ${animalRecord.status === 'sold' ? 'selected' : ''}>sold</option>
            <option value="dead" ${animalRecord.status === 'dead' ? 'selected' : ''}>dead</option>
        </select>`;

        // Change buttons first
        cells[6].innerHTML = `
            <button class="action-btn btn-save" onclick="saveEditSheep(this.parentElement.parentElement.getAttribute('data-id'))">Save</button>
            <button class="action-btn btn-cancel" onclick="cancelEditSheep(this.parentElement.parentElement.getAttribute('data-id'))">Cancel</button>
        `;

        // Then add hidden notes input
        const notesInput = document.createElement('input');
        notesInput.type = 'hidden';
        notesInput.value = animalRecord.notes || '';
        cells[6].appendChild(notesInput);
    } catch (error) {
        console.error('Error starting edit for sheep:', error);
    }
}

async function saveEditSheep(sheepId) {
    console.log('saveEditSheep called with ID:', sheepId);
    const row = document.querySelector(`#sheepTable tr[data-id="${sheepId}"]`);
    if (!row) {
        console.error('Row not found for ID:', sheepId);
        return;
    }
    const cells = row.querySelectorAll('td');

    const purchaseCostValue = cells[4].querySelector('input').value;
    console.log('Purchase cost input value:', purchaseCostValue);

    const updatedAnimal = {
        id: sheepId,
        animalType: cells[0].querySelector('select').value,
        gender: cells[2].querySelector('select').value,
        birthDate: JSON.parse(row.getAttribute('data-original')).birthDate,
        purchaseCost: parseFloat(purchaseCostValue) || 0,
        status: cells[5].querySelector('select').value,
        additionType: JSON.parse(row.getAttribute('data-original')).additionType || 'purchase',
        notes: cells[6].querySelector('input[type="hidden"]').value,
        dateAdded: JSON.parse(row.getAttribute('data-original')).dateAdded
    };

    console.log('Updated animal object:', updatedAnimal);

    try {
        const animals = await getSheepData();
        const index = animals.findIndex(a => a.id === sheepId);
        console.log('Animal index found:', index);
        if (index !== -1) {
            animals[index] = updatedAnimal;
            await saveSheepData(animals);
            console.log('Data saved to IndexedDB');
            showAlert('sheepAlert', 'Animal record updated successfully!');
            await renderSheepTable();
            await updateDashboard();
        } else {
            console.error('Animal not found in array');
        }
    } catch (error) {
        console.error('Error saving edited sheep:', error);
        showAlert('sheepAlert', 'Failed to update animal record. Please try again.', false);
    }
}

function cancelEditSheep(sheepId) {
    renderSheepTable();
}

// Inline editing functions for transactions
async function startEditTransaction(transactionId) {
    try {
        const transactions = await getTransactionData();
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        const row = document.querySelector(`#financialTable tr[data-id="${transactionId}"]`);
        const cells = row.querySelectorAll('td');

        // Store original values
        row.setAttribute('data-original', JSON.stringify(transaction));

        // Make cells editable
        cells[0].innerHTML = `<input type="date" value="${transaction.date}">`;
        cells[1].innerHTML = `<select>
            <option value="sale" ${transaction.type === 'sale' ? 'selected' : ''}>Sale</option>
            <option value="purchase" ${transaction.type === 'purchase' ? 'selected' : ''}>Purchase</option>
            <option value="expense" ${transaction.type === 'expense' ? 'selected' : ''}>Expense</option>
        </select>`;
        cells[2].innerHTML = `<input type="text" value="${transaction.sheepId || ''}" placeholder="Sheep ID (for sales)">`;
        cells[3].innerHTML = `<input type="number" value="${transaction.amount}" min="0" step="0.01">`;
        cells[4].innerHTML = `<textarea rows="2">${transaction.description}</textarea>`;

        // Change buttons
        cells[5].innerHTML = `
            <button class="action-btn btn-save" onclick="saveEditTransaction(this.parentElement.parentElement.getAttribute('data-id'))">Save</button>
            <button class="action-btn btn-cancel" onclick="cancelEditTransaction(this.parentElement.parentElement.getAttribute('data-id'))">Cancel</button>
        `;
    } catch (error) {
        console.error('Error starting edit for transaction:', error);
    }
}

async function saveEditTransaction(transactionId) {
    console.log('saveEditTransaction called with ID:', transactionId);
    const row = document.querySelector(`#financialTable tr[data-id="${transactionId}"]`);
    if (!row) {
        console.error('Row not found for ID:', transactionId);
        return;
    }
    const cells = row.querySelectorAll('td');

    // Check if elements exist before accessing their values
    const typeSelect = cells[1].querySelector('select');
    const sheepIdInput = cells[2].querySelector('input');
    const amountInput = cells[3].querySelector('input');
    const dateInput = cells[0].querySelector('input');
    const descriptionTextarea = cells[4].querySelector('textarea');

    if (!typeSelect || !amountInput || !dateInput || !descriptionTextarea) {
        console.error('Required form elements not found');
        return;
    }

    const updatedTransaction = {
        id: transactionId,
        type: typeSelect.value,
        sheepId: sheepIdInput ? sheepIdInput.value || null : null,
        amount: parseFloat(amountInput.value),
        date: dateInput.value,
        description: descriptionTextarea.value,
        dateAdded: JSON.parse(row.getAttribute('data-original')).dateAdded
    };

    console.log('Updated transaction object:', updatedTransaction);

    // Validation
    if (!updatedTransaction.amount || !updatedTransaction.date || !updatedTransaction.description) {
        showAlert('financialAlert', 'Please fill in all required fields.', false);
        return;
    }

    try {
        // For sales, check if animal exists and is active
        if (updatedTransaction.type === 'sale' && updatedTransaction.sheepId) {
            const animals = await getSheepData();
            const animalRecord = animals.find(a => a.id === updatedTransaction.sheepId);
            if (!animalRecord) {
                showAlert('financialAlert', `Animal with ID ${updatedTransaction.sheepId} not found!`, false);
                return;
            }
            // Update animal status if it was a sale
            animalRecord.status = 'sold';
            await saveSheepData(animals);
        }

        const transactions = await getTransactionData();
        const index = transactions.findIndex(t => t.id === transactionId);
        console.log('Transaction index found:', index);
        if (index !== -1) {
            transactions[index] = updatedTransaction;
            await saveTransactionData(transactions);
            console.log('Transaction data saved to IndexedDB');
            showAlert('financialAlert', 'Transaction updated successfully!');
            await renderFinancialTable();
            await updateFinancialSummary();
            await updateDashboard();
            await renderSheepTable();
        } else {
            console.error('Transaction not found in array');
        }
    } catch (error) {
        console.error('Error saving edited transaction:', error);
        showAlert('financialAlert', 'Failed to update transaction. Please try again.', false);
    }
}

function cancelEditTransaction(transactionId) {
    renderFinancialTable();
}

// Inline editing functions for health records
async function startEditHealthRecord(recordId) {
    try {
        const healthRecords = await getHealthData();
        const record = healthRecords.find(r => r.id === recordId);
        if (!record) return;

        const row = document.querySelector(`#healthTable tr[data-id="${recordId}"]`);
        const cells = row.querySelectorAll('td');

        // Store original values
        row.setAttribute('data-original', JSON.stringify(record));

        // Make cells editable
        cells[0].innerHTML = `<input type="text" value="${record.sheepId}">`;
        cells[1].innerHTML = `<input type="date" value="${record.date}">`;
        cells[2].innerHTML = `<select>
            <option value="weight" ${record.type === 'weight' ? 'selected' : ''}>Weight</option>
            <option value="medication" ${record.type === 'medication' ? 'selected' : ''}>Medication</option>
            <option value="vaccination" ${record.type === 'vaccination' ? 'selected' : ''}>Vaccination</option>
            <option value="death" ${record.type === 'death' ? 'selected' : ''}>Death</option>
            <option value="other" ${record.type === 'other' ? 'selected' : ''}>Other</option>
        </select>`;
        cells[3].innerHTML = `<input type="number" value="${record.weight || ''}" min="0" step="0.1" placeholder="kg">`;
        cells[4].innerHTML = `<textarea rows="2">${record.medication || record.notes || ''}</textarea>`;

        // Change buttons
        cells[5].innerHTML = `
            <button class="action-btn btn-save" onclick="saveEditHealthRecord(this.parentElement.parentElement.getAttribute('data-id'))">Save</button>
            <button class="action-btn btn-cancel" onclick="cancelEditHealthRecord(this.parentElement.parentElement.getAttribute('data-id'))">Cancel</button>
        `;
    } catch (error) {
        console.error('Error starting edit for health record:', error);
    }
}

async function saveEditHealthRecord(recordId) {
    console.log('saveEditHealthRecord called with ID:', recordId);
    const row = document.querySelector(`#healthTable tr[data-id="${recordId}"]`);
    if (!row) {
        console.error('Row not found for ID:', recordId);
        return;
    }
    const cells = row.querySelectorAll('td');

    // Check if elements exist before accessing their values
    const sheepIdInput = cells[0].querySelector('input');
    const dateInput = cells[1].querySelector('input');
    const typeSelect = cells[2].querySelector('select');
    const weightInput = cells[3].querySelector('input');
    const notesTextarea = cells[4].querySelector('textarea');

    if (!sheepIdInput || !dateInput || !typeSelect || !notesTextarea) {
        console.error('Required form elements not found');
        return;
    }

    const updatedRecord = {
        id: recordId,
        sheepId: sheepIdInput.value,
        type: typeSelect.value,
        weight: weightInput ? parseFloat(weightInput.value) || null : null,
        medication: notesTextarea.value,
        date: dateInput.value,
        notes: notesTextarea.value,
        dateAdded: JSON.parse(row.getAttribute('data-original')).dateAdded
    };

    console.log('Updated health record object:', updatedRecord);

    // Validation
    if (!updatedRecord.sheepId || !updatedRecord.date) {
        showAlert('healthAlert', 'Please fill in required fields (Sheep ID and Date).', false);
        return;
    }

    try {
        // Check if animal exists
        const animals = await getSheepData();
        const animalRecord = animals.find(a => a.id === updatedRecord.sheepId);
        if (!animalRecord) {
            showAlert('healthAlert', `Animal with ID ${updatedRecord.sheepId} not found!`, false);
            return;
        }

        // If record type is death, mark animal as dead
        if (updatedRecord.type === 'death') {
            animalRecord.status = 'dead';
            await saveSheepData(animals);
        }

        const healthRecords = await getHealthData();
        const index = healthRecords.findIndex(r => r.id === recordId);
        console.log('Health record index found:', index);
        if (index !== -1) {
            healthRecords[index] = updatedRecord;
            await saveHealthData(healthRecords);
            console.log('Health record data saved to IndexedDB');
            const message = updatedRecord.type === 'death' ? `Animal ${updatedRecord.sheepId} marked as deceased!` : 'Health record updated successfully!';
            showAlert('healthAlert', message);
            await renderHealthTable();
            await renderSheepTable();
            await updateDashboard();
        } else {
            console.error('Health record not found in array');
        }
    } catch (error) {
        console.error('Error saving edited health record:', error);
        showAlert('healthAlert', 'Failed to update health record. Please try again.', false);
    }
}

function cancelEditHealthRecord(recordId) {
    renderHealthTable();
}

// Filter functions
function filterTransactionsByPeriod(transactions, filters) {
    const now = new Date();
    let startDate, endDate;

    switch (filters.period) {
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            if (filters.startDate && filters.endDate) {
                startDate = new Date(filters.startDate);
                endDate = new Date(filters.endDate);
            } else {
                return transactions; // No valid custom range, return all
            }
            break;
        default:
            return transactions; // 'all' or invalid period
    }

    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
}

function filterTransactionsByAnimal(transactions, animalType) {
    if (animalType === 'all') return transactions;

    const animals = getSheepData();
    const filteredAnimalIds = animals
        .filter(a => a.animalType === animalType)
        .map(a => a.id);

    return transactions.filter(t => {
        if (!t.sheepId) return false; // Only include transactions with animal IDs
        return filteredAnimalIds.includes(t.sheepId);
    });
}

function filterAnimalsByType(animals, animalType) {
    if (animalType === 'all') return animals;
    return animals.filter(a => a.animalType === animalType);
}

// Toggle custom date range visibility
document.getElementById('transactionPeriod').addEventListener('change', function() {
    const customRange = document.getElementById('customDateRange');
    if (this.value === 'custom') {
        customRange.style.display = 'block';
    } else {
        customRange.style.display = 'none';
    }
});

document.getElementById('dashboardPeriod').addEventListener('change', function() {
    const customRange = document.getElementById('dashboardCustomDateRange');
    if (this.value === 'custom') {
        customRange.style.display = 'block';
    } else {
        customRange.style.display = 'none';
    }
});

// Financial filters event handlers
document.getElementById('applyFinancialFilters').addEventListener('click', function() {
    const animalType = document.getElementById('financialAnimalType').value;
    const period = document.getElementById('transactionPeriod').value;
    const filters = { animalType, period };

    if (period === 'custom') {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate && endDate) {
            filters.startDate = startDate;
            filters.endDate = endDate;
        }
    }

    renderFinancialTable(filters);
    updateFinancialSummary(filters);
});

document.getElementById('clearFinancialFilters').addEventListener('click', function() {
    document.getElementById('financialAnimalType').value = 'all';
    document.getElementById('transactionPeriod').value = 'all';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('customDateRange').style.display = 'none';
    renderFinancialTable();
    updateFinancialSummary();
});

// Dashboard filters event handlers
document.getElementById('applyDashboardFilters').addEventListener('click', function() {
    const animalType = document.getElementById('dashboardAnimalType').value;
    const period = document.getElementById('dashboardPeriod').value;
    const filters = { animalType, period };

    if (period === 'custom') {
        const startDate = document.getElementById('dashboardStartDate').value;
        const endDate = document.getElementById('dashboardEndDate').value;
        if (startDate && endDate) {
            filters.startDate = startDate;
            filters.endDate = endDate;
        }
    }

    updateDashboard(filters);
});

document.getElementById('clearDashboardFilters').addEventListener('click', function() {
    document.getElementById('dashboardAnimalType').value = 'all';
    document.getElementById('dashboardPeriod').value = 'all';
    document.getElementById('dashboardStartDate').value = '';
    document.getElementById('dashboardEndDate').value = '';
    document.getElementById('dashboardCustomDateRange').style.display = 'none';
    updateDashboard();
});

// Animal filters event handlers
document.getElementById('applyAnimalFilters').addEventListener('click', function() {
    const animalType = document.getElementById('animalTypeFilter').value;
    const filters = { animalType };
    renderSheepTable(filters);
});

document.getElementById('clearAnimalFilters').addEventListener('click', function() {
    document.getElementById('animalTypeFilter').value = 'all';
    renderSheepTable();
});

// Toggle purchase cost field based on addition type
document.getElementById('additionType').addEventListener('change', function() {
    const purchaseCostGroup = document.getElementById('purchaseCostGroup');
    if (this.value === 'birth') {
        purchaseCostGroup.style.display = 'none';
    } else {
        purchaseCostGroup.style.display = 'block';
    }
});

// Toggle gender options based on animal type
document.getElementById('animalType').addEventListener('change', function() {
    const genderSelect = document.getElementById('gender');
    const selectedType = this.value;

    // Clear current options
    genderSelect.innerHTML = '';

    if (selectedType === 'sheep') {
        genderSelect.innerHTML = `
            <option value="">Select Gender</option>
            <option value="Ewe">Ewe (Female)</option>
            <option value="Ram">Ram (Male)</option>
            <option value="Lamb">Lamb (Young Sheep)</option>
            <option value="Wether">Wether (Castrated)</option>
        `;
    } else if (selectedType === 'goat') {
        genderSelect.innerHTML = `
            <option value="">Select Gender</option>
            <option value="Doe">Doe (Female Goat)</option>
            <option value="Buck">Buck (Male Goat)</option>
            <option value="Kid">Kid (Young Goat)</option>
            <option value="Wether">Wether (Castrated)</option>
        `;
    }
});

// Initialize the application
async function init() {
    try {
        console.log('Initializing application...');
        await initializeDatabase();
        console.log('Database ready, updating UI...');
        updateCurrentDate();

        // Only render data if database is ready
        if (typeof window.dbReady !== 'undefined' && window.dbReady) {
            console.log('Rendering initial data...');
            await updateDashboard();
            await renderSheepTable();
            await renderFinancialTable();
            await updateFinancialSummary();
            await renderHealthTable();
        }

        // Set default dates to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('birthDate').value = today;
        document.getElementById('transactionDate').value = today;
        document.getElementById('recordDate').value = today;

        // Initialize purchase cost field visibility
        document.getElementById('additionType').dispatchEvent(new Event('change'));

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showAlert('sheepAlert', 'Failed to initialize application. Please refresh the page.', false);
    }
}

// Run initialization when page loads
document.addEventListener('DOMContentLoaded', init);
