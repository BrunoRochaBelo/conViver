import { logout } from './auth.js';

export function initUserMenu() {
    const avatarBtn = document.getElementById('userMenuButton');
    const modal = document.getElementById('userMenuModal');
    const modalHeader = modal ? modal.querySelector('.cv-modal-header') : null;
    const closeBtn = document.getElementById('userMenuClose');
    const toggleThemeBtn = document.getElementById('toggleThemeButton');
    const profileBtn = document.getElementById('goProfileButton');
    const logoutBtn = document.getElementById('userLogoutButton');

    // Determine display name for avatar and header
    let displayName = localStorage.getItem('cv_userName');
    if (!displayName) {
        const userEmail = localStorage.getItem('cv_userEmail');
        if (userEmail) {
            displayName = userEmail.split('@')[0];
        } else {
            displayName = 'Usuário'; // Default if no name or email
        }
    }

    const userPhoto = localStorage.getItem('cv_userPhoto');
    if (avatarBtn) {
        if (userPhoto) {
            const img = document.createElement('img');
            img.src = userPhoto;
            avatarBtn.textContent = '';
            avatarBtn.appendChild(img);
        } else {
            avatarBtn.textContent = displayName.charAt(0).toUpperCase();
        }
        avatarBtn.title = displayName;
    }

    function openModal() {
        if (modal) modal.style.display = 'flex';
        if (modalHeader) {
            // Remove existing username h2 if any to prevent duplicates
            const existingH2 = modalHeader.querySelector('h2.user-menu-username');
            if (existingH2) {
                existingH2.remove();
            }
            // Add display name to modal header
            const displayNameH2 = document.createElement('h2');
            displayNameH2.classList.add('user-menu-username'); // Add a class for specific styling if needed
            displayNameH2.textContent = displayName;
            // Prepend h2 to keep close button (if it's part of header) after it or style accordingly
            modalHeader.insertBefore(displayNameH2, modalHeader.firstChild);
        }
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

    // Ensure modal starts hidden after events are bound
    closeModal();
}

document.addEventListener('DOMContentLoaded', initUserMenu);
