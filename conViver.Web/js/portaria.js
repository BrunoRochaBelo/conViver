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


// Variáveis de estado para o feed
let currentPortariaPage = 1;
let isLoadingPortariaItems = false;
let noMorePortariaItems = false;
const portariaFeedContainerSelector = ".js-portaria-feed"; // Para visitantes
const portariaEncomendasFeedContainerSelector = ".js-portaria-feed-encomendas"; // Para encomendas
const portariaScrollSentinelId = "portaria-scroll-sentinel";
let fetchedPortariaItems = []; // Array para armazenar itens do feed (visitantes/encomendas)
let currentPortariaSortOrder = "desc";
let currentPortariaFilters = {}; // Para armazenar filtros ativos
let activePortariaTab = "visitantes"; // 'visitantes' ou 'encomendas'
let tipoVisualizacaoVisitantes = "atuais"; // 'atuais' ou 'historico'


// --- Função de Badge de Status ---
function getStatusBadgeHtml(status) {
    const s = status ? status.toLowerCase() : "";
    let type = "default"; // default, success, warning, danger, info
    let icon = "info"; // Ou um ícone padrão

    if (s.includes("presente") || s.includes("aguardando") || s.includes("recebida")) {
        type = "warning";
        icon = "clock";
    } else if (s.includes("saiu") || s.includes("entregue") || s.includes("concluído")) {
        type = "success";
        icon = "check-circle";
    } else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) {
        type = "danger";
        icon = "x-circle";
    }
    return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${icon}"></span>${status}</span>`;
}


// --- Configuração das Abas Principais ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.cv-tabs-buttons .cv-tab-button');
    const tabContents = document.querySelectorAll('main > .cv-tab-content'); // Pegar os conteúdos diretos de main

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                content.style.display = 'none'; // Esconder todos os conteúdos de aba
                // content.classList.remove('active'); // Remover classe active de todos
            });

            const targetContentId = button.id.replace('tab-', 'content-');
            const targetContent = document.getElementById(targetContentId);

            if (targetContent) {
                targetContent.style.display = 'block'; // Mostrar o conteúdo da aba clicada
                // targetContent.classList.add('active'); // Adicionar classe active
                activePortariaTab = button.id === 'tab-visitantes' ? 'visitantes' : 'encomendas';

                currentPortariaPage = 1;
                noMorePortariaItems = false;
                fetchedPortariaItems = [];
                // Resetar filtros aqui ou deixar que o modal de filtro faça isso?
                // Por enquanto, os filtros são mantidos ao trocar de aba,
                // mas a função applyFilters no modal irá ajustar a visibilidade dos campos.
                loadInitialPortariaItems();
            }
        });
    });

    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}


// --- Modais (Registro) ---
function openRegistrarVisitanteModal() {
    if (modalRegistrarVisitante && formRegistrarVisitante) {
        formRegistrarVisitante.reset();
        clearModalError(modalRegistrarVisitante);
        document.getElementById('visQRCodeEntrada').value = '';
        openModal(modalRegistrarVisitante);
    }
}

function closeRegistrarVisitanteModal() {
    if (modalRegistrarVisitante) {
        closeModal(modalRegistrarVisitante);
    }
}

function openRegistrarEncomendaModal() {
    if (modalRegistrarEncomenda && formNovaEncomendaModal) {
        formNovaEncomendaModal.reset();
        clearModalError(modalRegistrarEncomenda);
        openModal(modalRegistrarEncomenda);
    }
}

function closeRegistrarEncomendaModal() {
    if (modalRegistrarEncomenda) {
        closeModal(modalRegistrarEncomenda);
    }
}

