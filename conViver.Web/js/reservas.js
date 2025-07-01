import { showGlobalFeedback, createErrorStateElement, createEmptyStateElement, showSkeleton, hideSkeleton, showModalError, clearModalError } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
import apiClient from "./apiClient.js";
import { initFabMenu } from "./fabMenu.js";

const {
  Calendar: FullCalendarCalendar,
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
} = window.FullCalendar || {};

// --- Variáveis Globais ---
let espacosComunsList = [];
let calendarioReservas = null;
let currentUserId = null;
let currentUserRoles = [];
let dataSelecionadaAgenda = new Date().toISOString().split("T")[0]; // Para detalhes do dia no calendário

// Estado de Paginação e Carregamento para Listas
let currentPageListView = 1;
let isLoadingListView = false;
let noMoreItemsListView = false;
const listViewItemsContainerId = "list-view-reservas-items";
const listViewSentinelId = "list-view-sentinel";

let currentPageMinhasReservas = 1;
let isLoadingMinhasReservas = false;
let noMoreItemsMinhasReservas = false;
const minhasReservasItemsContainerId = "minhas-reservas-list";
const minhasReservasSentinelId = "minhas-reservas-sentinel";

// Estado Atual de Filtros e Ordenação
let currentFilters = {}; // { espacoComumId: '', periodo: '', status: '', etc. }
let currentSortBy = 'dataInicio'; // 'dataInicio', 'dataSolicitacao', 'nomeEspaco'
let currentSortDirection = 'desc'; // 'asc', 'desc'
let activeTab = 'agenda'; // 'agenda' ou 'minhas-reservas'
let agendaViewMode = 'calendario'; // 'calendario' ou 'lista'

// --- Elementos DOM ---
// Abas e Controles de Visualização
let tabAgendaBtn, tabMinhasBtn, contentAgenda, contentMinhas;
let btnViewCalendario, btnViewLista, calendarioViewContainer, listViewContainer;

// Botões de Ação Globais (Filtro e Ordenação)
let openFilterButton, openSortButton;

// Modais Principais
let modalFiltros, modalSort, modalNovaReserva, modalDetalheReserva, modalGerenciarEspaco, modalTermosUso;

// Forms e Elementos de Modais
let formFiltrosReservas, formSortReservas, formNovaReserva, formGerenciarEspaco;
// ... (outros elementos internos dos modais serão referenciados dentro de suas funções de setup)

// Containers de Listas e Skeletons
let agendaDiaListContainer, agendaDiaSkeleton; // Para detalhes do dia no calendário
// ... (skeletons das listas principais serão pegos dinamicamente)


function getStatusBadgeHtml(status) {
  const s = status ? status.toLowerCase() : "";
  let type = "success"; // default
  if (s.includes("pendente") || s.includes("aguardando")) type = "warning";
  else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) type = "danger";
  else if (s.includes("confirmada")) type = "success";
  else type = "info"; // Para outros status
  return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${type}"></span>${status}</span>`;
}

export async function initialize() {
  requireAuth();
  const userInfo = getUserInfo();
  if (!userInfo || !userInfo.id) {
    showGlobalFeedback("Erro ao identificar usuário. Recarregue a página.", "error");
    return;
  }
  currentUserId = userInfo.id;
  currentUserRoles = getRoles();

  // Inicializar Seletores DOM
  initDomSelectors();

  // Configurar Abas
  setupTabs();

  // Configurar Modais
  setupModalEventListeners(); // Configura todos os modais, incluindo filtro e sort

  // Carregar dados essenciais
  await carregarEspacosComuns(); // Para popular selects nos filtros e modais

  // Configurar Views Iniciais e Observers (FullCalendar, Listas com scroll)
  // A chamada inicial de dados será feita por setupTabs ao ativar a primeira aba.
  initializeFullCalendar();
  setupListViewObserver();
  setupMinhasReservasObserver();
  setupTryAgainButtons(); // Adicionado aqui

  // Configurar FAB
  setupFab();
  setupTryAgainButtons(); // Adicionado aqui

  // Se a primeira aba não for clicada automaticamente por setupTabs, chame o carregamento aqui
   if (tabAgendaBtn && tabAgendaBtn.classList.contains('active')) {
       loadInitialDataForActiveTab();
   } else if (tabMinhasBtn && tabMinhasBtn.classList.contains('active')) {
       loadInitialDataForActiveTab();
   } else if (tabAgendaBtn) { // Fallback para clicar na primeira se nenhuma estiver ativa
       tabAgendaBtn.click();
   }
}

function initDomSelectors() {
    tabAgendaBtn = document.getElementById("tab-agenda");
    tabMinhasBtn = document.getElementById("tab-minhas-reservas");
    contentAgenda = document.getElementById("content-agenda");
    contentMinhas = document.getElementById("content-minhas-reservas");

    btnViewCalendario = document.getElementById("btn-view-calendario");
    btnViewLista = document.getElementById("btn-view-lista");
    calendarioViewContainer = document.getElementById("calendario-view-container");
    listViewContainer = document.getElementById("list-view-container");

    openFilterButton = document.getElementById("open-filter-reservas-button");
    openSortButton = document.getElementById("open-sort-reservas-button");

    modalFiltros = document.getElementById("modal-filtros-reservas");
    formFiltrosReservas = document.getElementById("form-filtros-reservas");
    modalSort = document.getElementById("modal-sort-reservas");
    formSortReservas = document.getElementById("form-sort-reservas");

    modalNovaReserva = document.getElementById("modal-nova-reserva");
    formNovaReserva = document.getElementById("form-nova-reserva");
    modalDetalheReserva = document.getElementById("modal-detalhe-reserva");
    modalGerenciarEspaco = document.getElementById("modal-gerenciar-espaco-comum");
    formGerenciarEspaco = document.getElementById("form-gerenciar-espaco-comum");
    modalTermosUso = document.getElementById("modal-termos-uso-reserva");

    agendaDiaListContainer = document.getElementById("agenda-dia-reservas-items");
    agendaDiaSkeleton = document.querySelector("#agenda-dia-list .feed-skeleton-container");

    // Admin Espaços Comuns (elementos internos são pegos nas suas funções)
    // adminEspacosSection = document.getElementById("admin-espacos-section");
    // adminEspacosGrid = document.getElementById("admin-espacos-grid");
    // btnAdicionarEspaco = document.getElementById("btn-adicionar-espaco");
}

function setupTabs() {
    const tabsContainer = document.getElementById("reservas-tabs");
    if (!tabsContainer) return;

    const tabButtons = tabsContainer.querySelectorAll(".cv-tabs-buttons .cv-tab-button");
    const mainContentPanes = document.querySelectorAll("main > .cv-tab-content"); // Assumindo que os panes são filhos diretos de main

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            tabButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            activeTab = button.id === 'tab-agenda' ? 'agenda' : 'minhas-reservas';

            mainContentPanes.forEach(pane => pane.style.display = "none");
            const targetPaneId = button.id.replace("tab-", "content-");
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) targetPane.style.display = "block";

            // Atualizar título do modal de filtros e visibilidade dos campos
            updateFilterModalContent();
            // Recarregar dados para a aba ativa
            loadInitialDataForActiveTab();
        });
    });

    // Toggle entre Calendário e Lista na aba Agenda
    if (btnViewCalendario) btnViewCalendario.addEventListener("click", () => toggleAgendaView("calendario"));
    if (btnViewLista) btnViewLista.addEventListener("click", () => toggleAgendaView("lista"));

    // Ativar primeira aba por padrão
    if (tabButtons.length > 0 && !tabsContainer.querySelector(".cv-tab-button.active")) {
        tabButtons[0].click();
    } else if (tabsContainer.querySelector(".cv-tab-button.active")) {
        // Se já houver uma aba ativa (ex: por URL ou estado salvo), carrega seus dados
        activeTab = tabsContainer.querySelector(".cv-tab-button.active").id === 'tab-agenda' ? 'agenda' : 'minhas-reservas';
        loadInitialDataForActiveTab();
    }
}

