// checkout.js
import { cartItems, removeFromCart, updateCartDisplay } from "./cart.js";
import { updatePaymentSummary } from "./paymentSummary.js";

async function getMenuItems() {
    try {
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            // Redirect to login if no token
            window.location.href = '/signin';
            return [];
        }

        const response = await fetch('/api/menu', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Try to refresh token
                const refreshResponse = await fetch('/refresh', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (!refreshResponse.ok) {
                    window.location.href = '/signin';
                    return [];
                }
                
                const { accessToken: newToken } = await refreshResponse.json();
                localStorage.setItem('accessToken', newToken);
                
                // Retry with new token
                const retryResponse = await fetch('/api/menu', {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
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
        return [];
    }
}

const generateCartHtml = async () => {
    const orderSummary = document.querySelector('.order-summary');
    if (!orderSummary) return;

    const menuItems = await getMenuItems();

    // Remove invalid items from cart
    const cartItemsCopy = [...cartItems];
    cartItemsCopy.forEach(cartItem => {
        const menuItem = menuItems.find(item => item._id === cartItem.id);
        if (!menuItem) {
            removeFromCart(cartItem.id);
        }
    });

    // Handle empty cart
    if (cartItems.length === 0) {
        orderSummary.innerHTML = '<div class="empty-cart-message">Your cart is empty.</div>';
        updatePaymentSummary();
        return;
    }

    orderSummary.innerHTML = cartItems.map(cartItem => {
        const menuItem = menuItems.find(item => item._id === cartItem.id);
        if (!menuItem) return '';
        
        return `
            <div class="cart-item-container js-cart-item-container-${menuItem._id}">
                <div class="cart-item-details-grid">
                    <img class="product-image" src="${menuItem.image || '/img/default-meal.png'}" 
                         onerror="this.src='/img/default-meal.png'">
                    <div class="cart-item-details">
                        <div class="product-name">${menuItem.name}</div>
                        <div class="product-price">
                            KES ${menuItem.price.toFixed(2)}
                        </div>
                        <div class="product-quantity">
                            <span>Quantity: ${cartItem.quantity}</span>
                            <button class="update-quantity" data-product-id="${menuItem._id}">
                                Update
                            </button>
                            <button class="delete-quantity js-delete-link" data-product-id="${menuItem._id}">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    orderSummary.addEventListener('click', e => {
        if (e.target.classList.contains('js-delete-link')) {
            const productId = e.target.dataset.productId;
            removeFromCart(productId);
            generateCartHtml();
        } else if (e.target.classList.contains('update-quantity')) {
            const productId = e.target.dataset.productId;
            const cartItem = cartItems.find(item => item.id === productId);
            if (!cartItem) return;

            const newQuantity = prompt("Enter new quantity:");
            if (newQuantity === null) return;

            const parsed = parseInt(newQuantity, 10);
            if (isNaN(parsed)) {
                alert('Please enter a valid number.');
                return;
            }
            if (parsed < 1) {
                alert('Quantity must be at least 1.');
                return;
            }

            cartItem.quantity = parsed;
            generateCartHtml();
        }
    });

    updateCartDisplay();
    updatePaymentSummary();
};

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateCartHtml);
} else {
    generateCartHtml();
}