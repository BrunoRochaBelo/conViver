import apiClient, { setToken } from './apiClient.js';

const form = document.querySelector('.js-login-form');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('.js-email').value;
    const senha = document.querySelector('.js-senha').value;
    try {
        const resp = await apiClient.post('/auth/login', { email, senha });
        setToken(resp.accessToken);
        window.location.href = 'index.html';
    } catch (err) {
        alert('Falha no login');
        console.error(err);
    }
});
