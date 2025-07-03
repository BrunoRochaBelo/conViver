import apiClient from './apiClient.js';
import { requireAuth, getRoles } from './auth.js';
import {
    showGlobalFeedback,
    createErrorStateElement,
    createEmptyStateElement,
    showSkeleton,
    hideSkeleton,
    showModalError,
    clearModalError,
    openModal,
    closeModal
} from './main.js';
import { initFabMenu } from './fabMenu.js';
import { createProgressBar, showProgress, xhrPost } from './progress.js';

// --- Elementos Globais e Modais ---
let modalRegistrarVisitante, formRegistrarVisitante, btnValidarQRCodeModal;
let modalRegistrarEncomenda, formNovaEncomendaModal;
let modalFiltrosPortaria, modalSortPortaria;
let openFilterModalButton, openSortButton;

// Estado do feed de Portaria
let currentPortariaPage = 1;
let isLoadingPortariaItems = false;
let noMorePortariaItems = false;
const portariaFeedContainerSelector = ".js-portaria-feed";
const portariaEncomendasFeedContainerSelector = ".js-portaria-feed-encomendas";
const portariaScrollSentinelId = "portaria-scroll-sentinel";
let fetchedPortariaItems = [];
let currentPortariaSortOrder = "desc";
let currentPortariaFilters = {};
let activePortariaTab = "visitantes"; // 'visitantes' ou 'encomendas'
let tipoVisualizacaoVisitantes = "atuais"; // 'atuais' ou 'historico'

// --- Badge de Status ---
function getStatusBadgeHtml(status) {
    const s = status ? status.toLowerCase() : "";
    let type = "default";
    let icon = "info";
    if (s.includes("presente") || s.includes("aguardando") || s.includes("recebida")) {
        type = "warning"; icon = "clock";
    } else if (s.includes("saiu") || s.includes("entregue") || s.includes("concluído")) {
        type = "success"; icon = "check-circle";
    } else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) {
        type = "danger"; icon = "x-circle";
    }
    return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${icon}"></span>${status}</span>`;
}

// --- Configuração das Abas ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.cv-tabs-buttons .cv-tab-button');
    const tabContents = document.querySelectorAll('main > .cv-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => content.style.display = 'none');

            const targetContentId = button.id.replace('tab-', 'content-');
            const targetContent = document.getElementById(targetContentId);
            if (!targetContent) return;

            targetContent.style.display = 'block';
            activePortariaTab = (button.id === 'tab-visitantes') ? 'visitantes' : 'encomendas';

            // Reset e recarga de feed
            currentPortariaPage = 1;
            noMorePortariaItems = false;
            fetchedPortariaItems = [];
            loadInitialPortariaItems();
        });
    });

    if (tabButtons.length) tabButtons[0].click();
}

// --- Modais de Registro ---
function openRegistrarVisitanteModal() {
    formRegistrarVisitante.reset();
    clearModalError(modalRegistrarVisitante);
    document.getElementById('visQRCodeEntrada').value = '';
    openModal(modalRegistrarVisitante);
}
function closeRegistrarVisitanteModal() {
    closeModal(modalRegistrarVisitante);
}
function openRegistrarEncomendaModal() {
    formNovaEncomendaModal.reset();
    clearModalError(modalRegistrarEncomenda);
    openModal(modalRegistrarEncomenda);
}
function closeRegistrarEncomendaModal() {
    closeModal(modalRegistrarEncomenda);
}

// --- Modal de Filtros e Ordenação ---
function toggleHistoricoFiltersVisibility(show) {
    document.querySelectorAll('#modal-filtros-portaria [data-filter-context="visitantes_historico"]')
        .forEach(el => el.style.display = show ? 'block' : 'none');
}

function updateFilterButtonIndicator() {
    const hasFilters = Object.values(currentPortariaFilters).some(v => v && v !== '');
    const tipoChanged = (activePortariaTab === 'visitantes' && tipoVisualizacaoVisitantes !== 'atuais');
    openFilterModalButton.classList.toggle('has-indicator', hasFilters || tipoChanged);
}

