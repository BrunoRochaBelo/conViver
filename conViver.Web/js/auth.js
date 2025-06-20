import apiClient, { getToken } from './apiClient.js';

export function requireAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

export function logout() {
    localStorage.removeItem('cv_token');
    window.location.href = 'login.html';
}

/**
 * Verifica se o usuário está autenticado consultando o endpoint /auth/me.
 * Caso não esteja, redireciona para a página de login.
 * @returns {Promise<boolean>} true se autenticado, false caso contrário
 */
export async function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    try {
        await apiClient.get('/auth/me');
        return true;
    } catch (err) {
        console.warn('Falha ao validar token, redirecionando para login.', err);
        localStorage.removeItem('cv_token');
        window.location.href = 'login.html';
        return false;
    }
}

/**
 * Obtém os dados do usuário logado a partir do endpoint /auth/me.
 * Retorna null caso não seja possível recuperar os dados.
 */
export async function getCurrentUser() {
    const token = getToken();
    if (!token) return null;
    try {
        return await apiClient.get('/auth/me');
    } catch (err) {
        console.error('Erro ao obter usuário atual:', err);
        return null;
    }
}
