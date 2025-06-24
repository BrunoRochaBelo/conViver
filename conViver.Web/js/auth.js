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

// Retorna os papéis (roles) do usuário armazenados em localStorage.
// Espera que a aplicação salve um objeto JSON em `userInfo` com uma
// propriedade `roles` contendo um array de strings.
export function getUserRoles() {
    try {
        const info = JSON.parse(localStorage.getItem('userInfo'));
        if (info && Array.isArray(info.roles)) {
            return info.roles;
        }
    } catch {
        // Ignora erros de parsing
    }
    return [];
}
