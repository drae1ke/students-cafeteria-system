import { cartItems } from "./cart.js";

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

export async function updatePaymentSummary() {
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

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updatePaymentSummary().catch(error => {
            console.error('Failed to initialize payment summary:', error);
        });
    });
} else {
    // DOM is already loaded
    updatePaymentSummary().catch(error => {
        console.error('Failed to initialize payment summary:', error);
    });
}

// Listen for cart updates
window.addEventListener('cart-updated', () => {
    updatePaymentSummary().catch(error => {
        console.error('Failed to update payment summary:', error);
    });
});