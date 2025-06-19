import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js'; // Added import

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    await carregarAvisos();
});

async function carregarAvisos() {
    showGlobalFeedback('Carregando avisos...', 'info', 3000);
    const container = document.querySelector('.js-avisos');
    if (!container) {
        console.error('Container de avisos .js-avisos não encontrado.');
        showGlobalFeedback('Erro interno: container de avisos não encontrado.', 'error');
        return;
    }
    container.innerHTML = '<p>Carregando...</p>'; // Local loading indicator

    try {
        const resp = await apiClient.get('/api/v1/app/avisos?page=1&size=10');
        const avisos = resp.items || resp;

        container.innerHTML = ''; // Clear loading indicator
        if (avisos && avisos.length > 0) {
            avisos.forEach(a => {
                const art = document.createElement('article');
                art.className = 'cv-card communication__post';
                art.innerHTML = `<h3 class="communication__post-title">${a.titulo}</h3>` +
                    `<p class="communication__post-text">${a.corpo || ''}</p>`;
                container.appendChild(art);
            });
            showGlobalFeedback('Avisos carregados!', 'success', 3000);
        } else {
            container.innerHTML = '<p>Nenhum aviso encontrado.</p>';
            showGlobalFeedback('Nenhum aviso encontrado.', 'info', 3000);
        }
    } catch(err) {
        console.error('Erro ao carregar avisos', err);
        container.innerHTML = '<p class="error-message">Falha ao carregar avisos. Tente novamente mais tarde.</p>';
        showGlobalFeedback('Erro ao carregar avisos: ' + (err.message || 'Erro desconhecido'), 'error');
    }
}
