// cart.js
// Initialize cart from localStorage
import { updatePaymentSummary } from "./paymentSummary.js";
export let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

function saveCart() {
  localStorage.setItem('cartItems', JSON.stringify(cartItems));
}

export function updateCartDisplay() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalQuantity;
  }
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
  updatePaymentSummary();
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
    updatePaymentSummary
  }
}