// --- Modais (Filtro e Ordenação) ---
function setupFilterModalAndButton() {
    const closeFilterModalButton = document.querySelector(".js-modal-filtros-portaria-close");
    const applyFiltersModalButton = document.getElementById("apply-filters-button-portaria-modal");
    const clearFiltersModalButton = document.getElementById("clear-filters-button-portaria-modal");
    const tipoVisitanteSelect = document.getElementById("portaria-tipo-visitante-filter");

    if (openFilterModalButton && modalFiltrosPortaria) {
        openFilterModalButton.addEventListener("click", () => {
            // Ajustar visibilidade dos campos de filtro com base na aba ativa
            const visitanteFilters = modalFiltrosPortaria.querySelectorAll('[data-filter-context="visitantes"], [data-filter-context="visitantes_historico"]');
            const encomendaFilters = modalFiltrosPortaria.querySelectorAll('[data-filter-context="encomendas"]');
            const modalTitle = modalFiltrosPortaria.querySelector("h2");

            if (activePortariaTab === 'visitantes') {
                visitanteFilters.forEach(el => el.style.display = 'block');
                encomendaFilters.forEach(el => el.style.display = 'none');
                if (modalTitle) modalTitle.textContent = "Filtros de Visitantes";
                // Ajustar visibilidade dos filtros de histórico
                toggleHistoricoFiltersVisibility(tipoVisitanteSelect.value === 'historico');
            } else { // Encomendas
                visitanteFilters.forEach(el => el.style.display = 'none');
                encomendaFilters.forEach(el => el.style.display = 'block');
                if (modalTitle) modalTitle.textContent = "Filtros de Encomendas";
            }
            openModal(modalFiltrosPortaria);
        });
    }

    if (closeFilterModalButton && modalFiltrosPortaria) {
        closeFilterModalButton.addEventListener("click", () => closeModal(modalFiltrosPortaria));
    }
    if (modalFiltrosPortaria) {
        window.addEventListener("click", (event) => {
            if (event.target === modalFiltrosPortaria) closeModal(modalFiltrosPortaria);
        });
    }

    if (applyFiltersModalButton) {
        applyFiltersModalButton.addEventListener("click", () => {
            currentPortariaFilters = {}; // Limpa filtros anteriores
            if (activePortariaTab === 'visitantes') {
                tipoVisualizacaoVisitantes = tipoVisitanteSelect.value;
                currentPortariaFilters.unidadeId = document.getElementById("filterUnidadeVisitantes").value.trim();
                if (tipoVisualizacaoVisitantes === 'historico') {
                    currentPortariaFilters.dataInicio = document.getElementById("filterHistDataInicio").value;
                    currentPortariaFilters.dataFim = document.getElementById("filterHistDataFim").value;
                    currentPortariaFilters.nomeVisitante = document.getElementById("filterHistNome").value.trim();
                }
            } else { // Encomendas
                currentPortariaFilters.unidadeIdEncomenda = document.getElementById("filterUnidadeEncomendas").value.trim();
                currentPortariaFilters.statusEncomenda = document.getElementById("filterStatusEncomenda").value;
            }

            loadInitialPortariaItems();
            if (modalFiltrosPortaria) closeModal(modalFiltrosPortaria);
            updateFilterButtonIndicator();
        });
    }

    if (clearFiltersModalButton && modalFiltrosPortaria) {
        clearFiltersModalButton.addEventListener("click", () => {
            // Resetar campos do formulário de filtro
            modalFiltrosPortaria.querySelectorAll("input[type='text'], input[type='date']").forEach(input => input.value = '');
            modalFiltrosPortaria.querySelectorAll("select").forEach(select => select.selectedIndex = 0);

            currentPortariaFilters = {};
            tipoVisualizacaoVisitantes = 'atuais'; // Reset para default
            toggleHistoricoFiltersVisibility(false); // Esconder filtros de histórico

            loadInitialPortariaItems();
            if (modalFiltrosPortaria) closeModal(modalFiltrosPortaria);
            updateFilterButtonIndicator();
        });
    }

    if (tipoVisitanteSelect) {
        tipoVisitanteSelect.addEventListener('change', (event) => {
            toggleHistoricoFiltersVisibility(event.target.value === 'historico');
        });
    }
}

function toggleHistoricoFiltersVisibility(show) {
    const historicoFilterElements = document.querySelectorAll('#modal-filtros-portaria [data-filter-context="visitantes_historico"]');
    historicoFilterElements.forEach(el => el.style.display = show ? 'block' : 'none');
}

