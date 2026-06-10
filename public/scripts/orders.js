import { cartItems } from "./cart.js";

// ==========================================
// Authentication Functions
// ==========================================
async function refreshAccessToken() {
    try {
        const response = await fetch('/refresh', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return data.accessToken;
    } catch (error) {
        console.error('Token refresh failed:', error);
        window.location.href = '/signin';
        throw error;
    }
}

// ==========================================
// Menu Functions
// ==========================================
async function getAllMenuItems() {
    try {
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            accessToken = await refreshAccessToken();
        }

        const response = await fetch('/api/menu', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                accessToken = await refreshAccessToken();
                // Retry with new token
                const retryResponse = await fetch('/api/menu', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!retryResponse.ok) {
                    throw new Error('Failed to fetch menu items after token refresh');
                }
                
                return await retryResponse.json();
            }
            throw new Error('Failed to fetch menu items');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching menu items:', error);
        throw error;
    }
}

// ==========================================
// Order Functions
// ==========================================
async function placeOrder() {
    try {
        // Get access token
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            accessToken = await refreshAccessToken();
        }

        // Get cart items from localStorage
        const currentCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        
        if (currentCartItems.length === 0) {
            alert('Your cart is empty. Please add items before placing an order.');
            return;
        }

        // Get menu items to ensure we have proper name and price info
        const menuItems = await getAllMenuItems();
        
        // Prepare order items with required fields (name, price, quantity)
        const formattedItems = currentCartItems.map(cartItem => {
            const menuItem = menuItems.find(item => item._id === cartItem.id);
            if (!menuItem) {
                throw new Error(`Menu item not found for ID: ${cartItem.id}`);
            }
            
            return {
                menuItemId: menuItem._id,
                quantity: cartItem.quantity
            };
        });

        // Prepare order data. The server validates menu prices and wallet balance.
        const orderData = {
            items: formattedItems,
            orderDate: new Date().toISOString()
        };

        console.log('Sending order data:', JSON.stringify(orderData));

        // Send order to the server
        const response = await fetch('/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Order API error details:', errorData);
            
            if (response.status === 401) {
                // Token expired, refresh and retry
                console.log('Token expired, refreshing...');
                accessToken = await refreshAccessToken();
                
                const retryResponse = await fetch('/orders', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });
                
                if (!retryResponse.ok) {
                    const retryErrorData = await retryResponse.json().catch(() => ({}));
                    console.error('Retry failed details:', retryErrorData);
                    throw new Error(`Failed to place order after token refresh: ${retryResponse.status}`);
                }
                
                const orderResult = await retryResponse.json();
                handleOrderSuccess(orderResult);
                return orderResult;
            }
            
            throw new Error(`Failed to place order: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const orderResult = await response.json();
        console.log('Order result:', orderResult);
        handleOrderSuccess(orderResult);
        return orderResult;
    } catch (error) {
        console.error('Error placing order:', error);
        alert(`Failed to place your order: ${error.message}`);
        throw error;
    }
}

function handleOrderSuccess(orderResult) {
    // Check if we have the expected response format
    if (!orderResult || !orderResult.orderId) {
        console.error('Invalid order result:', orderResult);
        alert('Order was processed but there was an issue with the confirmation. Please check your orders page.');
        window.location.href = '/orders';
        return;
    }
    
    // Clear the cart
    localStorage.setItem('cartItems', JSON.stringify([]));
    
    // Dispatch event to update the cart UI
    window.dispatchEvent(new CustomEvent('cart-updated'));
    
    // Display success message
    alert(`Order paid from your e-wallet. Receipt: ${orderResult.receiptNumber || orderResult.orderId}`);
    
    // Redirect to orders page
    window.location.href = '/orders';
}

async function getOrders() {
    try {
         // Get access token
         let accessToken = localStorage.getItem('accessToken');
         if (!accessToken) {
             accessToken = await refreshAccessToken();
         }
        
        const response = await fetch('/orders', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
      
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, refresh and retry
                accessToken = await refreshAccessToken();
                
                const retryResponse = await fetch('/orders', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!retryResponse.ok) {
                    throw new Error('Failed to fetch orders after token refresh');
                }
                
                return await retryResponse.json();
            }
            throw new Error('Failed to fetch orders');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
}

async function viewOrderReceipt(orderId) {
    try {
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            accessToken = await refreshAccessToken();
        }

        let response = await fetch(`/orders/${orderId}/receipt`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (response.status === 401) {
            accessToken = await refreshAccessToken();
            response = await fetch(`/orders/${orderId}/receipt`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch receipt');
        }

        const receipt = await response.json();
        openReceiptWindow(receipt);
    } catch (error) {
        console.error('Error loading receipt:', error);
        alert(error.message || 'Failed to load receipt');
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function openReceiptWindow(receipt) {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
        alert('Please allow popups to view the receipt.');
        return;
    }

    const itemsHtml = receipt.order.items.map(item => `
        <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>KES ${Number(item.unitPrice).toFixed(2)}</td>
            <td>KES ${Number(item.lineTotal).toFixed(2)}</td>
        </tr>
    `).join('');

    receiptWindow.document.write(`
        <!doctype html>
        <html>
        <head>
            <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
                .totals { margin-top: 16px; max-width: 360px; margin-left: auto; }
                .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
                .total { font-weight: 700; border-top: 1px solid #222; margin-top: 8px; padding-top: 8px; }
                .print { margin-top: 24px; padding: 10px 14px; cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>JKUAT Student's Mess Receipt</h1>
            <p><strong>Receipt:</strong> ${escapeHtml(receipt.receiptNumber)}</p>
            <p><strong>Student:</strong> ${escapeHtml(receipt.customer.username)} (${escapeHtml(receipt.customer.regno)})</p>
            <p><strong>Paid at:</strong> ${new Date(receipt.order.paidAt || receipt.order.orderDate).toLocaleString()}</p>
            <p><strong>Payment ref:</strong> ${escapeHtml(receipt.order.paymentReference)}</p>
            <table>
                <thead>
                    <tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>
            <div class="totals">
                <div><span>Subtotal</span><span>KES ${Number(receipt.order.totals.subtotal).toFixed(2)}</span></div>
                <div><span>Subsidy</span><span>KES ${Number(receipt.order.totals.subsidy).toFixed(2)}</span></div>
                <div class="total"><span>Total paid</span><span>KES ${Number(receipt.order.totals.total).toFixed(2)}</span></div>
            </div>
            <p><strong>Wallet balance after payment:</strong> KES ${Number(receipt.wallet.balanceAfter).toFixed(2)}</p>
            <button class="print" onclick="window.print()">Print</button>
        </body>
        </html>
    `);
    receiptWindow.document.close();
}



// ==========================================
// UI Functions
// ==========================================
async function updatePaymentSummary() {
    try {
        // Get cart items from localStorage
        const currentCartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
        const itemCount = currentCartItems.reduce((sum, item) => sum + item.quantity, 0);
        const subsidyRate = 0.10;

        if (itemCount === 0) {
            const summaryContainer = document.querySelector('.payment-summary');
            if (summaryContainer) {
                summaryContainer.innerHTML = `
                    <div class="payment-summary-row">
                        <div>Cart is empty</div>
                    </div>
                    <button class="place-order-button button-primary" disabled>
                        Cart is Empty
                    </button>`;
            }
            return;
        }

        // Get all menu items
        const menuItems = await getAllMenuItems();

        // Calculate totals using menu items
        const totalBeforeSubsidy = currentCartItems.reduce((sum, cartItem) => {
            const menuItem = menuItems.find(item => item._id === cartItem.id);
            if (!menuItem) return sum; // Skip if item not found
            return sum + (menuItem.price * cartItem.quantity);
        }, 0);

        const subsidy = totalBeforeSubsidy * subsidyRate;
        const orderTotal = totalBeforeSubsidy - subsidy;

        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES',
                minimumFractionDigits: 2
            }).format(amount);
        };

        const paymentSummaryHTML = `
            <div class="payment-summary-row">
                <div>Items (${itemCount}):</div>
                <div class="payment-summary-money js-items-total">
                    ${formatCurrency(totalBeforeSubsidy)}
                </div>
            </div>

            <div class="payment-summary-row subtotal-row">
                <div>Total before Subsidy:</div>
                <div class="payment-summary-money js-total-before-subsidy">
                    ${formatCurrency(totalBeforeSubsidy)}
                </div>
            </div>

            <div class="payment-summary-row">
                <div>Estimated Subsidy (10%):</div>
                <div class="payment-summary-money js-subsidy">
                    -${formatCurrency(subsidy)}
                </div>
            </div>

            <div class="payment-summary-row total-row">
                <div>Order total:</div>
                <div class="payment-summary-money js-order-total">
                    ${formatCurrency(orderTotal)}
                </div>
            </div>

            <button class="place-order-button button-primary">
                Place your order
            </button>`;

        const summaryContainer = document.querySelector('.payment-summary');
        if (summaryContainer) {
            summaryContainer.innerHTML = paymentSummaryHTML;
            
            // Add event listener to the place order button
            const placeOrderButton = summaryContainer.querySelector('.place-order-button');
            if (placeOrderButton) {
                placeOrderButton.addEventListener('click', async () => {
                    try {
                        placeOrderButton.disabled = true;
                        placeOrderButton.textContent = 'Processing...';
                        await placeOrder();
                    } catch (error) {
                        console.error('Error in place order button handler:', error);
                        placeOrderButton.disabled = false;
                        placeOrderButton.textContent = 'Place your order';
                    }
                });
            }
        } else {
            console.error('Payment summary container not found');
        }
    } catch (error) {
        console.error('Error updating payment summary:', error);
        const summaryContainer = document.querySelector('.payment-summary');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to update payment summary. Please try again.</p>
                    <button onclick="window.location.reload()">Retry</button>
                </div>`;
        }
    }
}

