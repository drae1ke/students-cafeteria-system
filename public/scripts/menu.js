// menu.js
import { menuItems } from "../model/menu0ptions.js";
import { cartItems, addToCart, updateCartDisplay } from "./cart.js";

document.addEventListener('DOMContentLoaded', initMenu);

function initMenu() {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.innerHTML = menuItems.map(item => `
    <div class="menu-item">
      <img src="${item.image}" alt="${item.name}">
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <div class="availability">
        <div class="availability-dot ${item.availability}"></div>
        ${item.availability.charAt(0).toUpperCase() + item.availability.slice(1)}
      </div>
      <p>Price: kes${(item.priceCents / 100).toFixed(2)}</p>
      <button class="add-to-cart" data-product-id="${item.id}">
        Add to Cart
      </button>
    </div>
  `).join('');

  container.addEventListener('click', e => {
    if (e.target.classList.contains('add-to-cart')) {
      const itemId = e.target.dataset.productId;
      addToCart(itemId);
    }
  });

  updateCartDisplay();
}