function updateFilterButtonIndicator() {
    if (!openFilterModalButton) return;
    const hasFilters = Object.values(currentPortariaFilters).some(val => val && val !== '');
    // Considerar também tipoVisualizacaoVisitantes se for diferente do padrão 'atuais'
    const tipoVisitanteChanged = activePortariaTab === 'visitantes' && tipoVisualizacaoVisitantes !== 'atuais';

    if (hasFilters || tipoVisitanteChanged) {
        openFilterModalButton.classList.add("has-indicator");
    } else {
        openFilterModalButton.classList.remove("has-indicator");
    }
}


function setupSortModalAndButton() {
    const closeSortButtons = document.querySelectorAll(".js-modal-sort-portaria-close");
    const applySortButton = document.getElementById("apply-sort-button-portaria");
    const clearSortButtonModal = document.getElementById("clear-sort-button-portaria-modal");
    const sortSelect = document.getElementById("sort-order-select-portaria");

    if (openSortButton && modalSortPortaria) {
        openSortButton.addEventListener("click", () => {
            if (sortSelect) sortSelect.value = currentPortariaSortOrder;
            openModal(modalSortPortaria);
            openSortButton.classList.add("rotated");
        });
    }
    closeSortButtons.forEach(btn => btn.addEventListener("click", () => {
        if (modalSortPortaria) closeModal(modalSortPortaria);
        if (openSortButton) openSortButton.classList.remove("rotated");
    }));
    window.addEventListener("click", (e) => {
        if (e.target === modalSortPortaria) {
            closeModal(modalSortPortaria);
            if (openSortButton) openSortButton.classList.remove("rotated");
        }
    });
    if (applySortButton && sortSelect) {
        applySortButton.addEventListener("click", () => {
            currentPortariaSortOrder = sortSelect.value;
            if (modalSortPortaria) closeModal(modalSortPortaria);
            if (openSortButton) {
                 openSortButton.classList.remove("rotated");
                 if (currentPortariaSortOrder !== "desc") openSortButton.classList.add("has-indicator");
                 else openSortButton.classList.remove("has-indicator");
            }
            loadInitialPortariaItems();
        });
    }
    if (clearSortButtonModal && sortSelect && modalSortPortaria) {
        clearSortButtonModal.addEventListener("click", () => {
            sortSelect.value = "desc";
            currentPortariaSortOrder = "desc";
            closeModal(modalSortPortaria);
            if (openSortButton) {
                openSortButton.classList.remove("rotated");
                openSortButton.classList.remove("has-indicator");
            }
            loadInitialPortariaItems();
        });
    }
}


function setupModalEventListeners() {
    // Modal Registrar Visitante
    if (modalRegistrarVisitante && formRegistrarVisitante) {
        document.querySelectorAll(".js-modal-registrar-visitante-close").forEach(btn => {
            btn.addEventListener("click", closeRegistrarVisitanteModal);
        });
        window.addEventListener("click", (event) => {
            if (event.target === modalRegistrarVisitante) closeRegistrarVisitanteModal();
        });

        formRegistrarVisitante.addEventListener('submit', handleRegistrarVisitanteSubmit);

        if (btnValidarQRCodeModal) {
            btnValidarQRCodeModal.addEventListener('click', handleValidarQRCodeModal);
        }
    }

    // Modal Registrar Encomenda
    if (modalRegistrarEncomenda && formNovaEncomendaModal) {
        document.querySelectorAll(".js-modal-registrar-encomenda-close").forEach(btn => {
            btn.addEventListener("click", closeRegistrarEncomendaModal);
        });
        window.addEventListener("click", (event) => {
            if (event.target === modalRegistrarEncomenda) closeRegistrarEncomendaModal();
        });
        formNovaEncomendaModal.addEventListener('submit', handleRegistrarEncomendaSubmit);
    }

    setupFilterModalAndButton();
    setupSortModalAndButton();
}


