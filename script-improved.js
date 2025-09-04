/**
 * Lottery Results Checker - Improved Version
 * Enhanced with better performance, error handling, and code organization
 */

// Global state variables
let selectedSeries = 5;
let prizeNumbers = {};
let selectedDate = '';
let selectedTime = '13:00';
let availableDates = [];

// Cache DOM elements for better performance
const domElements = {};

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    cacheDOMElements();
    // Auto-load latest results instead of today's date
    setTimeout(function() {
        initializeWithLatestResults();
    }, 100);
    setupEventListeners();
});

/**
 * Cache frequently accessed DOM elements
 */
function cacheDOMElements() {
    domElements.seriesButtons = document.querySelectorAll('.series-btn');
    domElements.timeButtons = document.querySelectorAll('.time-btn');
    domElements.datePicker = document.getElementById('date-picker');
    domElements.dateSearch = document.getElementById('date-search');
    domElements.ticketInput = document.getElementById('ticket-input');
    domElements.applyBtn = document.getElementById('apply-selection-btn');
    domElements.resultDiv = document.getElementById('result');
    
    // Prize display elements
    domElements.firstPrizeEl = document.getElementById('first-prize-number');
    domElements.consolationEl = document.getElementById('consolation-number');
    domElements.datetimeEl = document.getElementById('draw-datetime');
    domElements.secondPrizeContainer = document.getElementById('second-prize-numbers');
    domElements.thirdPrizeContainer = document.getElementById('third-prize-numbers');
    domElements.fourthPrizeContainer = document.getElementById('fourth-prize-numbers');
    domElements.fifthPrizeContainer = document.getElementById('fifth-prize-numbers');
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Series selection
    domElements.seriesButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            LotteryUtils.dom.toggleActiveButton(this, domElements.seriesButtons);
            selectedSeries = parseInt(this.dataset.series);
        });
    });

    // Time selection
    domElements.timeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            LotteryUtils.dom.toggleActiveButton(this, domElements.timeButtons);
            selectedTime = this.dataset.time;
        });
    });

    // Date picker
    if (domElements.datePicker) {
        domElements.datePicker.addEventListener('change', function() {
            selectedDate = this.value;
        });
    }

    // Date search functionality
    if (domElements.dateSearch) {
        domElements.dateSearch.addEventListener('input', handleDateSearch);
        domElements.dateSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleDateSearch.call(this);
            }
        });
    }

    // Ticket input
    if (domElements.ticketInput) {
        domElements.ticketInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkTicket();
            }
        });
    }

    // Apply selection button
    if (domElements.applyBtn) {
        domElements.applyBtn.addEventListener('click', loadSelectedDrawData);
    }
}

/**
 * Handle date search input
 */
function handleDateSearch() {
    const searchValue = this.value;
    if (searchValue.length >= 10) { // DD-MM-YYYY format
        const convertedDate = convertDateFormat(searchValue);
        if (convertedDate) {
            domElements.datePicker.value = convertedDate;
            selectedDate = convertedDate;
            loadSelectedDrawData();
        }
    }
}

/**
 * Update display with current prize numbers
 */
