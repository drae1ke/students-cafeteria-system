function switchForm(formType) {
    document.getElementById('loginForm').classList.toggle('hidden', formType !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', formType === 'login');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loginButton = document.querySelector('#loginForm button[type="submit"]');
    const errorDisplay = document.getElementById('loginGeneralError');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');
    
    // Clear previous errors
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';
    emailError.textContent = '';
    emailError.style.display = 'none';
    passwordError.textContent = '';
    passwordError.style.display = 'none';
    
    // Add loading state
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner"></span> Logging in...';
    
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Basic validation
        if (!email) {
            emailError.textContent = 'Email is required';
            emailError.style.display = 'block';
            throw new Error('Validation failed');
        }
        
        if (!password) {
            passwordError.textContent = 'Password is required';
            passwordError.style.display = 'block';
            throw new Error('Validation failed');
        }
        
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.field === 'email') {
                emailError.textContent = data.message;
                emailError.style.display = 'block';
            } else if (data.field === 'password') {
                passwordError.textContent = data.message;
                passwordError.style.display = 'block';
            } else {
                errorDisplay.textContent = data.message || 'Authentication failed';
                errorDisplay.style.display = 'block';
            }
            throw new Error('API error');
        }
        
        const { token } = data;
        localStorage.setItem('adminToken', token);
        window.location.href = '/dashboard';
    } catch (error) {
        if (error.message !== 'Validation failed' && error.message !== 'API error') {
            errorDisplay.textContent = 'Connection error. Please try again.';
            errorDisplay.style.display = 'block';
        }
    } finally {
        // Reset button state
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const signupButton = document.querySelector('#signupForm button[type="submit"]');
    const errorDisplay = document.getElementById('signupGeneralError');
    const emailError = document.getElementById('signupEmailError');
    const passwordError = document.getElementById('signupPasswordError');
    const confirmError = document.getElementById('confirmPasswordError');
    
    // Clear previous errors
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';
    emailError.textContent = '';
    emailError.style.display = 'none';
    passwordError.textContent = '';
    passwordError.style.display = 'none';
    confirmError.textContent = '';
    confirmError.style.display = 'none';
    
    // Add loading state
    signupButton.disabled = true;
    signupButton.innerHTML = '<span class="spinner"></span> Signing up...';
    
    try {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Basic validation
        if (!email) {
            emailError.textContent = 'Email is required';
            emailError.style.display = 'block';
            throw new Error('Validation failed');
        }
        
        if (!password) {
            passwordError.textContent = 'Password is required';
            passwordError.style.display = 'block';
            throw new Error('Validation failed');
        }
        
        if (password !== confirmPassword) {
            confirmError.textContent = 'Passwords do not match';
            confirmError.style.display = 'block';
            throw new Error('Validation failed');
        }
        
        const response = await fetch('/admin/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.field === 'email') {
                emailError.textContent = data.message;
                emailError.style.display = 'block';
            } else if (data.field === 'password') {
                passwordError.textContent = data.message;
                passwordError.style.display = 'block';
            } else {
                errorDisplay.textContent = data.message || 'Registration failed';
                errorDisplay.style.display = 'block';
            }
            throw new Error('API error');
        }
        
        alert('Registration successful! Please login.');
        switchForm('login');
    } catch (error) {
        if (error.message !== 'Validation failed' && error.message !== 'API error') {
            errorDisplay.textContent = 'Connection error. Please try again.';
            errorDisplay.style.display = 'block';
        }
    } finally {
        // Reset button state
        signupButton.disabled = false;
        signupButton.textContent = 'Sign Up';
    }
});