async function handleRegistrarVisitanteSubmit(event) {
    event.preventDefault();
    if (!formRegistrarVisitante) return;

    const submitButton = formRegistrarVisitante.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarVisitante);

    const formData = new FormData(formRegistrarVisitante);
    const data = Object.fromEntries(formData.entries());

    data.documento = data.documento || null;
    data.motivoVisita = data.motivoVisita || null;
    data.horarioSaidaPrevisto = data.horarioSaidaPrevisto ? new Date(data.horarioSaidaPrevisto).toISOString() : null;
    data.observacoes = data.observacoes || null;
    delete data.qrCodeEntrada;

    try {
        await apiClient.post('/api/v1/visitantes/registrar-entrada', data);
        showGlobalFeedback('Entrada de visitante registrada com sucesso!', 'success', 2500);
        formRegistrarVisitante.reset();
        closeRegistrarVisitanteModal();
        if (activePortariaTab === 'visitantes') {
            loadInitialPortariaItems();
        }
    } catch (err) {
        console.error('Erro ao registrar entrada de visitante:', err);
        const errorMessage = err.detalhesValidacao || err.message || 'Falha ao registrar entrada. Verifique os dados e tente novamente.';
        showModalError(modalRegistrarVisitante, errorMessage);
    } finally {
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}

async function handleValidarQRCodeModal() {
    const qrCodeValue = document.getElementById('visQRCodeEntrada')?.value;
    if (!qrCodeValue || !modalRegistrarVisitante) return;

    const submitButton = formRegistrarVisitante.querySelector('button[type="submit"]');
    const validateButton = document.getElementById('btnValidarQRCode');
    const originalValidateButtonText = validateButton.innerHTML;

    submitButton.disabled = true;
    validateButton.disabled = true;
    validateButton.innerHTML = 'Validando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarVisitante);

    try {
        const response = await apiClient.post('/api/v1/visitantes/validar-qr-code', { qrCodeValue });
        showGlobalFeedback(`Entrada por QR Code validada para: ${response.nome}.`, 'success', 3000);
        formRegistrarVisitante.reset();
        closeRegistrarVisitanteModal();
        if (activePortariaTab === 'visitantes') {
            loadInitialPortariaItems();
        }
    } catch (err) {
        console.error('Erro ao validar QR Code:', err);
        const errorMessage = err.detalhesValidacao || err.message || 'QR Code inválido, expirado ou já utilizado.';
        showModalError(modalRegistrarVisitante, errorMessage);
    } finally {
        submitButton.disabled = false;
        validateButton.innerHTML = originalValidateButtonText;
        validateButton.disabled = false;
    }
}


