"use strict";

// Load orders from the server
const loadOrders = async () => {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/adminform';
            return;
        }

        console.log('Fetching all orders with token:', token);
        // Changed path to match the API route structure
        const response = await fetch('/api/orders', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to fetch orders. Status:', response.status);
            try {
                const errorData = await response.json();
                console.error('Error details:', errorData);
                throw new Error(errorData.message || 'Failed to fetch orders');
            } catch (e) {
                const text = await response.text();
                console.error('Raw error response:', text);
                throw new Error(text || 'Failed to fetch orders');
            }
        }

        const orders = await response.json();
        const tbody = document.querySelector('#orders-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            return;
        }
        
        orders.forEach(order => {
            // Format date properly
            const orderDate = new Date(order.orderDate || order.createdAt);
            const formattedDate = orderDate.toLocaleString();
            
            // Extract username from the populated user data
            const username = order.userId?.username || order.user?.username || 'Guest';
            
            // Format order items for display
            const orderItems = order.items.map(item => `${item.name} (${item.quantity})`).join(', ');
            
            // Generate a shortened order ID for display
            const displayOrderId = order.orderNumber || order._id.substring(0, 8);
            
            const row = `
                <tr data-id="${order._id}">
                    <td>${displayOrderId}</td>
                    <td>${username}</td>
                    <td>${orderItems}</td>
                    <td>Ksh ${order.totalAmount.toFixed(2)}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>
                    </td>
                    <td>
                        <button onclick="viewOrderDetails('${order._id}')" class="view-btn">View</button>
                        <button onclick="updateOrderStatus('${order._id}')" class="edit-btn">Update</button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        // Use the existing showNotification function from dashboard.js
        showNotification('Failed to load orders. Please try again.', 'error');
    }
};

// View order details
const viewOrderDetails = async (orderId) => {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/adminform';
            return;
        }

        const response = await fetch(`/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch order details');
        }

        const order = await response.json();
        
        // Populate the modal with order details
        document.getElementById('orderDetailId').textContent = order.orderNumber || order._id;
        
        // Handle user information based on the response structure
        const customerName = order.userId?.username || order.user?.username || 'Guest';
        const customerEmail = order.userId?.email || order.user?.email || '';
        const customerDisplay = customerEmail ? `${customerName} (${customerEmail})` : customerName;
        document.getElementById('orderDetailCustomer').textContent = customerDisplay;
        
        // Display date
        const orderDate = new Date(order.orderDate || order.createdAt);
        document.getElementById('orderDetailDate').textContent = orderDate.toLocaleString();
        document.getElementById('orderDetailStatus').textContent = order.status;
        document.getElementById('orderDetailTotal').textContent = `Ksh ${order.totalAmount.toFixed(2)}`;
        
        // Populate items table
        const itemsTable = document.getElementById('orderItemsTable');
        const itemsBody = itemsTable.querySelector('tbody');
        itemsBody.innerHTML = '';
        
        order.items.forEach(item => {
            const itemRow = `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>Ksh ${item.price.toFixed(2)}</td>
                    <td>Ksh ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `;
            itemsBody.insertAdjacentHTML('beforeend', itemRow);
        });
        
        // Display additional information if available
        if (order.deliveryAddress) {
            document.getElementById('orderDeliveryAddress').textContent = order.deliveryAddress;
            document.getElementById('deliveryAddressSection').style.display = 'block';
        } else {
            document.getElementById('deliveryAddressSection').style.display = 'none';
        }
        
        if (order.note) {
            document.getElementById('orderNote').textContent = order.note;
            document.getElementById('orderNoteSection').style.display = 'block';
        } else {
            document.getElementById('orderNoteSection').style.display = 'none';
        }
        
        // Show the modal
        const modal = document.getElementById('orderDetailModal');
        modal.style.display = 'block';
        
        // Set up close button
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close modal when clicking outside of it
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    } catch (error) {
        console.error('Error fetching order details:', error);
        showNotification('Failed to load order details', 'error');
    }
};

