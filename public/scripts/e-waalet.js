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

    if (isNaN(cashAmount) || cashAmount < 1) {
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

async function initiateMpesaPayment() {
    const number = document.getElementById('number').value;
    const amount = document.getElementById('amount').value;
    const submitError = document.getElementById('submit-error');

    if (!validateNumber() || !validateAmount()) {
        submitError.textContent = "Please correct the errors above.";
        return;
    }

    try {
        const response = await fetch('http://localhost:3500/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: number, amount: amount })
        });

        const data = await response.json();

        if (response.ok) {
            alert("STK Push sent. Please enter your M-Pesa PIN to complete the transaction.");
            console.log(data); // Log response for debugging
        } else {
            submitError.textContent = `Error: ${data.message || "Something went wrong"}`;
        }
    } catch (error) {
        console.error("Error:", error);
        submitError.textContent = "Failed to connect to the server.";
    }
}

// Event listener for deposit button
document.querySelector('.submit-btn').addEventListener('click', (e) => {
    e.preventDefault();
    initiateMpesaPayment();
});

// Function to fetch and update balance
async function updateBalanceDisplay() {
    try {
        const response = await fetch('http://localhost:3500/user/balance'); // Ensure this endpoint exists
        const data = await response.json();

        if (response.ok) {
            document.getElementById('balance-amount').textContent = data.balance.toFixed(2);
        }
    } catch (error) {
        console.error("Error fetching balance:", error);
    }
}

// Fetch balance on page load
document.addEventListener('DOMContentLoaded', updateBalanceDisplay);

function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}