async function handleRegistrarEncomendaSubmit(event) {
    event.preventDefault();
    if (!formNovaEncomendaModal) return;

    const submitButton = formNovaEncomendaModal.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
    clearModalError(modalRegistrarEncomenda);

    const formData = new FormData(formNovaEncomendaModal);
    const data = {
        unidadeId: formData.get('unidadeId'),
        descricao: formData.get('descricao'),
        codigoRastreio: formData.get('codigoRastreio') || null,
        remetente: formData.get('remetente') || null,
    };

    try {
        await apiClient.post('/syndic/encomendas', data);
        showGlobalFeedback('Encomenda registrada com sucesso!', 'success', 2500);
        formNovaEncomendaModal.reset();
        closeRegistrarEncomendaModal();
        if (activePortariaTab === 'encomendas') {
            loadInitialPortariaItems();
        }
    } catch (err) {
        console.error('Erro ao registrar encomenda:', err);
        const errorMessage = err.detalhesValidacao || err.message || 'Falha ao registrar encomenda. Verifique os dados e tente novamente.';
        showModalError(modalRegistrarEncomenda, errorMessage);
    } finally {
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}


// --- Funções de Carregamento e Renderização do Feed (Unificado) ---
async function loadInitialPortariaItems() {
    currentPortariaPage = 1;
    noMorePortariaItems = false;
    isLoadingPortariaItems = false;

    const currentTabContent = document.getElementById(activePortariaTab === 'visitantes' ? 'content-visitantes' : 'content-encomendas');
    const feedContainer = currentTabContent?.querySelector(
        activePortariaTab === 'visitantes' ? portariaFeedContainerSelector : portariaEncomendasFeedContainerSelector
    );
    if (!feedContainer || !currentTabContent) return;

    feedContainer.querySelectorAll(`.cv-card:not(.prio-0):not(.feed-skeleton-item)`).forEach(el => el.remove());
    fetchedPortariaItems = [];

    const oldError = currentTabContent.querySelector('.cv-error-state');
    if (oldError) oldError.style.display = 'none';
    const oldEmpty = currentTabContent.querySelector('.cv-empty-state');
    if (oldEmpty) oldEmpty.style.display = 'none';

    let sentinel = document.getElementById(portariaScrollSentinelId);
    if (!sentinel) {
        sentinel = document.createElement("div");
        sentinel.id = portariaScrollSentinelId;
        sentinel.style.height = "10px";
        feedContainer.appendChild(sentinel);
    }
    sentinel.style.display = "block";

    showSkeleton(currentTabContent);
    await fetchAndDisplayPortariaItems(currentPortariaPage, false);
}

function setupPortariaFeedObserver() {
    const sentinel = document.getElementById(portariaScrollSentinelId);
    if (!sentinel) return;

    const observer = new IntersectionObserver(async (entries) => {
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

    const currentTabContentEl = document.getElementById(
        activePortariaTab === 'visitantes' ? 'content-visitantes' : 'content-encomendas'
    );
    const feedContainer = currentTabContentEl?.querySelector(
        activePortariaTab === 'visitantes' ? portariaFeedContainerSelector : portariaEncomendasFeedContainerSelector
    );

    if (!feedContainer || !currentTabContentEl) {
        isLoadingPortariaItems = false;
        if(currentTabContentEl) hideSkeleton(currentTabContentEl);
        return;
    }
    const sentinelElement = document.getElementById(portariaScrollSentinelId);

    if (!append) {
        showSkeleton(currentTabContentEl);
    } else {
        if (sentinelElement) {
            let spinner = sentinelElement.previousElementSibling;
            if (!spinner || !spinner.classList.contains('loading-spinner-portaria')) {
                spinner = document.createElement('div');
                spinner.className = 'loading-spinner-portaria';
                spinner.innerHTML = '<span class="inline-spinner"></span>';
                feedContainer.insertBefore(spinner, sentinelElement);
            }
            spinner.style.display = 'block';
        }
    }
    if (sentinelElement) sentinelElement.style.display = "block";

    let endpoint = '';
    const params = {
        pageNumber: page,
        pageSize: 10,
        sortOrder: currentPortariaSortOrder || 'desc',
    };

    if (activePortariaTab === 'visitantes') {
        params.tipo = tipoVisualizacaoVisitantes; // 'atuais' ou 'historico'
        if (currentPortariaFilters.unidadeId) params.unidadeId = currentPortariaFilters.unidadeId;
        if (tipoVisualizacaoVisitantes === 'historico') {
            endpoint = '/api/v1/visitantes/historico'; // Endpoint para histórico
            if (currentPortariaFilters.dataInicio) params.dataInicio = currentPortariaFilters.dataInicio;
            if (currentPortariaFilters.dataFim) params.dataFim = currentPortariaFilters.dataFim;
            if (currentPortariaFilters.nomeVisitante) params.nome = currentPortariaFilters.nomeVisitante;
        } else {
            endpoint = '/api/v1/visitantes/atuais'; // Endpoint para atuais
        }
    } else { // Encomendas
        endpoint = '/syndic/encomendas';
        if (currentPortariaFilters.unidadeIdEncomenda) params.unidadeId = currentPortariaFilters.unidadeIdEncomenda;
        if (currentPortariaFilters.statusEncomenda) params.status = currentPortariaFilters.statusEncomenda;
    }

    try {
        const response = await apiClient.get(endpoint, params);
        const items = response.data || response || [];

        hideSkeleton(currentTabContentEl);
        const existingError = currentTabContentEl.querySelector('.cv-error-state');
        if (existingError) existingError.remove();
        const existingEmpty = currentTabContentEl.querySelector('.cv-empty-state');
        if (existingEmpty) existingEmpty.remove();

        const spinner = feedContainer.querySelector('.loading-spinner-portaria');
        if (spinner) spinner.style.display = 'none';

        if (items.length > 0) {
            items.forEach(item => {
                const itemTypeForComparison = activePortariaTab === 'visitantes' ?
                                             (tipoVisualizacaoVisitantes === 'atuais' ? 'visitante_atual' : 'visitante_historico')
                                             : 'encomenda';
                if (fetchedPortariaItems.some(fi => fi.id === item.id && fi.type === itemTypeForComparison)) {
                    return;
                }
                item.type = itemTypeForComparison;
                fetchedPortariaItems.push(item);

                const itemElement = renderPortariaItem(item);
                if (sentinelElement) {
                    feedContainer.insertBefore(itemElement, sentinelElement);
                } else {
                    feedContainer.appendChild(itemElement);
                }
            });
        } else {
            if (page === 1 && !append && fetchedPortariaItems.length === 0) {
                const hasActiveFilters = Object.values(currentPortariaFilters).some(f => f && f !== '');
                let description = hasActiveFilters ?
                    'Nenhum item encontrado para os filtros atuais.' :
                    `Nenhum ${activePortariaTab === 'visitantes' ? (tipoVisualizacaoVisitantes === 'atuais' ? 'visitante atual' : 'registro no histórico') : 'encomenda'} encontrado.`;
                const roles = getRoles();
                const isSindico = roles.includes('Porteiro') || roles.includes('Sindico') || roles.includes('Administrador');
                if (!hasActiveFilters && isSindico) {
                    description += activePortariaTab === 'visitantes'
                        ? ' Use o botão (+) para registrar um novo visitante.'
                        : ' Use o botão (+) para registrar uma nova encomenda.';
                }
                const emptyStateEl = createEmptyStateElement({
                    iconHTML: `<img src="/img/illustrations/empty-box.svg" alt="Sem resultados">`,
                    title: 'Nenhum Item Encontrado',
                    description
                });
                if (sentinelElement) {
                    currentTabContentEl.insertBefore(emptyStateEl, sentinelElement);
                } else {
                    currentTabContentEl.appendChild(emptyStateEl);
                }
            }
            noMorePortariaItems = true;
            if (sentinelElement) sentinelElement.style.display = 'none';
        }
    } catch (error) {
        console.error(`Erro ao buscar ${activePortariaTab}:`, error);
        hideSkeleton(currentTabContentEl);
        const spinner = feedContainer.querySelector('.loading-spinner-portaria');
        if (spinner) spinner.style.display = 'none';

        if (!append || (append && fetchedPortariaItems.length === 0) ) {
            const errorState = createErrorStateElement({
                iconHTML: `<img src="/img/illustrations/undraw_warning_cyit.svg" alt="Erro">`,
                title: 'Falha ao Carregar',
                message: error.message || `Falha ao carregar ${activePortariaTab}. Verifique sua conexão ou tente novamente.`,
                retryButton: {
                    text: 'Tentar Novamente',
                    onClick: () => {
                        const current = currentTabContentEl.querySelector('.cv-error-state');
                        if (current) current.remove();
                        loadInitialPortariaItems();
                    }
                }
            });
            if (sentinelElement) {
                currentTabContentEl.insertBefore(errorState, sentinelElement);
            } else {
                currentTabContentEl.appendChild(errorState);
            }
        } else if (append) {
            if (!error.handledByApiClient && error.message) {
                 showGlobalFeedback(error.message || `Erro ao carregar mais ${activePortariaTab}.`, "error");
            }
        }
        if (sentinelElement) sentinelElement.style.display = "none";
    } finally {
        isLoadingPortariaItems = false;
         const spinner = feedContainer.querySelector('.loading-spinner-portaria');
        if (spinner) spinner.style.display = 'none';
    }
}


function renderPortariaItem(item) {
    const card = document.createElement('div');
    card.className = 'cv-card portaria-item';
    card.dataset.id = item.id;
    card.dataset.type = item.type;

    let htmlContent = '';

    if (item.type === 'visitante_atual' || item.type === 'visitante_historico') {
        const isAtual = item.type === 'visitante_atual';
        htmlContent = `
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
    } else if (item.type === 'encomenda') {
        // A API de encomendas pode usar 'status' ou 'retiradoEm' para determinar se está pendente.
        // Adotar uma lógica consistente com a API. Exemplo:
        const statusEncomenda = item.status || (item.retiradoEm ? 'Entregue' : 'Recebida');
        const isPendente = statusEncomenda.toLowerCase() === 'recebida' || statusEncomenda.toLowerCase() === 'aguardando retirada';
        htmlContent = `
            <h4>Encomenda: ${item.descricao || `ID ${item.id.substring(0,8)}...`}</h4>
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
    card.innerHTML = htmlContent;
    return card;
}

function setupPortariaItemActionListeners() {
    const feedVisitantes = document.querySelector(portariaFeedContainerSelector);
    const feedEncomendas = document.querySelector(portariaEncomendasFeedContainerSelector);

    const handleActionClick = async (event) => {
        const target = event.target;
        const id = target.dataset.id;

        if (target.classList.contains('btn-registrar-saida-visitante')) {
            if (id && confirm('Deseja realmente registrar a saída do visitante?')) {
                try {
                    target.disabled = true;
                    target.innerHTML = '<span class="inline-spinner"></span> Registrando...';
                    await apiClient.post(`/api/v1/visitantes/${id}/registrar-saida`, {});
                    showGlobalFeedback('Saída do visitante registrada.', 'success');
                    loadInitialPortariaItems();
                } catch (err) {
                    console.error('Erro ao registrar saída do visitante:', err);
                    showGlobalFeedback('Erro ao registrar saída: ' + (err.message || ''), 'error');
                    target.disabled = false;
                    target.innerHTML = 'Registrar Saída';
                }
            }
        } else if (target.classList.contains('btn-confirmar-retirada-encomenda')) {
            if (id && confirm('Confirmar retirada da encomenda?')) {
                try {
                    target.disabled = true;
                    target.innerHTML = '<span class="inline-spinner"></span> Confirmando...';
                    await apiClient.post(`/syndic/encomendas/${id}/retirar`, {});
                    showGlobalFeedback('Retirada da encomenda confirmada.', 'success');
                    loadInitialPortariaItems();
                } catch (err) {
                    console.error('Erro ao confirmar retirada da encomenda:', err);
                    showGlobalFeedback('Erro ao confirmar retirada: ' + (err.message || ''), 'error');
                    target.disabled = false;
                    target.innerHTML = 'Confirmar Retirada';
                }
            }
        }
    };

    feedVisitantes?.addEventListener('click', handleActionClick);
    feedEncomendas?.addEventListener('click', handleActionClick);
}

function setupTryAgainButtons() {
    document.querySelectorAll(".js-try-again-button").forEach(button => {
        button.addEventListener("click", (event) => {
            const buttonEl = event.currentTarget;
            const contentId = buttonEl.dataset.contentId; // Ex: content-visitantes, content-encomendas

            if (contentId) {
                const errorStateDiv = buttonEl.closest(".cv-error-state");
                if (errorStateDiv) {
                    errorStateDiv.style.display = "none";
                }
                // Determinar qual aba está ativa e recarregar seus itens
                // A variável activePortariaTab já deve estar correta.
                // A função loadInitialPortariaItems usa activePortariaTab.
                loadInitialPortariaItems();
            } else {
                // Fallback geral se não houver contentId (recarrega o feed da aba atualmente ativa)
                loadInitialPortariaItems();
            }
        });
    });
}


// --- Inicialização ---
export async function initialize() {
    requireAuth();

    // Inicializar Modais
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
    setupModalEventListeners(); // Inclui setup para filtros e sort
    setupPortariaFeedObserver();
    setupPortariaItemActionListeners();
    setupTryAgainButtons();


    const roles = getRoles();
    const isPorteiroOuSindico = roles.includes('Porteiro') || roles.includes('Sindico') || roles.includes('Administrador');
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