function updateDisplayNumbers() {
    try {
        // Update datetime display
        if (prizeNumbers.drawDate && prizeNumbers.drawTime && domElements.datetimeEl) {
            domElements.datetimeEl.textContent = `${prizeNumbers.drawDate} - ${prizeNumbers.drawTime}`;
        }

        // Update first prize and consolation
        if (domElements.firstPrizeEl) domElements.firstPrizeEl.textContent = prizeNumbers.firstPrize || 'No Data';
        if (domElements.consolationEl) domElements.consolationEl.textContent = prizeNumbers.consolation || 'No Data';

        // Update all prize categories with special handling for fifth prize
        const prizeCategories = [
            { name: 'second', container: domElements.secondPrizeContainer },
            { name: 'third', container: domElements.thirdPrizeContainer },
            { name: 'fourth', container: domElements.fourthPrizeContainer }
        ];

        // Handle 2nd, 3rd, and 4th prizes normally
        prizeCategories.forEach(({ name, container }) => {
            if (container && prizeNumbers[`${name}Prize`]) {
                container.innerHTML = prizeNumbers[`${name}Prize`]
                    .map(num => `<span>${num}</span>`)
                    .join('');
            }
        });
        
        // Handle 5th prize with automatic sorting and vertical arrangement
        if (domElements.fifthPrizeContainer && prizeNumbers.fifthPrize) {
            // Automatically sort fifth prize numbers from smallest to largest
            const sortedFifthPrize = [...prizeNumbers.fifthPrize].sort((a, b) => {
                // Convert to numbers for proper numerical sorting
                return parseInt(a) - parseInt(b);
            });
            
            // Arrange numbers vertically (top to bottom) in the grid
            // This means filling columns first, then moving to next column
            const totalNumbers = sortedFifthPrize.length;
            const columns = 10; // Grid has 10 columns
            const rows = Math.ceil(totalNumbers / columns);
            
            // Create array to hold the vertically arranged numbers
            let verticallyArranged = new Array(totalNumbers);
            
            // Fill the array column by column (vertical arrangement)
            for (let i = 0; i < totalNumbers; i++) {
                const col = Math.floor(i / rows);
                const row = i % rows;
                const gridPosition = row * columns + col;
                verticallyArranged[gridPosition] = sortedFifthPrize[i];
            }
            
            // Remove empty slots and create HTML
            const finalNumbers = verticallyArranged.filter(num => num !== undefined);
            domElements.fifthPrizeContainer.innerHTML = finalNumbers.map(num => `<span>${num}</span>`).join('');
            
            console.log(`✅ Auto-sorted and arranged ${totalNumbers} fifth prize numbers vertically`);
        }
    } catch (error) {
        console.error('Error updating display numbers:', error);
        showErrorMessage('Failed to update display');
    }
}

/**
 * Main ticket checking function
 */
function checkTicket() {
    const ticketNumber = domElements.ticketInput ? domElements.ticketInput.value.trim() : '';
    
    if (!ticketNumber) {
        showError('Please enter a ticket number');
        return;
    }

    // Show loading state
    showLoading('Checking your ticket...');

    try {
        // Clear previous highlights
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

        // Expand ticket range if needed
        const ticketsToCheck = ticketNumber.includes('-') 
            ? expandTicketRange(ticketNumber) 
            : [ticketNumber];

        if (!ticketsToCheck) {
            showError('Invalid ticket format');
            return;
        }

        // Check all tickets
        const allMatches = [];
        for (const ticket of ticketsToCheck) {
            checkSingleTicket(ticket.replace(/\s+/g, '').toUpperCase(), allMatches);
        }

        // Display results
        displayResults(allMatches);
    } catch (error) {
        console.error('Error checking ticket:', error);
        showError('An error occurred while checking your ticket');
    }
}

/**
 * Check a single ticket against all prize categories
 */
function checkSingleTicket(cleanTicket, allMatches) {
    const { firstPrize, consolation } = prizeNumbers;

    // Check first prize
    if (cleanTicket === firstPrize) {
        document.querySelector('.first-prize .number')?.classList.add('highlight');
        allMatches.push({ ticket: cleanTicket, prize: '1st prize', amount: 10000000 });
        return;
    }

    // Check first prize with different series
    if (cleanTicket.length === 8 && 
        cleanTicket.slice(0, 2) === firstPrize.slice(0, 2) && 
        cleanTicket.slice(3) === firstPrize.slice(3) && 
        isValidFirstPrizeTicket(cleanTicket.charAt(2), selectedSeries)) {
        document.querySelector('.first-prize .number')?.classList.add('highlight');
        allMatches.push({ ticket: cleanTicket, prize: '1st prize', amount: 10000000 });
        return;
    }

    // Check consolation prize
    if (isConsolationWinner(cleanTicket, firstPrize, consolation)) {
        document.querySelector('.first-prize-desc')?.classList.add('highlight');
        allMatches.push({
            ticket: cleanTicket,
            prize: 'Consolation prize',
            amount: selectedSeries * 1000,
            winningNumber: firstPrize,
            inputTicket: cleanTicket
        });
    }

    // Check other prizes
    const prizeConfigs = [
        { name: 'second', slice: -5, amount: 9000 },
        { name: 'third', slice: -4, amount: 450 },
        { name: 'fourth', slice: -4, amount: 250 },
        { name: 'fifth', slice: -4, amount: 120 }
    ];

    prizeConfigs.forEach(config => {
        checkPrizeCategory(cleanTicket, allMatches, config);
    });
}

