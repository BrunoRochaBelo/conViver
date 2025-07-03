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

// --- Estado do Feed ---
let currentPortariaPage = 1;
let isLoadingPortariaItems = false;
let noMorePortariaItems = false;
const portariaFeedContainerSelector = ".js-portaria-feed";
const portariaEncomendasFeedContainerSelector = ".js-portaria-feed-encomendas";
const portariaScrollSentinelId = "portaria-scroll-sentinel";
let fetchedPortariaItems = [];
let currentPortariaSortOrder = "desc";
let currentPortariaFilters = {};
let activePortariaTab = "visitantes";
let tipoVisualizacaoVisitantes = "atuais";

// --- Badge de Status ---
function getStatusBadgeHtml(status) {
    const s = status ? status.toLowerCase() : "";
    let type = "default", icon = "info";
    if (s.includes("presente") || s.includes("aguardando") || s.includes("recebida")) {
        type = "warning"; icon = "clock";
    } else if (s.includes("saiu") || s.includes("entregue") || s.includes("concluído")) {
        type = "success"; icon = "check-circle";
    } else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) {
        type = "danger"; icon = "x-circle";
    }
    return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${icon}"></span>${status}</span>`;
}

// --- Abas ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.cv-tabs-buttons .cv-tab-button');
    const tabContents = document.querySelectorAll('main > .cv-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            tabContents.forEach(content => content.style.display = 'none');

            const targetId = button.id.replace('tab-', 'content-');
            const target = document.getElementById(targetId);
            if (!target) return;

            target.style.display = 'block';
            activePortariaTab = button.id === 'tab-visitantes' ? 'visitantes' : 'encomendas';
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
    if (!modalRegistrarVisitante || !formRegistrarVisitante) return;
    formRegistrarVisitante.reset();
    clearModalError(modalRegistrarVisitante);
    document.getElementById('visQRCodeEntrada').value = '';
    openModal(modalRegistrarVisitante);
}
function closeRegistrarVisitanteModal() {
    if (modalRegistrarVisitante) closeModal(modalRegistrarVisitante);
}
function openRegistrarEncomendaModal() {
    if (!modalRegistrarEncomenda || !formNovaEncomendaModal) return;
    formNovaEncomendaModal.reset();
    clearModalError(modalRegistrarEncomenda);
    openModal(modalRegistrarEncomenda);
}
function closeRegistrarEncomendaModal() {
    if (modalRegistrarEncomenda) closeModal(modalRegistrarEncomenda);
}