function toggleAgendaView(viewToShow) {
    agendaViewMode = viewToShow;
    if (calendarioViewContainer && listViewContainer && btnViewCalendario && btnViewLista) {
        if (agendaViewMode === 'calendario') {
            calendarioViewContainer.style.display = 'block';
            listViewContainer.style.display = 'none';
            btnViewCalendario.classList.add('cv-button--primary');
            btnViewLista.classList.remove('cv-button--primary');
            if (calendarioReservas) calendarioReservas.refetchEvents();
        } else { // 'lista'
            calendarioViewContainer.style.display = 'none';
            listViewContainer.style.display = 'block';
            btnViewLista.classList.add('cv-button--primary');
            btnViewCalendario.classList.remove('cv-button--primary');
            // Carregar dados da lista se não tiverem sido carregados ainda para os filtros atuais
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if (!listItemsContainer.dataset.loadedOnce || listItemsContainer.innerHTML.trim() === "") {
                 loadInitialDataForActiveTab(); // Especificamente para a lista da agenda
            }
        }
    }
    // Atualizar visibilidade dos filtros no modal, se aberto
    updateFilterModalContent();
}


function setupModalEventListeners() {
    // Modal de Filtros
    if (openFilterButton && modalFiltros) {
        openFilterButton.addEventListener("click", () => {
            updateFilterModalContent(); // Ajusta campos visíveis e título
            // Preencher valores atuais dos filtros no modal
            populateFiltersModal();
            modalFiltros.style.display = "flex";
        });
        modalFiltros.querySelector(".js-modal-filtros-reservas-close").addEventListener("click", () => modalFiltros.style.display = "none");
        formFiltrosReservas.addEventListener("submit", (e) => {
            e.preventDefault();
            applyFiltersFromModal();
            modalFiltros.style.display = "none";
        });
        document.getElementById("limpar-filtros-modal-reservas").addEventListener("click", () => {
            formFiltrosReservas.reset();
            currentFilters = {};
            // Resetar selects para o primeiro option (geralmente "Todos")
            formFiltrosReservas.querySelectorAll("select").forEach(s => s.selectedIndex = 0);
            applyFiltersFromModal(); // Aplica os filtros limpos (recarrega os dados)
            modalFiltros.style.display = "none";
        });
    }

    // Modal de Ordenação
    if (openSortButton && modalSort) {
        openSortButton.addEventListener("click", () => {
            // Preencher valores atuais de ordenação
            document.getElementById('sort-by-reservas').value = currentSortBy;
            document.getElementById('sort-direction-reservas').value = currentSortDirection;
            modalSort.style.display = "flex";
        });
        modalSort.querySelector(".js-modal-sort-reservas-close").addEventListener("click", () => modalSort.style.display = "none");
        formSortReservas.addEventListener("submit", (e) => {
            e.preventDefault();
            applySortFromModal();
            modalSort.style.display = "none";
        });
        document.getElementById("limpar-sort-modal-reservas").addEventListener("click", () => {
            formSortReservas.reset(); // Reseta para os valores padrão do HTML
            currentSortBy = document.getElementById('sort-by-reservas').value; // Pega o padrão do HTML
            currentSortDirection = document.getElementById('sort-direction-reservas').value;
            applySortFromModal();
            modalSort.style.display = "none";
        });
    }

    // Outros Modais (Nova Reserva, Detalhes, Gerenciar Espaço, Termos)
    if (modalNovaReserva) {
        modalNovaReserva.querySelector(".js-modal-nova-reserva-close").addEventListener("click", () => modalNovaReserva.style.display = "none");
        formNovaReserva.addEventListener("submit", handleSalvarReservaFormSubmit);
        document.getElementById("modal-reserva-espaco")?.addEventListener("change", (e) => exibirInfoEspacoSelecionadoModal(e.target.value));
    }
    if (modalDetalheReserva) {
        modalDetalheReserva.querySelector(".js-modal-detalhe-reserva-close").addEventListener("click", () => modalDetalheReserva.style.display = "none");
        // Listeners para botões de ação (aprovar, recusar, cancelar) são adicionados dinamicamente em abrirModalDetalhesComDados
    }
    if (modalGerenciarEspaco) {
        modalGerenciarEspaco.querySelector(".js-modal-gerenciar-espaco-close").addEventListener("click", () => modalGerenciarEspaco.style.display = "none");
        formGerenciarEspaco.addEventListener("submit", handleSalvarEspacoComumSubmit);
    }
    if (modalTermosUso) {
        modalTermosUso.querySelector(".js-modal-termos-uso-close").addEventListener("click", () => modalTermosUso.style.display = "none");
        document.getElementById("link-termos-uso-reserva")?.addEventListener("click", (e) => {
            e.preventDefault();
            modalTermosUso.style.display = "flex";
        });
    }
     window.addEventListener("click", (e) => {
        if (e.target === modalFiltros) modalFiltros.style.display = "none";
        if (e.target === modalSort) modalSort.style.display = "none";
        if (e.target === modalNovaReserva) modalNovaReserva.style.display = "none";
        if (e.target === modalDetalheReserva) modalDetalheReserva.style.display = "none";
        if (e.target === modalGerenciarEspaco) modalGerenciarEspaco.style.display = "none";
        if (e.target === modalTermosUso) modalTermosUso.style.display = "none";
    });
}

function updateFilterModalContent() {
    if (!modalFiltros) return;
    const title = document.getElementById("modal-filtros-reservas-title");
    const agendaFilters = modalFiltros.querySelector('[data-context="agenda"]');
    const minhasReservasFilters = modalFiltros.querySelector('[data-context="minhas-reservas"]');
    const agendaPeriodoFilter = modalFiltros.querySelector('[data-context="agenda"] [data-view-context="lista"]');

    if (activeTab === 'agenda') {
        title.textContent = "Filtros da Agenda";
        agendaFilters.style.display = 'block';
        minhasReservasFilters.style.display = 'none';
        if (agendaViewMode === 'lista') {
            agendaPeriodoFilter.style.display = 'block';
        } else { // calendário
            agendaPeriodoFilter.style.display = 'none';
        }
    } else { // minhas-reservas
        title.textContent = "Filtros de Minhas Reservas";
        agendaFilters.style.display = 'none';
        minhasReservasFilters.style.display = 'block';
    }
}

function populateFiltersModal() {
    // Preenche com base em currentFilters e activeTab/agendaViewMode
    if (activeTab === 'agenda') {
        document.getElementById('filtro-espaco-comum-agenda').value = currentFilters.espacoComumId || "";
        if (agendaViewMode === 'lista') {
            document.getElementById('filtro-periodo-agenda-lista').value = currentFilters.periodo || "";
        }
    } else { // minhas-reservas
        document.getElementById('filtro-espaco-comum-minhas').value = currentFilters.espacoComumId || "";
        document.getElementById('filtro-periodo-minhas').value = currentFilters.periodo || "";
        document.getElementById('filtro-status-minhas').value = currentFilters.status || "";
    }
}

function applyFiltersFromModal() {
    currentFilters = {}; // Limpa filtros antes de aplicar novos
    if (activeTab === 'agenda') {
        currentFilters.espacoComumId = document.getElementById('filtro-espaco-comum-agenda').value;
        if (agendaViewMode === 'lista') {
            currentFilters.periodo = document.getElementById('filtro-periodo-agenda-lista').value;
        }
        // Filtro de data para calendário é manipulado pelo próprio calendário (navegação) + refetchEvents
        // Se o modal precisar forçar uma data no calendário, seria uma lógica adicional aqui.
    } else { // minhas-reservas
        currentFilters.espacoComumId = document.getElementById('filtro-espaco-comum-minhas').value;
        currentFilters.periodo = document.getElementById('filtro-periodo-minhas').value;
        currentFilters.status = document.getElementById('filtro-status-minhas').value;
    }
    updateFilterButtonIndicator();
    loadInitialDataForActiveTab();
}