function setupFilterModalAndButton() {
    const closeBtn = document.querySelector(".js-modal-filtros-portaria-close");
    const applyBtn = document.getElementById("apply-filters-button-portaria-modal");
    const clearBtn = document.getElementById("clear-filters-button-portaria-modal");
    const tipoSelect = document.getElementById("portaria-tipo-visitante-filter");

    openFilterModalButton.addEventListener("click", () => {
        const visitanteCtx = modalFiltrosPortaria.querySelectorAll('[data-filter-context="visitantes"], [data-filter-context="visitantes_historico"]');
        const encomendaCtx = modalFiltrosPortaria.querySelectorAll('[data-filter-context="encomendas"]');
        const title = modalFiltrosPortaria.querySelector("h2");
        if (activePortariaTab === 'visitantes') {
            visitanteCtx.forEach(el => el.style.display = 'block');
            encomendaCtx.forEach(el => el.style.display = 'none');
            title.textContent = "Filtros de Visitantes";
            toggleHistoricoFiltersVisibility(tipoSelect.value === 'historico');
        } else {
            visitanteCtx.forEach(el => el.style.display = 'none');
            encomendaCtx.forEach(el => el.style.display = 'block');
            title.textContent = "Filtros de Encomendas";
        }
        openModal(modalFiltrosPortaria);
    });

    closeBtn.addEventListener("click", () => closeModal(modalFiltrosPortaria));
    window.addEventListener("click", e => { if (e.target === modalFiltrosPortaria) closeModal(modalFiltrosPortaria); });

    applyBtn.addEventListener("click", () => {
        currentPortariaFilters = {};
        if (activePortariaTab === 'visitantes') {
            tipoVisualizacaoVisitantes = tipoSelect.value;
            currentPortariaFilters.unidadeId = document.getElementById("filterUnidadeVisitantes").value.trim();
            if (tipoVisualizacaoVisitantes === 'historico') {
                currentPortariaFilters.dataInicio = document.getElementById("filterHistDataInicio").value;
                currentPortariaFilters.dataFim = document.getElementById("filterHistDataFim").value;
                currentPortariaFilters.nomeVisitante = document.getElementById("filterHistNome").value.trim();
            }
        } else {
            currentPortariaFilters.unidadeIdEncomenda = document.getElementById("filterUnidadeEncomendas").value.trim();
            currentPortariaFilters.statusEncomenda = document.getElementById("filterStatusEncomenda").value;
        }
        loadInitialPortariaItems();
        closeModal(modalFiltrosPortaria);
        updateFilterButtonIndicator();
    });

    clearBtn.addEventListener("click", () => {
        modalFiltrosPortaria.querySelectorAll("input, select").forEach(el => el.value = '');
        currentPortariaFilters = {};
        tipoVisualizacaoVisitantes = 'atuais';
        toggleHistoricoFiltersVisibility(false);
        loadInitialPortariaItems();
        closeModal(modalFiltrosPortaria);
        updateFilterButtonIndicator();
    });

    tipoSelect.addEventListener('change', e => toggleHistoricoFiltersVisibility(e.target.value === 'historico'));
}

function setupSortModalAndButton() {
    const closeBtns = document.querySelectorAll(".js-modal-sort-portaria-close");
    const applyBtn = document.getElementById("apply-sort-button-portaria");
    const clearBtn = document.getElementById("clear-sort-button-portaria-modal");
    const sortSelect = document.getElementById("sort-order-select-portaria");

    openSortButton.addEventListener("click", () => {
        sortSelect.value = currentPortariaSortOrder;
        openModal(modalSortPortaria);
        openSortButton.classList.add("rotated");
    });
    closeBtns.forEach(btn => btn.addEventListener("click", () => {
        closeModal(modalSortPortaria);
        openSortButton.classList.remove("rotated");
    }));
    window.addEventListener("click", e => {
        if (e.target === modalSortPortaria) {
            closeModal(modalSortPortaria);
            openSortButton.classList.remove("rotated");
        }
    });

    applyBtn.addEventListener("click", () => {
        currentPortariaSortOrder = sortSelect.value;
        closeModal(modalSortPortaria);
        openSortButton.classList.toggle("has-indicator", currentPortariaSortOrder !== "desc");
        openSortButton.classList.remove("rotated");
        loadInitialPortariaItems();
    });

    clearBtn.addEventListener("click", () => {
        sortSelect.value = "desc";
        currentPortariaSortOrder = "desc";
        closeModal(modalSortPortaria);
        openSortButton.classList.remove("rotated", "has-indicator");
        loadInitialPortariaItems();
    });
}