/**
 * Check if ticket is a consolation winner
 */
function isConsolationWinner(cleanTicket, firstPrize, consolation) {
    if (cleanTicket.length === 8 && cleanTicket.slice(-5) === firstPrize.slice(-5)) {
        const ticketPrefix = cleanTicket.slice(0, 2);
        const ticketLetter = cleanTicket.charAt(2);
        const firstPrizePrefix = firstPrize.slice(0, 2);
        const firstPrizeLetter = firstPrize.charAt(2);
        
        return (ticketPrefix !== firstPrizePrefix || ticketLetter !== firstPrizeLetter) &&
               isValidConsolationTicket(ticketLetter, selectedSeries, cleanTicket);
    }
    
    return cleanTicket === consolation || 
           (cleanTicket.length >= 5 && cleanTicket.slice(-5) === consolation);
}

/**
 * Check a specific prize category
 */
function checkPrizeCategory(cleanTicket, allMatches, config) {
    const matchNumber = cleanTicket.length >= Math.abs(config.slice) 
        ? cleanTicket.slice(config.slice) 
        : cleanTicket;

    if (prizeNumbers[`${config.name}Prize`]?.includes(matchNumber)) {
        // Highlight matching number
        const selector = config.name === 'fifth' 
            ? '#fifth-prize-numbers span' 
            : '.prize-numbers span';
        
        document.querySelectorAll(selector).forEach(span => {
            if (span.textContent.trim() === matchNumber) {
                span.classList.add('highlight');
            }
        });

        allMatches.push({
            ticket: matchNumber,
            prize: `${config.name} prize`,
            amount: selectedSeries * config.amount
        });
    }
}

/**
 * Display check results
 */
function displayResults(allMatches) {
    if (allMatches.length > 0) {
        const totalWinning = allMatches.reduce((sum, match) => sum + match.amount, 0);
        domElements.resultDiv.innerHTML = generateWinnerHTML(allMatches, totalWinning);
    } else {
        domElements.resultDiv.innerHTML = generateNoMatchHTML();
    }
}

/**
 * Generate HTML for winner display
 */
function generateWinnerHTML(allMatches, totalWinning) {
    const prizeColors = {
        '1st prize': '#ff6b35',
        'Consolation prize': '#feca57',
        '2nd prize': '#dc3545',
        '3rd prize': '#17a2b8',
        '4th prize': '#6f42c1',
        '5th prize': '#28a745'
    };

    const matchesHtml = allMatches.map(match => {
        const bgColor = prizeColors[match.prize] || '#28a745';
        const displayAmount = match.prize === '1st prize' ? '1 CRORE' : `₹${match.amount.toLocaleString()}`;
        const displayNumber = match.prize === 'Consolation prize' && match.winningNumber === prizeNumbers.firstPrize 
            ? prizeNumbers.consolation 
            : match.ticket;

        return `<p style="color: #ffffff; font-size: 1.2rem; margin: 5px 0; font-weight: bold; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); background: ${bgColor}; padding: 8px; border-radius: 8px;">⭐ ${displayNumber} - ${match.prize} - ${displayAmount}</p>`;
    }).join('');

    return `
        <div style="text-align: center; padding: 20px; background: linear-gradient(45deg, #d4edda, #c3e6cb); border-radius: 12px; margin: 20px 0;">
            <h2 style="color: #155724; font-size: 2rem; margin: 10px 0;">🎉🎆 ${allMatches.length > 1 ? 'MULTIPLE WINS!' : 'WINNER!'} 🎆🎉</h2>
            <p style="color: #155724; font-size: 1.4rem; font-weight: bold;">You won ${allMatches.length} prize${allMatches.length > 1 ? 's' : ''}!</p>
            <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 15px; border-radius: 12px; margin: 15px 0; border: 2px solid #28a745;">
                ${matchesHtml}
                <hr style="border: 1px solid #28a745; margin: 10px 0;">
                <p style="color: #28a745; font-size: 2rem; font-weight: 900; margin: 10px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">💰 Total: ₹${totalWinning.toLocaleString()} 💰</p>
            </div>
            <p style="color: #6f42c1; font-size: 1.1rem;">🎆 ${allMatches.length > 1 ? 'Amazing luck! Multiple prizes!' : 'Congratulations on your win!'} 🎆</p>
        </div>
    `;
}