function updateFilterButtonIndicator() {
    if (!openFilterButton) return;
    const hasActiveFilters = Object.values(currentFilters).some(val => val && val !== "");
    if (hasActiveFilters) {
        openFilterButton.classList.add("has-indicator");
    } else {
        openFilterButton.classList.remove("has-indicator");
    }
}

function applySortFromModal() {
    currentSortBy = document.getElementById('sort-by-reservas').value;
    currentSortDirection = document.getElementById('sort-direction-reservas').value;
    updateSortButtonIndicator();
    loadInitialDataForActiveTab();
}

function updateSortButtonIndicator() {
    if (!openSortButton) return;
    // Adiciona indicador se não for a ordenação padrão (ex: data desc)
    const isDefaultSort = currentSortBy === 'dataInicio' && currentSortDirection === 'desc';
    if (!isDefaultSort) {
        openSortButton.classList.add("has-indicator");
    } else {
        openSortButton.classList.remove("has-indicator");
    }
}

function setupFab() {
    const actions = [{ label: "Nova Reserva", onClick: openModalNovaReserva }];
    if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
        actions.push({ label: "Novo Espaço Comum", onClick: openModalAdicionarEspaco });
    }
    initFabMenu(actions);
}

function openModalNovaReserva() {
    if (!modalNovaReserva || !formNovaReserva) return;
    document.getElementById("modal-nova-reserva-title").textContent = "Solicitar Nova Reserva";
    formNovaReserva.reset();
    clearModalError(modalNovaReserva);
    document.getElementById("modal-reserva-id").value = "";
    document.getElementById("modal-reserva-unidade-sindico-group").style.display = "none";
    document.getElementById("btn-submit-nova-reserva").textContent = "Solicitar Reserva";
    document.getElementById("modal-reserva-termos").disabled = false;

    // Pré-selecionar espaço se um estiver ativo nos filtros da agenda
    const selectEspacoModal = document.getElementById("modal-reserva-espaco");
    if (activeTab === 'agenda' && currentFilters.espacoComumId) {
        selectEspacoModal.value = currentFilters.espacoComumId;
    } else {
        selectEspacoModal.value = ""; // Limpa se não houver filtro ativo
    }
    exibirInfoEspacoSelecionadoModal(selectEspacoModal.value);
    modalNovaReserva.style.display = "flex";
}

function openModalAdicionarEspaco() {
    if (!modalGerenciarEspaco || !formGerenciarEspaco) return;
    document.getElementById("modal-gerenciar-espaco-title").textContent = "Adicionar Novo Espaço Comum";
    formGerenciarEspaco.reset();
    clearModalError(modalGerenciarEspaco);
    document.getElementById("espaco-comum-id").value = "";
    modalGerenciarEspaco.style.display = "flex";
}

// --- Funções de Carregamento de Dados ---
function loadInitialDataForActiveTab() {
    if (activeTab === 'agenda') {
        if (agendaViewMode === 'calendario') {
            if (calendarioReservas) calendarioReservas.refetchEvents();
             // Carregar detalhes do dia para a data atualmente selecionada no calendário
            carregarReservasDia(dataSelecionadaAgenda);
        } else { // lista
            currentPageListView = 1;
            noMoreItemsListView = false;
            document.getElementById(listViewItemsContainerId).innerHTML = ''; // Limpar antes de carregar
            carregarReservasListView(true); // true para isInitialLoad
        }
    } else { // minhas-reservas
        currentPageMinhasReservas = 1;
        noMoreItemsMinhasReservas = false;
        document.getElementById(minhasReservasItemsContainerId).innerHTML = ''; // Limpar
        carregarMinhasReservas(true); // true para isInitialLoad
    }
}


// --- initReservasPage e outras funções de manipulação de DOM/eventos (a serem refatoradas/integradas) ---
// Muitas dessas lógicas já foram ou serão movidas para as funções de setup mais granulares.
// Por exemplo, listeners de modais estão em setupModalEventListeners.
// Carregamento de dados em loadInitialDataForActiveTab e nas funções específicas de lista/calendário.

// --- Funções de API e Renderização (a serem adaptadas) ---
// carregarEspacosComuns, initializeFullCalendar, carregarReservasListView, carregarMinhasReservas,
// renderCardReservaListView, etc., precisarão usar currentFilters, currentSortBy, currentSortDirection.


// TODO: Refatorar as seguintes funções para usar as variáveis globais de filtro/ordem
// e para lidar com os novos containers de empty/error state:
// - carregarEspacosComuns (já ok, usado para popular selects)
// - initializeFullCalendar (especialmente a fonte de `events`)
// - carregarReservasListView (para scroll infinito da lista da agenda)
// - carregarMinhasReservas (para scroll infinito de "Minhas Reservas")
// - handleSalvarReservaFormSubmit, handleSalvarEspacoComumSubmit (já usam modais)
// - abrirModalDetalhesComDados, handleCancelarReserva, etc. (já usam modais)


// O restante do arquivo (initializeFullCalendar, carregarReservasDia, carregarMinhasReservas,
// carregarReservasListView, renderCardReservaListView, e todas as funções de handle de forms e modais)
// precisará ser revisado para:
// 1. Usar `currentFilters`, `currentSortBy`, `currentSortDirection` nas chamadas de API.
// 2. Mostrar/ocultar os Skeletons, Empty States e Error States corretos para cada contexto.
// 3. Assegurar que o scroll infinito funcione para as listas.

// Por ora, esta é a refatoração da estrutura inicial e dos listeners dos novos controles.

if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}

