import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js'; // Added import

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    carregarAgenda();
    const reservaForm = document.querySelector('.js-reserva-form');
    if (reservaForm) {
        reservaForm.addEventListener('submit', criarReserva);
    } else {
        console.error('Formulário de reserva .js-reserva-form não encontrado.');
        showGlobalFeedback('Erro interno: formulário de reserva não encontrado.', 'error');
    }
});

async function carregarAgenda() {
    showGlobalFeedback('Carregando agenda...', 'info', 3000);
    const container = document.querySelector('.js-calendario');
    if (!container) {
        console.error('Container do calendário .js-calendario não encontrado.');
        showGlobalFeedback('Erro interno: container do calendário não encontrado.', 'error');
        return;
    }
    container.innerHTML = '<p>Carregando agenda...</p>'; // Local loading indicator

    try {
        const now = new Date();
        const mes = now.toISOString().slice(0,7);
        const reservas = await apiClient.get(`/api/v1/app/reservas/agenda?mesAno=${mes}`);

        container.innerHTML = ''; // Clear loading indicator
        if (reservas && reservas.length > 0) {
            reservas.forEach(r => {
                const div = document.createElement('div');
                div.className = 'cv-card reservas__day-item';
                const inicio = new Date(r.inicio).toLocaleDateString('pt-BR');
                div.textContent = `${inicio} - ${r.area}`;
                container.appendChild(div);
            });
            showGlobalFeedback('Agenda carregada!', 'success', 3000);
        } else {
            container.innerHTML = '<p>Nenhuma reserva encontrada para o mês atual.</p>';
            showGlobalFeedback('Nenhuma reserva encontrada para este mês.', 'info', 3000);
        }
    } catch(err) {
        console.error('Erro ao carregar agenda', err);
        container.innerHTML = '<p class="error-message">Falha ao carregar a agenda. Tente novamente.</p>';
        showGlobalFeedback('Erro ao carregar agenda: ' + (err.message || 'Erro desconhecido'), 'error');
    }
}

async function criarReserva(evt) {
    evt.preventDefault();
    const form = evt.target;
    const dataInput = form.querySelector('.js-reserva-data');
    const submitButton = form.querySelector('button[type="submit"]'); // Assuming there's a submit button

    if (!dataInput || !dataInput.value) {
        showGlobalFeedback('Por favor, selecione uma data para a reserva.', 'error');
        return;
    }
    const data = dataInput.value;
    const inicio = `${data}T10:00:00`; // Exemplo, idealmente pegar do form
    const fim = `${data}T12:00:00`;   // Exemplo, idealmente pegar do form
    const area = "Área Comum Teste"; // Exemplo, idealmente pegar do form

    showGlobalFeedback('Criando reserva...', 'info', 2000);
    if (submitButton) submitButton.disabled = true;

    try {
        // TODO: UnidadeId needs to be fetched or selected by the user.
        const payload = { AreaComumId: area, Inicio: inicio, Fim: fim, UnidadeId: null };
        await apiClient.post('/api/v1/app/reservas', payload);
        showGlobalFeedback('Reserva criada com sucesso!', 'success', 5000);
        form.reset();
        await carregarAgenda(); // Recarrega a agenda para mostrar a nova reserva
    } catch(err) {
        console.error('Erro ao criar reserva', err);
        let errorMessage = 'Erro ao criar reserva.';
        if (err.data && err.data.message) { // Specific API message
            errorMessage += ` ${err.data.message}`;
        } else if (err.message) {
            errorMessage += ` ${err.message}`;
        } else {
            errorMessage += ' Erro desconhecido.';
        }
        showGlobalFeedback(errorMessage, 'error');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}
