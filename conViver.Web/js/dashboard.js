import apiClient, { ApiError } from './apiClient.js';
import { requireAuth, getUserRoles } from './auth.js';
import { formatCurrency, formatDate, showGlobalFeedback } from './main.js'; // Updated import
import { initFabMenu } from './fabMenu.js';

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth(); // Ensures user is authenticated before proceeding

    // DOM Elements for data display
    const inadimplenciaPercentEl = document.querySelector('.js-db-inadimplencia-percent');
    const inadimplenciaValorEl = document.querySelector('.js-db-inadimplencia-valor');
    const saldoEl = document.querySelector('.js-db-saldo');
    const proximasDespesasEl = document.querySelector('.js-db-proximas-despesas');
    const alertasEl = document.querySelector('.js-db-alertas');
    const ultimosChamadosEl = document.querySelector('.js-db-ultimos-chamados');
    const ultimosAvisosEl = document.querySelector('.js-db-ultimos-avisos');
    const inadimplenciaChartCanvas = document.getElementById('inadimplenciaChart');
    let inadimplenciaChartInstance = null; // Para manter a instância do gráfico

    const dashboardSkeleton = document.getElementById('dashboard-skeleton');
    // Loading indicator (simple text for now, could be a spinner) - Kept for local loading messages if still desired
    const showLoading = (container, message = "Carregando...") => {
        if (container) container.innerHTML = `<p class="loading-message">${message}</p>`;
    };

    const clearAllSections = () => {
        if (inadimplenciaPercentEl) inadimplenciaPercentEl.textContent = '--%';
        if (inadimplenciaValorEl) inadimplenciaValorEl.textContent = 'R$ --';
        if (saldoEl) saldoEl.textContent = 'R$ --';
        if (proximasDespesasEl) proximasDespesasEl.innerHTML = '<li>Nenhuma despesa próxima.</li>';
        if (alertasEl) alertasEl.innerHTML = '<p>Nenhum alerta no momento.</p>';
        if (ultimosChamadosEl) ultimosChamadosEl.innerHTML = '<li>Nenhum chamado recente.</li>';
        if (ultimosAvisosEl) ultimosAvisosEl.innerHTML = '<li>Nenhum aviso recente.</li>';
        if (inadimplenciaChartInstance) {
            inadimplenciaChartInstance.destroy();
            inadimplenciaChartInstance = null;
        }
         // Clear chart canvas if it exists and no data
        if (inadimplenciaChartCanvas) {
            const ctx = inadimplenciaChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, inadimplenciaChartCanvas.width, inadimplenciaChartCanvas.height);
        }
    };

    function renderInadimplenciaChart(metricas) {
        if (!inadimplenciaChartCanvas) {
            console.error('Canvas para gráfico de inadimplência não encontrado.');
            return;
        }
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está carregado.');
            // Consider using showGlobalError or a specific message for the chart area
            return;
        }
        if (inadimplenciaChartInstance) {
            inadimplenciaChartInstance.destroy();
            inadimplenciaChartInstance = null;
        }

        if (metricas === null || typeof metricas.inadimplenciaPercentual !== 'number') {
            console.warn('Dados de inadimplência não disponíveis para o gráfico.');
            const ctx = inadimplenciaChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, inadimplenciaChartCanvas.width, inadimplenciaChartCanvas.height);
            // Optionally display a message on the canvas
            // ctx.font = "14px Arial";
            // ctx.textAlign = "center";
            // ctx.fillText("Dados do gráfico indisponíveis", inadimplenciaChartCanvas.width/2, inadimplenciaChartCanvas.height/2);
            return;
        }

        const percentualInadimplentes = metricas.inadimplenciaPercentual;
        const percentualAdimplentes = 100 - percentualInadimplentes;

        const chartData = {
            labels: [`Inadimplentes (${percentualInadimplentes.toFixed(1)}%)`,
                     `Adimplentes (${percentualAdimplentes.toFixed(1)}%)`],
            datasets: [{
                data: [percentualInadimplentes, percentualAdimplentes],
                backgroundColor: [
                    '#FF6384', // Vermelho para inadimplentes
                    '#36A2EB'  // Azul para adimplentes
                ],
                borderColor: [
                    '#FF6384',
                    '#36A2EB'
                ],
                borderWidth: 1,
                hoverOffset: 8
            }]
        };

        const chartConfig = {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { animateScale: true, animateRotate: true },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            font: { size: 10 },
                            padding: 10
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.toFixed(1) + '%';
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: { size: 12 },
                        bodyFont: { size: 10 },
                        padding: 8
                    },
                    title: {
                        display: true,
                        text: 'Distribuição de Adimplência',
                        font: { size: 14 },
                        padding: { top: 5, bottom: 5 }
                    }
                },
                cutout: '60%'
            }
        };
        inadimplenciaChartInstance = new Chart(inadimplenciaChartCanvas.getContext('2d'), chartConfig);
    }

    // Function to render metrics (now also calls chart rendering)
    function renderMetricas(metricas) {
        if (!metricas) {
            if (inadimplenciaPercentEl) inadimplenciaPercentEl.textContent = '--%';
            if (inadimplenciaValorEl) inadimplenciaValorEl.textContent = 'R$ --';
            if (saldoEl) saldoEl.textContent = 'R$ --';
            if (proximasDespesasEl) proximasDespesasEl.innerHTML = '<li>Nenhuma despesa próxima.</li>';
            renderInadimplenciaChart(null); // Ensure chart is cleared or shows 'no data'
            return;
        }

        if (inadimplenciaPercentEl) {
            inadimplenciaPercentEl.textContent = `${metricas.inadimplenciaPercentual.toFixed(1)}%`;
        }
        if (inadimplenciaValorEl) {
            inadimplenciaValorEl.textContent = formatCurrency(metricas.inadimplenciaValorTotal);
        }
        if (saldoEl) {
            saldoEl.textContent = formatCurrency(metricas.saldoDisponivel);
        }

        if (proximasDespesasEl) {
            proximasDespesasEl.innerHTML = ''; // Clear current items
            if (metricas.proximasDespesas && metricas.proximasDespesas.length > 0) {
                metricas.proximasDespesas.forEach(despesa => {
                    const li = document.createElement('li');
                    li.textContent = `${despesa.descricao} - ${formatCurrency(despesa.valor)} (Vence em: ${formatDate(new Date(despesa.dataVencimento))})`;
                    proximasDespesasEl.appendChild(li);
                });
            } else {
                proximasDespesasEl.innerHTML = '<li>Nenhuma despesa próxima.</li>';
            }
        }
        renderInadimplenciaChart(metricas); // Call chart rendering
    }

    // Function to render alerts
    function renderAlertas(alertas, container) {
        if (!container) return;
        container.innerHTML = ''; // Clear current items

        if (alertas && alertas.length > 0) {
            alertas.forEach(alerta => {
                const alertItemDiv = document.createElement('div');
                alertItemDiv.className = `db-alert-item db-alert-item--${alerta.criticidade.toLowerCase()}`;

                const titleEl = document.createElement('span');
                titleEl.className = 'db-alert-item__title';
                titleEl.textContent = alerta.titulo;

                const messageEl = document.createElement('p'); // Using <p> for message for better structure
                messageEl.className = 'db-alert-item__message';
                messageEl.textContent = alerta.mensagem;

                const dateEl = document.createElement('span');
                dateEl.className = 'db-alert-item__date';
                dateEl.textContent = `Criado em: ${formatDate(new Date(alerta.dataCriacao))}`;

                alertItemDiv.appendChild(titleEl);
                alertItemDiv.appendChild(messageEl);
                alertItemDiv.appendChild(dateEl);

                container.appendChild(alertItemDiv);
            });
        } else {
            const noAlertsMessage = document.createElement('p');
            noAlertsMessage.textContent = 'Nenhum alerta no momento.';
            container.appendChild(noAlertsMessage);
        }
    }

    // Function to render activities (chamados or avisos)
    function renderAtividades(atividades, container, tipo, placeholderMessage) {
        if (!container) return;
        container.innerHTML = ''; // Clear current items

        const filteredAtividades = atividades ? atividades.filter(a => a.tipo === tipo) : [];

        if (filteredAtividades.length > 0) {
            filteredAtividades.forEach(atividade => {
                const li = document.createElement('li');
                const cleanDescricao = atividade.descricao.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                li.textContent = `${cleanDescricao} (Ocorrido em: ${formatDate(new Date(atividade.dataOcorrencia))})`;
                container.appendChild(li);
            });
        } else {
            container.innerHTML = `<li>${placeholderMessage}</li>`;
        }
    }

    async function carregarDadosDashboard() {

        // Set loading states for all sections (local indicators can remain or be removed if global is sufficient)
        showLoading(inadimplenciaPercentEl.parentNode, 'Carregando métricas...');
        showLoading(alertasEl, '<p>Carregando alertas...</p>');
        showLoading(ultimosChamadosEl.parentNode.parentNode, 'Carregando atividades...');

        // Clear previous chart if any
        if (inadimplenciaChartInstance) {
            inadimplenciaChartInstance.destroy();
            inadimplenciaChartInstance = null;
        }
        if (inadimplenciaChartCanvas) {
            const ctx = inadimplenciaChartCanvas.getContext('2d');
            ctx.clearRect(0, 0, inadimplenciaChartCanvas.width, inadimplenciaChartCanvas.height);
        }

        try {
            console.log('Buscando dados do dashboard...');
            const dados = await apiClient.get('/dashboard/geral', { showSkeleton: dashboardSkeleton });
            console.log('Dados recebidos:', dados);

            // Clear local loading messages (optional, as global feedback is present)
            // clearLoading(inadimplenciaPercentEl.parentNode, '');
            // clearLoading(alertasEl, '<p>Nenhum alerta no momento.</p>');
            // clearLoading(ultimosChamadosEl.parentNode.parentNode, '');

            if (dados) {
                renderMetricas(dados.metricas || null);
                renderAlertas(dados.alertas, alertasEl);
                renderAtividades(dados.atividadesRecentes, ultimosChamadosEl, "Chamado", "Nenhum chamado recente.");
                renderAtividades(dados.atividadesRecentes, ultimosAvisosEl, "Aviso", "Nenhum aviso recente.");
            } else {
                showGlobalFeedback("Não foi possível carregar os dados do dashboard. Resposta vazia.", 'error');
                clearAllSections();
            }
        } catch (error) {
            console.error('Erro ao carregar o dashboard:', error);
            clearAllSections();
            let errorMessage = 'Ocorreu um erro inesperado ao carregar o dashboard.';
            if (error instanceof ApiError) {
                errorMessage = `Erro da API (${error.status || 'Rede'}): ${error.message || 'Não foi possível conectar à API.'}`;
            } else if (error.message) {
                errorMessage = error.message;
            }
            showGlobalFeedback(errorMessage, 'error');
        } finally {
            // skeleton handled by apiClient
        }
    }

    carregarDadosDashboard();

    const roles = getUserRoles();
    const actions = [];
    if (roles.includes('Sindico')) {
        actions.push({ label: 'Novo Aviso', href: 'comunicacao.html' });
    } else {
        actions.push({ label: 'Criar Solicitação', href: 'comunicacao.html' });
    }
    initFabMenu(actions);
});