async function initReservasPage() {
  // Elementos de nova reserva
  const fabNovaReserva = document.getElementById("fab-nova-reserva");
  const modalNovaReserva = document.getElementById("modal-nova-reserva");
  const closeModalNovaReservaButton = modalNovaReserva
    ? modalNovaReserva.querySelector(".js-modal-nova-reserva-close")
    : null;
  const formNovaReserva = document.getElementById("form-nova-reserva");
  const selectEspacoComumCalendario = document.getElementById(
    "select-espaco-comum-calendario"
  );
  const modalSelectEspaco = document.getElementById("modal-reserva-espaco");

  // Termos de uso
  const linkTermosUso = document.getElementById("link-termos-uso-reserva");
  const modalTermosUso = document.getElementById("modal-termos-uso-reserva");
  const closeModalTermosUso = modalTermosUso
    ? modalTermosUso.querySelector(".js-modal-termos-uso-close")
    : null;

  // Detalhe de reserva
  const modalDetalheReserva = document.getElementById("modal-detalhe-reserva");
  const closeModalDetalheReserva = modalDetalheReserva
    ? modalDetalheReserva.querySelector(".js-modal-detalhe-reserva-close")
    : null;
  const btnCancelarReservaModal = document.getElementById(
    "btn-cancelar-reserva-modal"
  );
  const btnAprovarReservaModal = document.getElementById(
    "btn-aprovar-reserva-modal"
  );
  const btnRecusarReservaModal = document.getElementById(
    "btn-recusar-reserva-modal"
  );
  const btnEditarReservaModalTrigger = document.getElementById(
    "btn-editar-reserva-modal-trigger"
  );

  // Admin Espaços Comuns
  adminEspacosSection = document.getElementById("admin-espacos-section");
  adminEspacosGrid = document.getElementById("admin-espacos-grid");
  btnAdicionarEspaco = document.getElementById("btn-adicionar-espaco");
  modalGerenciarEspaco = document.getElementById("modal-gerenciar-espaco-comum");
  closeModalGerenciarEspaco = modalGerenciarEspaco
    ? modalGerenciarEspaco.querySelector(".js-modal-gerenciar-espaco-close")
    : null;
  formGerenciarEspaco = document.getElementById("form-gerenciar-espaco-comum");

  if (adminEspacosSection) {
    if (
      currentUserRoles.includes("Sindico") ||
      currentUserRoles.includes("Administrador")
    ) {
      adminEspacosSection.style.display = "block";
    }
  }

  // Abre modal de nova reserva
  if (fabNovaReserva) fabNovaReserva.addEventListener("click", () => {
    document.getElementById("modal-nova-reserva-title").textContent =
      "Solicitar Nova Reserva";
    formNovaReserva.reset();
    document.getElementById("modal-reserva-id").value = "";
    document.getElementById(
      "modal-reserva-unidade-sindico-group"
    ).style.display = "none";
    document.getElementById("btn-submit-nova-reserva").textContent =
      "Solicitar Reserva";
    document.getElementById("modal-reserva-termos").disabled = false;
    modalNovaReserva.style.display = "flex";

    // Pré-seleciona o espaço
    let esp = "";
    if (calendarioViewContainer.style.display !== "none")
      esp = selectEspacoComumCalendario.value;
    else esp = filtroEspacoLista.value;
    modalSelectEspaco.value = esp;
    exibirInfoEspacoSelecionadoModal(esp);
  });

  if (closeModalNovaReservaButton)
    closeModalNovaReservaButton.addEventListener(
      "click",
      () => (modalNovaReserva.style.display = "none")
    );
  window.addEventListener("click", (e) => {
    if (e.target === modalNovaReserva) modalNovaReserva.style.display = "none";
  });
  if (formNovaReserva)
    formNovaReserva.addEventListener("submit", handleSalvarReservaFormSubmit);

  // Termos de uso
  if (linkTermosUso) linkTermosUso.addEventListener("click", (e) => {
    e.preventDefault();
    modalTermosUso.style.display = "flex";
  });
  if (closeModalTermosUso)
    closeModalTermosUso.addEventListener(
      "click",
      () => (modalTermosUso.style.display = "none")
    );
  window.addEventListener("click", (e) => {
    if (e.target === modalTermosUso) modalTermosUso.style.display = "none";
  });

  // Detalhe de reserva
  if (closeModalDetalheReserva)
    closeModalDetalheReserva.addEventListener(
      "click",
      () => (modalDetalheReserva.style.display = "none")
    );
  window.addEventListener("click", (e) => {
    if (e.target === modalDetalheReserva)
      modalDetalheReserva.style.display = "none";
  });

  if (btnCancelarReservaModal) btnCancelarReservaModal.addEventListener("click", async () => {
    const id = btnCancelarReservaModal.dataset.reservaId;
    if (id) {
      await handleCancelarReserva(id);
      modalDetalheReserva.style.display = "none";
    }
  });
  if (btnAprovarReservaModal)
    btnAprovarReservaModal.addEventListener("click", handleAprovarReserva);
  if (btnRecusarReservaModal)
    btnRecusarReservaModal.addEventListener("click", handleRecusarReserva);
  if (btnEditarReservaModalTrigger)
    btnEditarReservaModalTrigger.addEventListener(
      "click",
      abrirModalEditarReservaPeloSindico
    );

  // Atualiza seleção de espaço no calendário
  if (selectEspacoComumCalendario) selectEspacoComumCalendario.addEventListener("change", () => {
    exibirInfoEspacoSelecionadoCalendario(selectEspacoComumCalendario.value);
    calendarioReservas && calendarioReservas.refetchEvents();
  });

  // Carrega dados e inicializa componentes
  await carregarEspacosComuns();
  initializeFullCalendar(); // For Agenda Tab
  setupListViewObserver(); // For Agenda Tab's List View
  setupMinhasReservasObserver(); // For Minhas Reservas Tab

  // Initial content load is triggered by setupTabs based on active tab.
  // Example: await carregarMinhasReservas(1, false); // if Minhas Reservas is default active
  // Example: carregarReservasListView(1, false); // if Agenda List is default active
  // FullCalendar loads its own data on render.

  // Define view inicial (within Agenda tab)
  toggleReservasView("calendario");
}

async function carregarEspacosComuns() {
  const selects = [
    document.getElementById("select-espaco-comum-calendario"),
    document.getElementById("modal-reserva-espaco"),
    document.getElementById("filtro-espaco-lista"),
    document.getElementById("filtro-minhas-espaco"), // On-page filter for Minhas Reservas
    document.getElementById("filtro-espaco-modal-agenda"),
    document.getElementById("filtro-espaco-modal-minhas"), // Modal filter for Minhas Reservas
  ];
  selects.forEach((sel) => {
    if (sel) sel.innerHTML = "<option>Carregando...</option>";
  });
  try {
    const espacos = await apiClient.get("/api/v1/app/reservas/espacos-comuns");
    espacosComunsList = espacos;
    selects.forEach((sel) => {
      if (!sel) return;
      const currentValue = sel.value;
      const isFiltro = [
        "select-espaco-comum-calendario",
        "filtro-espaco-lista",
        "filtro-minhas-espaco",
        "filtro-espaco-modal-reservas",
      ].some((id) => sel.id === id);
      sel.innerHTML = `<option value="">${
        isFiltro ? "Todos os Espaços" : "Selecione um espaço"
      }</option>`;
      espacos.forEach((e) => {
        const o = document.createElement("option");
        o.value = e.id;
        o.textContent = e.nome;
        sel.appendChild(o);
      });
      if (currentValue && espacos.some((e) => e.id === currentValue)) {
        sel.value = currentValue;
      }
    });
    if (adminEspacosSection && adminEspacosSection.style.display !== "none") {
      if (espacosComunsList && espacosComunsList.length > 0) {
        renderAdminEspacos();
      } else {
        // Limpar o grid e mostrar empty state
        if (adminEspacosGrid) {
          adminEspacosGrid.innerHTML = '';
          const emptyState = createEmptyStateElement({
            title: "Nenhum Espaço Comum Cadastrado",
            description: "Adicione o primeiro espaço comum para começar a gerenciar as reservas.",
            actionButton: {
              text: "Adicionar Espaço",
              onClick: () => {
                // Acionar o modal de criação de espaço comum
                // Assumindo que existe um botão/função para isso, ex:
                const btnAdd = document.getElementById("btn-adicionar-espaco"); // ou similar
                if (btnAdd) btnAdd.click();
              },
              classes: ["cv-button--primary"]
            }
          });
          adminEspacosGrid.appendChild(emptyState);
        }
      }
    }
  } catch (err) {
    console.error("Erro ao carregar espaços comuns:", err);
    showGlobalFeedback("Falha ao carregar espaços comuns.", "error");
    selects.forEach((sel) => {
      if (sel) sel.innerHTML = "<option>Erro ao carregar</option>";
    });
  }
}

function toggleReservasView(view) {
  if (view === "calendario") {
    calendarioViewContainer.style.display = "block";
    listViewContainer.style.display = "none";
    btnViewCalendario.classList.add("cv-button--primary");
    btnViewLista.classList.remove("cv-button--primary");
    calendarioReservas && calendarioReservas.refetchEvents();
  } else {
    calendarioViewContainer.style.display = "none";
    listViewContainer.style.display = "block";
    btnViewLista.classList.add("cv-button--primary");
    btnViewCalendario.classList.remove("cv-button--primary");
    const c = document.getElementById(listViewItemsContainerId);
    if (c && (!c.dataset.loadedOnce || c.innerHTML.trim() === "")) {
      currentPageListView = 1;
      noMoreItemsListView = false;
      carregarReservasListView(1, false);
    }
  }
}

