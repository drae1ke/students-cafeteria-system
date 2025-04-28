// Initialize charts when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the sales section
    const setupChartEventListeners = () => {
        // Set up date range filter change handling
        const dateRangeSelect = document.getElementById('chartDateRange');
        const applyFilterBtn = document.getElementById('applyChartFilter');
        
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                const selectedRange = dateRangeSelect.value;
                fetchAndUpdateChartData(selectedRange);
            });
        }
    };
    
    // Set up event listeners
    setupChartEventListeners();
    
    // Listen for section changes to initialize charts when sales section is shown
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
            // If the sales section is being shown, initialize the charts
            if (link.getAttribute('onclick').includes("showSection('sales')")) {
                // Wait for the section to be visible before initializing charts
                setTimeout(() => {
                    const salesSection = document.getElementById('sales-section');
                    if (salesSection && salesSection.style.display !== 'none') {
                        initializeCharts();
                    }
                }, 100);
            }
        });
    });
    
    // If the sales section is already visible (e.g., if it's the default section), initialize charts
    const salesSection = document.getElementById('sales-section');
    if (salesSection && salesSection.style.display !== 'none') {
        initializeCharts();
    }
});

// Initialize charts with mock data (replace with actual data fetch later)
function initializeCharts() {
    const weeklySalesCanvas = document.getElementById('weeklySalesChart');
    const customerRateCanvas = document.getElementById('customerRateChart');
    
    if (!weeklySalesCanvas || !customerRateCanvas) return;
    
    // Destroy existing charts if they exist
    const existingWeeklySalesChart = Chart.getChart(weeklySalesCanvas);
    const existingCustomerRateChart = Chart.getChart(customerRateCanvas);
    
    if (existingWeeklySalesChart) {
        existingWeeklySalesChart.destroy();
    }
    if (existingCustomerRateChart) {
        existingCustomerRateChart.destroy();
    }
    
    // Sample data - replace with actual data from your API
    const weeklySalesData = {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        datasets: [{
            label: 'Sales Amount ($)',
            data: [1200, 1900, 1500, 2000, 2400, 2800, 2200],
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
        }]
    };
    
    const customerRateData = {
        labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        datasets: [{
            label: 'Number of Customers',
            data: [45, 59, 50, 65, 70, 85, 75],
            fill: false,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1,
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointRadius: 4
        }]
    };
    
    // Create the bar chart for weekly sales
    new Chart(weeklySalesCanvas, {
        type: 'bar',
        data: weeklySalesData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return 'ksh' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'ksh' + context.parsed.y;
                        }
                    }
                }
            }
        }
    });
    
    // Create the line chart for customer rate
    new Chart(customerRateCanvas, {
        type: 'line',
        data: customerRateData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Function to fetch and update chart data based on selected date range
function fetchAndUpdateChartData(dateRange) {
    // This function would normally fetch data from your backend
    // For now, we'll just simulate different data based on the range
    
    let labels, salesData, customerData;
    
    switch(dateRange) {
        case 'month':
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            salesData = [5800, 7200, 6500, 8400];
            customerData = [210, 250, 230, 280];
            break;
        case 'quarter':
            labels = ['Jan', 'Feb', 'Mar'];
            salesData = [22000, 19500, 24000];
            customerData = [850, 790, 920];
            break;
        default: // week
            labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            salesData = [1200, 1900, 1500, 2000, 2400, 2800, 2200];
            customerData = [45, 59, 50, 65, 70, 85, 75];
    }
    
    // Update the charts with the new data
    updateChart('weeklySalesChart', labels, salesData, 'bar');
    updateChart('customerRateChart', labels, customerData, 'line');
}

// Helper function to update a chart with new data
function updateChart(chartId, labels, data, type) {
    const chartCanvas = document.getElementById(chartId);
    if (!chartCanvas) return;
    
    const chartInstance = Chart.getChart(chartCanvas);
    if (chartInstance) {
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
    }
}

// This function would fetch actual data from your backend
// You'll need to implement this based on your API
function fetchActualData(dateRange) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/adminform';
        return Promise.reject('Not authenticated');
    }
    
    return fetch(`/api/sales-analytics?range=${dateRange}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch sales data');
        return response.json();
    })
    .catch(error => {
        console.error('Error fetching sales data:', error);
        return null;
    });
}