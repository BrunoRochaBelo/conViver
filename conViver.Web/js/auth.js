import { getToken } from './apiClient.js';

export function requireAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

export function logout() {
    localStorage.removeItem('cv_token');
    window.location.href = 'login.html';
}