function setupTabs() {
  const tabsContainer = document.getElementById("reservas-tabs");
  if (!tabsContainer) {
    console.warn("Elemento de abas de reservas não encontrado.");
    return;
  }

  const tabButtons = tabsContainer.querySelectorAll(".cv-tab-button");
  const tabContents = tabsContainer.parentElement.querySelectorAll(
    ".cv-tab-content"
  );

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      console.log(`Tab clicked: ${button.id}`);
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      tabContents.forEach((c) => {
        c.style.display = "none";
      });

      const targetContentId = "content-" + button.id.replace("tab-", "");
      console.log(`Target content ID: ${targetContentId}`);
      const target = document.getElementById(targetContentId);
      if (target) {
        target.style.display = "block";
        console.log(`Displayed content: ${target.id}`);
      } else {
        console.error(`Target content pane with ID ${targetContentId} not found.`);
      }

      if (button.id === "tab-minhas-reservas") {
        console.log("Handling 'tab-minhas-reservas' activation.");
        const container = document.getElementById(minhasReservasItemsContainerId);
        if (!container) {
          console.error(`Container for minhas reservas (#${minhasReservasItemsContainerId}) not found.`);
          return;
        }
        console.log(`'Minhas Reservas' container found. LoadedOnce: ${container.dataset.loadedOnce}, empty: ${!container.innerHTML.trim()}`);
        if (
          !container.dataset.loadedOnce ||
          !container.innerHTML.trim() ||
          container.querySelector(".cv-loading-message")
        ) {
          console.log("Loading 'Minhas Reservas' now.");
          currentPageMinhasReservas = 1;
          noMoreItemsMinhasReservas = false;
          carregarMinhasReservas(1, false);
        }
      }
      else if (button.id === "tab-agenda") {
        if (calendarioViewContainer && calendarioViewContainer.style.display !== 'none') {
          calendarioReservas && calendarioReservas.refetchEvents();
        } else if (listViewContainer && listViewContainer.style.display !== 'none') {
          const listContainer = document.getElementById(listViewItemsContainerId);
          if (!listContainer.dataset.loadedOnce || !listContainer.innerHTML.trim()) {
            currentPageListView = 1;
            noMoreItemsListView = false;
            carregarReservasListView(1, false);
          }
        }
      }
    });
  });

  // trigger initial tab
  const initialActive =
    tabsContainer.querySelector(".cv-tab-button.active") || tabButtons[0];
  if (initialActive) initialActive.click();
}


// The switchTab function is redundant as its logic is incorporated into setupTabs.
// function switchTab(tab) { ... }

async function carregarMinhasReservas(page = 1, append = false) {
  if (isLoadingMinhasReservas || (noMoreItemsMinhasReservas && append)) return;
  isLoadingMinhasReservas = true;

  const container = document.getElementById(minhasReservasItemsContainerId);
  const sentinel = document.getElementById(minhasReservasSentinelId);
  const skeleton = container ? container.parentElement.querySelector('.feed-skeleton-container') : null;

  if (!container) {
    console.error("Container para 'Minhas Reservas' não encontrado.");
    isLoadingMinhasReservas = false;
    return;
  }

  if (!append) {
    container.innerHTML = ""; // Clear previous items for a fresh load
    noMoreItemsMinhasReservas = false; // Reset for new filter/load
  }

  if (sentinel) sentinel.style.display = "block";


  try {
    const params = {
      pageNumber: page,
      pageSize: 10, // Standard page size
      espacoComumId: filtroMinhasEspaco.value || null,
      status: filtroMinhasStatus.value || null,
    };

    if (filtroMinhasPeriodo.value) {
      const [year, month] = filtroMinhasPeriodo.value.split("-").map(Number);
      params.periodoInicio = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
      const ultimoDiaDoMes = new Date(Date.UTC(year, month, 0));
      params.periodoFim = new Date(
        Date.UTC(
          ultimoDiaDoMes.getUTCFullYear(),
          ultimoDiaDoMes.getUTCMonth(),
          ultimoDiaDoMes.getUTCDate(),
          23,
          59,
          59,
          999
        )
      ).toISOString();
    }

    const responseData = await apiClient.get("/api/v1/app/reservas/minhas-reservas", { params, showSkeleton: !append ? skeleton : null });
    // Assuming API returns { items: [], pageNumber: X, pageSize: Y, totalCount: Z, hasNextPage: bool }
    // or similar. For now, we'll use responseData.items and check length against pageSize.
    const items = responseData.items || [];


    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true"; // Mark as loaded once for the tab logic
      items.forEach((reserva) => {
        const card = renderCardReservaListView({ ...reserva, pertenceAoUsuarioLogado: true });
        // Insert before sentinel if appending, otherwise just append
        if (append && sentinel) container.insertBefore(card, sentinel);
        else container.appendChild(card);
      });
      currentPageMinhasReservas = page;
      if (items.length < params.pageSize || responseData.hasNextPage === false) {
        noMoreItemsMinhasReservas = true;
        if (sentinel) sentinel.style.display = "none";
        if (container.querySelector(".fim-lista-minhas") === null) {
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista-minhas";
            fim.textContent = "Fim das suas reservas.";
            fim.style.textAlign = "center";
            container.appendChild(fim);
        }
      }
    } else if (!append) { // No items on first load for these filters
      // container.innerHTML =
      //   '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada com os filtros aplicados.</p>';
      container.innerHTML = ''; // Limpa o container
      const filtersActive = filtroMinhasEspaco.value || filtroMinhasStatus.value || filtroMinhasPeriodo.value;
      const emptyState = createEmptyStateElement({
        title: filtersActive ? "Nenhuma Reserva Encontrada" : "Você Ainda Não Tem Reservas",
        description: filtersActive
          ? "Não encontramos reservas que correspondam aos seus filtros. Tente ajustá-los."
          : "Que tal fazer sua primeira reserva? Explore os espaços comuns disponíveis!",
        actionButton: {
          text: "Nova Reserva",
          onClick: () => {
            const fabNovaReserva = document.getElementById("fab-nova-reserva");
            if (fabNovaReserva) fabNovaReserva.click();
          },
          classes: ["cv-button--primary"]
        }
      });
      container.appendChild(emptyState);
      noMoreItemsMinhasReservas = true;
      if (sentinel) sentinel.style.display = "none";
    } else { // No more items when appending
      noMoreItemsMinhasReservas = true;
      if (sentinel) sentinel.style.display = "none";
      if (container.querySelector(".fim-lista-minhas") === null && page > 1) {
        const fim = document.createElement("p");
        fim.className = "cv-info-message fim-lista-minhas";
        fim.textContent = "Fim das suas reservas.";
        fim.style.textAlign = "center";
        container.appendChild(fim);
    }
    }
  } catch (err) {
    console.error("Erro ao carregar 'Minhas Reservas':", err);
    if (!append) {
      // container.innerHTML =
      //   '<p class="cv-error-message" style="text-align:center;">Erro ao carregar suas reservas. Tente novamente mais tarde.</p>';
      container.innerHTML = ''; // Limpa o container
      const errorState = createErrorStateElement({
        message: err.message || "Não foi possível carregar suas reservas. Verifique sua conexão e tente novamente.",
        retryButton: {
          text: "Tentar Novamente",
          onClick: () => carregarMinhasReservas(1, false) // Recarrega a primeira página
        }
      });
      container.appendChild(errorState);
    } else {
        // showGlobalFeedback("Erro ao carregar mais reservas.", "error"); // Removed as per user request
        // Consider adding a small inline error indicator at the bottom of the list if append fails
        console.error("Erro ao carregar mais itens para 'Minhas Reservas'.");
        // Optionally, add a small error message at the end of the list for append failures
        const appendErrorMsg = document.createElement('p');
        appendErrorMsg.className = 'cv-info-message cv-info-message--error';
        appendErrorMsg.textContent = 'Falha ao carregar mais. Tente rolar novamente.';
        appendErrorMsg.style.textAlign = 'center';
        container.appendChild(appendErrorMsg);

    }
    noMoreItemsMinhasReservas = true;
    if (sentinel) sentinel.style.display = "none";
  } finally {
    isLoadingMinhasReservas = false;
  }
}

function setupMinhasReservasObserver() {
  const sentinel = document.getElementById(minhasReservasSentinelId);
  if (!sentinel) {
    console.warn("Sentinel da Minhas Reservas View não encontrado.");
    return;
  }
  new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        !isLoadingMinhasReservas &&
        !noMoreItemsMinhasReservas
      ) {
        carregarMinhasReservas(currentPageMinhasReservas + 1, true);
      }
    },
    { threshold: 0.1 }
  ).observe(sentinel);
}


