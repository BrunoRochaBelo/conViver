import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    await carregarVisitantes();
    await carregarEncomendas();
});

async function carregarVisitantes() {
    try {
        const hoje = new Date();
        const from = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7)
            .toISOString().slice(0,10);
        const to = hoje.toISOString().slice(0,10);
        const visitas = await apiClient.get(`/syndic/visitantes?from=${from}&to=${to}`);
        const tbody = document.querySelector('.js-visitantes');
        tbody.innerHTML = '';
        visitas.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${v.nome}</td><td>${v.unidadeId.slice(0,4)}</td><td>${v.status || ''}</td>`;
            tbody.appendChild(tr);
        });
    } catch(err) {
        console.error('Erro ao listar visitantes', err);
    }
}

async function carregarEncomendas() {
    try {
        const encomendas = await apiClient.get('/syndic/encomendas?status=recebida');
        const tbody = document.querySelector('.js-encomendas');
        tbody.innerHTML = '';
        encomendas.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${e.descricao || ''}</td><td>${e.unidadeId.slice(0,4)}</td><td>${e.status}</td>`;
            tbody.appendChild(tr);
        });
    } catch(err) {
        console.error('Erro ao listar encomendas', err);
    }
}
