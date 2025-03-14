function switchForm(formType) {
    document.getElementById('loginForm').classList.toggle('hidden', formType !== 'login');
    document.getElementById('signupForm').classList.toggle('hidden', formType === 'login');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const errorDisplay = document.getElementById('loginGeneralError');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');

    // Clear previous errors
    errorDisplay.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';
    try {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        const { token } = await response.json();
        localStorage.setItem('adminToken', token);
        window.location.href = '/dashboard';
    } catch (error) {
        document.getElementById('loginGeneralError').textContent = error.message;
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDisplay = document.getElementById('loginGeneralError');
    const emailError = document.getElementById('loginEmailError');
    const passwordError = document.getElementById('loginPasswordError');

    // Clear previous errors
    errorDisplay.textContent = '';
    emailError.textContent = '';
    passwordError.textContent = '';
    try {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const response = await fetch('/admin/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        alert('Registration successful! Please login.');
        switchForm('login');
    } catch (error) {
        document.getElementById('confirmPasswordError').textContent = error.message;
    }
});