async function carregarReservasListView(page, append = false) {
  if (isLoadingListView || (noMoreItemsListView && append)) return;
  isLoadingListView = true;
  const container = document.getElementById(listViewItemsContainerId);
  const sentinel = document.getElementById(listViewSentinelId);
  if (!container) {
    isLoadingListView = false;
    console.error("Container não encontrado.");
    return;
  }

  if (!append) {
    container.innerHTML = "";
    noMoreItemsListView = false;
  }

  const skeleton = container.parentElement.querySelector('.feed-skeleton-container');
  if (sentinel) sentinel.style.display = "block";

    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        espacoComumId: filtroEspacoLista.value || null,
        status: filtroStatusLista.value || null,
      };
      if (filtroPeriodoLista.value) {
        const [year, month] = filtroPeriodoLista.value.split("-").map(Number);
        params.periodoInicio = new Date(
          Date.UTC(year, month - 1, 1)
        ).toISOString();
        const last = new Date(Date.UTC(year, month, 0));
        params.periodoFim = new Date(
          Date.UTC(
            last.getFullYear(),
            last.getMonth(),
            last.getDate(),
            23,
            59,
            59,
            999
          )
        ).toISOString();
      }

    // Chamada real à API (substitui o mock)
    const responseData = await apiClient.get("/api/v1/app/reservas/lista", { params, showSkeleton: !append ? skeleton : null });
    // Assumindo que a API retorna um objeto com 'items' e 'hasNextPage' ou similar
    // ou um array diretamente e verificamos o tamanho para 'noMoreItemsListView'
    // Para este exemplo, vou assumir que retorna um array de itens.
    // Se a API retornar estrutura de paginação (ex: { items: [], totalCount: X, page: Y, pageSize: Z }),
    // a lógica de noMoreItemsListView precisaria ser ajustada.

    const items = responseData.items || responseData; // Adaptar conforme a resposta da API

    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true";
      items.forEach((reserva) =>
        container.appendChild(renderCardReservaListView(reserva))
      );
      currentPageListView = page; // Atualiza a página atual
      if (items.length < params.pageSize || (responseData.hasNextPage === false)) { // Verifica se há menos itens que o esperado ou se a API indica que não há mais
        noMoreItemsListView = true;
        if (sentinel) sentinel.style.display = "none";
        if (container.querySelector(".fim-lista") === null) { // Evita duplicar mensagem
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista";
            fim.textContent = "Fim das reservas.";
            fim.style.textAlign = "center";
            container.appendChild(fim);
        }
      }
    } else if (!append) { // Nenhuma reserva encontrada na primeira busca com os filtros
      // container.innerHTML =
      //   '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada para os filtros aplicados.</p>';
      container.innerHTML = ''; // Limpa o container
      const filtersActive = filtroEspacoLista.value || filtroStatusLista.value || filtroPeriodoLista.value;
      const emptyState = createEmptyStateElement({
        title: filtersActive ? "Nenhuma Reserva Encontrada" : "Sem Reservas na Agenda",
        description: filtersActive
          ? "Não encontramos reservas que correspondam aos filtros aplicados para esta visualização."
          : "Ainda não há reservas agendadas. Você pode ser o primeiro a reservar um espaço!",
        actionButton: {
          text: "Nova Reserva",
          onClick: () => {
            const fabNovaReserva = document.getElementById("fab-nova-reserva");
            if (fabNovaReserva) fabNovaReserva.click();
          },
          classes: ["cv-button--primary"]
        }
      });
      container.appendChild(emptyState);
      noMoreItemsListView = true;
      if (sentinel) sentinel.style.display = "none";
    } else { // Nenhuma reserva encontrada em uma página subsequente (append = true)
        noMoreItemsListView = true;
        if (sentinel) sentinel.style.display = "none";
         if (container.querySelector(".fim-lista") === null && page > 1) {
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista";
            fim.textContent = "Fim das reservas.";
            fim.style.textAlign = "center";
            container.appendChild(fim);
        }
    }
  } catch (err) {
    console.error("Erro ao carregar lista de reservas:", err);
    if (!append) {
      // container.innerHTML =
      //  '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas. Tente novamente mais tarde.</p>';
      container.innerHTML = ''; // Limpa o container
      const errorState = createErrorStateElement({
        message: err.message || "Não foi possível carregar as reservas. Verifique sua conexão e tente novamente.",
        retryButton: {
          text: "Tentar Novamente",
          onClick: () => carregarReservasListView(1, false) // Recarrega a primeira página
        }
      });
      container.appendChild(errorState);
    } else {
      // showGlobalFeedback("Erro ao carregar mais reservas.", "error"); // Removed as per user request
      // Consider adding a small inline error indicator at the bottom of the list if append fails
      console.error("Erro ao carregar mais itens para 'Lista de Reservas'.");
      // Optionally, add a small error message at the end of the list for append failures
      const appendErrorMsg = document.createElement('p');
      appendErrorMsg.className = 'cv-info-message cv-info-message--error';
      appendErrorMsg.textContent = 'Falha ao carregar mais. Tente rolar novamente.';
      appendErrorMsg.style.textAlign = 'center';
      container.appendChild(appendErrorMsg);
    }
    // Considerar parar o observer em caso de erro para não ficar tentando carregar.
    noMoreItemsListView = true; // Para evitar novas tentativas automáticas
    if (sentinel) sentinel.style.display = "none";
  } finally {
    isLoadingListView = false;
  }
}

function renderCardReservaListView(reserva) {
  const card = document.createElement("div");
  card.className = "cv-card";
  card.dataset.reservaId = reserva.id;

  const inicioFmt = new Date(reserva.inicio).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const fimFmt = new Date(reserva.fim).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  card.innerHTML = `
    <h3>${reserva.nomeEspacoComum}</h3>
    <p><strong>Data:</strong> ${inicioFmt} - ${fimFmt}</p>
    <p><strong>Status:</strong> ${getStatusBadgeHtml(reserva.status)}</p>
    <p><strong>Solicitante:</strong> ${
      reserva.nomeUsuarioSolicitante || reserva.nomeUnidade || "N/A"
    }</p>
    ${
      reserva.observacoes
        ? `<p><strong>Obs:</strong> ${reserva.observacoes}</p>`
        : ""
    }
    <div class="cv-form-actions">
      <button class="cv-button cv-button--secondary js-detalhe-reserva-lista">Ver Detalhes</button>
      ${
        reserva.pertenceAoUsuarioLogado &&
        ["Pendente", "Confirmada"].includes(reserva.status) &&
        new Date(reserva.inicio) > new Date()
          ? `<button class="cv-button cv-button--danger js-cancelar-reserva-lista">Cancelar</button>`
          : ""
      }
    </div>
  `;

  const detalheBtn = card.querySelector(".js-detalhe-reserva-lista");
  if (detalheBtn)
    detalheBtn.addEventListener("click", () => {
      const fakeEv = {
        id: reserva.id,
        title: reserva.tituloReserva || reserva.nomeEspacoComum,
        startStr: reserva.inicio,
        endStr: reserva.fim,
        extendedProps: { ...reserva },
      };
      if (
        calendarioReservas &&
        calendarioReservas.options &&
        calendarioReservas.options.eventClick
      ) {
        calendarioReservas.options.eventClick({ event: fakeEv });
      } else {
        abrirModalDetalhesComDados(reserva);
      }
    });

  const cancelarBtn = card.querySelector(".js-cancelar-reserva-lista");
  if (cancelarBtn)
    cancelarBtn.addEventListener("click", async () => {
      if (confirm("Tem certeza que deseja cancelar esta reserva?")) {
        await handleCancelarReserva(reserva.id);
        currentPageListView = 1;
        noMoreItemsListView = false;
        const c = document.getElementById(listViewItemsContainerId);
        if (c) c.dataset.loadedOnce = "false";
        carregarReservasListView(1, false);
        calendarioReservas && calendarioReservas.refetchEvents();
      }
    });

  return card;
}

