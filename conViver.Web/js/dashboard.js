import apiClient, { ApiError } from './apiClient.js';
import { requireAuth, getUserRoles } from './auth.js';
import {
    formatCurrency,
    formatDate,
    showGlobalFeedback,
    createErrorStateElement, // Adicionado
    createEmptyStateElement, // Adicionado
    showSkeleton,            // Adicionado
    hideSkeleton             // Adicionado
} from './main.js';
import messages from './messages.js';
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

    // Referência ao container principal do conteúdo do dashboard para ErrorState global
    const dashboardContentWrapper = document.querySelector('.dashboard-layout'); // Assumindo que .dashboard-layout engloba todo o conteúdo mutável

    // Skeletons para seções individuais (IDs ou classes que devem estar no HTML)
    const metricasSkeleton = document.getElementById('metricas-skeleton'); // Exemplo de ID
    const alertasSkeleton = document.getElementById('alertas-skeleton');
    const atividadesSkeleton = document.getElementById('atividades-skeleton');
    const chartSkeleton = document.getElementById('chart-skeleton'); // Para a área do gráfico

    // O dashboardSkeleton global pode ser usado para cobrir tudo inicialmente
    const globalDashboardSkeleton = document.getElementById('dashboard-skeleton');


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

            // Exibir mensagem diretamente no canvas
            ctx.font = "14px 'Open Sans', sans-serif";
            ctx.fillStyle = 'var(--current-text-secondary, #6c757d)';
            ctx.textAlign = "center";
            ctx.fillText("Dados do gráfico indisponíveis", inadimplenciaChartCanvas.width / 2, inadimplenciaChartCanvas.height / 2);

            // Se houvesse um container HTML para o gráfico, poderíamos usar EmptyState:
            // const chartContainer = inadimplenciaChartCanvas.parentNode;
            // if (chartContainer) {
            //     chartContainer.innerHTML = ''; // Limpa o canvas anterior
            //     const emptyState = createEmptyStateElement({ title: "Gráfico Indisponível", description: "Não há dados para exibir o gráfico de inadimplência."});
            //     chartContainer.appendChild(emptyState);
            // }
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
            // container.innerHTML = ''; // Já feito no início da função
            const emptyState = createEmptyStateElement({
                iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`, // Ícone de sino
                title: "Sem Alertas",
                description: "Nenhum alerta novo para exibir no momento."
            });
            container.appendChild(emptyState);
        }
    }

    // Function to render activities (chamados or avisos)
    function renderAtividades(atividades, container, tipo, placeholderMessage) {
        if (!container) return;
        container.innerHTML = ''; // Clear current items

        const filteredAtividades = atividades ? atividades.filter(a => a.tipo === tipo) : [];

        if (filteredAtividades.length > 0) {
            const ul = document.createElement('ul'); // Garante que é uma lista
            ul.className = 'db-activity-list'; // Adiciona uma classe para estilização se necessário
            filteredAtividades.forEach(atividade => {
                const li = document.createElement('li');
                // Sanitizar a descrição é uma boa prática, mas se a API já retorna texto seguro, pode ser opcional.
                // A substituição de < > é uma sanitização muito básica. Considerar bibliotecas se o HTML for complexo.
                const cleanDescricao = atividade.descricao // .replace(/</g, "&lt;").replace(/>/g, "&gt;");
                li.innerHTML = `<strong>${tipo}:</strong> ${cleanDescricao} <span class="text-muted">(${formatDate(new Date(atividade.dataOcorrencia))})</span>`;
                ul.appendChild(li);
            });
            container.appendChild(ul);
        } else {
            let icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 12H5V5h14v9z"/></svg>`; // Ícone de chat/lista
            if (tipo === "Aviso") {
                icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`; // Ícone de aviso/info
            }
            const emptyState = createEmptyStateElement({
                iconHTML: icon,
                title: tipo === "Chamado" ? "Sem Solicitações Recentes" : "Sem Avisos Recentes",
                description: placeholderMessage // Usa o placeholderMessage como descrição
            });
            container.appendChild(emptyState);
        }
    }

    async function carregarDadosDashboard() {
        // Remover ErrorState anterior, se houver
        if (dashboardContentWrapper) {
            const existingErrorState = dashboardContentWrapper.querySelector('.cv-error-state');
            if (existingErrorState) existingErrorState.remove();
            // Garantir que o conteúdo principal (onde os cards/skeletons vão) esteja visível
            const mainDashboardArea = dashboardContentWrapper.querySelector('.dashboard-grid-container'); // Supondo uma classe para a área de conteúdo
            if (mainDashboardArea) mainDashboardArea.style.display = '';
        }

        // Mostrar skeletons individuais ou um global
        if (globalDashboardSkeleton) showSkeleton(globalDashboardSkeleton);
        // Ou, para granularidade:
        // if (metricasSkeleton) showSkeleton(metricasSkeleton);
        // if (alertasSkeleton) showSkeleton(alertasSkeleton);
        // if (atividadesSkeleton) showSkeleton(atividadesSkeleton);
        // if (chartSkeleton) showSkeleton(chartSkeleton);


        // Limpar gráfico anterior
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
            // apiClient.get pode ser modificado para não precisar passar o skeleton global se vamos controlar por seção
            const dados = await apiClient.get('/dashboard/geral' /*, { showSkeleton: globalDashboardSkeleton } */);
            console.log('Dados recebidos:', dados);

            if (dados) {
                renderMetricas(dados.metricas || null);
                renderAlertas(dados.alertas, alertasEl); // `alertasEl` é o container, renderAlertas o preenche
                renderAtividades(dados.atividadesRecentes, ultimosChamadosEl, "Chamado", "Nenhum chamado recente.");
                renderAtividades(dados.atividadesRecentes, ultimosAvisosEl, "Aviso", "Nenhum aviso recente.");
            } else {
                // Se dados for null/undefined mas não houve exceção (improvável com apiClient)
                throw new ApiError("Resposta vazia do servidor ao carregar dados do dashboard.", null, null, "Resposta inesperada");
            }
        } catch (error) {
            console.error('Erro ao carregar o dashboard:', error);

            if (dashboardContentWrapper) {
                // Esconder o conteúdo principal do dashboard para dar lugar ao ErrorState
                const mainDashboardArea = dashboardContentWrapper.querySelector('.dashboard-grid-container');
                if (mainDashboardArea) mainDashboardArea.style.display = 'none';

                const errorState = createErrorStateElement({
                    title: "Falha ao Carregar o Dashboard",
                    message: error.message || "Não foi possível buscar os dados do dashboard. Verifique sua conexão e tente novamente.",
                    retryButton: {
                        text: "Tentar Novamente",
                        onClick: carregarDadosDashboard // Chama a própria função para tentar novamente
                    }
                });
                // Adiciona o error state ao wrapper principal do dashboard
                dashboardContentWrapper.appendChild(errorState);
            } else {
                // Fallback se o wrapper não for encontrado
                clearAllSections(); // Comportamento antigo
                showGlobalFeedback(error.message || 'Ocorreu um erro inesperado ao carregar o dashboard.', 'error');
            }
        } finally {
            if (globalDashboardSkeleton) hideSkeleton(globalDashboardSkeleton);
            // Ou, para granularidade:
            // if (metricasSkeleton) hideSkeleton(metricasSkeleton);
            // if (alertasSkeleton) hideSkeleton(alertasSkeleton);
            // if (atividadesSkeleton) hideSkeleton(atividadesSkeleton);
            // if (chartSkeleton) hideSkeleton(chartSkeleton);
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
