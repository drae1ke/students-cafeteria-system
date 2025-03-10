document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    function openTab(tabName) {
        // Remove active class from all tabs and hide content
        tabs.forEach(tab => tab.classList.remove("active"));
        contents.forEach(content => content.classList.add("hidden"));

        // Add active class to clicked tab and show content
        document.querySelector(`[onclick="openTab('${tabName}')"]`).classList.add("active");
        document.getElementById(tabName).classList.remove("hidden");
    }

    // Attach tab switching function
    window.openTab = openTab;
});
