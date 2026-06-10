document.addEventListener('DOMContentLoaded', () => {
    const dateRangeSelect = document.getElementById('chartDateRange');
    const applyFilterBtn = document.getElementById('applyChartFilter');

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            fetchAndUpdateChartData(dateRangeSelect.value);
        });
    }

    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (link.getAttribute('onclick').includes("showSection('sales')")) {
                setTimeout(() => initializeCharts(), 100);
            }
        });
    });
});

async function initializeCharts() {
    const salesSection = document.getElementById('sales-section');
    if (!salesSection || salesSection.style.display === 'none') return;

    const dateRangeSelect = document.getElementById('chartDateRange');
    await fetchAndUpdateChartData(dateRangeSelect?.value || 'week');
}

async function fetchAndUpdateChartData(dateRange) {
    const data = await fetchActualData(dateRange);
    if (!data) return;

    renderCharts(data);
    updateDashboardSummary(data.summary);
}

function renderCharts(data) {
    const weeklySalesCanvas = document.getElementById('weeklySalesChart');
    const customerRateCanvas = document.getElementById('customerRateChart');

    if (!weeklySalesCanvas || !customerRateCanvas || typeof Chart === 'undefined') return;

    const existingWeeklySalesChart = Chart.getChart(weeklySalesCanvas);
    const existingCustomerRateChart = Chart.getChart(customerRateCanvas);

    if (existingWeeklySalesChart) existingWeeklySalesChart.destroy();
    if (existingCustomerRateChart) existingCustomerRateChart.destroy();

    new Chart(weeklySalesCanvas, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Sales Amount',
                data: data.salesData,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `KES ${value}`
                    }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => `KES ${context.parsed.y}`
                    }
                }
            }
        }
    });

    new Chart(customerRateCanvas, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Students Served',
                data: data.customerData,
                fill: false,
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
                pointBackgroundColor: 'rgb(255, 99, 132)',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateDashboardSummary(summary = {}) {
    const formatCurrency = (amount) => new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(Number(amount) || 0);

    const totalUsers = document.getElementById('total-users');
    const todaySales = document.getElementById('today-sales');
    const averageDailyUsers = document.getElementById('average-daily-users');
    const monthlySales = document.getElementById('monthly-sales');

    if (totalUsers) totalUsers.textContent = summary.totalUsers ?? totalUsers.textContent;
    if (todaySales) todaySales.textContent = formatCurrency(summary.todaySales);
    if (averageDailyUsers) averageDailyUsers.textContent = summary.averageDailyUsers ?? 0;
    if (monthlySales) monthlySales.textContent = formatCurrency(summary.monthlySales);
}

function fetchActualData(dateRange) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/adminform';
        return Promise.resolve(null);
    }

    return fetch(`/api/sales-analytics?range=${dateRange}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminToken');
                window.location.href = '/adminform';
                return null;
            }

            if (!response.ok) throw new Error('Failed to fetch sales data');
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching sales data:', error);
            return null;
        });
}
