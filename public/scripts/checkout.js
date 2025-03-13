// checkout.js
const { cartItems, removeFromCart, updateCartDisplay } = require("./cart");
const { menuItems } = require("../../model/menuOptions");
const { updatePaymentSummary } = require("./paymentSummary");


const generateCartHtml=()=> {
    const orderSummary = document.querySelector('.order-summary');
    if (!orderSummary) return;

    // Remove invalid items from cart
    const cartItemsCopy = [...cartItems];
    cartItemsCopy.forEach(cartItem => {
        const menuItem = menuItems.find(item => item.id === cartItem.id);
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
        const menuItem = menuItems.find(item => item.id === cartItem.id);
        if (!menuItem) return '';
        
        return `
            <div class="cart-item-container js-cart-item-container-${menuItem.id}">
                <div class="cart-item-details-grid">
                    <img class="product-image" src="${menuItem.image}">
                    <div class="cart-item-details">
                        <div class="product-name">${menuItem.name}</div>
                        <div class="product-price">
                            kes${(menuItem.priceCents / 100).toFixed(2)}
                        </div>
                        <div class="product-quantity">
                            <span>Quantity: ${cartItem.quantity}</span>
                            <button class="update-quantity" data-product-id="${menuItem.id}">
                                Update
                            </button>
                            <button class="delete-quantity js-delete-link" data-product-id="${menuItem.id}">
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
}

document.addEventListener('DOMContentLoaded', generateCartHtml);