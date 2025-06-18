import apiClient from './apiClient.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const metrics = await apiClient.get('/syndic/reports/dashboard');
        if (metrics.inadimplencia !== undefined) {
            const val = (metrics.inadimplencia * 100).toFixed(1) + '%';
            document.querySelector('.js-inadimplencia').textContent = val;
        }
        if (metrics.saldoCaixa !== undefined) {
            document.querySelector('.js-saldo').textContent =
                `R$ ${metrics.saldoCaixa.toFixed(2)}`;
        }
    } catch (err) {
        console.error('Erro ao carregar dashboard', err);
    }
});