function renderAdminEspacos() {
  if (!adminEspacosGrid) return;
  adminEspacosGrid.innerHTML = "";
  espacosComunsList.forEach((e) => {
    adminEspacosGrid.appendChild(createEspacoCard(e));
  });
}

function createEspacoCard(espaco) {
  const card = document.createElement("div");
  card.className = "cv-card espaco-card";
  card.dataset.espacoId = espaco.id;
  const taxa =
    espaco.taxaReserva && espaco.taxaReserva > 0
      ? `R$ ${parseFloat(espaco.taxaReserva).toFixed(2)}`
      : "Isento";
  const horario =
    espaco.horarioFuncionamentoInicio || espaco.horarioFuncionamentoFim
      ? `${espaco.horarioFuncionamentoInicio || ""}${
          espaco.horarioFuncionamentoFim ? " - " + espaco.horarioFuncionamentoFim : ""
        }`
      : "-";
  card.innerHTML = `
    <h4>${espaco.nome}</h4>
    <p><strong>Capacidade:</strong> ${espaco.capacidade || "-"}</p>
    <p><strong>Taxa:</strong> ${taxa}</p>
    <p><strong>Horário:</strong> ${horario}</p>
    <div class="espaco-card-actions">
      <button class="cv-button js-edit-espaco" data-id="${espaco.id}">Editar</button>
      <button class="cv-button cv-button--danger js-delete-espaco" data-id="${espaco.id}">Excluir</button>
    </div>
  `;
  return card;
}

function abrirModalDetalhesComDados(reserva) {
  const modal = document.getElementById("modal-detalhe-reserva");
  const conteudo = document.getElementById("modal-detalhe-reserva-conteudo");
  const btnCanc = document.getElementById("btn-cancelar-reserva-modal");
  const btnApr = document.getElementById("btn-aprovar-reserva-modal");
  const btnRec = document.getElementById("btn-recusar-reserva-modal");
  const btnEdt = document.getElementById("btn-editar-reserva-modal-trigger");
  const justGroup = document.getElementById(
    "modal-detalhe-reserva-sindico-justificativa-group"
  );
  const justText = document.getElementById(
    "modal-detalhe-reserva-sindico-justificativa"
  );
  if (
    !modal ||
    !conteudo ||
    !btnCanc ||
    !btnApr ||
    !btnRec ||
    !btnEdt ||
    !justGroup ||
    !justText
  ) {
    console.error("Elementos do modal detalhe não encontrados.");
    return;
  }

  // limpa botões
  [btnCanc, btnApr, btnRec, btnEdt].forEach((b) => (b.style.display = "none"));
  justGroup.style.display = "none";
  justText.value = "";

  document.getElementById(
    "modal-detalhe-reserva-title"
  ).textContent = `Detalhes: ${
    reserva.tituloReserva || reserva.nomeEspacoComum
  }`;
  conteudo.innerHTML = `
    <p><strong>Espaço:</strong> ${reserva.nomeEspacoComum || "N/A"}</p>
    <p><strong>Unidade:</strong> ${reserva.nomeUnidade || "N/A"}</p>
    <p><strong>Solicitante:</strong> ${
      reserva.nomeUsuarioSolicitante || "N/A"
    }</p>
    <p><strong>Início:</strong> ${new Date(reserva.inicio).toLocaleString(
      "pt-BR"
    )}</p>
    <p><strong>Fim:</strong> ${new Date(reserva.fim).toLocaleString(
      "pt-BR"
    )}</p>
    <p><strong>Status:</strong> ${reserva.status}</p>
    ${
      reserva.observacoes
        ? `<p><strong>Observações:</strong> ${reserva.observacoes}</p>`
        : ""
    }
    ${
      reserva.justificativaAprovacaoRecusa
        ? `<p><strong>Justificativa Síndico:</strong> ${reserva.justificativaAprovacaoRecusa}</p>`
        : ""
    }
  `;

  btnCanc.dataset.reservaId = reserva.id;
  btnApr.dataset.reservaId = reserva.id;
  btnRec.dataset.reservaId = reserva.id;
  btnEdt.dataset.reservaOriginal = JSON.stringify(reserva);

  const isSind =
    currentUserRoles.includes("Sindico") ||
    currentUserRoles.includes("Administrador");
  const podeCancUser =
    reserva.pertenceAoUsuarioLogado &&
    ["Pendente", "Confirmada"].includes(reserva.status) &&
    new Date(reserva.inicio) > new Date();

  if (isSind) {
    btnCanc.style.display = "inline-block";
    btnEdt.style.display = "inline-block";
    if (reserva.status === "Pendente") {
      btnApr.style.display = "inline-block";
      btnRec.style.display = "inline-block";
      justGroup.style.display = "block";
    }
  } else if (podeCancUser) {
    const esp = espacosComunsList.find((e) => e.id === reserva.espacoComumId);
    let pode = true;
    if (esp && esp.antecedenciaMinimaCancelamentoHoras) {
      if (
        Date.now() + esp.antecedenciaMinimaCancelamentoHoras * 3600 * 1000 >
        new Date(reserva.inicio).getTime()
      ) {
        pode = false;
        conteudo.innerHTML += `<p class="cv-alert cv-alert-error">
             Prazo para cancelamento expirado
             (mínimo ${esp.antecedenciaMinimaCancelamentoHoras}h).
           </p>`;
      }
    }
    if (pode) btnCanc.style.display = "inline-block";
  }

  modal.style.display = "flex";
}

function setupListViewObserver() {
  const sentinel = document.getElementById(listViewSentinelId);
  if (!sentinel) {
    console.warn("Sentinel da List View não encontrado.");
    return;
  }
  new IntersectionObserver(
    (entries) => {
      if (
        entries[0].isIntersecting &&
        !isLoadingListView &&
        !noMoreItemsListView
      ) {
        carregarReservasListView(currentPageListView + 1, true);
      }
    },
    { threshold: 0.1 }
  ).observe(sentinel);
}

function exibirInfoEspacoSelecionadoCalendario(espacoId) {
  const info = document.getElementById("info-espaco-selecionado-calendario");
  if (!info) return;
  const esp = espacosComunsList.find((e) => e.id === espacoId);
  if (esp) {
    let html = `<h4>${esp.nome}</h4>`;
    html += `<p><strong>Descrição:</strong> ${esp.descricao || "N/A"}</p>`;
    if (esp.capacidade)
      html += `<p><strong>Capacidade:</strong> ${esp.capacidade} pessoas</p>`;
    if (esp.taxaReserva > 0)
      html += `<p><strong>Taxa:</strong> R$ ${parseFloat(
        esp.taxaReserva
      ).toFixed(2)}</p>`;
    else html += `<p><strong>Taxa:</strong> Isento</p>`;
    if (esp.horarioFuncionamentoInicio && esp.horarioFuncionamentoFim) {
      html += `<p><strong>Horário:</strong> ${esp.horarioFuncionamentoInicio} - ${esp.horarioFuncionamentoFim}</p>`;
    }
    info.innerHTML = html;
    info.style.display = "block";
  } else {
    info.style.display = "none";
  }
}

