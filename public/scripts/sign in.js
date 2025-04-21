// Utility Functions
function showLoading(show) {
  document.querySelector('.loading-overlay').style.display = show ? 'flex' : 'none';
}

function showError(fieldId, message) {
  const errorElement = document.getElementById(`${fieldId}-error`);
  const inputField = document.getElementById(fieldId);
  
  errorElement.textContent = message;
  errorElement.style.display = message ? 'block' : 'none';
  inputField.style.borderColor = message ? '#dc3545' : '#ddd';
}

// Form Validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

function validatePassword(password) {
  return password.length >= 8;
}

// Password Visibility Toggle
function togglePassword(fieldId) {
  const passwordField = document.getElementById(fieldId);
  const toggleIcon = passwordField.parentNode.querySelector('.toggle-password');
  
  if (passwordField.type === 'password') {
    passwordField.type = 'text';
    toggleIcon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    passwordField.type = 'password';
    toggleIcon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

// Form Switching
function switchForm(formType) {
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.remove('active');
  });
  
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  if (formType !== 'forgot' && formType !== 'reset') {
    const tabSelector = document.querySelector(`.auth-tab[onclick*="${formType}"]`);
    if (tabSelector) {
      tabSelector.classList.add('active');
    }
  }
  
  const targetForm = document.getElementById(`${formType}-form`);
  if (targetForm) targetForm.classList.add('active');
}

// Forgot Password Handler
async function handleForgotPassword(event) {
  event.preventDefault();
  showLoading(true);
  
  const email = document.getElementById('forgot-email').value;

  if (!validateEmail(email)) {
    showLoading(false);
    return showError('forgot-email', 'Please enter a valid email address');
  }

  try {
    const response = await fetch('/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    showLoading(false);

    if (response.ok) {
      alert('Password reset link sent to your email');
      switchForm('login');
    } else {
      showError('forgot-email', data.message || 'Failed to send reset email');
    }
  } catch (error) {
    showLoading(false);
    console.error('Forgot password error:', error);
    showError('forgot-email', 'An error occurred while processing your request');
  }
}

// Reset Password Handler
async function handleResetPassword(event) {
  event.preventDefault();
  showLoading(true);
  
  const password = document.getElementById('reset-password').value;
  const confirmPassword = document.getElementById('reset-confirm-password').value;
  
  // Extract token from URL path
  const pathSegments = window.location.pathname.split('/');
  const token = pathSegments[pathSegments.length - 1];

  if (!token) {
    showLoading(false);
    return alert('Invalid reset token');
  }

  if (!validatePassword(password)) {
    showLoading(false);
    return showError('reset-password', 'Minimum 8 characters required');
  }

  if (password !== confirmPassword) {
    showLoading(false);
    return showError('reset-confirm-password', 'Passwords do not match');
  }

  try {
    const response = await fetch(`/reset-password/${token}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();
    showLoading(false);

    if (response.ok) {
      alert('Password reset successfully!');
      window.location.href = '/login';
    } else {
      showError('reset-password', data.message || 'Failed to reset password');
    }
  } catch (error) {
    showLoading(false);
    console.error('Reset password error:', error);
    showError('reset-password', 'An error occurred during password reset');
  }
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Forgot password form
  const forgotForm = document.getElementById('forgot-form');
  if (forgotForm) {
    forgotForm.addEventListener('submit', handleForgotPassword);
  }

  // Reset password form
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', handleResetPassword);
  }

  // Check for reset password path
  if (window.location.pathname.startsWith('/reset-password/')) {
    switchForm('reset');
  }

  // Input validation listeners
  const signupEmail = document.getElementById('signup-email');
  if (signupEmail) {
    signupEmail.addEventListener('input', (e) => {
      showError('signup-email', validateEmail(e.target.value) ? '' : 'Invalid email format');
    });
  }

  const signupPassword = document.getElementById('signup-password');
  if (signupPassword) {
    signupPassword.addEventListener('input', (e) => {
      showError('signup-password', validatePassword(e.target.value) ? '' : 'Minimum 8 characters required');
    });
  }

  const confirmPassword = document.getElementById('confirm-password');
  if (confirmPassword) {
    confirmPassword.addEventListener('input', (e) => {
      const pwd = document.getElementById('signup-password').value;
      showError('confirm-password', e.target.value === pwd ? '' : 'Passwords do not match');
    });
  }
});

function hideError() {
  const alert = document.querySelector('.alert-danger');
  if (alert) {
    alert.style.display = 'none';
  }
}

// Login form handler
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      showLoading(true);
      
      const formData = {
        regno: document.getElementById('login-regno').value,
        pwd: document.getElementById('login-password').value
      };

      try {
        const response = await fetch('/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        showLoading(false);

        if (data.accessToken) {
          // Store the access token
          localStorage.setItem('accessToken', data.accessToken);
          window.location.href = '/e-wallet';
        } else {
          showError('login-regno', 'Login failed');
        }
      } catch (error) {
        showLoading(false);
        console.error('Login error:', error);
        showError('login-regno', 'An error occurred during login');
      }
    });
  }
});