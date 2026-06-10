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

async function refreshAccessToken() {
    const response = await fetch('/refresh', {
        method: 'GET',
        credentials: 'include'
    });

    if (!response.ok) {
        localStorage.removeItem('accessToken');
        window.location.href = '/signin';
        throw new Error('Session expired. Please sign in again.');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
}

async function getAccessToken() {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) return accessToken;
    return refreshAccessToken();
}

async function authenticatedFetch(url, options = {}) {
    let accessToken = await getAccessToken();
    const requestOptions = {
        ...options,
        headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${accessToken}`
        }
    };

    let response = await fetch(url, requestOptions);
    if (response.status !== 401) return response;

    accessToken = await refreshAccessToken();
    return fetch(url, {
        ...requestOptions,
        headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${accessToken}`
        }
    });
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
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";
        submitError.textContent = "";

        // Make API request to initiate STK Push
        const response = await authenticatedFetch('/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
            
            // Make API request to check transaction status
            const response = await authenticatedFetch(`/mpesa/transaction/${reference}`, {
                method: 'GET'
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
            else if (['failed', 'insufficient_funds', 'wrong_pin', 'cancelled', 'timeout', 'rejected'].includes(data.status)) {
                console.log('Transaction failed');
                const submitError = document.getElementById('submit-error');
                submitError.textContent = data.failureReason || `Transaction ${data.status}. Please try again.`;
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
        const response = await authenticatedFetch('/mpesa/balance', {
            method: 'GET'
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
        const receiptReference = transaction.mpesaReceiptNumber || transaction.reference;
        transactionElement.innerHTML = `
            <div class="transaction-info">
                <div>
                    <span class="transaction-type">${transaction.type.toUpperCase()}</span>
                    <span class="transaction-status status-${transaction.status}">${transaction.status}</span>
                </div>
                <div class="transaction-date">${formattedDate}</div>
                ${transaction.reference ? `<div class="transaction-reference">Ref: ${transaction.reference}</div>` : ''}
                ${transaction.type === 'deposit' && transaction.status === 'completed' && receiptReference ? `<button class="receipt-btn" data-reference="${receiptReference}">Receipt</button>` : ''}
            </div>
            <div class="transaction-amount">KES ${transaction.amount.toFixed(2)}</div>
        `;
        transactionList.appendChild(transactionElement);
    });
}

async function openWalletReceipt(reference) {
    try {
        const response = await authenticatedFetch(`/mpesa/receipt/${encodeURIComponent(reference)}`, {
            method: 'GET'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch receipt');
        }

        const receipt = await response.json();
        openWalletReceiptWindow(receipt);
    } catch (error) {
        console.error('Error opening receipt:', error);
        alert(error.message || 'Failed to open receipt');
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openWalletReceiptWindow(receipt) {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
        alert('Please allow popups to view the receipt.');
        return;
    }

    receiptWindow.document.write(`
        <!doctype html>
        <html>
        <head>
            <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
                .row { display: flex; justify-content: space-between; max-width: 420px; padding: 6px 0; border-bottom: 1px solid #eee; }
                .print { margin-top: 24px; padding: 10px 14px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>Wallet Deposit Receipt</h1>
            <p><strong>Receipt:</strong> ${escapeHtml(receipt.receiptNumber)}</p>
            <p><strong>Student:</strong> ${escapeHtml(receipt.customer.username)} (${escapeHtml(receipt.customer.regno)})</p>
            <div class="row"><span>Amount</span><strong>KES ${Number(receipt.transaction.amount).toFixed(2)}</strong></div>
            <div class="row"><span>Status</span><strong>${escapeHtml(receipt.transaction.status)}</strong></div>
            <div class="row"><span>M-Pesa receipt</span><strong>${escapeHtml(receipt.transaction.mpesaReceiptNumber || '')}</strong></div>
            <div class="row"><span>Balance before</span><strong>KES ${Number(receipt.wallet.balanceBefore).toFixed(2)}</strong></div>
            <div class="row"><span>Balance after</span><strong>KES ${Number(receipt.wallet.balanceAfter).toFixed(2)}</strong></div>
            <p><strong>Paid at:</strong> ${new Date(receipt.transaction.paidAt).toLocaleString()}</p>
            <button class="print" onclick="window.print()">Print</button>
        </body>
        </html>
    `);
    receiptWindow.document.close();
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

    const transactionList = document.getElementById('transaction-list');
    transactionList.addEventListener('click', (event) => {
        if (event.target.classList.contains('receipt-btn')) {
            openWalletReceipt(event.target.dataset.reference);
        }
    });
});
