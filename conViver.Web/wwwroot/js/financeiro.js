import apiClient, { ApiError, getFriendlyApiErrorMessage, getFriendlyNetworkErrorMessage } from './apiClient.js';
import { requireAuth } from './auth.js';
import {
    formatCurrency,
    formatDate,
    showGlobalFeedback,
    showInlineSpinner,
    createErrorStateElement, // Adicionado
    createEmptyStateElement, // Adicionado
    showModalError,          // Adicionado
    clearModalError,         // Adicionado
    debugLog,
    openModal,
    closeModal
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
    const graficoDespesasSkeletonEl = document.getElementById('graficoDespesasSkeleton');
    const graficoBalanceteEl = document.getElementById('graficoBalancete');
    const graficoBalanceteSkeletonEl = document.getElementById('graficoBalanceteSkeleton');
    const graficoOrcamentoEl = document.getElementById('graficoOrcamento');
    const graficoOrcamentoSkeletonEl = document.getElementById('graficoOrcamentoSkeleton');
    const graficoTendenciasEl = document.getElementById('graficoTendencias');
    const graficoTendenciasSkeletonEl = document.getElementById('graficoTendenciasSkeleton');

    const summaryInadimplenciaEl = document.querySelector('.js-summary-inadimplencia');
    const summaryInadimplenciaSkeletonEl = document.querySelector('.js-summary-inadimplencia-skeleton');
    const summaryPixEl = document.querySelector('.js-summary-pix');
    const summaryPixSkeletonEl = document.querySelector('.js-summary-pix-skeleton');
    const summaryPendentesEl = document.querySelector('.js-summary-pendentes');
    const summaryPendentesSkeletonEl = document.querySelector('.js-summary-pendentes-skeleton');

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
    function openModalCobranca(title, contentHtml) {
        if (modalCobrancaTitle) modalCobrancaTitle.textContent = title;
        if (modalCobrancaBody) modalCobrancaBody.innerHTML = contentHtml;
        if (modalCobranca) openModal(modalCobranca);

        const modalCancelButton = modalCobrancaBody.querySelector('.js-modal-cancel-cobranca');
        if (modalCancelButton) {
            modalCancelButton.addEventListener('click', closeModal);
        }

        const form = modalCobrancaBody.querySelector('form');
        if (form && form.id === 'formNovaCobranca') {
            form.addEventListener('submit', handleNovaCobrancaSubmit);
        }
    }

    function closeModalCobranca() {
        if (modalCobranca) {
            closeModal(modalCobranca);
            if (modalCobrancaBody) modalCobrancaBody.innerHTML = '';
        }
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModalCobranca);
    }
    window.addEventListener('click', (event) => {
        if (event.target === modalCobranca) {
            closeModalCobranca();
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
        const cobrancaCriada = await apiClient.post('/api/v1/financeiro/cobrancas', novaCobrancaDto);
            closeModalCobranca();
            showGlobalFeedback("Cobrança emitida com sucesso!", "success", 2500);

            if (cobrancaCriada && cobrancaCriada.id && tbodyCobrancas) {
                const emptyStateEl = tbodyCobrancas.querySelector('.cv-empty-state');
                if (emptyStateEl) {
                    emptyStateEl.remove();
                }
                 // Adiciona o nome do sacado se não vier da API de criação mas estiver disponível de outra forma (improvável aqui)
                const cardData = { ...cobrancaCriada, nomeSacado: cobrancaCriada.nomeSacado || 'N/A (Nova Cobrança)' };
                const newCard = createCobrancaCardElement(cardData);
                tbodyCobrancas.prepend(newCard); // Adiciona no início
                newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                newCard.classList.add('cv-card--highlight');
                setTimeout(() => newCard.classList.remove('cv-card--highlight'), 2000);
            } else {
                // Fallback: recarregar se não puder adicionar diretamente
                fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
            }
            fetchAndRenderDashboard(); // Atualizar resumo
        } catch (error) {
            console.error('Erro ao criar cobrança:', error);
            let errorMessage = error.message || 'Ocorreu um erro inesperado ao emitir a cobrança.';
            if (error.validationErrors) {
                const messages = [];
                for (const key in error.validationErrors) {
                    error.validationErrors[key].forEach(msg => {
                        // Adiciona a chave do campo se ela não for genérica (como '$')
                        messages.push( (key !== '$' && key !== '') ? `${key}: ${msg}` : msg);
                    });
                }
                if (messages.length > 0) {
                    errorMessage = messages.join('\n');
                } else {
                    errorMessage = error.message || "Erro de validação."; // Fallback se validationErrors estiver vazio
                }
            } else if (error.detalhesValidacao) { // Manter suporte ao formato antigo se existir
                 errorMessage = error.detalhesValidacao;
            }
            showModalError(modalCobranca, errorMessage);
        } finally {
            submitButton.innerHTML = originalButtonText; // Restaura texto original
            submitButton.disabled = false;
        }
    }

    if (btnNovaCobranca) {
        btnNovaCobranca.addEventListener('click', () => {
            openModalCobranca('Emitir Nova Cobrança', novaCobrancaFormHtml);
        });
    }

    if (btnGerarLote) {
        btnGerarLote.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja gerar as cobranças em lote para o mês atual? Esta ação pode levar alguns instantes.')) {
                return;
            }
            btnGerarLote.disabled = true;
            const hideSpinner = showInlineSpinner(btnGerarLote);

            const hoje = new Date();
            const requestBody = {
                Mes: hoje.getMonth() + 1,
                Ano: hoje.getFullYear()
            };

            try {
                const resultado = await apiClient.post('/api/v1/financeiro/cobrancas/gerar-lote', requestBody);
                if (resultado.sucesso) {
                    showGlobalFeedback(resultado.mensagem || "Cobranças em lote geradas com sucesso!", "success", 3000);
                    fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                    fetchAndRenderDashboard();
                } else {
                    showGlobalFeedback(resultado.mensagem || 'Falha ao gerar lote.', 'error');
                }
            } catch (error) {
                console.error('Erro ao gerar lote:', error);
                const friendlyMsg = error instanceof ApiError ? getFriendlyApiErrorMessage(error) : getFriendlyNetworkErrorMessage(error.message);
                showGlobalFeedback(friendlyMsg, 'error');
            } finally {
                btnGerarLote.disabled = false;
                hideSpinner();
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
                openModalCobranca(
                    `Detalhes da Cobrança ${cobrancaId.substring(0,8)}...`,
                    `<p>Detalhes completos da cobrança ${cobrancaId} serão exibidos aqui... (Funcionalidade a ser implementada)</p>`
                );
            } else if (target.classList.contains('js-btn-segunda-via')) {
                target.disabled = true;
                try {
                    const response = await apiClient.get(`/api/v1/financeiro/cobrancas/${cobrancaId}/segunda-via`);
                    if (response && response.url) {
                        window.open(response.url, '_blank');
                    } else {
                        showGlobalFeedback('Não foi possível obter o link da 2ª via ou o link não foi fornecido.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao obter 2ª via:', error);
                    const friendlyMsg = error instanceof ApiError ? getFriendlyApiErrorMessage(error) : getFriendlyNetworkErrorMessage(error.message);
                    showGlobalFeedback(friendlyMsg, 'error');
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
                        // Optimistic UI: Remove/update card directly instead of full fetch
                        const cardToRemove = tbodyCobrancas.querySelector(`.cobranca-card[data-id="${cobrancaId}"]`);
                        if (cardToRemove) {
                            // cardToRemove.remove(); // Or update its status badge
                            // For now, simple refresh is fine as per existing logic, but could be optimized.
                             fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                        } else {
                             fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                        }
                        fetchAndRenderDashboard();
                    } else {
                         // If API returns { sucesso: false, mensagem: "..." }, use that message
                        showGlobalFeedback(resultado.mensagem || 'Falha ao cancelar cobrança.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao cancelar cobrança:', error);
                    const friendlyMsg = error instanceof ApiError ? getFriendlyApiErrorMessage(error) : getFriendlyNetworkErrorMessage(error.message);
                    showGlobalFeedback(friendlyMsg, 'error');
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
                title: filtroStatus ? "Nenhuma Cobrança Encontrada" : "Sem Cobranças Registradas",
                description: filtroStatus
                    ? "Não há cobranças que correspondam ao filtro de status selecionado."
                    : "Ainda não há cobranças registradas ou todas foram liquidadas.",
                actionButton: filtroStatus ? {
                    text: "Limpar Filtro",
                    onClick: () => {
                        if (btnLimparFiltroCobrancaEl) btnLimparFiltroCobrancaEl.click();
                    },
                    classes: ["cv-button--secondary"]
                } : { // Not filtered, general empty state
                    text: "Emitir Nova Cobrança",
                    onClick: () => {
                        // const btnNovaCobranca = document.querySelector('.js-btn-nova-cobranca'); // Already defined globally
                        if (btnNovaCobranca) btnNovaCobranca.click();
                    },
                    classes: ["cv-button--primary"]
                }
            });
            tbodyCobrancas.appendChild(emptyState);
            return;
        }

        cobrancas.forEach(cobranca => {
            const cardElement = createCobrancaCardElement(cobranca);
            tbodyCobrancas.appendChild(cardElement);
        });
    }

    function createCobrancaCardElement(cobranca) {
        const card = document.createElement('div');
        card.className = 'cv-card cobranca-card';
        card.dataset.id = cobranca.id; // Adicionar dataset ID ao card para possível manipulação

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
        return card;
    }

    function renderDashboardFinanceiro(dashboardData) {
        // Hide skeletons, show text content
        if (summaryInadimplenciaSkeletonEl) hideSkeleton(summaryInadimplenciaSkeletonEl);
        if (summaryInadimplenciaEl) summaryInadimplenciaEl.style.display = 'block';
        if (summaryPixSkeletonEl) hideSkeleton(summaryPixSkeletonEl);
        if (summaryPixEl) summaryPixEl.style.display = 'block';
        if (summaryPendentesSkeletonEl) hideSkeleton(summaryPendentesSkeletonEl);
        if (summaryPendentesEl) summaryPendentesEl.style.display = 'block';

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
        // tbodyCobrancas.innerHTML = '<p>Carregando cobranças...</p>'; // Removido, skeleton cobre isso
        if (cobrancasSkeleton) showFeedSkeleton(cobrancasSkeleton);
        tbodyCobrancas.innerHTML = ''; // Limpar qualquer conteúdo anterior (como empty state) antes de mostrar skeleton e carregar

        let apiUrl = '/api/v1/financeiro/cobrancas';
        if (status) {
            apiUrl += `?status=${encodeURIComponent(status)}`;
        }

        try {
            const cobrancas = await apiClient.get(apiUrl);
            renderCobrancas(cobrancas); // renderCobrancas agora lida com o EmptyState
        } catch (error) {
            console.error('Erro ao buscar cobranças:', error);
            if (tbodyCobrancas) { // Garante que o container existe
                tbodyCobrancas.innerHTML = '';
                const friendlyMsg = error instanceof ApiError ? getFriendlyApiErrorMessage(error) : getFriendlyNetworkErrorMessage(error.message);
                const errorState = createErrorStateElement({
                    title: "Erro ao Carregar Cobranças",
                    message: friendlyMsg,
                    retryButton: {
                        text: "Tentar Novamente",
                        onClick: () => fetchAndRenderCobrancas(status)
                    }
                });
                tbodyCobrancas.appendChild(errorState);
            }
        } finally {
            if (cobrancasSkeleton) hideFeedSkeleton(cobrancasSkeleton);
        }
    }

    async function fetchAndRenderDashboard() {
        // Show skeletons, hide text
        if (summaryInadimplenciaEl) summaryInadimplenciaEl.style.display = 'none';
        if (summaryInadimplenciaSkeletonEl) showSkeleton(summaryInadimplenciaSkeletonEl);
        if (summaryPixEl) summaryPixEl.style.display = 'none';
        if (summaryPixSkeletonEl) showSkeleton(summaryPixSkeletonEl);
        if (summaryPendentesEl) summaryPendentesEl.style.display = 'none';
        if (summaryPendentesSkeletonEl) showSkeleton(summaryPendentesSkeletonEl);

        try {
            const dashboardData = await apiClient.get('/api/v1/financeiro/cobrancas/dashboard');
            renderDashboardFinanceiro(dashboardData);
        } catch (error) {
            console.error('Erro ao buscar dados do dashboard financeiro:', error);
            renderDashboardFinanceiro(null);
            const friendlyMsg = error instanceof ApiError ? getFriendlyApiErrorMessage(error) : getFriendlyNetworkErrorMessage(error.message);
            showGlobalFeedback(friendlyMsg, 'error');
        } finally {
            // Skeletons are hidden inside renderDashboardFinanceiro
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

        // Skeleton para a lista de despesas (cards)
        const listaDespesasSkeletonId = 'despesas-lista-skeleton'; // ID para o skeleton da lista
        let listaSkeletonElement = document.getElementById(listaDespesasSkeletonId);
        if (!listaSkeletonElement && despesasTableBody.parentNode) {
            listaSkeletonElement = document.createElement('div');
            listaSkeletonElement.id = listaDespesasSkeletonId;
            listaSkeletonElement.className = 'feed-skeleton-container card-grid'; // Adiciona card-grid para manter layout
            listaSkeletonElement.innerHTML = `
                <div class="cv-card feed-skeleton-item"><div class="skeleton-block skeleton-title" style="width: 40%; height: 20px;"></div><div class="skeleton-block skeleton-line"></div><div class="skeleton-block skeleton-line--short"></div></div>
                <div class="cv-card feed-skeleton-item"><div class="skeleton-block skeleton-title" style="width: 50%; height: 20px;"></div><div class="skeleton-block skeleton-line"></div><div class="skeleton-block skeleton-line--short"></div></div>
            `;
            despesasTableBody.parentNode.insertBefore(listaSkeletonElement, despesasTableBody);
        }
        if (listaSkeletonElement) showSkeleton(listaSkeletonElement);

        // Skeleton para o gráfico de despesas
        if (graficoDespesasSkeletonEl) showSkeleton(graficoDespesasSkeletonEl);
        if (graficoDespesasEl) graficoDespesasEl.style.display = 'none';

        despesasTableBody.innerHTML = ''; // Limpa conteúdo antigo da lista

        try {
            const despesas = await apiClient.get('/api/v1/financeiro/despesas');
            despesasTableBody.innerHTML = '';

            if (despesas && despesas.length) {
                if (graficoDespesasEl) graficoDespesasEl.style.display = 'block'; // Mostrar canvas se houver dados
                renderDespesasChart(despesas); // Renderiza o gráfico antes da lista
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
                    title: "Sem Despesas Registradas",
                    description: "Ainda não há despesas lançadas. Você pode adicionar uma nova despesa.",
                    actionButton: {
                        text: "Adicionar Despesa",
                        onClick: () => {
                            // Placeholder: Logic to open a modal or navigate to a form for adding expenses
                            debugLog("Botão 'Adicionar Despesa' clicado. Implementar ação.");
                            showGlobalFeedback("Funcionalidade 'Adicionar Despesa' a ser implementada.", "info");
                        },
                        classes: ["cv-button--primary"]
                    }
                });
                despesasTableBody.appendChild(emptyState);
            }
            // renderDespesasChart(despesas || []); // Movido para dentro do if (despesas && despesas.length)
            if (!(despesas && despesas.length) && graficoDespesasEl) { // Se não há despesas, não mostra o gráfico
                 graficoDespesasEl.style.display = 'none';
            }
        } catch (err) {
            console.error('Erro ao buscar despesas:', err);
            despesasTableBody.innerHTML = ''; // Limpa
            if (graficoDespesasEl) graficoDespesasEl.style.display = 'none'; // Esconde gráfico em caso de erro
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
            if (listaSkeletonElement) hideSkeleton(listaSkeletonElement);
            if (graficoDespesasSkeletonEl) hideSkeleton(graficoDespesasSkeletonEl);
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
        if (graficoBalanceteSkeletonEl) showSkeleton(graficoBalanceteSkeletonEl);
        if (graficoBalanceteEl) graficoBalanceteEl.style.display = 'none';

        try {
            const dataInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
            const dataFim = new Date().toISOString().split('T')[0];
            const balancete = await apiClient.get(`/api/v1/financeiro/relatorios/balancete?dataInicio=${dataInicio}&dataFim=${dataFim}`);
            if (balancete && (balancete.totalReceitas > 0 || balancete.totalDespesas > 0)) {
                if (graficoBalanceteEl) graficoBalanceteEl.style.display = 'block';
                renderBalanceteChart(balancete);
                 // Limpar mensagens de erro/sem dados se o gráfico for renderizado
                const parent = graficoBalanceteSkeletonEl?.parentNode;
                parent?.querySelector('.no-data-message')?.remove();
                parent?.querySelector('.error-data-message')?.remove();
            } else {
                if (graficoBalanceteEl) graficoBalanceteEl.style.display = 'none';
                if (graficoBalanceteSkeletonEl && graficoBalanceteSkeletonEl.parentNode) {
                    const chartContainer = graficoBalanceteSkeletonEl.parentNode;
                    chartContainer.querySelectorAll('.cv-empty-state, .cv-error-state, .no-data-message, .error-data-message').forEach(el => el.remove());
                    const emptyState = createEmptyStateElement({
                        title: "Gráfico Indisponível",
                        description: "Sem dados suficientes para exibir o gráfico de balancete no momento.",
                        iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px"><path d="M4 9h4v11H4zm0-5h4v4H4zm6 3h4v8h-4zm0-3h4v2h-4zm6 5h4v6h-4zm0-5h4v4h-4z"/></svg>` // Simple bar chart icon
                    });
                    chartContainer.insertBefore(emptyState, graficoBalanceteEl || graficoBalanceteSkeletonEl);
                }
            }
        } catch (err) {
            console.error('Erro ao obter balancete:', err);
            if (graficoBalanceteEl) graficoBalanceteEl.style.display = 'none';
            // showGlobalFeedback('Erro ao carregar relatório de balancete.', 'error'); // REMOVED
            if (graficoBalanceteSkeletonEl && graficoBalanceteSkeletonEl.parentNode) {
                const chartContainer = graficoBalanceteSkeletonEl.parentNode;
                // Limpar mensagens antigas
                chartContainer.querySelectorAll('.cv-error-state, .no-data-message, .error-data-message').forEach(el => el.remove());

                const errorState = createErrorStateElement({
                    title: "Erro no Gráfico",
                    message: err.message || "Não foi possível carregar os dados para o gráfico de balancete.",
                    retryButton: {
                        text: "Tentar Novamente",
                        onClick: fetchAndRenderBalancete
                    }
                });
                // Adicionar o errorState antes do canvas do gráfico ou do skeleton (se o canvas estiver oculto)
                chartContainer.insertBefore(errorState, graficoBalanceteEl || graficoBalanceteSkeletonEl);
            }
        } finally {
            if (graficoBalanceteSkeletonEl) hideSkeleton(graficoBalanceteSkeletonEl);
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
        if (graficoOrcamentoSkeletonEl) showSkeleton(graficoOrcamentoSkeletonEl);
        if (graficoOrcamentoEl) graficoOrcamentoEl.style.display = 'none';

        try {
            const resumo = await apiClient.get('/api/v1/financeiro/orcamento');
            if (resumo && resumo.itens && resumo.itens.length > 0) {
                if (graficoOrcamentoEl) graficoOrcamentoEl.style.display = 'block';
                renderOrcamentoChart(resumo);
                const parent = graficoOrcamentoSkeletonEl?.parentNode;
                parent?.querySelector('.no-data-message')?.remove();
                parent?.querySelector('.error-data-message')?.remove();
            } else {
                if (graficoOrcamentoEl) graficoOrcamentoEl.style.display = 'none';
                if (graficoOrcamentoSkeletonEl && graficoOrcamentoSkeletonEl.parentNode) {
                    const chartContainer = graficoOrcamentoSkeletonEl.parentNode;
                    chartContainer.querySelectorAll('.cv-empty-state, .cv-error-state, .no-data-message, .error-data-message').forEach(el => el.remove());
                    const emptyState = createEmptyStateElement({
                        title: "Gráfico Indisponível",
                        description: "Sem dados de orçamento para exibir o gráfico no momento.",
                        iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px"><path d="M4 9h4v11H4zm0-5h4v4H4zm6 3h4v8h-4zm0-3h4v2h-4zm6 5h4v6h-4zm0-5h4v4h-4z"/></svg>`
                    });
                    chartContainer.insertBefore(emptyState, graficoOrcamentoEl || graficoOrcamentoSkeletonEl);
                }
            }
        } catch (err) {
            console.error('Erro ao obter orçamento:', err);
            if (graficoOrcamentoEl) graficoOrcamentoEl.style.display = 'none';
            // showGlobalFeedback('Erro ao carregar dados do orçamento.', 'error'); // REMOVED
            if (graficoOrcamentoSkeletonEl && graficoOrcamentoSkeletonEl.parentNode) {
                const chartContainer = graficoOrcamentoSkeletonEl.parentNode;
                chartContainer.querySelectorAll('.cv-error-state, .no-data-message, .error-data-message').forEach(el => el.remove());

                const errorState = createErrorStateElement({
                    title: "Erro no Gráfico",
                    message: err.message || "Não foi possível carregar os dados para o gráfico de orçamento.",
                    retryButton: {
                        text: "Tentar Novamente",
                        onClick: fetchAndRenderOrcamento
                    }
                });
                chartContainer.insertBefore(errorState, graficoOrcamentoEl || graficoOrcamentoSkeletonEl);
            }
        } finally {
            if (graficoOrcamentoSkeletonEl) hideSkeleton(graficoOrcamentoSkeletonEl);
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
        if (graficoTendenciasSkeletonEl) showSkeleton(graficoTendenciasSkeletonEl);
        if (graficoTendenciasEl) graficoTendenciasEl.style.display = 'none';

        try {
            const dados = await apiClient.get('/api/v1/financeiro/tendencias');
            if (dados && dados.length > 0) {
                if (graficoTendenciasEl) graficoTendenciasEl.style.display = 'block';
                renderTendenciasChart(dados);
                const parent = graficoTendenciasSkeletonEl?.parentNode;
                parent?.querySelector('.no-data-message')?.remove();
                parent?.querySelector('.error-data-message')?.remove();
            } else {
                if (graficoTendenciasEl) graficoTendenciasEl.style.display = 'none';
                if (graficoTendenciasSkeletonEl && graficoTendenciasSkeletonEl.parentNode) {
                    const chartContainer = graficoTendenciasSkeletonEl.parentNode;
                    chartContainer.querySelectorAll('.cv-empty-state, .cv-error-state, .no-data-message, .error-data-message').forEach(el => el.remove());
                    const emptyState = createEmptyStateElement({
                        title: "Gráfico Indisponível",
                        description: "Sem dados de tendências financeiras para exibir o gráfico no momento.",
                        iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>` // Simple line chart icon
                    });
                    chartContainer.insertBefore(emptyState, graficoTendenciasEl || graficoTendenciasSkeletonEl);
                }
            }
        } catch (err) {
            console.error('Erro ao obter tendencias:', err);
            if (graficoTendenciasEl) graficoTendenciasEl.style.display = 'none';
            // showGlobalFeedback('Erro ao carregar dados de tendências.', 'error'); // REMOVED
            if (graficoTendenciasSkeletonEl && graficoTendenciasSkeletonEl.parentNode) {
                const chartContainer = graficoTendenciasSkeletonEl.parentNode;
                chartContainer.querySelectorAll('.cv-error-state, .no-data-message, .error-data-message').forEach(el => el.remove());

                const errorState = createErrorStateElement({
                    title: "Erro no Gráfico",
                    message: err.message || "Não foi possível carregar os dados para o gráfico de tendências.",
                    retryButton: {
                        text: "Tentar Novamente",
                        onClick: fetchAndRenderTendencias
                    }
                });
                chartContainer.insertBefore(errorState, graficoTendenciasEl || graficoTendenciasSkeletonEl);
            }
        } finally {
            if (graficoTendenciasSkeletonEl) hideSkeleton(graficoTendenciasSkeletonEl);
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
