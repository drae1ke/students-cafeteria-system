// menu.js
import { cartItems, addToCart, updateCartDisplay } from "./cart.js";

// Changed from require() to fetch API call
async function initMenu() {
  try {
    const response = await fetch('/api/menuroute', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        await refreshToken();
        return initMenu(); // Retry after token refresh
      }
      throw new Error('Failed to load menu');
    }

    const menuItems = await response.json();
    renderMenuItems(menuItems);
    setupCartHandlers();
    updateCartDisplay();
  } catch (error) {
    console.error('Error initializing menu:', error);
    // Add error display to UI
  }
}

function renderMenuItems(menuItems) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.innerHTML = menuItems.map(item => `
    <div class="menu-item">
      <img src="${item.image}" alt="${item.name}">
      <h3>${item.name}</h3>
      ${item.description ? `<p>${item.description}</p>` : ''}
      <div class="availability">
        <div class="availability-dot ${item.availability}"></div>
        ${item.availability.charAt(0).toUpperCase() + item.availability.slice(1)}
      </div>
      <p>Price: KES ${(item.price / 100).toFixed(2)}</p>
      <button class="add-to-cart" data-product-id="${item.id}">
        Add to Cart
      </button>
    </div>
  `).join('');
}

function setupCartHandlers() {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.addEventListener('click', e => {
    if (e.target.classList.contains('add-to-cart')) {
      const itemId = e.target.dataset.productId;
      addToCart(itemId);
      updateCartDisplay();
    }
  });
}

// Token refresh logic (add this)
async function refreshToken() {
  try {
    const response = await fetch('/refresh', {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Token refresh failed');
    
    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
  } catch (error) {
    window.location.href = '/login';
  }
}

document.addEventListener('DOMContentLoaded', initMenu);