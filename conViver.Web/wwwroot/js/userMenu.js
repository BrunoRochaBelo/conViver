import { logout, getUserRoles, getCurrentUser } from './auth.js';
import { openModal as openModalFn, closeModal as closeModalFn } from './main.js';

export function initUserMenu() {
    const avatarBtn = document.getElementById('userMenuButton');
    const modal = document.getElementById('userMenuModal');
    const modalHeader = modal ? modal.querySelector('.cv-modal-header') : null;
    const closeBtn = document.getElementById('userMenuClose');
    const lightThemeBtn = document.getElementById('lightThemeButton');
    const darkThemeBtn = document.getElementById('darkThemeButton');
    const profileBtn = document.getElementById('goProfileButton');
    const logoutBtn = document.getElementById('userLogoutButton');
    const userMenuList = modal ? modal.querySelector('.user-menu-list') : null;

    // Determine display name for avatar and header
    const currentUser = getCurrentUser();
    let userEmail = localStorage.getItem('cv_userEmail') || currentUser?.email || '';
    let displayName = localStorage.getItem('cv_userName') || currentUser?.name || '';
    if (!displayName) {
        if (userEmail) {
            displayName = userEmail.split('@')[0];
        } else {
            displayName = 'Usuário';
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
        if (modal) openModalFn(modal);
        if (modalHeader) {
            let headerTop = modalHeader.querySelector('.user-menu-header-top');
            if (!headerTop) {
                headerTop = document.createElement('div');
                headerTop.classList.add('user-menu-header-top');
                modalHeader.insertBefore(headerTop, modalHeader.firstChild);
                headerTop.appendChild(closeBtn);
            } else {
                headerTop.innerHTML = '';
                headerTop.appendChild(closeBtn);
            }

            const nameH2 = document.createElement('h2');
            nameH2.classList.add('user-menu-username');
            nameH2.textContent = displayName;
            headerTop.insertBefore(nameH2, closeBtn);

            let emailP = modalHeader.querySelector('p.user-menu-email');
            if (!emailP) {
                emailP = document.createElement('p');
                emailP.classList.add('user-menu-email');
                modalHeader.appendChild(emailP);
            }
            emailP.textContent = userEmail || '';
        }
    }
    function closeModal() {
        if (modal) closeModalFn(modal);
    }

    avatarBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    logoutBtn?.addEventListener('click', () => {
        logout();
    });

    const sunIcon =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const moonIcon =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    function updateThemeButtons(theme) {
        if (!lightThemeBtn || !darkThemeBtn) return;
        lightThemeBtn.innerHTML = sunIcon;
        darkThemeBtn.innerHTML = moonIcon;
        if (theme === 'dark') {
            darkThemeBtn.classList.add('active');
            lightThemeBtn.classList.remove('active');
        } else {
            lightThemeBtn.classList.add('active');
            darkThemeBtn.classList.remove('active');
        }
    }

    lightThemeBtn?.addEventListener('click', () => {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('cv_theme', 'light');
        updateThemeButtons('light');
    });

    darkThemeBtn?.addEventListener('click', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('cv_theme', 'dark');
        updateThemeButtons('dark');
    });

    profileBtn?.addEventListener('click', () => {
        const isInPagesDir = window.location.pathname.includes('/pages/');
        const prefix = isInPagesDir ? '' : 'pages/';
        window.location.href = `${prefix}perfil.html`;
    });

    const roles = getUserRoles();
    const isSindicoAdmin = roles.includes('Sindico') || roles.includes('Administrador');
    if (isSindicoAdmin && userMenuList) {
        const li = document.createElement('li');
        const manageBtn = document.createElement('button');
        manageBtn.id = 'manageCondoButton';
        manageBtn.className = 'cv-button';
        manageBtn.textContent = 'Gerenciar Condomínio';
        li.appendChild(manageBtn);
        userMenuList.insertBefore(li, logoutBtn.parentElement);
        manageBtn.addEventListener('click', () => {
            const inPages = window.location.pathname.includes('/pages/');
            const pref = inPages ? '' : 'pages/';
            window.location.href = `${pref}dashboard.html`;
        });
    }

    const savedTheme = localStorage.getItem('cv_theme');
    const initialTheme = savedTheme || document.documentElement.getAttribute('data-theme') || 'light';
    document.documentElement.setAttribute('data-theme', initialTheme);
    updateThemeButtons(initialTheme);

    // Ensure modal starts hidden after events are bound
    closeModal();
}

document.addEventListener('DOMContentLoaded', initUserMenu);
