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

    if (!validateNumber() || !validateAmount()) {
        submitError.textContent = "Please correct the errors above.";
        return;
    }

    try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            window.location.href = '/signin';
            return;
        }

        /*const response = await fetch('http://localhost:3500/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ phone: number, amount: amount })
        });
        */

        const data = await response.json();

        if (response.ok) {
            alert("STK Push sent. Please enter your M-Pesa PIN to complete the transaction.");
            console.log(data);
        } else {
            submitError.textContent = `Error: ${data.message || "Something went wrong"}`;
        }
    } catch (error) {
        console.error("Error:", error);
        submitError.textContent = "Failed to connect to the server.";
    }
}

// Balance update
async function updateBalanceDisplay() {
    try {
        const response = await fetch('http://localhost:3500/user/balance');
        const data = await response.json();

        if (response.ok) {
            document.getElementById('balance-amount').textContent = data.balance.toFixed(2);
        }
    } catch (error) {
        console.error("Error fetching balance:", error);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    
    // Add input validation listeners
    document.getElementById('number').addEventListener('input', validateNumber);
    document.getElementById('amount').addEventListener('input', validateAmount);
    
    // Add form submission listener
    document.getElementById('payment-form').addEventListener('submit', initiateMpesaPayment);
});