// --- Filtro ---
function setupFilterModalAndButton() {
    const btnCloseElements = document.querySelectorAll(".js-modal-filtros-portaria-close");
    const btnApply = document.getElementById("apply-filters-button-portaria-modal");
    const btnClear = document.getElementById("clear-filters-button-portaria-modal");
    const tipoSelect = document.getElementById("portaria-tipo-visitante-filter");

    openFilterModalButton?.addEventListener("click", () => {
        const visitFilters = modalFiltrosPortaria.querySelectorAll('[data-filter-context="visitantes"], [data-filter-context="visitantes_historico"]');
        const encFilters   = modalFiltrosPortaria.querySelectorAll('[data-filter-context="encomendas"]');
        const titleEl      = modalFiltrosPortaria.querySelector("h2");

        if (activePortariaTab === 'visitantes') {
            visitFilters.forEach(el => el.style.display = 'block');
            encFilters.forEach(el => el.style.display = 'none');
            titleEl.textContent = "Filtros de Visitantes";
            toggleHistoricoFiltersVisibility(tipoSelect.value === 'historico');
        } else {
            visitFilters.forEach(el => el.style.display = 'none');
            encFilters.forEach(el => el.style.display = 'block');
            titleEl.textContent = "Filtros de Encomendas";
        }
        openModal(modalFiltrosPortaria);
    });

    btnCloseElements.forEach(btn => btn.addEventListener("click", () => closeModal(modalFiltrosPortaria)));
    window.addEventListener("click", e => e.target === modalFiltrosPortaria && closeModal(modalFiltrosPortaria));

    btnApply?.addEventListener("click", () => {
        currentPortariaFilters = {};
        if (activePortariaTab === 'visitantes') {
            tipoVisualizacaoVisitantes = tipoSelect.value;
            currentPortariaFilters.unidadeId = document.getElementById("filterUnidadeVisitantes").value.trim();
            if (tipoVisualizacaoVisitantes === 'historico') {
                currentPortariaFilters.dataInicio = document.getElementById("filterHistDataInicio").value;
                currentPortariaFilters.dataFim    = document.getElementById("filterHistDataFim").value;
                currentPortariaFilters.nomeVisitante = document.getElementById("filterHistNome").value.trim();
            }
        } else {
            currentPortariaFilters.unidadeIdEncomenda = document.getElementById("filterUnidadeEncomendas").value.trim();
            currentPortariaFilters.statusEncomenda    = document.getElementById("filterStatusEncomenda").value;
        }
        loadInitialPortariaItems();
        closeModal(modalFiltrosPortaria);
        updateFilterButtonIndicator();
    });

    btnClear?.addEventListener("click", () => {
        modalFiltrosPortaria.querySelectorAll("input[type='text'], input[type='date']").forEach(i => i.value = '');
        modalFiltrosPortaria.querySelectorAll("select").forEach(s => s.selectedIndex = 0);
        currentPortariaFilters = {};
        tipoVisualizacaoVisitantes = 'atuais';
        toggleHistoricoFiltersVisibility(false);
        loadInitialPortariaItems();
        closeModal(modalFiltrosPortaria);
        updateFilterButtonIndicator();
    });

    tipoSelect?.addEventListener("change", e => toggleHistoricoFiltersVisibility(e.target.value === 'historico'));
}
function toggleHistoricoFiltersVisibility(show) {
    document.querySelectorAll('#modal-filtros-portaria [data-filter-context="visitantes_historico"]')
        .forEach(el => el.style.display = show ? 'block' : 'none');
}
function updateFilterButtonIndicator() {
    if (!openFilterModalButton) return;
    const hasFieldFilters = Object.values(currentPortariaFilters).some(v => v);
    const tipoChanged = activePortariaTab === 'visitantes' && tipoVisualizacaoVisitantes !== 'atuais';
    openFilterModalButton.classList.toggle("has-indicator", hasFieldFilters || tipoChanged);
}

// --- Ordenação ---
function setupSortModalAndButton() {
    const closeBtns = document.querySelectorAll(".js-modal-sort-portaria-close");
    const btnApply  = document.getElementById("apply-sort-button-portaria");
    const btnClear  = document.getElementById("clear-sort-button-portaria-modal");
    const sel       = document.getElementById("sort-order-select-portaria");

    openSortButton?.addEventListener("click", () => {
        sel.value = currentPortariaSortOrder;
        openModal(modalSortPortaria);
        openSortButton.classList.add("rotated");
    });

    closeBtns.forEach(b => b.addEventListener("click", () => {
        closeModal(modalSortPortaria);
        openSortButton.classList.remove("rotated");
    }));
    window.addEventListener("click", e => {
        if (e.target === modalSortPortaria) {
            closeModal(modalSortPortaria);
            openSortButton.classList.remove("rotated");
        }
    });

    btnApply?.addEventListener("click", () => {
        currentPortariaSortOrder = sel.value;
        closeModal(modalSortPortaria);
        openSortButton.classList.remove("rotated");
        openSortButton.classList.toggle("has-indicator", currentPortariaSortOrder !== "desc");
        loadInitialPortariaItems();
    });
    btnClear?.addEventListener("click", () => {
        sel.value = "desc";
        currentPortariaSortOrder = "desc";
        closeModal(modalSortPortaria);
        openSortButton.classList.remove("rotated", "has-indicator");
        loadInitialPortariaItems();
    });
}