// --- Eventos de Modal ---
function setupModalEventListeners() {
    // Visitante
    document.querySelectorAll(".js-modal-registrar-visitante-close").forEach(btn =>
        btn.addEventListener("click", closeRegistrarVisitanteModal)
    );
    window.addEventListener("click", e => { if (e.target === modalRegistrarVisitante) closeRegistrarVisitanteModal(); });
    formRegistrarVisitante.addEventListener('submit', handleRegistrarVisitanteSubmit);
    btnValidarQRCodeModal.addEventListener('click', handleValidarQRCodeModal);

    // Encomenda
    document.querySelectorAll(".js-modal-registrar-encomenda-close").forEach(btn =>
        btn.addEventListener("click", closeRegistrarEncomendaModal)
    );
    window.addEventListener("click", e => { if (e.target === modalRegistrarEncomenda) closeRegistrarEncomendaModal(); });
    formNovaEncomendaModal.addEventListener('submit', handleRegistrarEncomendaSubmit);

    setupFilterModalAndButton();
    setupSortModalAndButton();
}

// --- Submissões de Formulário ---
async function handleRegistrarVisitanteSubmit(event) {
    event.preventDefault();
    const submitBtn = formRegistrarVisitante.querySelector('button[type="submit"]');
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarVisitante);

    const formData = new FormData(formRegistrarVisitante);
    const data = Object.fromEntries(formData.entries());
    data.documento = data.documento || null;
    data.motivoVisita = data.motivoVisita || null;
    data.horarioSaidaPrevisto = data.horarioSaidaPrevisto
        ? new Date(data.horarioSaidaPrevisto).toISOString()
        : null;
    data.observacoes = data.observacoes || null;

    try {
        await apiClient.post('/api/v1/visitantes/registrar-entrada', data);
        showGlobalFeedback('Entrada de visitante registrada!', 'success', 2500);
        closeRegistrarVisitanteModal();
        if (activePortariaTab === 'visitantes') loadInitialPortariaItems();
    } catch (err) {
        console.error('Erro ao registrar visitante:', err);
        showModalError(
            modalRegistrarVisitante,
            err.detalhesValidacao || err.message || 'Falha ao registrar. Verifique os dados.'
        );
    } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
    }
}

async function handleValidarQRCodeModal() {
    const qrCodeValue = document.getElementById('visQRCodeEntrada')?.value;
    if (!qrCodeValue) return;

    const submitBtn = formRegistrarVisitante.querySelector('button[type="submit"]');
    const validateBtn = btnValidarQRCodeModal;
    const origText = validateBtn.innerHTML;
    submitBtn.disabled = true;
    validateBtn.disabled = true;
    validateBtn.innerHTML = 'Validando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarVisitante);

    try {
        const resp = await apiClient.post('/api/v1/visitantes/validar-qr-code', { qrCodeValue });
        showGlobalFeedback(`QR Code validado para: ${resp.nome}`, 'success', 3000);
        closeRegistrarVisitanteModal();
        if (activePortariaTab === 'visitantes') loadInitialPortariaItems();
    } catch (err) {
        console.error('Erro validar QR:', err);
        showModalError(
            modalRegistrarVisitante,
            err.detalhesValidacao || err.message || 'QR Code inválido ou expirado.'
        );
    } finally {
        submitBtn.disabled = false;
        validateBtn.innerHTML = origText;
        validateBtn.disabled = false;
    }
}

async function handleRegistrarEncomendaSubmit(event) {
    event.preventDefault();
    const submitBtn = formNovaEncomendaModal.querySelector('button[type="submit"]');
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarEncomenda);

    const formData = new FormData(formNovaEncomendaModal);
    const data = {
        unidadeId: formData.get('unidadeId'),
        descricao: formData.get('descricao'),
        codigoRastreio: formData.get('codigoRastreio') || null,
        remetente: formData.get('remetente') || null
    };

    try {
        await apiClient.post('/syndic/encomendas', data);
        showGlobalFeedback('Encomenda registrada!', 'success', 2500);
        closeRegistrarEncomendaModal();
        if (activePortariaTab === 'encomendas') loadInitialPortariaItems();
    } catch (err) {
        console.error('Erro registrar encomenda:', err);
        showModalError(
            modalRegistrarEncomenda,
            err.detalhesValidacao || err.message || 'Falha ao registrar encomenda.'
        );
    } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
    }
}

