import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js'; // Added import

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    await carregarVisitantes();
    await carregarEncomendas();
});

async function carregarVisitantes() {
    showGlobalFeedback('Carregando visitantes...', 'info', 3000);
    const tbody = document.querySelector('.js-visitantes');
    if (!tbody) {
        console.error('Tabela de visitantes .js-visitantes não encontrada.');
        showGlobalFeedback('Erro interno: tabela de visitantes não encontrada.', 'error');
        return;
    }
    tbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>'; // Local loading indicator

    try {
        const hoje = new Date();
        const from = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7)
            .toISOString().slice(0,10);
        const to = hoje.toISOString().slice(0,10);
        const visitas = await apiClient.get(`/syndic/visitantes?from=${from}&to=${to}`);

        tbody.innerHTML = ''; // Clear loading indicator
        if (visitas && visitas.length > 0) {
            visitas.forEach(v => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${v.nome}</td><td>${v.unidadeId.slice(0,4)}</td><td>${v.status || ''}</td>`;
                tbody.appendChild(tr);
            });
            showGlobalFeedback('Visitantes carregados!', 'success', 3000);
        } else {
            tbody.innerHTML = '<tr><td colspan="3">Nenhum visitante encontrado nos últimos 7 dias.</td></tr>';
            showGlobalFeedback('Nenhum visitante recente encontrado.', 'info', 3000);
        }
    } catch(err) {
        console.error('Erro ao listar visitantes', err);
        tbody.innerHTML = '<tr><td colspan="3" class="error-message">Falha ao carregar visitantes.</td></tr>';
        showGlobalFeedback('Erro ao carregar visitantes: ' + (err.message || 'Erro desconhecido'), 'error');
    }
}

async function carregarEncomendas() {
    showGlobalFeedback('Carregando encomendas...', 'info', 3000);
    const tbody = document.querySelector('.js-encomendas');
    if (!tbody) {
        console.error('Tabela de encomendas .js-encomendas não encontrada.');
        showGlobalFeedback('Erro interno: tabela de encomendas não encontrada.', 'error');
        return;
    }
    tbody.innerHTML = '<tr><td colspan="3">Carregando...</td></tr>'; // Local loading indicator

    try {
        const encomendas = await apiClient.get('/syndic/encomendas?status=recebida');

        tbody.innerHTML = ''; // Clear loading indicator
        if (encomendas && encomendas.length > 0) {
            encomendas.forEach(e => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${e.descricao || ''}</td><td>${e.unidadeId.slice(0,4)}</td><td>${e.status}</td>`;
                tbody.appendChild(tr);
            });
            showGlobalFeedback('Encomendas carregadas!', 'success', 3000);
        } else {
            tbody.innerHTML = '<tr><td colspan="3">Nenhuma encomenda com status "recebida" encontrada.</td></tr>';
            showGlobalFeedback('Nenhuma encomenda pendente encontrada.', 'info', 3000);
        }
    } catch(err) {
        console.error('Erro ao listar encomendas', err);
        tbody.innerHTML = '<tr><td colspan="3" class="error-message">Falha ao carregar encomendas.</td></tr>';
        showGlobalFeedback('Erro ao carregar encomendas: ' + (err.message || 'Erro desconhecido'), 'error');
    }
}
