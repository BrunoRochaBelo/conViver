import { logout } from './auth.js';

export function initUserMenu() {
    const avatarBtn = document.getElementById('userMenuButton');
    const modal = document.getElementById('userMenuModal');
    const closeBtn = document.getElementById('userMenuClose');
    const toggleThemeBtn = document.getElementById('toggleThemeButton');
    const profileBtn = document.getElementById('goProfileButton');
    const logoutBtn = document.getElementById('userLogoutButton');

    // Set avatar
    const userName = localStorage.getItem('cv_userName') || 'Usuário';
    const userPhoto = localStorage.getItem('cv_userPhoto');
    if (avatarBtn) {
        if (userPhoto) {
            const img = document.createElement('img');
            img.src = userPhoto;
            avatarBtn.textContent = '';
            avatarBtn.appendChild(img);
        } else {
            avatarBtn.textContent = userName.charAt(0).toUpperCase();
        }
        avatarBtn.title = userName;
    }

    function openModal() {
        if (modal) modal.style.display = 'flex';
    }
    function closeModal() {
        if (modal) modal.style.display = 'none';
    }

    avatarBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    logoutBtn?.addEventListener('click', () => {
        logout();
    });

    toggleThemeBtn?.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const newTheme = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('cv_theme', newTheme);
    });

    profileBtn?.addEventListener('click', () => {
        const isInPagesDir = window.location.pathname.includes('/pages/');
        const prefix = isInPagesDir ? '' : 'pages/';
        window.location.href = `${prefix}perfil.html`;
    });

    const savedTheme = localStorage.getItem('cv_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}

document.addEventListener('DOMContentLoaded', initUserMenu);
