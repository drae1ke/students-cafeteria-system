"use strict";

// Load menu items from the server
const loadMenuItems = async () => {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/adminform';
            return;
        }

        const response = await fetch('/api/menu', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error('Server response:', text);
            throw new Error('Failed to fetch menu items');
        }

        const items = await response.json();
        const tbody = document.querySelector('#menu-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!items || items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No menu items found</td></tr>';
            return;
        }
        
        items.forEach(item => {
            const row = `
                <tr data-id="${item._id}">
                    <td><img src="${item.image}" alt="${item.name}" class="menu-thumb" style="max-width: 50px;"></td>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>Ksh ${item.price}</td>
                    <td>${item.availability ? 'Available' : 'Not Available'}</td>
                    <td>
                        <button onclick="editMenuItem('${item._id}')" class="edit-btn">Edit</button>
                        <button onclick="deleteMenuItem('${item._id}')" class="delete-btn">Delete</button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error loading menu items:', error);
        showNotification('Failed to load menu items. Please try again.', 'error');
    }
};

// Delete menu item
const deleteMenuItem = async (itemId) => {
    try {
        if (!confirm('Are you sure you want to delete this menu item?')) return;

        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/adminform';
            return;
        }

        console.log('Attempting to delete item:', itemId); // Debug log

        const response = await fetch(`/api/menu/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error(errorData.message || 'Failed to delete item');
        }
        
        // Remove the row from the table
        const row = document.querySelector(`tr[data-id="${itemId}"]`);
        if (row) {
            row.remove();
            showNotification('Menu item deleted successfully', 'success');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showNotification(error.message || 'Failed to delete menu item', 'error');
    }
};

// Edit menu item
const editMenuItem = (itemId) => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/adminform';
        return;
    }

    window.location.href = `/add?edit=${itemId}`;
};

// Search functionality
const setupMenuSearch = () => {
    const searchInput = document.getElementById('menuSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#menu-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
};

// Show notification
const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    
    const container = document.querySelector('.main-content');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => notification.remove(), 3000);
};

// Initialize menu management when the menu section is shown
document.addEventListener('DOMContentLoaded', () => {
    const menuLink = document.querySelector('a[onclick="showSection(\'menu\')"]');
    if (menuLink) {
        menuLink.addEventListener('click', () => {
            loadMenuItems();
            setupMenuSearch();
        });
    }
});