function exibirInfoEspacoSelecionadoModal(espacoId) {
  const infoModal = document.getElementById("modal-info-espaco-reserva");
  const taxaModal = document.getElementById("modal-reserva-taxa-info");
  if (!infoModal || !taxaModal) return;
  const esp = espacosComunsList.find((e) => e.id === espacoId);
  if (esp) {
    let html = `<h5>Regras para ${esp.nome}:</h5><ul>`;
    if (esp.horarioFuncionamentoInicio && esp.horarioFuncionamentoFim)
      html += `<li>Horário: ${esp.horarioFuncionamentoInicio} - ${esp.horarioFuncionamentoFim}</li>`;
    if (esp.tempoMinimoReservaMinutos)
      html += `<li>Mínimo: ${esp.tempoMinimoReservaMinutos} min</li>`;
    if (esp.tempoMaximoReservaMinutos)
      html += `<li>Máximo: ${esp.tempoMaximoReservaMinutos} min</li>`;
    if (esp.antecedenciaMaximaReservaDias)
      html += `<li>Antecedência Máx.: ${esp.antecedenciaMaximaReservaDias} dias</li>`;
    if (esp.limiteReservasPorUnidadeMes)
      html += `<li>Limite: ${esp.limiteReservasPorUnidadeMes} por unidade/mês</li>`;
    html += `<li>Requer Aprovação: ${
      esp.requerAprovacaoSindico ? "Sim" : "Não"
    }</li>`;
    html += `</ul>`;
    infoModal.innerHTML = html;
    infoModal.style.display = "block";
    if (esp.taxaReserva > 0) {
      taxaModal.textContent = `Taxa de Reserva: R$ ${parseFloat(
        esp.taxaReserva
      ).toFixed(2)}`;
      taxaModal.style.display = "block";
    } else {
      taxaModal.textContent = "Taxa de Reserva: Isento";
      taxaModal.style.display = "block";
    }
  } else {
    infoModal.style.display = "none";
    taxaModal.style.display = "none";
  }
}

function initializeFullCalendar() {
  const el = document.getElementById("calendario-reservas");
  if (!el) {
    console.error("Elemento #calendario-reservas não encontrado.");
    return;
  }
  if (!FullCalendarCalendar) {
    console.error("FullCalendar library not loaded.");
    return;
  }

  calendarioReservas = new FullCalendarCalendar(el, {
    locale: "pt-br",
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
    },
    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      list: "Lista",
    },
    events: async (fetchInfo, successCallback, failureCallback) => {
      const emptyContainer = document.getElementById('agenda-calendario-empty');
      const errorContainer = document.getElementById('agenda-calendario-error');
      try {
        const params = {
          periodoInicio: fetchInfo.startStr,
          periodoFim: fetchInfo.endStr,
          espacoComumId: currentFilters.espacoComumId || null, // Usar filtro global
          // Adicionar outros filtros globais se aplicável (ex: status, se fizer sentido para calendário geral)
        };
        // Se for admin/síndico, pode ter filtros adicionais como unidadeId
        if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
            // Exemplo: Adicionar filtros específicos de admin que viriam de currentFilters
            // if(currentFilters.statusReservaAdmin) params.status = currentFilters.statusReservaAdmin;
            // if(currentFilters.unidadeIdReservaAdmin) params.unidadeId = currentFilters.unidadeIdReservaAdmin;
        }

        const items = await apiClient.get("/api/v1/app/reservas/agenda", params);
        const eventos = items.map((r) => {
          let color = "var(--fc-event-bg-color)", cls = ["fc-event-main"];
          if (r.status === "Confirmada") { color = "var(--current-semantic-success)"; cls.push("fc-event-confirmed"); }
          if (r.status === "Pendente") { color = "var(--current-semantic-warning)"; cls.push("fc-event-pending"); }
          if (new Date(r.inicio) < new Date()) cls.push("fc-event-past");
          if (r.pertenceAoUsuarioLogado) cls.push("fc-event-user");
          return { id: r.id, title: r.tituloReserva, start: r.inicio, end: r.fim, backgroundColor: color, borderColor: color, classNames: cls, extendedProps: { ...r } };
        });
        successCallback(eventos);
        if(emptyContainer) emptyContainer.style.display = eventos.length === 0 ? 'flex' : 'none';
        if(errorContainer) errorContainer.style.display = 'none';
      } catch (err) {
        failureCallback(err);
        if(emptyContainer) emptyContainer.style.display = 'none';
        if(errorContainer) {
            errorContainer.querySelector('.cv-empty-state__message').textContent = err.message || "Falha ao carregar a agenda.";
            errorContainer.style.display = 'flex';
        }
      }
    },
    dateClick: (info) => {
      dataSelecionadaAgenda = info.dateStr.split("T")[0];
      carregarReservasDia(dataSelecionadaAgenda); // Carrega detalhes do dia
      // Abrir modal de nova reserva pré-preenchido
      openModalNovaReserva(); // A função openModalNovaReserva já lida com reset e pré-seleção
      document.getElementById("modal-reserva-data").value = dataSelecionadaAgenda;
      const horaPreenchida = info.dateStr.includes("T") ? info.dateStr.split("T")[1].substring(0, 5) : "";
      if (horaPreenchida) document.getElementById("modal-reserva-inicio").value = horaPreenchida;

      // Pré-selecionar o espaço com base no filtro atual do calendário, se houver
      const modalSelectEspaco = document.getElementById("modal-reserva-espaco");
      if (currentFilters.espacoComumId) {
          modalSelectEspaco.value = currentFilters.espacoComumId;
          exibirInfoEspacoSelecionadoModal(currentFilters.espacoComumId);
      } else {
          modalSelectEspaco.value = "";
           const infoDiv = document.getElementById("modal-info-espaco-reserva");
           if(infoDiv) infoDiv.style.display = "none";
           const taxaDiv = document.getElementById("modal-reserva-taxa-info");
           if(taxaDiv) taxaDiv.style.display = "none";
      }
    },
    eventClick: (clickInfo) => {
      abrirModalDetalhesComDados(clickInfo.event.extendedProps);
    },
  });

  calendarioReservas.render();
  carregarReservasDia(dataSelecionadaAgenda);
}

async function carregarReservasDia(dataStr) {
  if (!agendaDiaListContainer) return;
  agendaDiaListContainer.innerHTML = "";
  if (agendaDiaLoading) agendaDiaLoading.style.display = "block";
  try {
    const params = {
      pageNumber: 1,
      pageSize: 50,
      espacoComumId: document.getElementById("select-espaco-comum-calendario").value || null,
      periodoInicio: new Date(`${dataStr}T00:00:00`).toISOString(),
      periodoFim: new Date(`${dataStr}T23:59:59`).toISOString(),
    };
    const resp = await apiClient.get("/api/v1/app/reservas/lista", { params, showSkeleton: agendaDiaSkeleton });
    const items = resp.items || resp;
    if (items.length > 0) {
      items.forEach((r) => agendaDiaListContainer.appendChild(renderCardReservaListView(r)));
    } else {
      // agendaDiaListContainer.innerHTML = '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva para o dia selecionado.</p>';
      agendaDiaListContainer.innerHTML = ''; // Limpa
      const emptyState = createEmptyStateElement({
        title: "Sem Reservas Neste Dia",
        description: "Não há reservas agendadas para o dia selecionado. Que tal fazer uma?",
        actionButton: {
          text: "Nova Reserva",
          onClick: () => {
            // Idealmente, pré-preencher a data no modal de nova reserva com 'dataStr'
            const fabNovaReserva = document.getElementById("fab-nova-reserva");
            if (fabNovaReserva) fabNovaReserva.click();
            // Adicional: tentar pré-preencher a data no modal que será aberto.
            // Isso pode ser feito setando um valor global ou passando para a função que abre o modal.
            // Por exemplo, se openNovaReservaModal() pudesse aceitar uma data: openNovaReservaModal(dataStr);
            // Ou, mais diretamente se o modal já está no DOM:
            const modalDataInput = document.getElementById("modal-reserva-data");
            if(modalDataInput) modalDataInput.value = dataStr;

          },
          classes: ["cv-button--primary"]
        }
      });
      agendaDiaListContainer.appendChild(emptyState);
    }
  } catch (err) {
    console.error("Erro ao carregar reservas do dia:", err);
    // agendaDiaListContainer.innerHTML = '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas.</p>';
    agendaDiaListContainer.innerHTML = ''; // Limpa o container
    const errorState = createErrorStateElement({
        message: err.message || "Não foi possível carregar as reservas para este dia. Verifique sua conexão e tente novamente.",
        retryButton: {
            text: "Tentar Novamente",
            onClick: () => carregarReservasDia(dataStr) // Recarrega para o mesmo dia
        }
    });
    agendaDiaListContainer.appendChild(errorState);
  } finally {
    if (agendaDiaLoading) agendaDiaLoading.style.display = "none";
  }
}

