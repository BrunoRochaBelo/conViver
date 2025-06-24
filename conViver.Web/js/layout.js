import { buildNavigation } from './nav.js';
import { initUserMenu } from './userMenu.js';

export function buildLayout() {
    const body = document.body;
    if (!body) return;

    // Create header, user menu and nav only if not present
    if (!document.getElementById('mainNav')) {
        const layoutHTML = `
<header class="cv-header">
  <div class="cv-container cv-header__container">
    <h1 class="cv-header__title">conViver</h1>
    <button id="userMenuButton" class="user-avatar"></button>
  </div>
</header>
<div id="userMenuModal" class="cv-modal user-menu-modal">
  <div class="cv-modal-content">
    <span class="cv-modal-close" id="userMenuClose">&times;</span>
    <ul class="user-menu-list">
      <li><button id="toggleThemeButton" class="cv-button">Alterar Tema</button></li>
      <li><button id="goProfileButton" class="cv-button">Gerenciar Perfil</button></li>
      <li><button id="userLogoutButton" class="cv-button">Logout</button></li>
    </ul>
  </div>
</div>
<nav id="mainNav"></nav>`;
        body.insertAdjacentHTML('afterbegin', layoutHTML);
    }

    buildNavigation();
    initUserMenu();
}

document.addEventListener('DOMContentLoaded', buildLayout);