// --- Eventos de Modal ---
function setupModalEventListeners() {
    // Visitante
    document.querySelectorAll(".js-modal-registrar-visitante-close")
        .forEach(btn => btn.addEventListener("click", closeRegistrarVisitanteModal));
    window.addEventListener("click", e => e.target === modalRegistrarVisitante && closeRegistrarVisitanteModal());
    formRegistrarVisitante?.addEventListener('submit', handleRegistrarVisitanteSubmit);
    btnValidarQRCodeModal?.addEventListener('click', handleValidarQRCodeModal);

    // Encomenda
    document.querySelectorAll(".js-modal-registrar-encomenda-close")
        .forEach(btn => btn.addEventListener("click", closeRegistrarEncomendaModal));
    window.addEventListener("click", e => e.target === modalRegistrarEncomenda && closeRegistrarEncomendaModal());
    formNovaEncomendaModal?.addEventListener('submit', handleRegistrarEncomendaSubmit);

    setupFilterModalAndButton();
    setupSortModalAndButton();
}

// --- Submits ---
async function handleRegistrarVisitanteSubmit(e) {
    e.preventDefault();
    if (!formRegistrarVisitante) return;
    const btn = formRegistrarVisitante.querySelector('button[type="submit"]');
    const oldText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarVisitante);

    const data = Object.fromEntries(new FormData(formRegistrarVisitante).entries());
    data.documento = data.documento || null;
    data.motivoVisita = data.motivoVisita || null;
    data.horarioSaidaPrevisto = data.horarioSaidaPrevisto
        ? new Date(data.horarioSaidaPrevisto).toISOString() : null;
    data.observacoes = data.observacoes || null;
    delete data.qrCodeEntrada;

    try {
        await apiClient.post('/api/v1/visitantes/registrar-entrada', data);
        showGlobalFeedback('Entrada de visitante registrada com sucesso!', 'success', 2500);
        formRegistrarVisitante.reset();
        closeRegistrarVisitanteModal();
        if (activePortariaTab === 'visitantes') loadInitialPortariaItems();
    } catch (err) {
        console.error(err);
        showModalError(modalRegistrarVisitante, err.detalhesValidacao || err.message || 'Falha ao registrar entrada.');
    } finally {
        btn.innerHTML = oldText; btn.disabled = false;
    }
}

async function handleValidarQRCodeModal() {
    const qr = document.getElementById('visQRCodeEntrada')?.value;
    if (!qr) return;
    const submitBtn = formRegistrarVisitante.querySelector('button[type="submit"]');
    const validateBtn = document.getElementById('btnValidarQRCode');
    const oldText = validateBtn.innerHTML;
    submitBtn.disabled = validateBtn.disabled = true;
    validateBtn.innerHTML = 'Validando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarVisitante);

    try {
        const resp = await apiClient.post('/api/v1/visitantes/validar-qr-code', { qrCodeValue: qr });
        showGlobalFeedback(`Entrada por QR Code validada para: ${resp.nome}.`, 'success', 3000);
        formRegistrarVisitante.reset();
        closeRegistrarVisitanteModal();
        if (activePortariaTab === 'visitantes') loadInitialPortariaItems();
    } catch (err) {
        console.error(err);
        showModalError(modalRegistrarVisitante, err.detalhesValidacao || err.message || 'QR Code inválido.');
    } finally {
        validateBtn.innerHTML = oldText;
        submitBtn.disabled = validateBtn.disabled = false;
    }
}

async function handleRegistrarEncomendaSubmit(e) {
    e.preventDefault();
    if (!formNovaEncomendaModal) return;
    const btn = formNovaEncomendaModal.querySelector('button[type="submit"]');
    const oldText = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarEncomenda);

    const fd = new FormData(formNovaEncomendaModal);
    const data = {
        unidadeId: fd.get('unidadeId'),
        descricao: fd.get('descricao'),
        codigoRastreio: fd.get('codigoRastreio') || null,
        remetente: fd.get('remetente') || null
    };

    try {
        await apiClient.post('/syndic/encomendas', data);
        showGlobalFeedback('Encomenda registrada com sucesso!', 'success', 2500);
        formNovaEncomendaModal.reset();
        closeRegistrarEncomendaModal();
        if (activePortariaTab === 'encomendas') loadInitialPortariaItems();
    } catch (err) {
        console.error(err);
        showModalError(modalRegistrarEncomenda, err.detalhesValidacao || err.message || 'Falha ao registrar encomenda.');
    } finally {
        btn.innerHTML = oldText; btn.disabled = false;
    }
}

