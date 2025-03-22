

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

function validatePassword(password) {
  return password.length >= 8;
}

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

// Handle form submission
document.getElementById('reset-password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  showLoading(true);
  
  const password = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-new-password').value;
  
  // Extract token from the URL path
  const pathSegments = window.location.pathname.split('/');
  const token = pathSegments[pathSegments.length - 1];
  
  // Validate password
  if (!validatePassword(password)) {
    showLoading(false);
    return showError('new-password', 'Password must be at least 8 characters');
  }
  
  // Check if passwords match
  if (password !== confirmPassword) {
    showLoading(false);
    return showError('confirm-new-password', 'Passwords do not match');
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
      alert('Password reset successfully! You can now log in with your new password.');
      window.location.href = '/signin';
    } else {
      showError('new-password', data.message || 'Failed to reset password');
    }
  } catch (error) {
    showLoading(false);
    console.error('Error resetting password:', error);
    showError('new-password', 'An error occurred. Please try again.');
  }
});

// Input validation
document.getElementById('new-password').addEventListener('input', (e) => {
  showError('new-password', validatePassword(e.target.value) ? '' : 'Minimum 8 characters required');
});

document.getElementById('confirm-new-password').addEventListener('input', (e) => {
  const pwd = document.getElementById('new-password').value;
  showError('confirm-new-password', e.target.value === pwd ? '' : 'Passwords do not match');
});

function hideError() {
  const alert = document.querySelector('.alert-danger');
  if (alert) {
    alert.style.display = 'none';
  }
}