// --- Carregamento do Feed ---
async function loadInitialPortariaItems() {
    currentPortariaPage = 1;
    noMorePortariaItems = false;
    isLoadingPortariaItems = false;
    const contentEl = document.getElementById(activePortariaTab === 'visitantes' ? 'content-visitantes' : 'content-encomendas');
    const feedSelector = (activePortariaTab === 'visitantes')
        ? portariaFeedContainerSelector
        : portariaEncomendasFeedContainerSelector;
    const feedContainer = contentEl?.querySelector(feedSelector);
    if (!feedContainer) return;

    feedContainer.querySelectorAll('.cv-card:not(.feed-skeleton-item)').forEach(el => el.remove());
    fetchedPortariaItems = [];
    contentEl.querySelectorAll('.cv-error-state, .cv-empty-state').forEach(el => el.remove());

    let sentinel = document.getElementById(portariaScrollSentinelId);
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = portariaScrollSentinelId;
        sentinel.style.height = '10px';
        feedContainer.appendChild(sentinel);
    }
    sentinel.style.display = 'block';

    showSkeleton(contentEl);
    await fetchAndDisplayPortariaItems(1, false);
}

function setupPortariaFeedObserver() {
    const sentinel = document.getElementById(portariaScrollSentinelId);
    if (!sentinel) return;
    const observer = new IntersectionObserver(async entries => {
        if (entries[0].isIntersecting && !isLoadingPortariaItems && !noMorePortariaItems) {
            currentPortariaPage++;
            await fetchAndDisplayPortariaItems(currentPortariaPage, true);
        }
    }, { root: null, threshold: 0.1 });
    observer.observe(sentinel);
}