// --- Feed ---
async function loadInitialPortariaItems() {
    currentPortariaPage = 1; noMorePortariaItems = false; isLoadingPortariaItems = false;
    const contentEl = document.getElementById(activePortariaTab === 'visitantes' ? 'content-visitantes' : 'content-encomendas');
    const feed = contentEl?.querySelector(activePortariaTab === 'visitantes' ? portariaFeedContainerSelector : portariaEncomendasFeedContainerSelector);
    if (!feed || !contentEl) return;

    feed.querySelectorAll(`.cv-card:not(.prio-0):not(.feed-skeleton-item)`).forEach(el => el.remove());
    fetchedPortariaItems = [];
    // Remove qualquer estado vazio ou de erro existente dentro da aba ativa
    contentEl.querySelectorAll('.cv-empty-state, .cv-error-state').forEach(el => el.remove());

    let sentinel = document.getElementById(portariaScrollSentinelId);
    if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = portariaScrollSentinelId;
        sentinel.style.height = "10px";
        feed.appendChild(sentinel);
    }
    sentinel.style.display = "block";
    showSkeleton(contentEl);
    await fetchAndDisplayPortariaItems(currentPortariaPage, false);
}

function setupPortariaFeedObserver() {
    const sentinel = document.getElementById(portariaScrollSentinelId);
    if (!sentinel) return;
    new IntersectionObserver(async ([entry]) => {
        if (entry.isIntersecting && !isLoadingPortariaItems && !noMorePortariaItems) {
            currentPortariaPage++;
            await fetchAndDisplayPortariaItems(currentPortariaPage, true);
        }
    }, { threshold: 0.1 }).observe(sentinel);
}