async function displayOrders() {
    try {
        const orders = await getOrders();
        const ordersContainer = document.getElementById('orders-container');
        
        if (!ordersContainer) {
            console.error('Orders container not found');
            return;
        }
        
        if (orders.length === 0) {
            ordersContainer.innerHTML = '<p>You have no orders yet.</p>';
            return;
        }
        
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-KE', {
                style: 'currency',
                currency: 'KES',
                minimumFractionDigits: 2
            }).format(amount);
        };
        
        // Format date
        const formatDate = (dateString) => {
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            return new Date(dateString).toLocaleDateString('en-KE', options);
        };
        
        // Create HTML for orders
        let ordersHTML = '<div class="orders-list">';
        
        orders.forEach(order => {
            const totalAmount = order.subtotalAmount ?? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const subsidy = order.subsidyAmount ?? totalAmount * 0.10;
            const finalAmount = order.totalAmount ?? totalAmount - subsidy;
            const displayOrderId = order.receiptNumber || order._id?.slice(-8) || order.orderId;
            
            ordersHTML += `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-id">Order #${displayOrderId}</div>
                        <div class="order-date">${formatDate(order.orderDate)}</div>
                        <div class="order-status">${order.status || 'Processing'}</div>
                    </div>
                    <div class="order-items">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>`;
                            
            order.items.forEach(item => {
                ordersHTML += `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.price * item.quantity)}</td>
                    </tr>`;
            });
                            
            ordersHTML += `
                            </tbody>
                        </table>
                    </div>
                    <div class="order-summary">
                        <div class="summary-row">
                            <span>Total:</span>
                            <span>${formatCurrency(totalAmount)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Subsidy (10%):</span>
                            <span>-${formatCurrency(subsidy)}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Final Amount:</span>
                            <span>${formatCurrency(finalAmount)}</span>
                        </div>
                        <button class="receipt-button" data-order-id="${order._id}">
                            View Receipt
                        </button>
                    </div>
                </div>`;
        });
        
        ordersHTML += '</div>';
        ordersContainer.innerHTML = ordersHTML;
        ordersContainer.querySelectorAll('.receipt-button').forEach(button => {
            button.addEventListener('click', () => viewOrderReceipt(button.dataset.orderId));
        });
    } catch (error) {
        console.error('Error displaying orders:', error);
        const ordersContainer = document.getElementById('orders-container');
        if (ordersContainer) {
            ordersContainer.innerHTML = `
                <div class="error-message">
                    <p>Failed to load orders. Please try again.</p>
                    <button onclick="displayOrders()">Retry</button>
                </div>`;
        }
    }
}

// ==========================================
// Initialization
// ==========================================
function initializeApp() {
    // Check if we're on the orders page
    const ordersContainer = document.getElementById('orders-container');
    if (ordersContainer) {
        displayOrders().catch(error => {
            console.error('Failed to initialize orders display:', error);
        });
    }
    
    // Check if we're on the cart/payment page
    const paymentSummary = document.querySelector('.payment-summary');
    if (paymentSummary) {
        updatePaymentSummary().catch(error => {
            console.error('Failed to initialize payment summary:', error);
        });
    }
    
    // Listen for cart updates
    window.addEventListener('cart-updated', () => {
        if (paymentSummary) {
            updatePaymentSummary().catch(error => {
                console.error('Failed to update payment summary:', error);
            });
        }
    });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded
    initializeApp();
}

// ==========================================
// Exports
// ==========================================
export {
    refreshAccessToken,
    getAllMenuItems,
    placeOrder,
    getOrders,
    displayOrders,
    updatePaymentSummary
};
