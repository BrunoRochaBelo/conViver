import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    try {
        const boletos = await apiClient.get('/syndic/finance/boletos');
        const tbody = document.querySelector('.js-boletos');
        tbody.innerHTML = '';
        boletos.forEach(b => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${b.unidadeId.slice(0,4)}</td><td>R$ ${b.valor.toFixed(2)}</td><td>${b.status}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao carregar boletos', err);
    }
});
