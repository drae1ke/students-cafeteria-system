// Form validation functions
function validateNumber() {
    const number = document.getElementById('number').value;
    const error = document.getElementById('num-error');
    const kenyanRegex = /^(2547\d{8}|07\d{8})$/;

    if (number === "") {
        error.innerHTML = "Phone number cannot be empty";
        return false;
    } else if (!kenyanRegex.test(number)) {
        error.innerHTML = "Please enter a valid Kenyan phone number";
        return false;
    } else {
        error.innerHTML = "✅";
        return true;
    }
}

function validateAmount() {
    const error = document.getElementById('amount-error');
    const amount = document.getElementById('amount').value;
    const cashAmount = Number(amount);

    if (isNaN(cashAmount) || cashAmount < 10) {
        error.innerHTML = "Minimum deposit is Ksh.10";
        return false;
    } else if (cashAmount > 100000) {
        error.innerHTML = "Maximum deposit is Ksh.100,000";
        return false;
    } else {
        error.innerHTML = "✅";
        return true;
    }
}

// Navigation menu toggle
function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}

// MPESA Payment integration
async function initiateMpesaPayment(event) {
    event.preventDefault();
    
    const number = document.getElementById('number').value;
    const amount = document.getElementById('amount').value;
    const submitError = document.getElementById('submit-error');
    const submitButton = document.querySelector('.submit-btn');

    if (!validateNumber() || !validateAmount()) {
        submitError.textContent = "Please correct the errors above.";
        return;
    }

    try {
        // Get access token from localStorage
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            window.location.href = '/signin';
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";
        submitError.textContent = "";

        // Make API request to initiate STK Push
        const response = await fetch('/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ phone: number, amount: parseFloat(amount) })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success message
            submitButton.className = "submit-btn bg-green-500";
            submitButton.textContent = "STK Push Sent";
            alert("STK Push sent. Please enter your M-Pesa PIN to complete the transaction.");
            
            // Store the transaction reference
            const transactionRef = data.transactionRef;
            if (transactionRef) {
                // Start polling for transaction status
                pollTransactionStatus(transactionRef);
            }
        } else {
            submitError.textContent = `Error: ${data.message || "Something went wrong"}`;
            submitButton.disabled = false;
            submitButton.textContent = "Deposit";
        }
    } catch (error) {
        console.error("Error:", error);
        submitError.textContent = "Failed to connect to the server.";
        submitButton.disabled = false;
        submitButton.textContent = "Deposit";
    }
}

// Poll for transaction status
async function pollTransactionStatus(reference) {
    // Set a polling interval (e.g., check every 5 seconds)
    const pollInterval = 5000;
    const maxAttempts = 12; // 1 minute total (12 * 5 seconds)
    let attempts = 0;
    
    const checkStatus = async () => {
        try {
            attempts++;
            
            // Get access token
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) return;
            
            // Make API request to check transaction status
            const response = await fetch(`/mpesa/transaction/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to check transaction status');
            }
            
            const data = await response.json();
            
            // If transaction completed, update UI and stop polling
            if (data.status === 'completed') {
                console.log('Transaction completed successfully');
                updateBalanceDisplay();
                resetForm();
                showTransactionSuccess(data.amount);
                return;
            } 
            // If transaction failed, update UI and stop polling
            else if (data.status === 'failed') {
                console.log('Transaction failed');
                const submitError = document.getElementById('submit-error');
                submitError.textContent = "Transaction failed. Please try again.";
                resetForm();
                return;
            }
            
            // If still pending and not reached max attempts, continue polling
            if (attempts < maxAttempts) {
                setTimeout(checkStatus, pollInterval);
            } else {
                console.log('Polling timed out');
                // We don't show an error as the transaction might still complete later
                resetForm();
            }
        } catch (error) {
            console.error('Error checking transaction status:', error);
            if (attempts < maxAttempts) {
                setTimeout(checkStatus, pollInterval);
            } else {
                resetForm();
            }
        }
    };
    
    // Start polling
    setTimeout(checkStatus, pollInterval);
}

// Show transaction success message
function showTransactionSuccess(amount) {
    const submitButton = document.querySelector('.submit-btn');
    submitButton.className = "submit-btn bg-green-500";
    submitButton.textContent = `KES ${amount} Added Successfully`;
    
    // Reset button after 3 seconds
    setTimeout(() => {
        resetForm();
    }, 3000);
}

// Reset form after transaction
function resetForm() {
    const submitButton = document.querySelector('.submit-btn');
    submitButton.disabled = false;
    submitButton.textContent = "Deposit";
    submitButton.className = "submit-btn";
    
    // Clear form fields
    document.getElementById('number').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('num-error').textContent = '';
    document.getElementById('amount-error').textContent = '';
}

// Balance update
async function updateBalanceDisplay() {
    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.log("No access token found");
            return;
        }

        const response = await fetch('/mpesa/balance', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch balance');
        }

        const data = await response.json();
        
        // Update balance display with animation
        const balanceElement = document.getElementById('balance-amount');
        const currentBalance = parseFloat(balanceElement.textContent);
        const newBalance = data.balance;
        
        // Animate balance update
        animateBalance(currentBalance, newBalance);

        // Update transaction history
        updateTransactionHistory(data.transactions);
    } catch (error) {
        console.error("Error fetching balance:", error);
    }
}

// Update transaction history display
function updateTransactionHistory(transactions) {
    const transactionList = document.getElementById('transaction-list');
    transactionList.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        transactionList.innerHTML = '<div class="transaction-item">No transactions found</div>';
        return;
    }

    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    transactions.forEach(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        const formattedDate = transactionDate.toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        transactionElement.innerHTML = `
            <div class="transaction-info">
                <div>
                    <span class="transaction-type">${transaction.type.toUpperCase()}</span>
                    <span class="transaction-status status-${transaction.status}">${transaction.status}</span>
                </div>
                <div class="transaction-date">${formattedDate}</div>
                ${transaction.reference ? `<div class="transaction-reference">Ref: ${transaction.reference}</div>` : ''}
            </div>
            <div class="transaction-amount">KES ${transaction.amount.toFixed(2)}</div>
        `;
        transactionList.appendChild(transactionElement);
    });
}

// Animate balance change
function animateBalance(start, end) {
    const balanceElement = document.getElementById('balance-amount');
    const duration = 1000; // 1 second animation
    const startTime = performance.now();
    
    // Animate the number counting up
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easeOutQuad for smooth animation
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        
        const currentValue = start + (end - start) * easeProgress;
        balanceElement.textContent = currentValue.toFixed(2);
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            // Ensure exact end value is displayed
            balanceElement.textContent = end.toFixed(2);
            
            // Flash animation for balance change
            balanceElement.classList.add('balance-updated');
            setTimeout(() => {
                balanceElement.classList.remove('balance-updated');
            }, 1000);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add balance update animation class
    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        @keyframes balanceFlash {
            0%, 100% { color: white; }
            50% { color: #F97316; }
        }
    `, styleSheet.cssRules.length);
    
    styleSheet.insertRule(`
        .balance-updated {
            animation: balanceFlash 1s ease-in-out;
        }
    `, styleSheet.cssRules.length);
    
    // Update balance on page load
    updateBalanceDisplay();
    
    // Add input validation listeners
    document.getElementById('number').addEventListener('input', validateNumber);
    document.getElementById('amount').addEventListener('input', validateAmount);
    
    // Add form submission listener
    document.getElementById('payment-form').addEventListener('submit', initiateMpesaPayment);
});