// menu.js
import { cartItems, addToCart, updateCartDisplay } from './cart.js';

async function refreshToken() {
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

// Changed from require() to fetch API call
async function initMenu() {
  try {
    let accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      accessToken = await refreshToken();
    }

    const response = await fetch('/api/menu', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        accessToken = await refreshToken();
        // Retry the request with new token
        const retryResponse = await fetch('/api/menu', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        });

        if (!retryResponse.ok) {
          throw new Error('Failed to load menu after token refresh');
        }

        const menuItems = await retryResponse.json();
        renderMenuItems(menuItems);
        setupCartHandlers();
        updateCartDisplay();
        return;
      }
      throw new Error('Failed to load menu');
    }

    const menuItems = await response.json();
    renderMenuItems(menuItems);
    setupCartHandlers();
    updateCartDisplay();
  } catch (error) {
    console.error('Error initializing menu:', error);
    showError('Failed to load menu items. Please try again later.');
  }
}

function showError(message) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.innerHTML = `
    <div class="error-message">
      <p>${message}</p>
      <button onclick="window.location.reload()">Retry</button>
    </div>
  `;
}

function renderMenuItems(menuItems) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  if (!menuItems || menuItems.length === 0) {
    container.innerHTML = '<div class="no-items">No menu items available</div>';
    return;
  }

  container.innerHTML = menuItems.map(item => `
    <div class="menu-item">
      <img src="${item.image || '/img/default-meal.png'}" 
           alt="${item.name}"
           onerror="this.src='/img/default-meal.png'">
      <h3>${item.name}</h3>
      ${item.description ? `<p class="description">${item.description}</p>` : ''}
      <div class="availability ${item.availability ? 'available' : 'unavailable'}">
        <div class="availability-dot"></div>
        ${item.availability ? 'Available' : 'Unavailable'}
      </div>
      <p class="price">Price: KES ${item.price.toFixed(2)}</p>
      ${item.availability ? 
        `<button class="add-to-cart" data-product-id="${item._id}">
           Add to Cart
         </button>` : 
        `<button class="add-to-cart" disabled>
           Currently Unavailable
         </button>`
      }
    </div>
  `).join('');
}

function setupCartHandlers() {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.addEventListener('click', e => {
    if (e.target.classList.contains('add-to-cart') && !e.target.disabled) {
      const itemId = e.target.dataset.productId;
      if (itemId) {
        addToCart(itemId);
        updateCartDisplay();
      }
    }
  });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenu);
} else {
  initMenu();
}