/**
 * Generate HTML for no match display
 */
function generateNoMatchHTML() {
    return `
        <div style="text-align: center; padding: 20px; background: linear-gradient(45deg, #f8d7da, #f5c6cb); border-radius: 12px; margin: 20px 0;">
            <p style="color: #721c24; font-size: 1.3rem;">🎯 No match found</p>
            <p style="color: #856404; font-size: 1.1rem;">🍀 Keep trying!</p>
        </div>
    `;
}

/**
 * Expand ticket range (e.g., "1234-40" becomes ["1234", "1235", ...])
 */
function expandTicketRange(ticketNumber) {
    const [baseTicket, endRange] = ticketNumber.split('-');
    const cleanBase = baseTicket.replace(/\s+/g, '').toUpperCase();
    const endNum = parseInt(endRange);
    
    if (isNaN(endNum) || endNum < 0 || endNum > 99) {
        return null;
    }

    const tickets = [];
    
    // Handle different ticket formats
    if (/^[0-9]{4}$/.test(cleanBase)) {
        const prefix = cleanBase.slice(0, -2);
        const startNum = parseInt(cleanBase.slice(-2));
        
        for (let i = startNum; i <= endNum; i++) {
            tickets.push(prefix + i.toString().padStart(2, '0'));
        }
    } else if (/^[0-9]{5}$/.test(cleanBase)) {
        const firstDigit = cleanBase.charAt(0);
        const prefix = cleanBase.slice(1, -2);
        const startNum = parseInt(cleanBase.slice(-2));
        
        for (let i = startNum; i <= endNum; i++) {
            tickets.push(firstDigit + prefix + i.toString().padStart(2, '0'));
        }
    } else if (/^[0-9]{2}[A-Z][0-9]{5}$/.test(cleanBase)) {
        const seriesPrefix = cleanBase.slice(0, 2);
        const startLetter = cleanBase.charAt(2);
        const numberPart = cleanBase.slice(3, 8);
        const startNum = parseInt(cleanBase.slice(-2));
        
        for (let i = startNum; i <= endNum; i++) {
            const fullNumber = numberPart.slice(0, -2) + i.toString().padStart(2, '0');
            tickets.push(seriesPrefix + startLetter + fullNumber);
        }
    } else {
        return null;
    }
    
    return tickets;
}

/**
 * Check if letter is valid for first prize ticket
 */
function isValidFirstPrizeTicket(letter, series) {
    const groupA = ['A', 'B', 'C', 'D', 'E'];
    const groupG = ['G', 'H', 'J', 'K', 'L'];
    const allLetters = [...groupA, ...groupG];
    const firstPrizeLetter = prizeNumbers.firstPrize?.charAt(2);

    switch (series) {
        case 5:
        case 25:
            return groupA.includes(firstPrizeLetter) 
                ? groupA.includes(letter) 
                : groupG.includes(letter);
        default:
            return allLetters.includes(letter);
    }
}

/**
 * Check if letter is valid for consolation prize
 */
function isValidConsolationTicket(letter, series, inputTicket) {
    const allLetters = ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'J', 'K', 'L'];
    return allLetters.includes(letter);
}

/**
 * Initialize date picker with today's date
 */
function initializeDatePicker() {
    const today = new Date();
    selectedDate = today.toISOString().split('T')[0];
    if (domElements.datePicker) {
        domElements.datePicker.value = selectedDate;
    }
    updateCurrentSelectionDisplay();
}

/**
 * Load draws data from external source
 */
function loadDrawsData() {
    try {
        if (typeof allDrawsData !== 'undefined' && Object.keys(allDrawsData).length > 0) {
            console.log('Loaded draws data from draws-data.js:', Object.keys(allDrawsData).length, 'draws');
            updateAvailableDates();
            loadSelectedDrawData();
        } else {
            throw new Error('allDrawsData not found');
        }
    } catch (error) {
        console.error('Error loading draws data:', error);
        showNoDataMessage();
        updateCurrentSelectionDisplay();
    }
}

/**
 * Load data for selected date and time
 */
