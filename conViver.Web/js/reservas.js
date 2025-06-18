import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    carregarAgenda();
    document.querySelector('.js-reserva-form').addEventListener('submit', criarReserva);
});

async function carregarAgenda() {
    try {
        const now = new Date();
        const mes = now.toISOString().slice(0,7);
        const reservas = await apiClient.get(`/app/reservas/agenda?mesAno=${mes}`);
        const container = document.querySelector('.js-calendario');
        container.innerHTML = '';
        reservas.forEach(r => {
            const div = document.createElement('div');
            div.className = 'cv-card reservas__day-item';
            const inicio = new Date(r.inicio).toLocaleDateString('pt-BR');
            div.textContent = `${inicio} - ${r.area}`;
            container.appendChild(div);
        });
    } catch(err) {
        console.error('Erro ao carregar agenda', err);
    }
}

async function criarReserva(evt) {
    evt.preventDefault();
    const data = document.querySelector('.js-reserva-data').value;
    if (!data) return;
    const inicio = `${data}T10:00:00`;
    const fim = `${data}T12:00:00`;
    try {
        await apiClient.post('/app/reservas', { area: 'Area Comum', inicio, fim });
        evt.target.reset();
        carregarAgenda();
    } catch(err) {
        console.error('Erro ao criar reserva', err);
    }
}