async function fetchAndDisplayPortariaItems(page, append = false) {
    if (isLoadingPortariaItems) return;
    isLoadingPortariaItems = true;

    const contentEl = document.getElementById(activePortariaTab === 'visitantes' ? 'content-visitantes' : 'content-encomendas');
    const feed = contentEl?.querySelector(activePortariaTab === 'visitantes' ? portariaFeedContainerSelector : portariaEncomendasFeedContainerSelector);
    const sentinel = document.getElementById(portariaScrollSentinelId);
    if (!feed || !contentEl) {
        isLoadingPortariaItems = false; // Corrigido: isLoadingPortariaItens -> isLoadingPortariaItems
        if (contentEl) hideSkeleton(contentEl);
        return;
    }

    // Limpar qualquer estado (vazio ou erro) existente antes da nova busca
    contentEl.querySelectorAll('.cv-error-state, .cv-empty-state').forEach(el => el.remove());

    if (!append) showSkeleton(contentEl);
    else {
        let spinner = sentinel.previousElementSibling;
        if (!spinner || !spinner.classList.contains('loading-spinner-portaria')) {
            spinner = document.createElement('div');
            spinner.className = 'loading-spinner-portaria';
            spinner.innerHTML = '<span class="inline-spinner"></span>';
            feed.insertBefore(spinner, sentinel);
        }
        spinner.style.display = 'block';
    }
    sentinel.style.display = "block";

    // montar endpoint e params
    const params = { pageNumber: page, pageSize: 10, sortOrder: currentPortariaSortOrder };
    let endpoint = '';
    if (activePortariaTab === 'visitantes') {
        params.tipo = tipoVisualizacaoVisitantes;
        if (tipoVisualizacaoVisitantes === 'historico') {
            endpoint = '/api/v1/visitantes/historico';
            if (currentPortariaFilters.dataInicio) params.dataInicio = currentPortariaFilters.dataInicio;
            if (currentPortariaFilters.dataFim)    params.dataFim    = currentPortariaFilters.dataFim;
            if (currentPortariaFilters.nomeVisitante) params.nome = currentPortariaFilters.nomeVisitante;
        } else {
            endpoint = '/api/v1/visitantes/atuais';
        }
        if (currentPortariaFilters.unidadeId) params.unidadeId = currentPortariaFilters.unidadeId;
    } else {
        endpoint = '/syndic/encomendas';
        if (currentPortariaFilters.unidadeIdEncomenda) params.unidadeId = currentPortariaFilters.unidadeIdEncomenda;
        if (currentPortariaFilters.statusEncomenda)    params.status    = currentPortariaFilters.statusEncomenda;
    }

    try {
        const resp = await apiClient.get(endpoint, params);
        const items = resp.data || resp || [];
        hideSkeleton(contentEl);
        // O estado de erro já foi removido no início da função.
        // Não é necessário tentar escondê-lo aqui novamente.
        const emptyEl = contentEl.querySelector(".cv-empty-state");
        if (emptyEl) emptyEl.style.display = 'none';
        feed.querySelector('.loading-spinner-portaria')?.remove();

        if (items.length) {
            items.forEach(item => {
                const typeForCompare = activePortariaTab === 'visitantes'
                    ? (tipoVisualizacaoVisitantes === 'atuais' ? 'visitante_atual' : 'visitante_historico')
                    : 'encomenda';
                if (fetchedPortariaItems.some(fi => fi.id === item.id && fi.type === typeForCompare)) return;
                item.type = typeForCompare;
                fetchedPortariaItems.push(item);
                const el = renderPortariaItem(item);
                feed.insertBefore(el, sentinel);
            });
        } else {
            if (page === 1 && !append && fetchedPortariaItems.length === 0) {
                const empty = contentEl.querySelector(".cv-empty-state");
                if (empty) {
                    const msg = empty.querySelector('.cv-empty-state__message');
                    const hasF = Object.values(currentPortariaFilters).some(v => v);
                    msg.textContent = hasF
                        ? "Nenhum item encontrado para os filtros atuais."
                        : `Nenhum ${activePortariaTab === 'visitantes'
                            ? (tipoVisualizacaoVisitantes === 'atuais' ? 'visitante atual' : 'registro no histórico')
                            : 'item'} encontrado.`;
                    empty.style.display = "flex";
                }
            }
            noMorePortariaItems = true;
            sentinel.style.display = "none";
        }
    } catch (err) {
        console.error(`Erro ao buscar ${activePortariaTab}:`, err);
        hideSkeleton(contentEl);
        feed.querySelector('.loading-spinner-portaria')?.remove();
        // criar estado de erro customizável
        const target = contentEl.querySelector(portariaFeedContainerSelector + ', ' + portariaEncomendasFeedContainerSelector) || contentEl;
        // Remover possíveis estados anteriores antes de exibir o novo
        target.querySelectorAll('.cv-error-state, .cv-empty-state').forEach(el => el.remove());

        const errState = createErrorStateElement({
            title: "Falha ao Carregar",
            message: err.message || `Não foi possível carregar ${activePortariaTab}. Verifique sua conexão ou tente novamente.`,
            retryButton: {
                text: "Tentar Novamente",
                onClick: () => {
                    target.querySelectorAll(".cv-error-state").forEach(el => el.remove());
                    loadInitialPortariaItems();
                }
            }
        });

        target.appendChild(errState);
        sentinel.style.display = "none";
    } finally {
        isLoadingPortariaItems = false;
    }
}