async function loadSelectedDrawData() {
    showLoading('Loading draw data...');
    
    if (!await loadFromDateTimeFile()) {
        const drawKey = `${selectedDate}_${selectedTime}`;
        
        if (allDrawsData && allDrawsData[drawKey]) {
            prizeNumbers = { ...allDrawsData[drawKey] };
            
            // Only override date/time if they're not already properly formatted
            if (!prizeNumbers.drawDate || !prizeNumbers.drawTime) {
                const [year, month, day] = selectedDate.split('-');
                prizeNumbers.drawDate = `${day}/${month}/${year}`;
                prizeNumbers.drawTime = formatTimeForDisplay(selectedTime);
            }
            
            console.log(`Loaded data from allDrawsData for ${drawKey}`);
            console.log(`📅 Using Date: ${prizeNumbers.drawDate}, Time: ${prizeNumbers.drawTime}`);
            updateDisplayNumbers();
            updateCurrentSelectionDisplay();
        } else {
            console.log(`No data found for ${drawKey}`);
            showNoDataMessage();
            updateCurrentSelectionDisplay();
        }
    }
    hideLoading();
}

/**
 * Load data from specific date-time file
 */
async function loadFromDateTimeFile() {
    try {
        const [year, month, day] = selectedDate.split('-');
        const dateStr = `${day}-${month}-${year}`;
        const timeStr = formatTimeForFilename(selectedTime);
        const filename = `${dateStr}_${timeStr}_lottery.json`;
        
        console.log(`Attempting to load: ${filename}`);
        
        const response = await fetch(filename);
        if (response.ok) {
            prizeNumbers = await response.json();
            prizeNumbers.drawDate = `${day}/${month}/${year}`;
            prizeNumbers.drawTime = formatTimeForDisplay(selectedTime);
            
            console.log(`Successfully loaded from ${filename}`);
            updateDisplayNumbers();
            updateCurrentSelectionDisplay();
            return true;
        }
        return false;
    } catch (error) {
        console.log('Error loading from date-time file:', error);
        return false;
    }
}

/**
 * Format time for filename (13:00 -> 1pm)
 */
function formatTimeForFilename(time24) {
    const [hours] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'pm' : 'am';
    return `${hour12}${ampm}`;
}

/**
 * Update available dates array
 */
function updateAvailableDates() {
    availableDates = [...new Set(Object.keys(allDrawsData).map(key => key.split('_')[0]))]
        .sort((a, b) => new Date(b) - new Date(a));
    console.log('Available dates:', availableDates);
}

/**
 * Convert date format using utility
 */
function convertDateFormat(dateString) {
    return LotteryUtils.dateTime.convertDateFormat(dateString);
}

/**
 * Update current selection display
 */
function updateCurrentSelectionDisplay() {
    const currentDateTimeEl = document.getElementById('current-date-time');
    if (currentDateTimeEl) {
        const formattedDate = formatDateForDisplay(selectedDate);
        const formattedTime = formatTimeForDisplay(selectedTime);
        currentDateTimeEl.textContent = `${formattedDate} - ${formattedTime}`;
    }
}

/**
 * Format date for display
 */
function formatDateForDisplay(dateString) {
    return LotteryUtils.dateTime.formatDateForDisplay(dateString);
}

/**
 * Format time for display
 */
function formatTimeForDisplay(timeString) {
    return LotteryUtils.dateTime.formatTimeForDisplay(timeString);
}

/**
 * Show no data message
 */
function showNoDataMessage() {
    const noDataText = 'No Data Available';
    const noDataStyle = 'color: #888; text-align: center; display: block; padding: 12px 20px; background-color: #fafafa; border-radius: 4px; margin: 8px 0; font-size: 13px; border: 1px solid #eeeeee; font-weight: normal;';
    
    // Clear main displays
    if (domElements.firstPrizeEl) domElements.firstPrizeEl.textContent = noDataText;
    if (domElements.consolationEl) domElements.consolationEl.textContent = 'No Data';
    if (domElements.datetimeEl) domElements.datetimeEl.textContent = noDataText;
    
    // Clear prize containers
    [domElements.secondPrizeContainer, domElements.thirdPrizeContainer, 
     domElements.fourthPrizeContainer, domElements.fifthPrizeContainer].forEach(container => {
        if (container) {
            container.innerHTML = `<div style="${noDataStyle}">No data available for this date/time</div>`;
        }
    });
    
    // Reset prize numbers
    prizeNumbers = {
        firstPrize: '',
        consolation: '',
        secondPrize: [],
        thirdPrize: [],
        fourthPrize: [],
        fifthPrize: []
    };
}

