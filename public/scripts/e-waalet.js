// Updated JavaScript code
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

function addFunds() {
    const amountInput = document.getElementById('amount');
    const submitError = document.getElementById('submit-error');
    const cashAmount = Number(amountInput.value);
    const currentBalance = Number(localStorage.getItem('balance')) || 0;

    const newBalance = currentBalance + cashAmount;
    localStorage.setItem('balance', newBalance.toString());
    updateBalanceDisplay();
    resetFields();
    submitError.textContent = "";
}

function updateBalanceDisplay() {
    const balanceDisplay = document.getElementById('balance-amount');
    const currentBalance = Number(localStorage.getItem('balance')) || 0;
    balanceDisplay.textContent = currentBalance.toFixed(2);
}

// Initialize balance display on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('balance')) {
        localStorage.setItem('balance', '0');
    }
    updateBalanceDisplay();
});

// Updated event listener for deposit button
const submitBtn = document.querySelector('.submit-btn');
 submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isNumberValid = validateNumber();
    const isAmountValid = validateAmount();

    if (isNumberValid && isAmountValid) {
        addFunds();
        alert("Deposit initiated. Please input your M-Pesa PIN.");
    } else {
        document.getElementById('submit-error').textContent = "Please correct the errors above.";
    }
});

function toggleMenu (){
    const navMenu = document.getElementById('nav-menu')

    navMenu.classList.toggle('active')
}