"use strict";

// --------- User Management Functions ---------

/**
 * Search functionality for the users table
 */
const setupUserSearch = () => {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#users-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
};

/**
 * Opens the edit user modal and populates it with the selected user's data
 * @param {string} userId - The ID of the user to edit
 */
function editUser(userId) {
    // Get the user data from the table row
    const row = document.querySelector(`tr[data-id="${userId}"]`);
    if (!row) return;
    
    const cells = row.querySelectorAll('td');
    const username = cells[0].textContent;
    const email = cells[1].textContent;
    const regno = cells[2].textContent;
    const roles = cells[3].textContent.split(', ');
    
    // Populate the edit form
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUsername').value = username;
    document.getElementById('editEmail').value = email;
    document.getElementById('editRegno').value = regno;
    
    // Set role checkboxes
    document.getElementById('roleUser').checked = roles.includes('User');
    document.getElementById('roleEditor').checked = roles.includes('Editor');
    document.getElementById('roleAdmin').checked = roles.includes('Admin');
    
    // Show the modal
    const modal = document.getElementById('userEditModal');
    modal.style.display = 'flex';
}

/**
 * Deletes a user after confirmation
 * @param {string} userId - The ID of the user to delete
 */
function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    // Get the admin token from localStorage
    const token = localStorage.getItem('adminToken');
    if (!token) {
        alert('You must be logged in to perform this action');
        window.location.href = '/adminform';
        return;
    }
    
    // Send delete request
    fetch(`/users`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id: userId })
    })
    .then(response => {
        if (response.ok) {
            // Remove the row from the table
            const row = document.querySelector(`tr[data-id="${userId}"]`);
            if (row) row.remove();
            
            // Show success message
            alert('User deleted successfully');
        } else {
            throw new Error('Failed to delete user');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to delete user. Please try again.');
    });
}

/**
 * Set up the edit user form submission
 */
const setupEditUserForm = () => {
    const form = document.getElementById('editUserForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const userId = document.getElementById('editUserId').value;
            const username = document.getElementById('editUsername').value;
            const email = document.getElementById('editEmail').value;
            const regno = document.getElementById('editRegno').value;
            
            // Prepare roles object
            const roles = {};
            if (document.getElementById('roleUser').checked) roles.User = 2001;
            if (document.getElementById('roleEditor').checked) roles.Editor = 1984;
            if (document.getElementById('roleAdmin').checked) roles.Admin = 5150;
            
            // Get the admin token from localStorage
            const token = localStorage.getItem('adminToken');
            if (!token) {
                alert('You must be logged in to perform this action');
                window.location.href = '/adminform';
                return;
            }
            
            // Send update request (this endpoint would need to be created)
            fetch(`/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, email, regno, roles })
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to update user');
            })
            .then(data => {
                // Update the row in the table
                updateUserRow(userId, { username, email, regno, roles });
                
                // Close the modal
                document.getElementById('userEditModal').style.display = 'none';
                
                // Show success message
                alert('User updated successfully');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to update user. Please try again.');
            });
        });
    }
};

/**
 * Updates a user row in the table with new data
 * @param {string} userId - The ID of the user to update
 * @param {Object} userData - The updated user data
 */
function updateUserRow(userId, userData) {
    const row = document.querySelector(`tr[data-id="${userId}"]`);
    if (!row) return;
    
    const cells = row.querySelectorAll('td');
    cells[0].textContent = userData.username;
    cells[1].textContent = userData.email;
    cells[2].textContent = userData.regno;
    
    // Update roles display
    const roleNames = [];
    if (userData.roles.User) roleNames.push('User');
    if (userData.roles.Editor) roleNames.push('Editor');
    if (userData.roles.Admin) roleNames.push('Admin');
    cells[3].textContent = roleNames.join(', ');
}

/**
 * Set up modal close functionality
 */
const setupModalClose = () => {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close, .cancel-btn');
    
    // Close when clicking the close button
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Close when clicking outside the modal
    window.addEventListener('click', (event) => {
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
};

/**
 * Verify the admin token on page load and redirect if invalid
 */
const checkAdminAuth = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/adminform';
        return;
    }
    
    // Optional: Verify token is valid
    fetch('/admin/verify-token', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
    })
    .catch(() => {
        // Token invalid, redirect to login
        localStorage.removeItem('adminToken');
        window.location.href = '/adminform';
    });
};

/**
 * Display the selected section and hide others
 * @param {string} section - The section to display
 */
const showSection = (section) => {
    // Update active link
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.sidebar nav a[onclick="showSection('${section}')"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(`${section}-section`).style.display = 'block';
};

/**
 * Set up logout functionality
 */
const setupLogout = () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('adminToken');
            window.location.href = '/adminform';
        });
    }
};

// Initialize all functions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
    setupUserSearch();
    setupEditUserForm();
    setupModalClose();
    setupLogout();
    
    // Show users section by default
    showSection('users');

    // Bring existing functionality from dashboard.js if needed
    // initDashboard();
});