async function fetchAndDisplayPortariaItems(page, append = false) {
    if (isLoadingPortariaItems) return;
    isLoadingPortariaItems = true;

    const contentEl = document.getElementById(activePortariaTab === 'visitantes' ? 'content-visitantes' : 'content-encomendas');
    const feedSelector = (activePortariaTab === 'visitantes')
        ? portariaFeedContainerSelector
        : portariaEncomendasFeedContainerSelector;
    const feedContainer = contentEl?.querySelector(feedSelector);
    const sentinel = document.getElementById(portariaScrollSentinelId);
    if (!feedContainer || !contentEl) {
        isLoadingPortariaItems = false;
        if (contentEl) hideSkeleton(contentEl);
        return;
    }

    if (!append) {
        showSkeleton(contentEl);
    } else {
        let spinner = feedContainer.querySelector('.loading-spinner-portaria');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.className = 'loading-spinner-portaria';
            spinner.innerHTML = '<span class="inline-spinner"></span>';
            feedContainer.insertBefore(spinner, sentinel);
        }
        spinner.style.display = 'block';
    }
    sentinel.style.display = 'block';

    // Monta endpoint e params
    let endpoint, params = { pageNumber: page, pageSize: 10, sortOrder: currentPortariaSortOrder };
    if (activePortariaTab === 'visitantes') {
        params.tipo = tipoVisualizacaoVisitantes;
        if (currentPortariaFilters.unidadeId) params.unidadeId = currentPortariaFilters.unidadeId;
        if (tipoVisualizacaoVisitantes === 'historico') {
            endpoint = '/api/v1/visitantes/historico';
            if (currentPortariaFilters.dataInicio) params.dataInicio = currentPortariaFilters.dataInicio;
            if (currentPortariaFilters.dataFim) params.dataFim = currentPortariaFilters.dataFim;
            if (currentPortariaFilters.nomeVisitante) params.nome = currentPortariaFilters.nomeVisitante;
        } else {
            endpoint = '/api/v1/visitantes/atuais';
        }
    } else {
        endpoint = '/syndic/encomendas';
        if (currentPortariaFilters.unidadeIdEncomenda) params.unidadeId = currentPortariaFilters.unidadeIdEncomenda;
        if (currentPortariaFilters.statusEncomenda) params.status = currentPortariaFilters.statusEncomenda;
    }

    try {
        const resp = await apiClient.get(endpoint, params);
        const items = resp.data || resp || [];

        hideSkeleton(contentEl);
        feedContainer.querySelectorAll('.loading-spinner-portaria').forEach(el => el.style.display = 'none');
        contentEl.querySelectorAll('.cv-error-state, .cv-empty-state').forEach(el => el.remove());

        if (items.length > 0) {
            items.forEach(item => {
                const typeTag = activePortariaTab === 'visitantes'
                    ? (tipoVisualizacaoVisitantes === 'atuais' ? 'visitante_atual' : 'visitante_historico')
                    : 'encomenda';
                if (fetchedPortariaItems.some(fi => fi.id === item.id && fi.type === typeTag)) return;
                item.type = typeTag;
                fetchedPortariaItems.push(item);
                const el = renderPortariaItem(item);
                feedContainer.insertBefore(el, sentinel);
            });
        } else if (page === 1 && !append && fetchedPortariaItems.length === 0) {
            const hasFilters = Object.values(currentPortariaFilters).some(v => v && v !== '');
            let description = hasFilters
                ? 'Nenhum item encontrado para os filtros atuais.'
                : (activePortariaTab === 'visitantes'
                    ? (tipoVisualizacaoVisitantes === 'atuais'
                        ? 'Nenhum visitante atual registrado.'
                        : 'Nenhum registro histórico de visitantes.')
                    : 'Nenhuma encomenda registrada.');
            const roles = getRoles();
            const isPorteiro = roles.includes('Porteiro') || roles.includes('Sindico') || roles.includes('Administrador');
            if (!hasFilters && isPorteiro) {
                description += activePortariaTab === 'visitantes'
                    ? ' Use o botão (+) para registrar um novo visitante.'
                    : ' Use o botão (+) para registrar uma nova encomenda.';
            }
            const emptyEl = createEmptyStateElement({
                iconHTML: `<img src="/img/illustrations/empty-box.svg" alt="Sem resultados">`,
                title: 'Nenhum Item Encontrado',
                description
            });
            contentEl.insertBefore(emptyEl, sentinel);
        } else {
            noMorePortariaItems = true;
            sentinel.style.display = 'none';
        }
    } catch (error) {
        console.error(`Erro ao carregar ${activePortariaTab}:`, error);
        hideSkeleton(contentEl);
        feedContainer.querySelectorAll('.loading-spinner-portaria').forEach(el => el.style.display = 'none');

        const errorState = createErrorStateElement({
            title: 'Falha ao Carregar',
            message: error.message || `Erro ao carregar ${activePortariaTab}. Verifique sua conexão.`,
            retryButton: {
                text: 'Tentar Novamente',
                onClick: () => {
                    contentEl.querySelectorAll('.cv-error-state').forEach(el => el.remove());
                    loadInitialPortariaItems();
                }
            }
        });
        contentEl.appendChild(errorState);
        sentinel.style.display = 'none';
    } finally {
        isLoadingPortariaItems = false;
    }
}

