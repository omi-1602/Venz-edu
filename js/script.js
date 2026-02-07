document.addEventListener('DOMContentLoaded', () => {
    
    // --- Elements ---
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuToggle = document.getElementById('menuToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const greetingText = document.getElementById('greetingText');
    
    // Dark Mode Elements
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;

    // Settings Tab Elements
    const settingsTabs = document.querySelectorAll('.settings-nav-item');
    const settingsSections = document.querySelectorAll('.settings-section');

    // --- Sidebar Logic ---
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    if(menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if(sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
    if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // --- Navigation Logic ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const targetId = item.getAttribute('data-target');

            pages.forEach(page => {
                if(page.id === targetId) {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });

            if(window.innerWidth <= 768) closeSidebar();
        });
    });

    // --- Dark Mode Logic ---
    // 1. Check LocalStorage
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
        if(darkModeToggle) darkModeToggle.classList.add('active');
    }

    // 2. Toggle Event
    if(darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            darkModeToggle.classList.toggle('active');
            
            // Save preference
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // --- Settings Tabs Logic ---
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            settingsTabs.forEach(t => t.classList.remove('active'));
            // Add to clicked tab
            tab.classList.add('active');

            // Hide all sections
            settingsSections.forEach(section => section.classList.remove('active'));
            
            // Show target section
            const target = tab.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');
        });
    });

    // --- Chat Simulation (Optional) ---
    const sendBtn = document.getElementById('sendMessageBtn');
    const chatInput = document.getElementById('messageInput');
    const chatFeed = document.getElementById('chatFeed');

    if(sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if(text) {
                // Add sent message
                const bubble = document.createElement('div');
                bubble.className = 'message-bubble sent';
                bubble.innerHTML = `<p>${text}</p><span class="msg-time">Just now</span>`;
                chatFeed.appendChild(bubble);
                chatInput.value = '';
                chatFeed.scrollTop = chatFeed.scrollHeight; // Auto scroll to bottom
            }
        });
    }

    // --- Dynamic Greeting ---
    function setGreeting() {
        const hour = new Date().getHours();
        const name = "Yash";
        let greeting = "Welcome back";

        if (hour < 12) greeting = "Good Morning";
        else if (hour < 18) greeting = "Good Afternoon";
        else greeting = "Good Evening";

        if(greetingText) greetingText.textContent = `${greeting}, ${name}!`;
    }

    setGreeting();
});