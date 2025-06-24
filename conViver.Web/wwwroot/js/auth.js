import { getToken } from './apiClient.js';

export function requireAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

export function logout() {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_userName');
    localStorage.removeItem('cv_userPhoto');
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const prefix = isInPagesDir ? '../' : '';
    window.location.href = `${prefix}login.html`;
}