// Update order status
const updateOrderStatus = async (orderId) => {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/adminform';
            return;
        }

        // Get the current order details to display in the modal
        const response = await fetch(`/api/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch order');
        }

        const order = await response.json();
        
        // Populate and show the status update modal
        document.getElementById('updateOrderId').value = orderId;
        document.getElementById('currentOrderStatus').textContent = order.status;
        
        // Set the current status in the dropdown
        const statusSelect = document.getElementById('newOrderStatus');
        for (let i = 0; i < statusSelect.options.length; i++) {
            if (statusSelect.options[i].value === order.status) {
                statusSelect.selectedIndex = i;
                break;
            }
        }
        
        // Show the modal
        const modal = document.getElementById('updateStatusModal');
        modal.style.display = 'block';
        
        // Set up close button
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close modal when clicking outside of it
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        // Set up form submission
        const form = document.getElementById('updateStatusForm');
        form.onsubmit = (e) => {
            e.preventDefault();
            submitStatusUpdate();
        };
        
    } catch (error) {
        console.error('Error preparing status update:', error);
        showNotification('Failed to prepare status update', 'error');
    }
};

// Submit the status update
const submitStatusUpdate = async () => {
    try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/adminform';
            return;
        }
        
        const orderId = document.getElementById('updateOrderId').value;
        const newStatus = document.getElementById('newOrderStatus').value;
        
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update order status');
        }
        
        // Close the modal
        document.getElementById('updateStatusModal').style.display = 'none';
        
        // Show success notification
        showNotification('Order status updated successfully', 'success');
        
        // Reload orders to reflect the change
        loadOrders();
        
    } catch (error) {
        console.error('Error updating order status:', error);
        showNotification('Failed to update order status', 'error');
    }
};

// Search functionality
const setupOrderSearch = () => {
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('#orders-table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
};

// Filter orders by status
const setupStatusFilter = () => {
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            const selectedStatus = statusFilter.value.toLowerCase();
            const rows = document.querySelectorAll('#orders-table tbody tr');
            
            rows.forEach(row => {
                if (selectedStatus === 'all') {
                    row.style.display = '';
                } else {
                    const statusCell = row.querySelector('td:nth-child(6)');
                    const status = statusCell.textContent.toLowerCase();
                    row.style.display = status === selectedStatus ? '' : 'none';
                }
            });
        });
    }
};

// Filter orders by date range
const setupDateFilter = () => {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const applyDateFilter = document.getElementById('applyDateFilter');
    
    if (applyDateFilter) {
        applyDateFilter.addEventListener('click', () => {
            const start = startDate.value ? new Date(startDate.value) : null;
            const end = endDate.value ? new Date(endDate.value) : null;
            
            if (!start && !end) return;
            
            const rows = document.querySelectorAll('#orders-table tbody tr');
            
            rows.forEach(row => {
                const dateCell = row.querySelector('td:nth-child(5)').textContent;
                const orderDate = new Date(dateCell);
                
                let showRow = true;
                
                if (start && orderDate < start) showRow = false;
                if (end) {
                    // Add 1 day to end date to include orders on that day
                    const endPlusDay = new Date(end);
                    endPlusDay.setDate(endPlusDay.getDate() + 1);
                    if (orderDate > endPlusDay) showRow = false;
                }
                
                row.style.display = showRow ? '' : 'none';
            });
        });
    }
    
    // Reset filters
    const resetFilters = document.getElementById('resetFilters');
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            if (startDate) startDate.value = '';
            if (endDate) endDate.value = '';
            if (statusFilter) statusFilter.value = 'all';
            
            const rows = document.querySelectorAll('#orders-table tbody tr');
            rows.forEach(row => {
                row.style.display = '';
            });
        });
    }
};

// Initialize orders section when the dashboard is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add Orders section to the showSection function if not already defined
    if (typeof showSection === 'function') {
        // The original showSection function is already defined in dashboard.js
        // We'll hook into the existing function by adding a click event listener
        const ordersLink = document.querySelector('a[onclick*="showSection(\'orders\')"]');
        if (ordersLink) {
            ordersLink.addEventListener('click', () => {
                // This will run after the original showSection function
                setTimeout(() => {
                    loadOrders();
                    setupOrderSearch();
                    setupStatusFilter();
                    setupDateFilter();
                }, 100);
            });
        }
    }
});