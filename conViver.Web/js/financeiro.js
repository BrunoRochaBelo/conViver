import apiClient, { ApiError } from './apiClient.js';
import { requireAuth } from './auth.js';
import {
    formatCurrency,
    formatDate,
    showGlobalFeedback,
    showInlineSpinner,
    createErrorStateElement, // Adicionado
    createEmptyStateElement, // Adicionado
    showModalError,          // Adicionado
    clearModalError          // Adicionado
} from './main.js';
import { showFeedSkeleton, hideFeedSkeleton } from './skeleton.js';

function getStatusBadgeHtml(status) {
    const s = status ? status.toLowerCase() : "";
    let type = "success";
    if (s.includes("pendente") || s.includes("aguardando")) type = "warning";
    else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) type = "danger";
    return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${type}"></span>${status}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {

    requireAuth();

    // DOM Elements
    const tbodyCobrancas = document.querySelector('.js-lista-cobrancas');
    const filtroStatusEl = document.querySelector('.js-filtro-status-cobranca');
    const btnLimparFiltroCobrancaEl = document.getElementById('btnLimparFiltroCobranca'); // Botão Limpar Filtro
    const despesasTableBody = document.querySelector('.js-lista-despesas');
    const graficoDespesasEl = document.getElementById('graficoDespesas');
    const graficoBalanceteEl = document.getElementById('graficoBalancete');
    const graficoOrcamentoEl = document.getElementById('graficoOrcamento');
    const graficoTendenciasEl = document.getElementById('graficoTendencias');

    const summaryInadimplenciaEl = document.querySelector('.js-summary-inadimplencia');
    const summaryPixEl = document.querySelector('.js-summary-pix');
    const summaryPendentesEl = document.querySelector('.js-summary-pendentes');

    const cobrancasSkeleton = document.getElementById('financeiro-skeleton');
    // Modal elements
    const modalCobranca = document.getElementById('modalCobranca');
    const modalCobrancaTitle = document.getElementById('modalCobrancaTitle');
    const modalCobrancaBody = document.getElementById('modalCobrancaBody');
    const closeModalButton = document.querySelector('.js-modal-close-cobranca');
    const btnNovaCobranca = document.querySelector('.js-btn-nova-cobranca');
    const btnGerarLote = document.querySelector('.js-btn-gerar-lote');

    // Tab Navigation
    const tabButtons = document.querySelectorAll('#finTabs .cv-tab-button');
    const tabContents = document.querySelectorAll('main .cv-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            const target = document.getElementById('content-' + button.dataset.subtab);
            if (target) {
                target.classList.add('active');
                target.style.display = 'block';
            }

            switch (button.dataset.subtab) {
                case 'despesas':
                    fetchAndRenderDespesas();
                    break;
                case 'relatorios':
                    fetchAndRenderBalancete();
                    break;
                case 'orcamento':
                    fetchAndRenderOrcamento();
                    break;
                case 'tendencias':
                    fetchAndRenderTendencias();
                    break;
                default:
                    break;
            }
        });
    });
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }

    // --- Modal Logic ---
    function openModal(title, contentHtml) {
        if (modalCobrancaTitle) modalCobrancaTitle.textContent = title;
        if (modalCobrancaBody) modalCobrancaBody.innerHTML = contentHtml;
        if (modalCobranca) modalCobranca.style.display = 'block';

        const modalCancelButton = modalCobrancaBody.querySelector('.js-modal-cancel-cobranca');
        if (modalCancelButton) {
            modalCancelButton.addEventListener('click', closeModal);
        }

        const form = modalCobrancaBody.querySelector('form');
        if (form && form.id === 'formNovaCobranca') {
            form.addEventListener('submit', handleNovaCobrancaSubmit);
        }
    }

    function closeModal() {
        if (modalCobranca) {
            modalCobranca.style.display = 'none';
            if (modalCobrancaBody) modalCobrancaBody.innerHTML = '';
        }
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === modalCobranca) {
            closeModal();
        }
    });

    // --- HTML for Nova Cobrança Form ---
    const novaCobrancaFormHtml = `
        <form id="formNovaCobranca" class="cv-form">
            <div class="cv-form__group">
                <label for="ncUnidadeId" class="cv-form__label">Unidade ID:</label>
                <input type="text" id="ncUnidadeId" name="unidadeId" class="cv-input" required placeholder="Ex: 001, 101A, etc.">
            </div>
            <div class="cv-form__group">
                <label for="ncValor" class="cv-form__label">Valor (R$):</label>
                <input type="number" id="ncValor" name="valor" class="cv-input" required step="0.01" min="0.01" placeholder="Ex: 150.50">
            </div>
            <div class="cv-form__group">
                <label for="ncDataVencimento" class="cv-form__label">Data de Vencimento:</label>
                <input type="date" id="ncDataVencimento" name="dataVencimento" class="cv-input" required>
            </div>
            <div class="cv-form__group">
                <label for="ncDescricao" class="cv-form__label">Descrição (Opcional):</label>
                <input type="text" id="ncDescricao" name="descricao" class="cv-input" placeholder="Ex: Taxa condominial, Multa, etc.">
            </div>
            <div class="cv-form__actions">
                <button type="submit" class="cv-button cv-button--primary" id="btnSalvarCobranca">Salvar Cobrança</button>
                <button type="button" class="cv-button js-modal-cancel-cobranca">Cancelar</button>
            </div>
        </form>
    `;

    // --- Event Handlers ---
    async function handleNovaCobrancaSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent; // Salva o texto original

        submitButton.disabled = true;
        submitButton.innerHTML = 'Salvando... <span class="inline-spinner"></span>'; // Adiciona spinner
        clearModalError(modalCobranca); // modalCobranca é a referência ao elemento do modal

        const unidadeId = form.unidadeId.value.trim();
        const valor = parseFloat(form.valor.value);
        const dataVencimento = form.dataVencimento.value;
        const descricao = form.descricao.value.trim();
        let validationError = null;

        if (!unidadeId || !valor || !dataVencimento) {
            validationError = 'Por favor, preencha Unidade, Valor e Data de Vencimento.';
        } else if (isNaN(valor) || valor <= 0) {
            validationError = 'O valor da cobrança deve ser um número positivo.';
        } else {
            const hoje = new Date();
            const dataVencObj = new Date(dataVencimento + "T00:00:00"); // Considerar timezone
            hoje.setHours(0,0,0,0); // Normalizar hoje para comparar só data

            if (dataVencObj < hoje) {
                 validationError = 'A data de vencimento não pode ser no passado.';
            }
        }

        if (validationError) {
            showModalError(modalCobranca, validationError);
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        const novaCobrancaDto = { UnidadeId: unidadeId, Valor: valor, DataVencimento: dataVencimento, Descricao: descricao };

        try {
            await apiClient.post('/financeiro/cobrancas', novaCobrancaDto);
            closeModal();
            showGlobalFeedback("Cobrança emitida com sucesso!", "success", 2500); // Toast de sucesso
            fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
            fetchAndRenderDashboard();
        } catch (error) {
            console.error('Erro ao criar cobrança:', error);
            const errorMessage = error.detalhesValidacao || error.message || 'Ocorreu um erro inesperado ao emitir a cobrança.';
            showModalError(modalCobranca, errorMessage);
        } finally {
            submitButton.innerHTML = originalButtonText; // Restaura texto original
            submitButton.disabled = false;
        }
    }

    if (btnNovaCobranca) {
        btnNovaCobranca.addEventListener('click', () => {
            openModal('Emitir Nova Cobrança', novaCobrancaFormHtml);
        });
    }

    if (btnGerarLote) {
        btnGerarLote.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja gerar as cobranças em lote para o mês atual? Esta ação pode levar alguns instantes.')) {
                return;
            }
            btnGerarLote.disabled = true;

            const hoje = new Date();
            const requestBody = {
                Mes: hoje.getMonth() + 1,
                Ano: hoje.getFullYear()
            };

            try {
                const resultado = await apiClient.post('/financeiro/cobrancas/gerar-lote', requestBody);
                if (resultado.sucesso) {
                    showGlobalFeedback(resultado.mensagem || "Cobranças em lote geradas com sucesso!", "success", 3000);
                    fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                    fetchAndRenderDashboard();
                } else {
                    showGlobalFeedback(resultado.mensagem || 'Falha ao gerar lote.', 'error');
                }
            } catch (error) {
                console.error('Erro ao gerar lote:', error);
                const defaultMessage = 'Ocorreu um erro inesperado ao gerar o lote de cobranças.';
                if (error instanceof ApiError) {
                    showGlobalFeedback(`Erro da API ao gerar lote: ${error.message || defaultMessage}`, 'error');
                } else {
                    showGlobalFeedback(defaultMessage, 'error');
                }
            } finally {
                btnGerarLote.disabled = false;
            }
        });
    }

    if (tbodyCobrancas) {
        tbodyCobrancas.addEventListener('click', async (event) => {
            const target = event.target.closest('button');
            if (!target) return;

            const cobrancaId = target.dataset.id;
            if (!cobrancaId) return;

            if (target.classList.contains('js-btn-detalhes-cobranca')) {
                openModal(
                    `Detalhes da Cobrança ${cobrancaId.substring(0,8)}...`,
                    `<p>Detalhes completos da cobrança ${cobrancaId} serão exibidos aqui... (Funcionalidade a ser implementada)</p>`
                );
            } else if (target.classList.contains('js-btn-segunda-via')) {
                target.disabled = true;
                try {
                    const response = await apiClient.get(`/financeiro/cobrancas/${cobrancaId}/segunda-via`);
                    if (response && response.url) {
                        window.open(response.url, '_blank');
                    } else {
                        showGlobalFeedback('Não foi possível obter o link da 2ª via ou o link não foi fornecido.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao obter 2ª via:', error);
                    showGlobalFeedback(`Erro ao obter 2ª via: ${error.message || 'Tente novamente.'}`, 'error');
                } finally {
                    target.disabled = false;
                }
            } else if (target.classList.contains('js-btn-cancelar-cobranca')) {
                if (!confirm('Tem certeza que deseja cancelar esta cobrança?')) return;
                target.disabled = true;
                const hideSpinner = showInlineSpinner(target);
                try {
                    const resultado = await apiClient.put(`/financeiro/cobrancas/${cobrancaId}/cancelar`, {});
                    if (resultado && resultado.sucesso) {
                        showGlobalFeedback(resultado.mensagem || "Cobrança cancelada com sucesso!", "success", 2500);
                        fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                        fetchAndRenderDashboard();
                    } else {
                        showGlobalFeedback(resultado.mensagem || 'Falha ao cancelar cobrança.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao cancelar cobrança:', error);
                    const defaultMessage = 'Ocorreu um erro inesperado ao cancelar a cobrança.';
                    if (error instanceof ApiError) {
                        showGlobalFeedback(`Erro ao cancelar cobrança: ${error.message || defaultMessage}`, 'error');
                    } else {
                        showGlobalFeedback(defaultMessage, 'error');
                    }
                } finally {
                    target.disabled = false;
                    hideSpinner();
                }
            }
        });
    }

    // --- Funções de Renderização ---
    function renderCobrancas(cobrancas) {
        if (!tbodyCobrancas) {
            console.error('Elemento .js-lista-cobrancas não encontrado.');
            return;
        }
        tbodyCobrancas.innerHTML = ''; // Limpa antes de adicionar EmptyState ou cards

        if (!cobrancas || cobrancas.length === 0) {
            const filtroStatus = filtroStatusEl ? filtroStatusEl.value : '';
            const emptyState = createEmptyStateElement({
                iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48px" height="48px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9h4v2h-4v-2zm0-4h4v2h-4V7z"/></svg>`, // Ícone genérico de lista/dinheiro
                title: filtroStatus ? "Nenhuma Cobrança Encontrada" : "Sem Cobranças",
                description: filtroStatus
                    ? "Não há cobranças que correspondam ao filtro de status selecionado."
                    : "Ainda não há cobranças registradas ou todas foram liquidadas.",
                actionButton: filtroStatus ? {
                    text: "Limpar Filtro",
                    onClick: () => {
                        if (btnLimparFiltroCobrancaEl) btnLimparFiltroCobrancaEl.click();
                    },
                    classes: ["cv-button--secondary"]
                } : null
            });
            tbodyCobrancas.appendChild(emptyState);
            return;
        }

        cobrancas.forEach(cobranca => {
            const card = document.createElement('div');
            card.className = 'cv-card cobranca-card';

            const statusKey = cobranca.statusCobranca || '';
            const cancellableStatuses = ["Pendente", "Gerado", "Registrado", "Enviado", "Atrasado"];

            card.innerHTML = `
                <div class="cobranca-card__header">
                    <h3>🏠 ${cobranca.unidadeId ? cobranca.unidadeId : 'N/A'}</h3>
                    ${getStatusBadgeHtml(statusKey)}
                </div>
                <p>👤 ${cobranca.nomeSacado || 'N/A'}</p>
                <p>💵 ${formatCurrency(cobranca.valor)}</p>
                <p>📅 ${formatDate(new Date(cobranca.dataVencimento))}</p>
                <div class="cobranca-card__actions">
                    <button class="cv-button cv-button--small cv-button--info js-btn-detalhes-cobranca" data-id="${cobranca.id}" title="Detalhes">Detalhes</button>
                    <button class="cv-button cv-button--small js-btn-segunda-via" data-id="${cobranca.id}" title="2ª Via">2ª Via</button>
                    ${cancellableStatuses.includes(statusKey) ? `<button class="cv-button cv-button--small cv-button--danger js-btn-cancelar-cobranca" data-id="${cobranca.id}" title="Cancelar">Cancelar</button>` : ''}
                </div>
            `;
            tbodyCobrancas.appendChild(card);
        });
    }

    function renderDashboardFinanceiro(dashboardData) {
        if (!dashboardData) {
            if (summaryInadimplenciaEl) summaryInadimplenciaEl.textContent = '--%';
            if (summaryPixEl) summaryPixEl.textContent = 'R$ --';
            if (summaryPendentesEl) summaryPendentesEl.textContent = '--';
            return;
        }

        if (summaryInadimplenciaEl) {
            summaryInadimplenciaEl.textContent = `${dashboardData.inadimplenciaPercentual.toFixed(1)}%`;
        }
        if (summaryPixEl) {
            summaryPixEl.textContent = formatCurrency(dashboardData.totalPixMes);
        }
        if (summaryPendentesEl) {
            summaryPendentesEl.textContent = dashboardData.totalBoletosPendentes;
        }
    }

    // --- Funções de Fetch ---
    async function fetchAndRenderCobrancas(status = '') {
        if (!tbodyCobrancas) return;
        tbodyCobrancas.innerHTML = '<p>Carregando cobranças...</p>';
        if (cobrancasSkeleton) showFeedSkeleton(cobrancasSkeleton);

        let apiUrl = '/financeiro/cobrancas';
        if (status) {
            apiUrl += `?status=${encodeURIComponent(status)}`;
        }

        try {
            const cobrancas = await apiClient.get(apiUrl);
            renderCobrancas(cobrancas); // renderCobrancas agora lida com o EmptyState
        } catch (error) {
            console.error('Erro ao buscar cobranças:', error);
            if (tbodyCobrancas) { // Garante que o container existe
                tbodyCobrancas.innerHTML = ''; // Limpa mensagens de carregamento ou conteúdo antigo
                const errorState = createErrorStateElement({
                    title: "Erro ao Carregar Cobranças",
                    message: error.message || "Não foi possível buscar as cobranças. Verifique sua conexão e tente novamente.",
                    retryButton: {
                        text: "Tentar Novamente",
                        onClick: () => fetchAndRenderCobrancas(status)
                    }
                });
                tbodyCobrancas.appendChild(errorState);
            }
            // O showGlobalFeedback foi removido pois o ErrorState é o feedback principal.
        } finally {
            if (cobrancasSkeleton) hideFeedSkeleton(cobrancasSkeleton);
        }
    }

    async function fetchAndRenderDashboard() {
        if (cobrancasSkeleton) showFeedSkeleton(cobrancasSkeleton);
        if (summaryInadimplenciaEl) summaryInadimplenciaEl.textContent = 'Carregando...';
        if (summaryPixEl) summaryPixEl.textContent = 'Carregando...';
        if (summaryPendentesEl) summaryPendentesEl.textContent = 'Carregando...';

        try {
            const dashboardData = await apiClient.get('/financeiro/cobrancas/dashboard');
            renderDashboardFinanceiro(dashboardData);
        } catch (error) {
            console.error('Erro ao buscar dados do dashboard financeiro:', error);
            renderDashboardFinanceiro(null);
            const defaultMessage = 'Ocorreu um erro inesperado ao buscar dados do dashboard.';
            if (error instanceof ApiError) {
                showGlobalFeedback(`Erro ao buscar dados do dashboard: ${error.message || defaultMessage}`, 'error');
            } else {
                showGlobalFeedback(defaultMessage, 'error');
            }
        } finally {
            if (cobrancasSkeleton) hideFeedSkeleton(cobrancasSkeleton);
        }
    }

    // --- Novas Seções ---
    let despesasChart = null;
    let balanceteChart = null;
    let orcamentoChart = null;
    let tendenciasChart = null;

    function renderDespesasChart(despesas) {
        if (!graficoDespesasEl || typeof Chart === 'undefined') return;
        if (despesasChart) despesasChart.destroy();
        const data = {
            labels: despesas.map(d => d.categoria),
            datasets: [{ label: 'Valor', data: despesas.map(d => d.valor), backgroundColor: '#36A2EB' }]
        };
        despesasChart = new Chart(graficoDespesasEl.getContext('2d'), { type: 'bar', data });
    }

    async function fetchAndRenderDespesas() {
        if (!despesasTableBody) return;

        const despesasSkeletonId = 'despesas-skeleton'; // ID para o skeleton de despesas
        let skeletonElement = document.getElementById(despesasSkeletonId);
        if (!skeletonElement && despesasTableBody.parentNode) { // Cria skeleton se não existir
            skeletonElement = document.createElement('div');
            skeletonElement.id = despesasSkeletonId;
            skeletonElement.className = 'feed-skeleton-container'; // Reutilizar estilo de skeleton
            skeletonElement.innerHTML = `
                <div class="feed-skeleton-item"><div class="skeleton-block skeleton-title" style="width: 40%; height: 20px;"></div><div class="skeleton-block skeleton-line"></div><div class="skeleton-block skeleton-line--short"></div></div>
                <div class="feed-skeleton-item"><div class="skeleton-block skeleton-title" style="width: 50%; height: 20px;"></div><div class="skeleton-block skeleton-line"></div><div class="skeleton-block skeleton-line--short"></div></div>
            `; // Skeleton simples para 2 cards
            despesasTableBody.parentNode.insertBefore(skeletonElement, despesasTableBody);
        }

        if (skeletonElement) showSkeleton(skeletonElement);
        despesasTableBody.innerHTML = ''; // Limpa conteúdo antigo

        try {
            const despesas = await apiClient.get('/financeiro/despesas');
            despesasTableBody.innerHTML = ''; // Limpa novamente caso o skeleton tenha sido inserido no mesmo container

            if (despesas && despesas.length) {
                despesas.forEach(d => {
                    const card = document.createElement('div');
                    card.className = 'cv-card despesa-card'; // Manter card para estilo
                    card.innerHTML = `
                        <div class="despesa-card__header">
                            <h3>💸 ${d.categoria || 'Despesa'}</h3>
                            <span>${formatCurrency(d.valor)}</span>
                        </div>
                        <p>Vencimento: 📅 ${formatDate(new Date(d.dataVencimento))}</p>
                        ${d.descricao ? `<p class="despesa-card__descricao"><em>${d.descricao}</em></p>` : ''}
                    `;
                    despesasTableBody.appendChild(card);
                });
            } else {
                const emptyState = createEmptyStateElement({
                    iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48px" height="48px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 7h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>`, // Ícone de informação/lista vazia
                    title: "Sem Despesas",
                    description: "Nenhuma despesa registrada para este período ou com os filtros aplicados."
                });
                despesasTableBody.appendChild(emptyState);
            }
            renderDespesasChart(despesas || []);
        } catch (err) {
            console.error('Erro ao buscar despesas:', err);
            despesasTableBody.innerHTML = ''; // Limpa
            const errorState = createErrorStateElement({
                title: "Erro ao Carregar Despesas",
                message: err.message || "Não foi possível buscar as despesas. Tente novamente.",
                retryButton: {
                    text: "Tentar Novamente",
                    onClick: fetchAndRenderDespesas
                }
            });
            despesasTableBody.appendChild(errorState);
            // showGlobalFeedback foi removido
        } finally {
            if (skeletonElement) hideSkeleton(skeletonElement);
        }
    }

    function renderBalanceteChart(balancete) {
        if (!graficoBalanceteEl || typeof Chart === 'undefined' || !balancete) return;
        if (balanceteChart) balanceteChart.destroy();
        const data = {
            labels: ['Receitas', 'Despesas'],
            datasets: [{ data: [balancete.totalReceitas || 0, balancete.totalDespesas || 0], backgroundColor: ['#36A2EB', '#FF6384'] }]
        };
        balanceteChart = new Chart(graficoBalanceteEl.getContext('2d'), { type: 'doughnut', data });
    }

    async function fetchAndRenderBalancete() {
        try {
            const dataInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            const dataFim = new Date().toISOString().split('T')[0];
            const balancete = await apiClient.get(`/financeiro/relatorios/balancete?dataInicio=${dataInicio}&dataFim=${dataFim}`);
            renderBalanceteChart(balancete);
        } catch (err) {
            console.error('Erro ao obter balancete:', err);
            showGlobalFeedback('Erro ao carregar relatório', 'error');
        }
    }

    function renderOrcamentoChart(resumo) {
        if (!graficoOrcamentoEl || typeof Chart === 'undefined' || !resumo) return;
        if (orcamentoChart) orcamentoChart.destroy();
        const data = {
            labels: (resumo.itens || []).map(i => i.categoria),
            datasets: [{ label: 'Valor', data: (resumo.itens || []).map(i => i.valor), backgroundColor: '#4BC0C0' }]
        };
        orcamentoChart = new Chart(graficoOrcamentoEl.getContext('2d'), { type: 'bar', data });
    }

    async function fetchAndRenderOrcamento() {
        try {
            const resumo = await apiClient.get('/financeiro/orcamento');
            renderOrcamentoChart(resumo);
        } catch (err) {
            console.error('Erro ao obter orçamento:', err);
            showGlobalFeedback('Erro ao carregar orçamento', 'error');
        }
    }

    function renderTendenciasChart(tendencias) {
        if (!graficoTendenciasEl || typeof Chart === 'undefined' || !Array.isArray(tendencias)) return;
        if (tendenciasChart) tendenciasChart.destroy();
        const data = {
            labels: tendencias.map(t => t.mes),
            datasets: [{ label: 'Valor', data: tendencias.map(t => t.valor), backgroundColor: '#FFCE56' }]
        };
        tendenciasChart = new Chart(graficoTendenciasEl.getContext('2d'), { type: 'line', data });
    }

    async function fetchAndRenderTendencias() {
        try {
            const dados = await apiClient.get('/financeiro/tendencias');
            renderTendenciasChart(dados);
        } catch (err) {
            console.error('Erro ao obter tendencias:', err);
            showGlobalFeedback('Erro ao carregar tendencias', 'error');
        }
    }

    // --- Inicialização ---
    if (tbodyCobrancas && filtroStatusEl) {
        fetchAndRenderCobrancas();
        fetchAndRenderDashboard();

        filtroStatusEl.addEventListener('change', (event) => {
            fetchAndRenderCobrancas(event.target.value);
        });

        if (btnLimparFiltroCobrancaEl) {
            btnLimparFiltroCobrancaEl.addEventListener('click', () => {
                if (filtroStatusEl) {
                    filtroStatusEl.value = ''; // Reseta o select para "Todos"
                }
                fetchAndRenderCobrancas(''); // Carrega cobranças sem filtro de status
            });
        }

    } else {
        console.error("Elementos essenciais do DOM não encontrados para a página de finanças.");
    }
});
