// cart.js
// Initialize cart from localStorage
let cartItems = [];

try {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
        cartItems = JSON.parse(savedCart);
    }
} catch (error) {
    console.error('Error loading cart from localStorage:', error);
    cartItems = [];
}

export { cartItems };

function saveCart() {
    try {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
    }
}

export function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalQuantity;
    }

    // Trigger a custom event that paymentSummary.js can listen for
    window.dispatchEvent(new CustomEvent('cart-updated'));
}

export function addToCart(itemId) {
    const existingItem = cartItems.find(item => item.id === itemId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cartItems.push({ id: itemId, quantity: 1 });
    }
    saveCart();
    updateCartDisplay();
}

export function removeFromCart(itemId) {
    const itemIndex = cartItems.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        cartItems[itemIndex].quantity--;
        if (cartItems[itemIndex].quantity === 0) {
            cartItems.splice(itemIndex, 1);
        }
        saveCart();
        updateCartDisplay();
    }
}

// Initialize cart display when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateCartDisplay);
} else {
    updateCartDisplay();
}