function renderPortariaItem(item) {
    const card = document.createElement('div');
    card.className = 'cv-card portaria-item';
    card.dataset.id = item.id;
    card.dataset.type = item.type;

    let html = '';
    if (item.type === 'visitante_atual' || item.type === 'visitante_historico') {
        const isAtual = item.type === 'visitante_atual';
        html = `
            <h4>${item.nome}</h4>
            <p><strong>Unidade:</strong> ${item.unidade?.descricao || item.unidadeId || 'N/A'}</p>
            ${item.motivoVisita ? `<p><strong>Motivo:</strong> ${item.motivoVisita}</p>` : ''}
            <p><strong>Chegada:</strong> ${new Date(item.dataChegada).toLocaleString('pt-BR')}</p>
            ${isAtual && item.horarioSaidaPrevisto ? `<p><strong>Saída Prevista:</strong> ${new Date(item.horarioSaidaPrevisto).toLocaleString('pt-BR')}</p>` : ''}
            ${!isAtual && item.dataSaida ? `<p><strong>Saída:</strong> ${new Date(item.dataSaida).toLocaleString('pt-BR')}</p>` : ''}
            ${item.status ? `<p>${getStatusBadgeHtml(item.status)}</p>` : ''}
            ${item.observacoes ? `<p><strong>Obs:</strong> ${item.observacoes}</p>` : ''}
            <div class="portaria-item__actions">
                ${isAtual ? `<button class="cv-button cv-button--small btn-registrar-saida-visitante" data-id="${item.id}">Registrar Saída</button>` : ''}
            </div>`;
    } else {
        const statusEncomenda = item.status || (item.dataRetirada ? 'Entregue' : 'Recebida');
        const isPendente = ['recebida','aguardando retirada'].includes(statusEncomenda.toLowerCase());
        html = `
            <h4>Encomenda: ${item.descricao || item.id}</h4>
            <p><strong>Unidade:</strong> ${item.unidade?.descricao || item.unidadeId || 'N/A'}</p>
            ${item.codigoRastreio ? `<p><strong>Rastreio:</strong> ${item.codigoRastreio}</p>` : ''}
            ${item.remetente ? `<p><strong>Remetente:</strong> ${item.remetente}</p>` : ''}
            <p><strong>Recebida em:</strong> ${new Date(item.dataRecebimento || item.criadoEm).toLocaleString('pt-BR')}</p>
            ${item.dataRetirada ? `<p><strong>Retirada em:</strong> ${new Date(item.dataRetirada).toLocaleString('pt-BR')}</p>` : ''}
            <p>${getStatusBadgeHtml(statusEncomenda)}</p>
            <div class="portaria-item__actions">
                ${isPendente ? `<button class="cv-button cv-button--small btn-confirmar-retirada-encomenda" data-id="${item.id}">Confirmar Retirada</button>` : ''}
            </div>`;
    }
    card.innerHTML = html;
    return card;
}

function setupPortariaItemActionListeners() {
    document.body.addEventListener('click', async event => {
        const btn = event.target;
        const id = btn.dataset.id;
        if (btn.classList.contains('btn-registrar-saida-visitante')) {
            if (confirm('Registrar saída do visitante?')) {
                btn.disabled = true;
                btn.innerHTML = '<span class="inline-spinner"></span>';
                try {
                    await apiClient.post(`/api/v1/visitantes/${id}/registrar-saida`, {});
                    showGlobalFeedback('Saída registrada.', 'success');
                    loadInitialPortariaItems();
                } catch (err) {
                    console.error(err);
                    showGlobalFeedback('Erro ao registrar saída.', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Registrar Saída';
                }
            }
        }
        if (btn.classList.contains('btn-confirmar-retirada-encomenda')) {
            if (confirm('Confirmar retirada da encomenda?')) {
                btn.disabled = true;
                btn.innerHTML = '<span class="inline-spinner"></span>';
                try {
                    await apiClient.post(`/syndic/encomendas/${id}/retirar`, {});
                    showGlobalFeedback('Retirada confirmada.', 'success');
                    loadInitialPortariaItems();
                } catch (err) {
                    console.error(err);
                    showGlobalFeedback('Erro ao confirmar retirada.', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Confirmar Retirada';
                }
            }
        }
    });
}

// --- Inicialização ---
function initialize() {
    requireAuth();
    // Referências de modal
    modalRegistrarVisitante = document.getElementById("modal-registrar-visitante");
    formRegistrarVisitante = document.getElementById("formRegistrarVisitante");
    btnValidarQRCodeModal = document.getElementById("btnValidarQRCode");

    modalRegistrarEncomenda = document.getElementById("modal-registrar-encomenda");
    formNovaEncomendaModal = document.getElementById("formNovaEncomenda");

    modalFiltrosPortaria = document.getElementById("modal-filtros-portaria");
    modalSortPortaria = document.getElementById("modal-sort-portaria");
    openFilterModalButton = document.getElementById("open-filter-modal-button");
    openSortButton = document.getElementById("open-sort-button");

    setupTabs();
    setupModalEventListeners();
    setupPortariaFeedObserver();
    setupPortariaItemActionListeners();

    const roles = getRoles();
    const isPorteiro = roles.includes('Porteiro') || roles.includes('Sindico') || roles.includes('Administrador');
    const actions = [];
    if (isPorteiro) {
        actions.push({ label: 'Registrar Visitante', onClick: openRegistrarVisitanteModal });
        actions.push({ label: 'Registrar Encomenda', onClick: openRegistrarEncomendaModal });
    }
    initFabMenu(actions);
}

if (document.readyState !== 'loading') {
    initialize();
} else {
    document.addEventListener('DOMContentLoaded', initialize);
}
