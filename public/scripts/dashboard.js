"use strict";

// --------- User Management Functions ---------
const loadUsers = () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/adminform';
        return;
    }

    fetch('/users', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    })
    .then(users => {
        const tbody = document.querySelector('#users-table tbody');
        if (!tbody) {
            console.error('Users table not found in the DOM');
            return;
        }
        
        tbody.innerHTML = ''; // Clear existing rows
        
        users.forEach(user => {
            const roleNames = [];
            if (user.roles.User) roleNames.push('User');
            if (user.roles.Editor) roleNames.push('Editor');
            if (user.roles.Admin) roleNames.push('Admin');
            
            const row = `
                <tr data-id="${user._id}">
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.regno}</td>
                    <td>${roleNames.join(', ')}</td>
                    <td class="user-actions">
                        <button class="edit-btn" onclick="editUser('${user._id}')" style="background-color: #2196F3; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all 0.3s; margin-right: 8px;">Edit</button>
                        <button class="delete-btn" onclick="deleteUser('${user._id}')" style="background-color: #F44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all 0.3s;">Delete</button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Update the total users count
        document.getElementById('total-users').textContent = users.length;
    })
    .catch(error => {
        console.error('Error loading users:', error);
        if (error.message === 'Failed to fetch users') {
            localStorage.removeItem('adminToken');
            window.location.href = '/adminform';
        }
        alert('Failed to load users. Please try again.');
    });
};

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
 */
function editUser(userId) {
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
    
    // Scroll to the modal
    modal.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Deletes a user after confirmation
 */
function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/adminform';
        return;
    }
    
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
            const row = document.querySelector(`tr[data-id="${userId}"]`);
            if (row) row.remove();
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
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                window.location.href = '/adminform';
                return;
            }
            
            fetch(`/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, email, regno, roles })
            })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('Failed to update user');
            })
            .then(data => {
                updateUserRow(userId, { username, email, regno, roles });
                document.getElementById('userEditModal').style.display = 'none';
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
 */
function updateUserRow(userId, userData) {
    const row = document.querySelector(`tr[data-id="${userId}"]`);
    if (!row) return;
    
    const cells = row.querySelectorAll('td');
    cells[0].textContent = userData.username;
    cells[1].textContent = userData.email;
    cells[2].textContent = userData.regno;
    
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
    
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modals.forEach(modal => modal.style.display = 'none');
        });
    });
    
    window.addEventListener('click', (event) => {
        modals.forEach(modal => {
            if (event.target === modal) modal.style.display = 'none';
        });
    });
};

/**
 * Display the selected section and hide others
 */
const showSection = (section) => {
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.sidebar nav a[onclick="showSection('${section}')"]`).classList.add('active');
    
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    document.getElementById(`${section}-section`).style.display = 'block';
};

// Initialize all functions when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupUserSearch();
    setupEditUserForm();
    setupModalClose();
    
    // Set up logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('adminToken');
            window.location.href = '/adminform';
        });
    }
    
    showSection('users');
    loadUsers(); 
});