/**
 * UI Helper Functions
 */
function showLoading(message = 'Loading...') {
    if (domElements.resultDiv) {
        domElements.resultDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; background: linear-gradient(45deg, #e3f2fd, #bbdefb); border-radius: 12px; margin: 20px 0;">
                <div class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #2196F3; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: #1976d2; font-size: 1.1rem; margin: 10px 0;">${message}</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
}

function hideLoading() {
    // Loading will be replaced by results, so no action needed
}

function showError(message) {
    if (domElements.resultDiv) {
        domElements.resultDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; background: linear-gradient(45deg, #ffebee, #ffcdd2); border-radius: 12px; margin: 20px 0;">
                <p style="color: #c62828; font-size: 1.2rem;">❌ ${message}</p>
            </div>
        `;
    }
}

function showErrorMessage(message) {
    console.error('Error:', message);
    // You can implement a toast notification system here
}

/**
 * Master initialization function that handles auto-loading
 */
async function initializeWithLatestResults() {
    console.log('🚀 Initializing lottery website with latest results...');
    
    try {
        // Step 1: Try to auto-load the latest results
        const autoLoadSuccess = await autoLoadLatestResults();
        
        // Step 2: Only load draws data if auto-loading didn't work
        if (!autoLoadSuccess) {
            console.log('🔄 Auto-loading failed, falling back to regular loading...');
            initializeDatePicker();
            loadDrawsData();
        } else {
            console.log('✅ Auto-loading successful, skipping regular loading');
            // Just update available dates for future use
            if (typeof allDrawsData !== 'undefined' && Object.keys(allDrawsData).length > 0) {
                updateAvailableDates();
            }
        }
        
    } catch (error) {
        console.error('❌ Error in initialization:', error);
        loadDefaultData();
    }
}

/**
 * Auto-load latest results function - PRIORITIZE JSON FILES ONLY
 */
async function autoLoadLatestResults() {
    console.log('🎲 Auto-loading latest lottery results - JSON FILES ONLY...');
    
    try {
        // ONLY Strategy: Find latest from individual JSON files (ignore draws-data.js)
        console.log('🔍 Searching for latest individual JSON files (PRIORITY ONLY)...');
        const latestFromFiles = await findLatestFromJsonFiles();
        if (latestFromFiles) {
            selectedDate = latestFromFiles.date;
            selectedTime = latestFromFiles.time;
            
            // Load the actual file data
            const success = await loadFromDateTimeFile();
            if (success) {
                updateDatePickerAndTimeButtons();
                console.log(`✅ Auto-loaded from JSON file: ${selectedDate} ${selectedTime}`);
                console.log(`📅 File Date: ${prizeNumbers.drawDate}, Time: ${prizeNumbers.drawTime}`);
                console.log(`🏆 First Prize: ${prizeNumbers.firstPrize}`);
                return true;
            }
        }
        
        // NO FALLBACK TO DRAWS-DATA.JS - Use hardcoded fallback instead
        console.log('⚠️ No individual JSON lottery files found, using hardcoded fallback');
        loadDefaultData();
        return true;
        
    } catch (error) {
        console.error('❌ Error in auto-loading latest results:', error);
        loadDefaultData();
        return true;
    }
}

/**
 * Find the latest results from draws-data.js
 */
function findLatestFromDrawsData() {
    if (!allDrawsData || Object.keys(allDrawsData).length === 0) {
        return null;
    }
    
    const drawKeys = Object.keys(allDrawsData);
    const parsedDates = drawKeys.map(key => {
        const [dateStr, timeStr] = key.split('_');
        const date = new Date(dateStr);
        return {
            originalKey: key,
            date: date,
            dateStr: dateStr,
            timeStr: timeStr,
            timestamp: date.getTime() + getTimeWeight(timeStr)
        };
    }).filter(item => !isNaN(item.date.getTime()));
    
    // Sort by date and time (latest first)
    parsedDates.sort((a, b) => b.timestamp - a.timestamp);
    
    if (parsedDates.length > 0) {
        const latest = parsedDates[0];
        console.log('📈 Latest from draws-data:', latest);
        return {
            date: latest.dateStr,
            time: latest.timeStr
        };
    }
    
    return null;
}

/**
 * Find the latest results from individual JSON files
 */
async function findLatestFromJsonFiles() {
    try {
        const timeSlots = ['8pm', '6pm', '1pm'];
        const today = new Date();
        
        // Check last 10 days
        for (let i = 0; i < 10; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            
            const dd = String(checkDate.getDate()).padStart(2, '0');
            const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
            const yyyy = checkDate.getFullYear();
            const dateStr = `${dd}-${mm}-${yyyy}`;
            
            // Check time slots in order of preference
            for (const timeSlot of timeSlots) {
                const filename = `${dateStr}_${timeSlot}_lottery.json`;
                try {
                    const response = await fetch(filename, { method: 'HEAD' });
                    if (response.ok) {
                        console.log(`📄 Found latest file: ${filename}`);
                        return {
                            date: `${yyyy}-${mm}-${dd}`,
                            time: convertTimeSlotTo24Hour(timeSlot)
                        };
                    }
                } catch (error) {
                    // File doesn't exist, continue
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding latest from JSON files:', error);
        return null;
    }
}

/**
 * Convert time slot string to 24-hour format
 */
function convertTimeSlotTo24Hour(timeSlot) {
    const timeMap = {
        '1pm': '13:00',
        '6pm': '18:00',
        '8pm': '20:00'
    };
    return timeMap[timeSlot.toLowerCase()] || '13:00';
}

/**
 * Get time weight for sorting (higher = later in day)
 */
function getTimeWeight(timeStr) {
    const weights = {
        '13:00': 1,
        '18:00': 2,
        '20:00': 3
    };
    return weights[timeStr] || 0;
}

/**
 * Update the date picker and time buttons to reflect auto-loaded selection
 */
function updateDatePickerAndTimeButtons() {
    // Update date picker
    if (domElements.datePicker) {
        domElements.datePicker.value = selectedDate;
    }
    
    // Update time button selection
    domElements.timeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.time === selectedTime) {
            btn.classList.add('active');
        }
    });
    
    console.log(`🔄 Updated UI: Date = ${selectedDate}, Time = ${selectedTime}`);
}

/**
 * Load default/fallback data - HARDCODED ONLY (ignore draws-data.js)
 */
 function loadDefaultData() {
    console.log('🔄 Loading hardcoded fallback data (IGNORE draws-data.js)...');
    
    // ALWAYS use hardcoded fallback - IGNORE draws-data.js completely
    console.log('🎯 Using ONLY hardcoded fallback data (19-08-2025_8pm)...');
    
    prizeNumbers = {
        firstPrize: '47L89944',
        consolation: '89944',
        drawDate: '19/08/2025',
        drawTime: '8:00 PM',
        secondPrize: ['00107','50332','50810','51476','11505','41626','95865','16075','88181','39567'],
        thirdPrize: ['0359','1414','2406','3687','5178','6652','8095','8848','8868','9602'],
        fourthPrize: ['0718','3673','4010','5158','7470','7617','8879','9176','9392','9789'],
        fifthPrize: ['0043','0261','0348','0431','0487','0592','0859','1296','1321','1326','1485','1516','1828','2170','2298','2324','2532','2577','2615','2683','2745','2912','2930','2950','3090','3116','3341','3381','3403','3473','3486','3497','3585','3586','3625','3684','3772','3859','3881','3992','4170','4337','4360','4376','4467','4503','4504','4660','5168','5475','5565','5633','5715','5772','5791','5803','5929','5947','5960','5966','6029','6330','6352','6359','6587','6924','6974','7023','7074','7097','7669','7678','7798','8033','8042','8105','8214','8530','8561','8634','8654','8685','8809','8823','8982','9083','9100','9222','9320','9345','9367','9382','9472','9483','9635','9646','9663','9790','9895','9902']
    };
    
    selectedDate = '2025-08-19';
    selectedTime = '20:00';
    
    // Initialize with the hardcoded date
    if (domElements.datePicker) {
        domElements.datePicker.value = selectedDate;
    }
    updateDisplayNumbers();
    updateDatePickerAndTimeButtons();
    
    console.log('✅ Loaded HARDCODED fallback data (47L89944):', prizeNumbers.firstPrize);
}
