"use strict";

// Sample Data
const users = [
  { id: 1, name: "John Doe", email: "john@uni.edu", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@uni.edu", status: "suspended" }
];

const menuItems = [
  { id: 1, name: "Chicken Rice", price: 4.5, stock: 15 },
  { id: 2, name: "Vegetarian Pasta", price: 5.0, stock: 8 }
];

// Sample Sales Trend Data (past 7 days)
const salesTrend = [
  { date: "2025-03-01", sales: 150 },
  { date: "2025-03-02", sales: 200 },
  { date: "2025-03-03", sales: 180 },
  { date: "2025-03-04", sales: 220 },
  { date: "2025-03-05", sales: 170 },
  { date: "2025-03-06", sales: 190 },
  { date: "2025-03-07", sales: 210 }
];

/**
 * Initializes the dashboard by updating stats, rendering tables,
 * and drawing the sales trend chart.
 */
const initDashboard = () => {
  updateStats();
  renderUsersTable();
  renderMenuTable();
  renderSalesChart();
};

/**
 * Displays the selected section and hides all others.
 * @param {string} section - The section identifier ('users', 'menu', 'transactions', or 'sales').
 */
const showSection = (section) => {
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((sec) => (sec.style.display = "none"));

  // Determine section id based on parameter
  const sectionId =
    section === "transactions"
      ? "transactions-section"
      : section === "sales"
      ? "sales-section"
      : `${section}-section`;

  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.style.display = "block";
  }
};

/**
 * Renders the users table using sample data.
 */
const renderUsersTable = () => {
  const tbody = document.querySelector("#users-table tbody");
  tbody.innerHTML = "";

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.status}</td>
      <td>
        <button onclick="toggleUserStatus(${user.id})">
          ${user.status === "active" ? "Suspend" : "Activate"}
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
};

/**
 * Renders the menu table using sample data.
 */
const renderMenuTable = () => {
  const tbody = document.querySelector("#menu-table tbody");
  tbody.innerHTML = "";

  menuItems.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>
        <input type="number" value="${item.price}" 
               class="edit-input" 
               onchange="updatePrice(${item.id}, this.value)">
      </td>
      <td>
        <input type="number" value="${item.stock}" 
               class="edit-input" 
               onchange="updateStock(${item.id}, this.value)">
      </td>
      <td>
        <button class="save-btn" onclick="saveChanges(${item.id})">Save</button>
      </td>
    `;
    tbody.appendChild(row);
  });
};

/**
 * Updates the dashboard statistics.
 */
const updateStats = () => {
  document.getElementById("total-users").textContent = users.length;
  const totalSales = menuItems.reduce(
    (sum, item) => sum + item.price * item.stock,
    0
  );
  document.getElementById("today-sales").textContent = `$${totalSales.toFixed(
    2
  )}`;
};

/**
 * Toggles the status of a user between active and suspended.
 * @param {number} userId - The user's ID.
 */
const toggleUserStatus = (userId) => {
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.status = user.status === "active" ? "suspended" : "active";
    renderUsersTable();
  }
};

/**
 * Updates the price of a menu item.
 * @param {number} itemId - The menu item's ID.
 * @param {number|string} newPrice - The new price value.
 */
const updatePrice = (itemId, newPrice) => {
  const item = menuItems.find((i) => i.id === itemId);
  if (item) {
    item.price = parseFloat(newPrice);
  }
};

/**
 * Updates the stock quantity of a menu item.
 * @param {number} itemId - The menu item's ID.
 * @param {number|string} newStock - The new stock quantity.
 */
const updateStock = (itemId, newStock) => {
  const item = menuItems.find((i) => i.id === itemId);
  if (item) {
    item.stock = parseInt(newStock);
  }
};

/**
 * Saves the changes made to a menu item.
 * Typically, an API call would be performed here.
 * @param {number} itemId - The menu item's ID.
 */
const saveChanges = (itemId) => {
  console.log("Saving changes for item:", itemId);
  updateStats();
};

/**
 * Renders a line chart displaying the sales trend over time using Chart.js.
 */
const renderSalesChart = () => {
  const ctx = document.getElementById("salesChart").getContext("2d");
  const labels = salesTrend.map((entry) => entry.date);
  const data = salesTrend.map((entry) => entry.sales);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Sales Over Time",
          data: data,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: true,
          tension: 0.1
        }
      ]
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: "Date"
          }
        },
        y: {
          title: {
            display: true,
            text: "Sales"
          },
          beginAtZero: true
        }
      }
    }
  });
};

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initDashboard);
