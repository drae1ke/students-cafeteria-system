document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    // Fetch user profile data when page loads
    fetchUserProfile();

    function openTab(tabName) {
        // Remove active class from all tabs and hide content
        tabs.forEach(tab => tab.classList.remove("active"));
        contents.forEach(content => content.classList.add("hidden"));

        // Add active class to clicked tab and show content
        document.querySelector(`[onclick="openTab('${tabName}')"]`).classList.add("active");
        document.getElementById(tabName).classList.remove("hidden");
    }

    async function fetchUserProfile() {
        try {
            const accessToken = localStorage.getItem('accessToken');
            
            if (!accessToken) {
                // Redirect to login if no token
                window.location.href = '/auth';
                return;
            }

            const response = await fetch('/profile/data', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('accessToken');
                    window.location.href = '/auth';
                    return;
                }
                throw new Error('Failed to fetch profile data');
            }

            const userData = await response.json();
            updateProfileUI(userData);
        } catch (error) {
            console.error('Error fetching profile:', error);
            // Show error message to user
            showError('Failed to load profile data. Please try again later.');
        }
    }

    function updateProfileUI(userData) {
        // Update profile information
        document.querySelector('.profile-header h2').textContent = userData.username || 'N/A';
        
        // Update personal information fields
        const personalInfoInputs = document.querySelectorAll('#personal input');
        personalInfoInputs[0].value = userData.username || 'N/A';
        personalInfoInputs[1].value = userData.regno || 'N/A';
        personalInfoInputs[2].value = userData.cardNumber || 'N/A';

        // Update stats if available
        if (userData.balance) {
            document.querySelector('.stat-box:nth-child(1) span').textContent = userData.balance.toFixed(2);
        }
        if (userData.orders) {
            document.querySelector('.stat-box:nth-child(2) span').textContent = userData.orders;
        }
        if (userData.totalSpent) {
            document.querySelector('.stat-box:nth-child(3) span').textContent = userData.totalSpent.toFixed(2);
        }
    }

    function showError(message) {
        // Add error display logic here
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.querySelector('.profile-container').prepend(errorDiv);
    }

    // Attach tab switching function to window
    window.openTab = openTab;

    // Attach loading spinner function to window
    function setLoading(isLoading) {
        // Assuming you add a loading-spinner element to your HTML
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.display = isLoading ? 'block' : 'none';
        }
    }

    function logout() {
        localStorage.removeItem('accessToken');
        window.location.href = '/auth';
    }

    // Add event listener for logout button
    document.querySelector('h5').addEventListener('click', logout);
});
