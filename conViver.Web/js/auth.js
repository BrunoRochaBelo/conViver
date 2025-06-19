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

// Helper function to parse JWT token (basic implementation)
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

export function getUserInfo() {
    const token = getToken();
    if (token) {
        const decodedToken = parseJwt(token);
        if (decodedToken) {
            return {
                // Adjust claim names if they are different in your JWT
                username: decodedToken.unique_name || decodedToken.name || "Usuário",
                userId: decodedToken.nameid, // Standard claim for user ID
                condominioId: decodedToken.condominioId,
                unidadeId: decodedToken.unidadeId, // May not exist for all users (e.g. global admin)
                roles: decodedToken.role || [] // Assuming role is a string or array of strings
            };
        }
    }
    return null;
}

export function getUserRoles() {
    const userInfo = getUserInfo();
    if (userInfo && userInfo.roles) {
        return Array.isArray(userInfo.roles) ? userInfo.roles : [userInfo.roles];
    }
    return [];
}

export function isUserInRole(roleName) {
    const roles = getUserRoles();
    return roles.includes(roleName);
}
