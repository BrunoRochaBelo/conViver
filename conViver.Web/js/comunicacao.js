import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    await carregarAvisos();
});

async function carregarAvisos() {
    try {
        const resp = await apiClient.get('/app/avisos?page=1&size=10');
        const avisos = resp.items || resp;
        const container = document.querySelector('.js-avisos');
        container.innerHTML = '';
        avisos.forEach(a => {
            const art = document.createElement('article');
            art.className = 'cv-card communication__post';
            art.innerHTML = `<h3 class="communication__post-title">${a.titulo}</h3>` +
                `<p class="communication__post-text">${a.corpo || ''}</p>`;
            container.appendChild(art);
        });
    } catch(err) {
        console.error('Erro ao carregar avisos', err);
    }
}
