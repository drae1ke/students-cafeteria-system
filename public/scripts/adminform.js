function switchForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (formType === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

// Login Form Validation
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let isValid = true;
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Email validation
    if (!validateEmail(email)) {
        document.getElementById('loginEmailError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('loginEmailError').style.display = 'none';
    }
    
    // Password validation
    if (password.trim() === '') {
        document.getElementById('loginPasswordError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('loginPasswordError').style.display = 'none';
    }
    
    if (isValid) {
        // Submit form (replace with actual login logic)
        alert('Login successful!');
        this.reset();
    }
});

// Signup Form Validation
document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let isValid = true;
    
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Email validation
    if (!validateEmail(email)) {
        document.getElementById('signupEmailError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('signupEmailError').style.display = 'none';
    }
    
    // Password validation
    if (password.length < 8) {
        document.getElementById('signupPasswordError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('signupPasswordError').style.display = 'none';
    }
    
    // Confirm password validation
    if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').style.display = 'block';
        isValid = false;
    } else {
        document.getElementById('confirmPasswordError').style.display = 'none';
    }
    
    if (isValid) {
        // Submit form (replace with actual signup logic)
        alert('Signup successful!');
        this.reset();
    }
});

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}