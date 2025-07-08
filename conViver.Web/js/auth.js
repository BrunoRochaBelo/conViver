import { getToken } from './apiClient.js';

export function requireAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

export function logout() {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_userName');
    localStorage.removeItem('cv_userEmail');
    localStorage.removeItem('cv_userPhoto');
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const prefix = isInPagesDir ? '../' : '';
    window.location.href = `${prefix}login.html`;
}

// Retorna os papéis (roles) do usuário armazenados em localStorage.
// Espera que a aplicação salve um objeto JSON em `userInfo` com uma
// propriedade `roles` contendo um array de strings.
export function getUserInfo() {
    const token = getToken();
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        let roles = [];
        if (payload.role) {
            roles = Array.isArray(payload.role) ? payload.role : [payload.role];
        } else if (payload.roles) {
            roles = Array.isArray(payload.roles) ? payload.roles : [payload.roles];
        }

        return {
            id: payload.sub || payload.nameid || null,
            email: payload.email || null,
            name: payload.given_name || payload.name || null,
            roles,
            condominioId: payload.condominioId || null,
        };
    } catch (err) {
        console.error('Failed to parse user token', err);
        return null;
    }
}

export function getRoles() {
    const info = getUserInfo();
    return info ? info.roles : [];
}

export function getUserRoles() {
    return getRoles();
}

export const getCurrentUser = getUserInfo;