// --- Render item ---
function renderPortariaItem(item) {
    const card = document.createElement('div');
    card.className = 'cv-card portaria-item';
    card.dataset.id   = item.id;
    card.dataset.type = item.type;
    let html = '';

    if (item.type.startsWith('visitante')) {
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
            </div>
        `;
    } else {
        const statusEncomenda = item.status || (item.retiradoEm ? 'Entregue' : 'Recebida');
        const isPendente = ['recebida','aguardando retirada'].some(s => statusEncomenda.toLowerCase().includes(s));
        html = `
            <h4>Encomenda: ${item.descricao || `ID ${item.id.slice(0,8)}...`}</h4>
            <p><strong>Unidade:</strong> ${item.unidade?.descricao || item.unidadeId || 'N/A'}</p>
            ${item.codigoRastreio ? `<p><strong>Rastreio:</strong> ${item.codigoRastreio}</p>` : ''}
            ${item.remetente ? `<p><strong>Remetente:</strong> ${item.remetente}</p>` : ''}
            <p><strong>Recebida em:</strong> ${new Date(item.dataRecebimento || item.criadoEm).toLocaleString('pt-BR')}</p>
            ${item.dataRetirada ? `<p><strong>Retirada em:</strong> ${new Date(item.dataRetirada).toLocaleString('pt-BR')}</p>` : ''}
            <p>${getStatusBadgeHtml(statusEncomenda)}</p>
            <div class="portaria-item__actions">
                ${isPendente ? `<button class="cv-button cv-button--small btn-confirmar-retirada-encomenda" data-id="${item.id}">Confirmar Retirada</button>` : ''}
            </div>
        `;
    }

    card.innerHTML = html;
    return card;
}

// --- Ações nos itens ---
function setupPortariaItemActionListeners() {
    const feedV = document.querySelector(portariaFeedContainerSelector);
    const feedE = document.querySelector(portariaEncomendasFeedContainerSelector);

    const handleClick = async e => {
        const btn = e.target;
        const id  = btn.dataset.id;
        if (!id) return;

        if (btn.classList.contains('btn-registrar-saida-visitante') && confirm('Registrar saída do visitante?')) {
            try {
                btn.disabled = true;
                btn.innerHTML = '<span class="inline-spinner"></span> Registrando...';
                await apiClient.post(`/api/v1/visitantes/${id}/registrar-saida`, {});
                showGlobalFeedback('Saída do visitante registrada.', 'success');
                loadInitialPortariaItems();
            } catch (err) {
                console.error(err);
                showGlobalFeedback('Erro ao registrar saída: ' + (err.message||''), 'error');
                btn.disabled = false; btn.innerHTML = 'Registrar Saída';
            }
        } else if (btn.classList.contains('btn-confirmar-retirada-encomenda') && confirm('Confirmar retirada da encomenda?')) {
            try {
                btn.disabled = true;
                btn.innerHTML = '<span class="inline-spinner"></span> Confirmando...';
                await apiClient.post(`/syndic/encomendas/${id}/retirar`, {});
                showGlobalFeedback('Retirada da encomenda confirmada.', 'success');
                loadInitialPortariaItems();
            } catch (err) {
                console.error(err);
                showGlobalFeedback('Erro ao confirmar retirada: ' + (err.message||''), 'error');
                btn.disabled = false; btn.innerHTML = 'Confirmar Retirada';
            }
        }
    };

    feedV?.addEventListener('click', handleClick);
    feedE?.addEventListener('click', handleClick);
}

// --- Inicialização ---
export async function initialize() {
    requireAuth();

    // mapear modais e botões
    modalRegistrarVisitante    = document.getElementById("modal-registrar-visitante");
    formRegistrarVisitante      = document.getElementById("formRegistrarVisitante");
    btnValidarQRCodeModal       = document.getElementById("btnValidarQRCode");
    modalRegistrarEncomenda     = document.getElementById("modal-registrar-encomenda");
    formNovaEncomendaModal      = document.getElementById("formNovaEncomenda");
    modalFiltrosPortaria        = document.getElementById("modal-filtros-portaria");
    modalSortPortaria           = document.getElementById("modal-sort-portaria");
    openFilterModalButton       = document.getElementById("open-filter-modal-button");
    openSortButton              = document.getElementById("open-sort-button");

    setupTabs();
    setupModalEventListeners();
    setupPortariaFeedObserver();
    setupPortariaItemActionListeners();

    const roles = getRoles();
    const isPorteiroOuSindico = ['Porteiro','Sindico','Administrador'].some(r => roles.includes(r));
    const actions = [];
    if (isPorteiroOuSindico) {
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
