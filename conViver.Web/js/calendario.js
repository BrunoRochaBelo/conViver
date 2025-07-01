import { showGlobalFeedback, createErrorStateElement, createEmptyStateElement, debugLog, showModalError, clearModalError } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
import apiClient from "./apiClient.js";
import { initFabMenu } from "./fabMenu.js";

// FullCalendar (global)
const {
  Calendar: FullCalendarCalendar,
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
} = window.FullCalendar || {};

// --- State & Constants ---
let espacosComunsList = [];
let calendarioFullCalendar = null;
let currentUserId = null;
let currentUserRoles = [];

// Agenda Tab - Dia List (abaixo do calendário)
let agendaDiaItemsContainer, agendaDiaSkeleton;
let dataSelecionadaAgenda = new Date().toISOString().split("T")[0];

// Agenda Tab - List View (alternativa ao calendário)
let currentPageAgendaListView = 1;
let isLoadingAgendaListView = false;
let noMoreItemsAgendaListView = false;
const agendaListViewItemsContainerId = "list-view-agenda-items";
const agendaListViewSentinelId = "list-view-agenda-sentinel";
let agendaListViewContainerSkeleton;


// Minhas Reservas Tab (Mantido, pois a sub-aba é "Minhas Reservas")
let currentPageMinhasReservas = 1;
let isLoadingMinhasReservas = false;
let noMoreItemsMinhasReservas = false;
const minhasReservasItemsContainerId = "minhas-reservas-list";
const minhasReservasSentinelId = "minhas-reservas-sentinel";
let minhasReservasContainerSkeleton;


// --- DOM Element References ---
// Abas e Conteúdos Principais
let tabAgendaBtn, tabMinhasReservasBtn;
let contentAgenda, contentMinhasReservas;

// Visualização da Agenda (Calendário vs Lista)
let viewToggleSwitch;
let calendarioViewContainer, agendaListViewContainer;
let selectEspacoComumCalendarioDisplay;

// Botões Globais de Filtro e Ordenação (no header das abas)
let openFilterCalendarioButton, openSortCalendarioButton;

// Modal de Filtros e seus elementos internos
let filtrosCalendarioModal, aplicarFiltrosModalCalendarioButton, limparFiltrosModalCalendarioButton, modalFiltrosCalendarioTitle;
let filtrosModalCalendarioAgendaContent, filtroEspacoModalAgenda, filtroDataModalAgenda, filtroStatusModalAgenda, filtroTipoItemModalAgenda, filtroUnidadeModalAgenda, filtrosAdminModalAgenda;
let filtrosModalMinhasReservasContent, filtroEspacoModalMinhas, filtroDataModalMinhas, filtroStatusModalMinhas;

// Modal de Ordenação e seus elementos
let modalSortCalendario, sortOrderSelectCalendario, applySortButtonCalendario, clearSortButtonCalendarioModal;

// Seção de Admin (Gerenciar Espaços)
let adminEspacosSection, adminEspacosGrid, btnAdicionarEspacoAdmin;

// Modais de CRUD (Novo Item, Detalhe Item, Gerenciar Espaço)
// IDs serão atualizados em cacheDOMElements e nas funções de setup

// --- Initialization ---
export async function initialize() {
  requireAuth();
  const userInfo = getUserInfo();
  if (!userInfo || !userInfo.id) {
    console.error("Não foi possível obter o ID do usuário.");
    showGlobalFeedback("Erro ao identificar usuário. Recarregue a página.", "error");
    return;
  }
  currentUserId = userInfo.id;
  currentUserRoles = getRoles();

  cacheDOMElements();
  setupEventListeners();
  setupTabs();

  await carregarEspacosComuns();
  initializeFullCalendar();
  setupAgendaListViewObserver(); // Renomeado de setupListViewObserver
  setupMinhasReservasObserver();

  const fabActions = [{ label: "Novo Agendamento", onClick: abrirModalNovoItemCalendario }]; // Label atualizada
  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    fabActions.push({ label: "Adicionar Espaço", onClick: abrirModalAdicionarEspacoAdmin });
  }
  initFabMenu(fabActions);

  toggleAgendaView(viewToggleSwitch.checked);
}

if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}

function cacheDOMElements() {
  // Abas
  tabAgendaBtn = document.getElementById("tab-agenda");
  tabMinhasReservasBtn = document.getElementById("tab-minhas-reservas");
  contentAgenda = document.getElementById("content-agenda");
  contentMinhasReservas = document.getElementById("content-minhas-reservas");

  // Toggle de Visualização da Agenda
  viewToggleSwitch = document.getElementById("view-toggle-switch");
  calendarioViewContainer = document.getElementById("calendario-view-container");
  agendaListViewContainer = document.getElementById("list-view-agenda-container");
  selectEspacoComumCalendarioDisplay = document.getElementById("select-espaco-comum-calendario-display");

  // Lista de Itens do Dia (abaixo do calendário)
  agendaDiaItemsContainer = document.getElementById("agenda-dia-items");
  agendaDiaSkeleton = document.querySelector("#agenda-dia-list .feed-skeleton-container");

  // Skeletons para listas principais
  agendaListViewContainerSkeleton = document.querySelector("#list-view-agenda-container .feed-skeleton-container");
  minhasReservasContainerSkeleton = document.querySelector("#content-minhas-reservas .feed-skeleton-container");


  // Botões Globais de Filtro/Ordenação
  openFilterCalendarioButton = document.getElementById("open-filter-calendario-button");
  openSortCalendarioButton = document.getElementById("open-sort-calendario-button");

  // Modal de Filtros
  filtrosCalendarioModal = document.getElementById("modal-filtros-calendario");
  aplicarFiltrosModalCalendarioButton = document.getElementById("aplicar-filtros-modal-calendario");
  limparFiltrosModalCalendarioButton = document.getElementById("limpar-filtros-modal-calendario");
  modalFiltrosCalendarioTitle = document.getElementById("modal-filtros-calendario-title");
  filtrosModalCalendarioAgendaContent = document.getElementById("filtros-modal-calendario-agenda-content");
  filtroEspacoModalAgenda = document.getElementById("filtro-espaco-modal-agenda");
  filtroDataModalAgenda = document.getElementById("filtro-data-modal-agenda");
  filtroStatusModalAgenda = document.getElementById("filtro-status-modal-agenda");
  filtroTipoItemModalAgenda = document.getElementById("filtro-tipo-item-modal-agenda");
  filtrosAdminModalAgenda = document.getElementById("filtros-admin-modal-agenda");
  filtroUnidadeModalAgenda = document.getElementById("filtro-unidade-modal-agenda");

  filtrosModalMinhasReservasContent = document.getElementById("filtros-modal-minhas-reservas-content");
  filtroEspacoModalMinhas = document.getElementById("filtro-espaco-modal-minhas");
  filtroDataModalMinhas = document.getElementById("filtro-data-modal-minhas");
  filtroStatusModalMinhas = document.getElementById("filtro-status-modal-minhas");

  // Modal de Ordenação
  modalSortCalendario = document.getElementById("modal-sort-calendario");
  sortOrderSelectCalendario = document.getElementById("sort-order-select-calendario");
  applySortButtonCalendario = document.getElementById("apply-sort-button-calendario");
  clearSortButtonCalendarioModal = document.getElementById("clear-sort-button-calendario-modal");

  // Admin Espaços
  adminEspacosSection = document.getElementById("admin-espacos-section");
  adminEspacosGrid = document.getElementById("admin-espacos-grid");
  btnAdicionarEspacoAdmin = document.getElementById("btn-adicionar-espaco-admin");
}

function setupEventListeners() {
  // Toggle de visualização da Agenda
  if (viewToggleSwitch) {
    viewToggleSwitch.addEventListener("change", (e) => toggleAgendaView(e.target.checked));
  }

  // Botão Abrir Modal de Filtros
  if (openFilterCalendarioButton) {
    openFilterCalendarioButton.addEventListener("click", abrirModalFiltros);
  }
  // Botões do Modal de Filtros
  if (filtrosCalendarioModal) {
    filtrosCalendarioModal.querySelectorAll(".js-modal-filtros-calendario-close").forEach(btn =>
      btn.addEventListener("click", () => filtrosCalendarioModal.style.display = "none")
    );
    window.addEventListener("click", (e) => { if (e.target === filtrosCalendarioModal) filtrosCalendarioModal.style.display = "none"; });
    if (aplicarFiltrosModalCalendarioButton) aplicarFiltrosModalCalendarioButton.addEventListener("click", aplicarFiltrosDoModal);
    if (limparFiltrosModalCalendarioButton) limparFiltrosModalCalendarioButton.addEventListener("click", limparFiltrosDoModal);
  }

  // Botão Abrir Modal de Ordenação
  if (openSortCalendarioButton) {
    openSortCalendarioButton.addEventListener("click", () => {
      if (modalSortCalendario) {
        sortOrderSelectCalendario.value = currentCalendarioSortOrder;
        modalSortCalendario.style.display = "flex";
        openSortCalendarioButton.classList.add("rotated");
      }
    });
  }
  // Botões do Modal de Ordenação
  if (modalSortCalendario) {
    modalSortCalendario.querySelectorAll(".js-modal-sort-calendario-close").forEach(btn => {
      btn.addEventListener("click", () => {
        modalSortCalendario.style.display = "none";
        if (openSortCalendarioButton) openSortCalendarioButton.classList.remove("rotated");
      });
    });
    window.addEventListener("click", (event) => {
      if (event.target === modalSortCalendario) {
        modalSortCalendario.style.display = "none";
        if (openSortCalendarioButton) openSortCalendarioButton.classList.remove("rotated");
      }
    });
    if (applySortButtonCalendario) applySortButtonCalendario.addEventListener("click", aplicarOrdenacaoDoModal);
    if (clearSortButtonCalendarioModal) clearSortButtonCalendarioModal.addEventListener("click", limparOrdenacaoDoModal);
  }

  // Modais de CRUD (Novo Item, Detalhes, Gerenciar Espaço, Termos)
  setupModalCrudListeners();

  // Botão Adicionar Espaço (Admin)
  if (btnAdicionarEspacoAdmin) {
    btnAdicionarEspacoAdmin.addEventListener("click", abrirModalAdicionarEspacoAdmin);
  }
}

function setupModalCrudListeners() {
    // Modal Novo Item Calendário
    const modalNovoItem = document.getElementById("modal-novo-item-calendario");
    const formNovoItem = document.getElementById("form-novo-item-calendario");
    if (modalNovoItem) {
        modalNovoItem.querySelector(".js-modal-novo-item-calendario-close")?.addEventListener("click", () => modalNovoItem.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalNovoItem) modalNovoItem.style.display = "none"; });
        formNovoItem?.addEventListener("submit", handleSalvarItemCalendarioFormSubmit);
    }

    // Modal Detalhe Item Calendário
    const modalDetalheItem = document.getElementById("modal-detalhe-item-calendario");
    if (modalDetalheItem) {
        modalDetalheItem.querySelector(".js-modal-detalhe-item-calendario-close")?.addEventListener("click", () => modalDetalheItem.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalDetalheItem) modalDetalheItem.style.display = "none"; });
        document.getElementById("btn-cancelar-item-modal")?.addEventListener("click", async (e) => {
            const id = e.target.dataset.itemId;
            if (id) {
                await handleCancelarItemCalendario(id);
                modalDetalheItem.style.display = "none";
            }
        });
        document.getElementById("btn-aprovar-item-modal")?.addEventListener("click", handleAprovarItemCalendario);
        document.getElementById("btn-recusar-item-modal")?.addEventListener("click", handleRecusarItemCalendario);
        document.getElementById("btn-editar-item-modal-trigger")?.addEventListener("click", abrirModalEditarItemPeloSindico);
    }

    // Modal Gerenciar Espaço Comum (Admin) - Mantido
    const modalGerenciarEspaco = document.getElementById("modal-gerenciar-espaco-comum");
    const formGerenciarEspaco = document.getElementById("form-gerenciar-espaco-comum");
    if (modalGerenciarEspaco) {
        modalGerenciarEspaco.querySelector(".js-modal-gerenciar-espaco-close")?.addEventListener("click", () => modalGerenciarEspaco.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalGerenciarEspaco) modalGerenciarEspaco.style.display = "none"; });
        formGerenciarEspaco?.addEventListener("submit", handleSalvarEspacoFormSubmit);
    }

    // Modal Termos de Uso
    const modalTermosUso = document.getElementById("modal-termos-uso-item-calendario");
    const linkTermosUso = document.getElementById("link-termos-uso-item");
    if (modalTermosUso) {
        modalTermosUso.querySelector(".js-modal-termos-uso-item-close")?.addEventListener("click", () => modalTermosUso.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalTermosUso) modalTermosUso.style.display = "none"; });
        linkTermosUso?.addEventListener("click", (e) => {
            e.preventDefault();
            modalTermosUso.style.display = "flex";
        });
    }
}


// --- Funções de Controle de UI ---

function setupTabs() {
  const tabsContainer = document.getElementById("calendario-tabs");
  if (!tabsContainer) return;
  const tabButtons = tabsContainer.querySelectorAll(".cv-tab-button");
  const tabContents = Array.from(tabsContainer.parentElement.querySelectorAll(".cv-tab-content"));

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      const targetContentId = "content-" + button.id.replace("tab-", "");
      tabContents.forEach(c => c.style.display = (c.id === targetContentId) ? "block" : "none");

      // Lógica de carregamento de dados ao trocar de aba
      if (button.id === "tab-agenda") {
        toggleAgendaView(viewToggleSwitch.checked);
      } else if (button.id === "tab-minhas-reservas") {
        const container = document.getElementById(minhasReservasItemsContainerId);
        if (!container.dataset.loadedOnce || !container.innerHTML.trim()) {
          currentPageMinhasReservas = 1;
          noMoreItemsMinhasReservas = false;
          carregarMinhasReservas(1, false);
        }
      }
      adminEspacosSection.style.display = (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) ? "block" : "none";
    });
  });

  const initialActiveTab = tabsContainer.querySelector(".cv-tab-button.active") || tabButtons[0];
  if (initialActiveTab) initialActiveTab.click();
}

/**
 * Alterna a visualização na aba Agenda entre Calendário e Lista.
 * @param {boolean} showList Se true, mostra a Lista; senão, mostra o Calendário.
 */
function toggleAgendaView(showList) {
  if (showList) { // Mostrar Lista da Agenda
    calendarioViewContainer.style.display = "none";
    agendaListViewContainer.style.display = "block";
    if (viewToggleSwitch) viewToggleSwitch.checked = true;

    const listItemsEl = document.getElementById(agendaListViewItemsContainerId);
    if (!listItemsEl.dataset.loadedOnce || !listItemsEl.innerHTML.trim()) {
      currentPageAgendaListView = 1;
      noMoreItemsAgendaListView = false;
      carregarItensAgendaListView(1, false);
    }
  } else { // Mostrar Calendário
    calendarioViewContainer.style.display = "block";
    agendaListViewContainer.style.display = "none";
    if (viewToggleSwitch) viewToggleSwitch.checked = false;

    calendarioFullCalendar?.refetchEvents();
    if (dataSelecionadaAgenda) carregarItensDoDia(dataSelecionadaAgenda);
  }
}

function abrirModalFiltros() {
    if (!filtrosCalendarioModal) return;
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasReservasBtn.classList.contains("active");

    if (agendaTabActive) {
        modalFiltrosCalendarioTitle.textContent = "Filtros da Agenda";
        filtrosModalCalendarioAgendaContent.style.display = "block";
        filtrosModalMinhasReservasContent.style.display = "none";
        filtrosAdminModalAgenda.style.display = (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) ? "block" : "none";
        filtroEspacoModalAgenda.value = selectEspacoComumCalendarioDisplay.value;
    } else if (minhasReservasTabActive) {
        modalFiltrosCalendarioTitle.textContent = "Filtros de Minhas Reservas";
        filtrosModalCalendarioAgendaContent.style.display = "none";
        filtrosModalMinhasReservasContent.style.display = "block";
        filtrosAdminModalAgenda.style.display = "none";
    } else {
        modalFiltrosCalendarioTitle.textContent = "Filtros do Calendário";
        filtrosModalCalendarioAgendaContent.style.display = "none";
        filtrosModalMinhasReservasContent.style.display = "none";
        filtrosAdminModalAgenda.style.display = "none";
    }
    filtrosCalendarioModal.style.display = "flex";
}

function aplicarFiltrosDoModal() {
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasReservasBtn.classList.contains("active");

    if (agendaTabActive) {
        selectEspacoComumCalendarioDisplay.value = filtroEspacoModalAgenda.value;
        if (viewToggleSwitch.checked) { // Lista da Agenda ativa
            currentPageAgendaListView = 1;
            noMoreItemsAgendaListView = false;
            carregarItensAgendaListView(1, false);
        } else { // Calendário ativo
            calendarioFullCalendar?.refetchEvents();
            if (filtroDataModalAgenda.value) {
                const [year, month] = filtroDataModalAgenda.value.split('-');
                calendarioFullCalendar?.gotoDate(`${year}-${month}-01`);
            }
            carregarItensDoDia(dataSelecionadaAgenda);
        }
    } else if (minhasReservasTabActive) {
        currentPageMinhasReservas = 1;
        noMoreItemsMinhasReservas = false;
        carregarMinhasReservas(1, false);
    }
    filtrosCalendarioModal.style.display = "none";
    if (openFilterCalendarioButton) {
        const hasFilters = [
            filtroEspacoModalAgenda.value, filtroDataModalAgenda.value, filtroStatusModalAgenda.value, filtroTipoItemModalAgenda.value,
            filtroEspacoModalMinhas.value, filtroDataModalMinhas.value, filtroStatusModalMinhas.value,
            filtroUnidadeModalAgenda.value
        ].some(val => val && val !== "");
        if (hasFilters) openFilterCalendarioButton.classList.add("has-indicator");
        else openFilterCalendarioButton.classList.remove("has-indicator");
    }
}

function limparFiltrosDoModal() {
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasReservasBtn.classList.contains("active");

    if (agendaTabActive) {
        filtroEspacoModalAgenda.value = "";
        filtroDataModalAgenda.value = "";
        filtroStatusModalAgenda.value = "";
        filtroTipoItemModalAgenda.value = "";
        filtroUnidadeModalAgenda.value = "";
        selectEspacoComumCalendarioDisplay.value = "";
    } else if (minhasReservasTabActive) {
        filtroEspacoModalMinhas.value = "";
        filtroDataModalMinhas.value = "";
        filtroStatusModalMinhas.value = "";
    }
    aplicarFiltrosDoModal();
    if (openFilterCalendarioButton) openFilterCalendarioButton.classList.remove("has-indicator");
}

// --- Funções de Ordenação (Modal) ---
let currentCalendarioSortOrder = "dataInicioDesc";

function aplicarOrdenacaoDoModal() {
    if (modalSortCalendario && sortOrderSelectCalendario && openSortCalendarioButton) {
        currentCalendarioSortOrder = sortOrderSelectCalendario.value;
        modalSortCalendario.style.display = "none";
        openSortCalendarioButton.classList.remove("rotated");
        if (currentCalendarioSortOrder !== "dataInicioDesc") {
            openSortCalendarioButton.classList.add("has-indicator");
        } else {
            openSortCalendarioButton.classList.remove("has-indicator");
        }
        reloadDataForActiveTab();
    }
}

function limparOrdenacaoDoModal() {
    if (modalSortCalendario && sortOrderSelectCalendario && openSortCalendarioButton) {
        sortOrderSelectCalendario.value = "dataInicioDesc";
        currentCalendarioSortOrder = "dataInicioDesc";
        modalSortCalendario.style.display = "none";
        openSortCalendarioButton.classList.remove("rotated");
        openSortCalendarioButton.classList.remove("has-indicator");
        reloadDataForActiveTab();
    }
}


function reloadDataForActiveTab() {
  if (tabAgendaBtn && tabAgendaBtn.classList.contains("active")) {
    if (!viewToggleSwitch.checked) { // Calendário visível (switch desmarcado)
      calendarioFullCalendar?.refetchEvents();
      carregarItensDoDia(dataSelecionadaAgenda);
    } else { // Lista da Agenda visível
      currentPageAgendaListView = 1;
      noMoreItemsAgendaListView = false;
      document.getElementById(agendaListViewItemsContainerId).dataset.loadedOnce = "false";
      carregarItensAgendaListView(1, false);
    }
  } else if (tabMinhasReservasBtn && tabMinhasReservasBtn.classList.contains("active")) {
    currentPageMinhasReservas = 1;
    noMoreItemsMinhasReservas = false;
    document.getElementById(minhasReservasItemsContainerId).dataset.loadedOnce = "false";
    carregarMinhasReservas(1, false);
  }
}

// --- Funções de Abertura de Modais de CRUD ---
function abrirModalNovoItemCalendario() {
  const modal = document.getElementById("modal-novo-item-calendario");
  const form = document.getElementById("form-novo-item-calendario");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("modal-novo-item-calendario-title").textContent = "Novo Item no Calendário";
  document.getElementById("btn-submit-novo-item").textContent = "Agendar Item";
  document.getElementById("modal-item-id").value = "";

  const tipoItemGroup = document.getElementById("modal-item-tipo-group");
  const tipoItemSelect = document.getElementById("modal-item-tipo");
  const espacoComumGroup = document.getElementById("modal-item-espaco").closest('.cv-form-group'); // Encontra o form-group do espaço
  const infoEspacoDiv = document.getElementById("modal-info-espaco-item");

  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    tipoItemGroup.style.display = "block";
    tipoItemSelect.value = "Reserva"; // Default para síndico
    espacoComumGroup.style.display = "block"; // Garante que espaço comum é visível
    infoEspacoDiv.style.display = "none"; // Esconde info do espaço inicialmente
  } else {
    tipoItemGroup.style.display = "none";
    tipoItemSelect.value = "Reserva"; // Default para moradores
    espacoComumGroup.style.display = "block";
    infoEspacoDiv.style.display = "none";
  }

  tipoItemSelect.removeEventListener('change', handleTipoItemChange); // Remove listener antigo para evitar duplicação
  tipoItemSelect.addEventListener('change', handleTipoItemChange);
  handleTipoItemChange({ target: tipoItemSelect }); // Chama para setar estado inicial do campo espaço

  document.getElementById("modal-item-unidade-sindico-group").style.display = "none";
  document.getElementById("modal-item-termos").checked = false;
  document.getElementById("modal-item-termos").disabled = false;

  // Preencher espaço com base no filtro ativo da agenda, se possível
  const espacoFiltroAgenda = filtroEspacoModalAgenda.value;
  if (espacoFiltroAgenda && tabAgendaBtn.classList.contains("active") && tipoItemSelect.value === "Reserva") { // Só preenche se for reserva
    document.getElementById("modal-item-espaco").value = espacoFiltroAgenda;
    exibirInfoEspacoSelecionadoModal(espacoFiltroAgenda);
  } else {
     document.getElementById("modal-item-espaco").value = "";
     exibirInfoEspacoSelecionadoModal(""); // Limpa infos
  }
  modal.style.display = "flex";
}

function handleTipoItemChange(event) {
    const tipoSelecionado = event.target.value;
    const espacoComumGroup = document.getElementById("modal-item-espaco").closest('.cv-form-group');
    const infoEspacoDiv = document.getElementById("modal-info-espaco-item");
    const selectEspacoComum = document.getElementById("modal-item-espaco");

    if (tipoSelecionado === "Reserva") {
        espacoComumGroup.style.display = "block";
        selectEspacoComum.required = true;
        // Se um espaço já estiver selecionado, mostre as infos dele
        if(selectEspacoComum.value) {
            exibirInfoEspacoSelecionadoModal(selectEspacoComum.value);
        } else {
            infoEspacoDiv.style.display = "none";
        }
    } else {
        espacoComumGroup.style.display = "none";
        selectEspacoComum.required = false;
        selectEspacoComum.value = ""; // Limpa seleção de espaço
        infoEspacoDiv.style.display = "none"; // Esconde info do espaço
    }
}

function abrirModalAdicionarEspacoAdmin() {
  const modal = document.getElementById("modal-gerenciar-espaco-comum");
  const form = document.getElementById("form-gerenciar-espaco-comum");
  if (!modal || !form) return;
  form.reset();
  document.getElementById("modal-gerenciar-espaco-title").textContent = "Adicionar Novo Espaço Comum";
  document.getElementById("espaco-comum-id").value = "";
  modal.style.display = "flex";
}

// --- Submissão de Formulários CRUD ---
async function handleSalvarItemCalendarioFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const modal = document.getElementById("modal-novo-item-calendario");
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    submitButton.disabled = true;
    submitButton.innerHTML = 'Salvando... <span class="inline-spinner"></span>';
    if (modal) clearModalError(modal);

    try {
        const formData = new FormData(form);
        const itemId = formData.get("itemId");
        const tipoItemSelecionado = document.getElementById("modal-item-tipo-group").style.display === "none" ? "Reserva" : formData.get("tipoItem");

        const payload = {
            tipoItem: tipoItemSelecionado,
            espacoComumId: (tipoItemSelecionado === "Reserva" && formData.get("espacoComumId")) ? formData.get("espacoComumId") : null,
            tituloParaMural: formData.get("tituloParaMural"),
            data: formData.get("data"),
            inicio: formData.get("inicio"),
            fim: formData.get("fim"),
            observacoes: formData.get("observacoes"),
            unidadeId: (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) ? formData.get("unidadeId") || null : null,
        };
        // Ajustar payload.espacoComumId para ser null se string vazia
        if (payload.espacoComumId === "") payload.espacoComumId = null;

        if (!document.getElementById("modal-item-termos").checked && !itemId) {
            throw new Error("Você deve aceitar os termos de uso para agendar (se aplicável).");
        }
        if (!payload.tituloParaMural || !payload.data || !payload.inicio || !payload.fim) {
            throw new Error("Título, data e horários são obrigatórios.");
        }
        if (payload.inicio >= payload.fim) {
            throw new Error("O horário de fim deve ser posterior ao horário de início.");
        }

        if (itemId) {
            await apiClient.put(`/api/v1/app/reservas/${itemId}`, payload);
            showGlobalFeedback("Item do calendário atualizado com sucesso!", "success", 2500);
        } else {
            await apiClient.post("/api/v1/app/reservas", payload);
            showGlobalFeedback("Item agendado com sucesso!", "success", 2500);
        }

        if (modal) modal.style.display = "none";
        form.reset();
        reloadDataForActiveTab();
    } catch (error) {
        console.error("Erro ao salvar reserva:", error);
        const errorMessage = error.detalhesValidacao || error.message || "Falha ao salvar item no calendário.";
        if (modal) showModalError(modal, errorMessage);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonText;
    }
}

async function handleSalvarEspacoFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const modal = document.getElementById("modal-gerenciar-espaco-comum");
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerHTML;

  submitButton.disabled = true;
  submitButton.innerHTML = 'Salvando... <span class="inline-spinner"></span>';
  if (modal) clearModalError(modal);

  try {
    const formData = new FormData(form);
    const espacoId = formData.get("id");
    const payload = {
        nome: formData.get("nome"),
        descricao: formData.get("descricao"),
        capacidade: formData.get("capacidade") ? parseInt(formData.get("capacidade"), 10) : null,
        taxaReserva: formData.get("taxaReserva") ? parseFloat(formData.get("taxaReserva")) : null,
        horarioFuncionamentoInicio: formData.get("horarioFuncionamentoInicio") || null,
        horarioFuncionamentoFim: formData.get("horarioFuncionamentoFim") || null,
        tempoMinimoReservaMinutos: formData.get("tempoMinimoReservaMinutos") ? parseInt(formData.get("tempoMinimoReservaMinutos"), 10) : null,
        tempoMaximoReservaMinutos: formData.get("tempoMaximoReservaMinutos") ? parseInt(formData.get("tempoMaximoReservaMinutos"), 10) : null,
        antecedenciaMaximaReservaDias: formData.get("antecedenciaMaximaReservaDias") ? parseInt(formData.get("antecedenciaMaximaReservaDias"), 10) : null,
        antecedenciaMinimaCancelamentoHoras: formData.get("antecedenciaMinimaCancelamentoHoras") ? parseInt(formData.get("antecedenciaMinimaCancelamentoHoras"), 10) : null,
        limiteReservasPorUnidadeMes: formData.get("limiteReservasPorUnidadeMes") ? parseInt(formData.get("limiteReservasPorUnidadeMes"), 10) : null,
        diasIndisponiveis: formData.get("diasIndisponiveis") || null,
        requerAprovacaoSindico: formData.get("requerAprovacaoSindico") === "on",
        exibirNoMural: formData.get("exibirNoMural") === "on",
        permiteVisualizacaoPublicaDetalhes: formData.get("permiteVisualizacaoPublicaDetalhes") === "on",
    };

    if (!payload.nome) {
        throw new Error("O nome do espaço é obrigatório.");
    }

    if (espacoId) {
      await apiClient.put(`/api/v1/app/reservas/espacos-comuns/${espacoId}`, payload);
      showGlobalFeedback("Espaço comum atualizado com sucesso!", "success", 2500);
    } else {
      await apiClient.post("/api/v1/app/reservas/espacos-comuns", payload);
      showGlobalFeedback("Espaço comum criado com sucesso!", "success", 2500);
    }

    if (modal) modal.style.display = "none";
    form.reset();
    await carregarEspacosComuns(); // Recarrega a lista de espaços (para selects e admin grid)
    // reloadDataForActiveTab(); // Se a alteração de espaço afetar as listas de reserva diretamente
  } catch (error) {
    console.error("Erro ao salvar espaço comum:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao salvar espaço comum.";
    if (modal) showModalError(modal, errorMessage);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
}


// --- Lógica de Carregamento e Renderização de Dados ---

async function carregarEspacosComuns() {
  const selectsParaPopular = [
    selectEspacoComumCalendarioDisplay, // O select de display no calendário
    document.getElementById("modal-reserva-espaco"), // Select no modal de nova reserva
    filtroEspacoModalAgenda, // Select de espaço no modal de filtros (seção Agenda)
    filtroEspacoModalMinhas, // Select de espaço no modal de filtros (seção Minhas Reservas)
  ];

  selectsParaPopular.forEach(sel => {
    if (sel) sel.innerHTML = "<option value=''>Carregando...</option>";
  });

  try {
    const espacos = await apiClient.get("/api/v1/app/reservas/espacos-comuns");
    espacosComunsList = espacos;

    selectsParaPopular.forEach(sel => {
      if (!sel) return;
      const currentValue = sel.value; // Salvar valor atual para tentar restaurar
      const isFiltroOuDisplay = sel.id.includes("filtro") || sel.id.includes("display");
      sel.innerHTML = `<option value="">${isFiltroOuDisplay ? "Todos os Espaços" : "Selecione um espaço"}</option>`;
      espacos.forEach(e => {
        const o = new Option(e.nome, e.id);
        sel.appendChild(o);
      });
      // Tentar restaurar valor selecionado anteriormente, se ainda válido
      if (currentValue && espacos.some(e => e.id === currentValue)) {
        sel.value = currentValue;
      } else if (sel.options.length > 0 && !isFiltroOuDisplay) {
         // Se não for filtro e não puder restaurar, não seleciona nada (deixa "Selecione")
      } else if (sel.options.length > 0 && isFiltroOuDisplay) {
        sel.value = ""; // Para filtros, default para "Todos"
      }
    });

    // Se a seção de admin estiver visível, renderizar os espaços nela
    if (adminEspacosSection && (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador"))) {
      renderAdminEspacos();
    }
  } catch (err) {
    console.error("Erro ao carregar espaços comuns:", err);
    showGlobalFeedback("Falha ao carregar espaços comuns.", "error");
    selectsParaPopular.forEach(sel => {
      if (sel) sel.innerHTML = "<option value=''>Erro ao carregar</option>";
    });
  }
}


async function carregarMinhasReservas(page = 1, append = false) {
  if (isLoadingMinhasReservas || (noMoreItemsMinhasReservas && append)) return;
  isLoadingMinhasReservas = true;

  const container = document.getElementById(minhasReservasItemsContainerId);
  const sentinel = document.getElementById(minhasReservasSentinelId);

  if (!container) {
    console.error("Container para 'Minhas Reservas' não encontrado.");
    isLoadingMinhasReservas = false; return;
  }
  if (!append) {
    container.innerHTML = ""; // Limpa para nova carga/filtro
    noMoreItemsMinhasReservas = false;
    // Remover mensagens de erro/vazio antigas
    const oldError = container.querySelector(".cv-error-state");
    if (oldError) oldError.remove();
    const oldEmpty = container.querySelector(".cv-empty-state");
    if (oldEmpty) oldEmpty.remove();
  }
  if (sentinel) sentinel.style.display = "block";

  try {
    const params = {
      pageNumber: page,
      pageSize: 10,
      espacoComumId: filtroEspacoModalMinhas.value || null,
      status: filtroStatusModalMinhas.value || null,
      orderBy: currentReservasSortOrder,
    };
    if (filtroDataModalMinhas.value) {
      const [year, month] = filtroDataModalMinhas.value.split("-").map(Number);
      params.periodoInicio = new Date(Date.UTC(year, month - 1, 1)).toISOString();
      const ultimoDiaDoMes = new Date(Date.UTC(year, month, 0));
      params.periodoFim = new Date(Date.UTC(ultimoDiaDoMes.getUTCFullYear(), ultimoDiaDoMes.getUTCMonth(), ultimoDiaDoMes.getUTCDate(), 23, 59, 59, 999)).toISOString();
    }

    const responseData = await apiClient.get("/api/v1/app/reservas/minhas-reservas", { params, showSkeleton: !append ? minhasReservasContainerSkeleton : null });
    const items = responseData.items || [];

    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true";
      items.forEach(reserva => {
        const card = renderCardReservaListView({ ...reserva, pertenceAoUsuarioLogado: true });
        if (append && sentinel) container.insertBefore(card, sentinel);
        else container.appendChild(card);
      });
      currentPageMinhasReservas = page;
      if (items.length < params.pageSize || responseData.hasNextPage === false) {
        noMoreItemsMinhasReservas = true;
        if (sentinel) sentinel.style.display = "none";
        if (!container.querySelector(".fim-lista-minhas")) {
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista-minhas";
            fim.textContent = "Fim das suas reservas.";
            container.appendChild(fim);
        }
      }
    } else if (!append) { // Sem itens na primeira carga com filtros
      const filtersActive = filtroEspacoModalMinhas.value || filtroStatusModalMinhas.value || filtroDataModalMinhas.value;
      const emptyState = createEmptyStateElement({
        title: filtersActive ? "Nenhuma Reserva Encontrada" : "Você Ainda Não Tem Reservas",
        description: filtersActive ? "Tente ajustar seus filtros." : "Que tal fazer sua primeira reserva?",
        actionButton: { text: "Nova Reserva", onClick: abrirModalNovaReserva, classes: ["cv-button--primary"] }
      });
      container.appendChild(emptyState);
      noMoreItemsMinhasReservas = true;
      if (sentinel) sentinel.style.display = "none";
    } else { // Sem mais itens ao rolar
      noMoreItemsMinhasReservas = true;
      if (sentinel) sentinel.style.display = "none";
      if (!container.querySelector(".fim-lista-minhas") && page > 1) {
        const fim = document.createElement("p");
        fim.className = "cv-info-message fim-lista-minhas";
        fim.textContent = "Fim das suas reservas.";
        container.appendChild(fim);
      }
    }
  } catch (err) {
    console.error("Erro ao carregar 'Minhas Reservas':", err);
    if (!append) {
      const errorState = createErrorStateElement({
        message: err.message || "Não foi possível carregar suas reservas.",
        retryButton: { text: "Tentar Novamente", onClick: () => carregarMinhasReservas(1, false) }
      });
      container.appendChild(errorState);
    } else {
        const appendErrorMsg = document.createElement('p');
        appendErrorMsg.className = 'cv-info-message cv-info-message--error';
        appendErrorMsg.textContent = 'Falha ao carregar mais. Tente rolar novamente.';
        container.appendChild(appendErrorMsg);
    }
    noMoreItemsMinhasReservas = true;
    if (sentinel) sentinel.style.display = "none";
  } finally {
    isLoadingMinhasReservas = false;
  }
}

async function carregarReservasListView(page = 1, append = false) {
  if (isLoadingListView || (noMoreItemsListView && append)) return;
  isLoadingListView = true;

  const container = document.getElementById(listViewItemsContainerId);
  const sentinel = document.getElementById(listViewSentinelId);

  if (!container) {
    console.error("Container da Lista de Reservas não encontrado.");
    isLoadingListView = false; return;
  }
  if (!append) {
    container.innerHTML = "";
    noMoreItemsListView = false;
    const oldError = container.querySelector(".cv-error-state");
    if (oldError) oldError.remove();
    const oldEmpty = container.querySelector(".cv-empty-state");
    if (oldEmpty) oldEmpty.remove();
  }
  if (sentinel) sentinel.style.display = "block";

  try {
    const params = {
      pageNumber: page,
      pageSize: 10,
      espacoComumId: filtroEspacoModalAgenda.value || null,
      status: filtroStatusModalAgenda.value || null,
      unidadeId: (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) ? filtroUnidadeModalAgenda.value || null : null,
      orderBy: currentReservasSortOrder,
    };
    if (filtroDataModalAgenda.value) {
      const [year, month] = filtroDataModalAgenda.value.split("-").map(Number);
      params.periodoInicio = new Date(Date.UTC(year, month - 1, 1)).toISOString();
      const last = new Date(Date.UTC(year, month, 0));
      params.periodoFim = new Date(Date.UTC(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59, 999)).toISOString();
    }

    const responseData = await apiClient.get("/api/v1/app/reservas/lista", { params, showSkeleton: !append ? listViewContainerSkeleton : null });
    const items = responseData.items || [];

    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true";
      items.forEach(reserva => container.appendChild(renderCardReservaListView(reserva)));
      currentPageListView = page;
      if (items.length < params.pageSize || responseData.hasNextPage === false) {
        noMoreItemsListView = true;
        if (sentinel) sentinel.style.display = "none";
        if (!container.querySelector(".fim-lista")) {
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista";
            fim.textContent = "Fim das reservas da agenda.";
            container.appendChild(fim);
        }
      }
    } else if (!append) {
      const filtersActive = filtroEspacoModalAgenda.value || filtroStatusModalAgenda.value || filtroDataModalAgenda.value || filtroUnidadeModalAgenda.value;
      const emptyState = createEmptyStateElement({
        title: filtersActive ? "Nenhuma Reserva Encontrada" : "Sem Reservas na Agenda",
        description: filtersActive ? "Não encontramos reservas que correspondam aos filtros." : "Ainda não há reservas agendadas.",
        actionButton: { text: "Nova Reserva", onClick: abrirModalNovaReserva, classes: ["cv-button--primary"] }
      });
      container.appendChild(emptyState);
      noMoreItemsListView = true;
      if (sentinel) sentinel.style.display = "none";
    } else {
      noMoreItemsListView = true;
      if (sentinel) sentinel.style.display = "none";
      if (!container.querySelector(".fim-lista") && page > 1) {
        const fim = document.createElement("p");
        fim.className = "cv-info-message fim-lista";
        fim.textContent = "Fim das reservas da agenda.";
        container.appendChild(fim);
      }
    }
  } catch (err) {
    console.error("Erro ao carregar lista de reservas (Agenda):", err);
    if (!append) {
      const errorState = createErrorStateElement({
        message: err.message || "Não foi possível carregar as reservas da agenda.",
        retryButton: { text: "Tentar Novamente", onClick: () => carregarReservasListView(1, false) }
      });
      container.appendChild(errorState);
    } else {
        const appendErrorMsg = document.createElement('p');
        appendErrorMsg.className = 'cv-info-message cv-info-message--error';
        appendErrorMsg.textContent = 'Falha ao carregar mais. Tente rolar novamente.';
        container.appendChild(appendErrorMsg);
    }
    noMoreItemsListView = true;
    if (sentinel) sentinel.style.display = "none";
  } finally {
    isLoadingListView = false;
  }
}

async function carregarReservasDia(dataStr) { // Para a lista abaixo do calendário
  if (!agendaDiaListContainer) return;
  agendaDiaListContainer.innerHTML = "";

  try {
    const params = {
      pageNumber: 1, pageSize: 50, // Carregar um número razoável para um dia
      espacoComumId: filtroEspacoModalAgenda.value || null, // Usa o filtro de espaço da agenda
      status: filtroStatusModalAgenda.value || null, // Usa o filtro de status da agenda
      periodoInicio: new Date(`${dataStr}T00:00:00`).toISOString(),
      periodoFim: new Date(`${dataStr}T23:59:59`).toISOString(),
      orderBy: 'inicioAsc', // Ordenar por horário de início para a lista do dia
    };
    // Adicionar filtro de unidade se admin/síndico e preenchido
    if ((currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) && filtroUnidadeModalAgenda.value) {
        params.unidadeId = filtroUnidadeModalAgenda.value;
    }

    const resp = await apiClient.get("/api/v1/app/reservas/lista", { params, showSkeleton: agendaDiaSkeleton });
    const items = resp.items || [];

    if (items.length > 0) {
      items.forEach(r => agendaDiaListContainer.appendChild(renderCardReservaListView(r)));
    } else {
      const emptyState = createEmptyStateElement({
        title: "Sem Reservas Neste Dia",
        description: "Não há reservas agendadas para o dia selecionado com os filtros atuais.",
        actionButton: { text: "Nova Reserva", onClick: () => {
            abrirModalNovaReserva(); // Abre o modal
            // Tenta pré-preencher a data no modal
            const modalDataInput = document.getElementById("modal-reserva-data");
            if(modalDataInput) modalDataInput.value = dataStr;
        }, classes: ["cv-button--primary"] }
      });
      agendaDiaListContainer.appendChild(emptyState);
    }
  } catch (err) {
    console.error("Erro ao carregar reservas do dia:", err);
    const errorState = createErrorStateElement({
        message: err.message || "Não foi possível carregar as reservas para este dia.",
        retryButton: { text: "Tentar Novamente", onClick: () => carregarReservasDia(dataStr) }
    });
    agendaDiaListContainer.appendChild(errorState);
  }
}

// --- Funções de Renderização de Cards ---
function getStatusBadgeHtml(status) { // Mantida como estava, parece boa
  const s = status ? status.toLowerCase() : "";
  let type = "success";
  if (s.includes("pendente") || s.includes("aguardando")) type = "warning";
  else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) type = "danger";
  return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${type}"></span>${status}</span>`;
}

function renderCardReservaListView(reserva) {
  const card = document.createElement("div");
  card.className = "cv-card"; // Usar a classe padrão de card
  card.dataset.reservaId = reserva.id;

  const inicioFmt = new Date(reserva.inicio).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fimFmt = new Date(reserva.fim).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  card.innerHTML = `
    <h3 class="cv-card__title">${reserva.nomeEspacoComum}</h3>
    <p class="cv-card__meta"><strong>Data:</strong> ${inicioFmt} - ${fimFmt}</p>
    <p class="cv-card__meta"><strong>Status:</strong> ${getStatusBadgeHtml(reserva.status)}</p>
    <p class="cv-card__meta"><strong>Solicitante:</strong> ${reserva.nomeUsuarioSolicitante || reserva.nomeUnidade || "N/A"}</p>
    ${reserva.observacoes ? `<p class="cv-card__meta"><strong>Obs:</strong> ${reserva.observacoes}</p>` : ""}
    <div class="cv-form-actions" style="margin-top: var(--cv-spacing-sm);">
      <button class="cv-button cv-button--secondary js-detalhe-reserva-lista">Ver Detalhes</button>
      ${reserva.pertenceAoUsuarioLogado && ["Pendente", "Confirmada"].includes(reserva.status) && new Date(reserva.inicio) > new Date()
        ? `<button class="cv-button cv-button--danger js-cancelar-reserva-lista">Cancelar</button>`
        : ""}
    </div>
  `;

  card.querySelector(".js-detalhe-reserva-lista")?.addEventListener("click", () => {
    // Abrir modal de detalhes, passando os dados da reserva
    // A lógica de `eventClick` do FullCalendar já faz isso com `abrirModalDetalhesComDados`
    abrirModalDetalhesComDados(reserva); // Passar o objeto reserva diretamente
  });

  card.querySelector(".js-cancelar-reserva-lista")?.addEventListener("click", async () => {
    if (confirm("Tem certeza que deseja cancelar esta reserva?")) {
      await handleCancelarReserva(reserva.id); // handleCancelarReserva precisa ser definida/adaptada
      // Recarregar a lista relevante após cancelamento
      reloadDataForActiveTab();
    }
  });
  return card;
}

function renderAdminEspacos() {
  if (!adminEspacosGrid) return;
  adminEspacosGrid.innerHTML = ""; // Limpar antes de renderizar
  if (espacosComunsList && espacosComunsList.length > 0) {
    espacosComunsList.forEach(e => adminEspacosGrid.appendChild(createEspacoCard(e)));
  } else {
    const emptyState = createEmptyStateElement({
        title: "Nenhum Espaço Comum Cadastrado",
        description: "Adicione o primeiro espaço comum para começar a gerenciar as reservas.",
        actionButton: { text: "Adicionar Espaço", onClick: abrirModalAdicionarEspacoAdmin, classes: ["cv-button--primary"] }
    });
    adminEspacosGrid.appendChild(emptyState);
  }
}

function createEspacoCard(espaco) { // Para a lista de gerenciamento de espaços do admin
  const card = document.createElement("div");
  card.className = "cv-card espaco-card"; // Usar classes padrão + específica
  card.dataset.espacoId = espaco.id;
  const taxa = espaco.taxaReserva && espaco.taxaReserva > 0 ? `R$ ${parseFloat(espaco.taxaReserva).toFixed(2)}` : "Isento";
  const horario = (espaco.horarioFuncionamentoInicio || espaco.horarioFuncionamentoFim)
    ? `${espaco.horarioFuncionamentoInicio || ""} - ${espaco.horarioFuncionamentoFim || ""}` : "-";

  card.innerHTML = `
    <h4 class="cv-card__title">${espaco.nome}</h4>
    <p class="cv-card__meta"><strong>Capacidade:</strong> ${espaco.capacidade || "-"}</p>
    <p class="cv-card__meta"><strong>Taxa:</strong> ${taxa}</p>
    <p class="cv-card__meta"><strong>Horário:</strong> ${horario}</p>
    <div class="cv-form-actions espaco-card-actions" style="margin-top: auto; padding-top: var(--cv-spacing-sm); border-top: 1px solid var(--current-border-subtle);">
      <button class="cv-button js-edit-espaco" data-id="${espaco.id}">Editar</button>
      <button class="cv-button cv-button--danger js-delete-espaco" data-id="${espaco.id}">Excluir</button>
    </div>
  `;
  // Adicionar listeners para botões de editar/excluir espaço aqui
  card.querySelector(".js-edit-espaco")?.addEventListener("click", () => abrirModalEditarEspaco(espaco));
  card.querySelector(".js-delete-espaco")?.addEventListener("click", () => handleExcluirEspaco(espaco.id));
  return card;
}


// --- Funções de Ação (Aprovar, Recusar, Cancelar Reserva) ---
// As funções handleAprovarReserva, handleRecusarReserva, handleCancelarReserva
// já existentes parecem adequadas. Apenas garantir que chamem reloadDataForActiveTab().

// --- FullCalendar ---
function initializeFullCalendar() {
  const el = document.getElementById("calendario-reservas");
  if (!el || !FullCalendarCalendar) {
    console.error("Elemento do FullCalendar ou biblioteca não encontrados.");
    return;
  }
  calendarioReservas = new FullCalendarCalendar(el, {
    locale: "pt-br",
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
    initialView: "dayGridMonth",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" },
    buttonText: { today: "Hoje", month: "Mês", week: "Semana", day: "Dia", list: "Lista" },
    events: async (fetchInfo, successCallback, failureCallback) => {
      try {
        const params = {
          mesAno: new Date(fetchInfo.start).toISOString().slice(0, 7),
          espacoComumId: filtroEspacoModalAgenda.value || null, // Do modal
          status: filtroStatusModalAgenda.value || null,       // Do modal
        };
        if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
            if (filtroUnidadeModalAgenda.value) params.unidadeId = filtroUnidadeModalAgenda.value; // Do modal
        }

        const items = await apiClient.get("/api/v1/app/reservas/agenda", { params });
        const eventos = items.map(r => ({
          id: r.id, title: r.tituloReserva, start: r.inicio, end: r.fim,
          backgroundColor: r.status === "Confirmada" ? "var(--current-semantic-success)" : r.status === "Pendente" ? "var(--current-semantic-warning)" : "var(--fc-event-bg-color)",
          borderColor: r.status === "Confirmada" ? "var(--current-semantic-success)" : r.status === "Pendente" ? "var(--current-semantic-warning)" : "var(--fc-event-bg-color)",
          classNames: [
            "fc-event-main",
            r.status === "Confirmada" ? "fc-event-confirmed" : "",
            r.status === "Pendente" ? "fc-event-pending" : "",
            new Date(r.inicio) < new Date() ? "fc-event-past" : "",
            r.pertenceAoUsuarioLogado ? "fc-event-user" : ""
          ].filter(Boolean),
          extendedProps: { ...r },
        }));
        successCallback(eventos);
      } catch (err) {
        console.error("Erro ao buscar eventos para o calendário:", err);
        showGlobalFeedback("Falha ao carregar agenda do calendário.", "error");
        failureCallback(err);
      }
    },
    dateClick: (info) => {
      dataSelecionadaAgenda = info.dateStr.split("T")[0];
      carregarReservasDia(dataSelecionadaAgenda);
      abrirModalNovaReserva(); // Abre o modal de nova reserva
      // Pré-preenche a data no modal
      const modalDataInput = document.getElementById("modal-reserva-data");
      if (modalDataInput) modalDataInput.value = dataSelecionadaAgenda;
      // Pré-preenche horário se for clique em horário específico
      if (info.dateStr.includes("T")) {
        document.getElementById("modal-reserva-inicio").value = info.dateStr.split("T")[1].substring(0, 5);
      }
      // Pré-preenche espaço com o filtro de espaço da agenda, se houver
      if (filtroEspacoModalAgenda.value) {
        document.getElementById("modal-reserva-espaco").value = filtroEspacoModalAgenda.value;
        exibirInfoEspacoSelecionadoModal(filtroEspacoModalAgenda.value);
      }
    },
    eventClick: (clickInfo) => {
      abrirModalDetalhesComDados(clickInfo.event.extendedProps);
    },
  });
  calendarioReservas.render();
  carregarReservasDia(dataSelecionadaAgenda); // Carrega reservas do dia atual inicialmente
}

// --- Funções de Apoio e Utilitários ---
function exibirInfoEspacoSelecionadoModal(espacoId) { // Para o modal de nova reserva
  const infoModal = document.getElementById("modal-info-espaco-reserva");
  const taxaModal = document.getElementById("modal-reserva-taxa-info");
  if (!infoModal || !taxaModal) return;

  const esp = espacosComunsList.find(e => e.id === espacoId);
  if (esp) {
    let html = `<h5>Regras para ${esp.nome}:</h5><ul>`;
    if (esp.horarioFuncionamentoInicio && esp.horarioFuncionamentoFim) html += `<li>Horário: ${esp.horarioFuncionamentoInicio} - ${esp.horarioFuncionamentoFim}</li>`;
    if (esp.tempoMinimoReservaMinutos) html += `<li>Mínimo: ${esp.tempoMinimoReservaMinutos} min</li>`;
    if (esp.tempoMaximoReservaMinutos) html += `<li>Máximo: ${esp.tempoMaximoReservaMinutos} min</li>`;
    // Adicionar mais regras conforme necessário
    html += `<li>Requer Aprovação: ${esp.requerAprovacaoSindico ? "Sim" : "Não"}</li></ul>`;
    infoModal.innerHTML = html;
    infoModal.style.display = "block";
    taxaModal.textContent = `Taxa de Reserva: ${esp.taxaReserva > 0 ? `R$ ${parseFloat(esp.taxaReserva).toFixed(2)}` : "Isento"}`;
    taxaModal.style.display = "block";
  } else {
    infoModal.style.display = "none";
    taxaModal.style.display = "none";
  }
}

// --- Observers para Scroll Infinito ---
function setupListViewObserver() {
  const sentinel = document.getElementById(listViewSentinelId);
  if (!sentinel) return;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoadingListView && !noMoreItemsListView) {
      carregarReservasListView(currentPageListView + 1, true);
    }
  }, { threshold: 0.1 }).observe(sentinel);
}

function setupMinhasReservasObserver() {
  const sentinel = document.getElementById(minhasReservasSentinelId);
  if (!sentinel) return;
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoadingMinhasReservas && !noMoreItemsMinhasReservas) {
      carregarMinhasReservas(currentPageMinhasReservas + 1, true);
    }
  }, { threshold: 0.1 }).observe(sentinel);
}

// --- Funções de Abertura de Modais de Detalhes/Edição (Exemplos) ---
function abrirModalDetalhesComDados(reserva) {
  const modal = document.getElementById("modal-detalhe-reserva");
  const conteudo = document.getElementById("modal-detalhe-reserva-conteudo");
  // ... (lógica para popular o modal com os dados da reserva)
  // ... (lógica para mostrar/ocultar botões de ação com base no status e permissões)
  if (modal) modal.style.display = "flex";
}

function abrirModalEditarEspaco(espaco) {
    const modal = document.getElementById("modal-gerenciar-espaco-comum");
    const form = document.getElementById("form-gerenciar-espaco-comum");
    if (!modal || !form) return;

    document.getElementById("modal-gerenciar-espaco-title").textContent = "Editar Espaço Comum";
    document.getElementById("espaco-comum-id").value = espaco.id;
    document.getElementById("espaco-nome").value = espaco.nome || "";
    document.getElementById("espaco-descricao").value = espaco.descricao || "";
    document.getElementById("espaco-capacidade").value = espaco.capacidade || "";
    document.getElementById("espaco-taxa").value = espaco.taxaReserva || "";
    document.getElementById("espaco-horario-inicio").value = espaco.horarioFuncionamentoInicio || "";
    document.getElementById("espaco-horario-fim").value = espaco.horarioFuncionamentoFim || "";
    // ... preencher outros campos ...
    document.getElementById("espaco-requer-aprovacao").checked = espaco.requerAprovacaoSindico;
    // ...
    modal.style.display = "flex";
}

async function handleExcluirEspaco(espacoId) {
    if (!confirm(`Tem certeza que deseja excluir este espaço comum? Esta ação não pode ser desfeita.`)) return;
    try {
        await apiClient.delete(`/api/v1/app/reservas/espacos-comuns/${espacoId}`);
        showGlobalFeedback("Espaço comum excluído com sucesso!", "success");
        await carregarEspacosComuns(); // Recarrega a lista de espaços
        // Se a exclusão de um espaço puder afetar as reservas exibidas, recarregue-as também:
        // reloadDataForActiveTab();
    } catch (error) {
        console.error("Erro ao excluir espaço comum:", error);
        showGlobalFeedback(error.message || "Falha ao excluir espaço comum.", "error");
    }
}

// Adaptações das funções handleAprovarReserva, handleRecusarReserva, handleCancelarReserva
// para garantir que chamam reloadDataForActiveTab() e usam showModalError corretamente.
// As versões existentes já parecem boas, mas é bom revisar no contexto.

// Adicionar as funções handleAprovarReserva, handleRecusarReserva, handleCancelarReserva (adaptadas)
// e abrirModalEditarReservaPeloSindico (se necessário)

// Exemplo de adaptação para handleAprovarReserva
async function handleAprovarReserva(event) {
  const button = event.target;
  const reservaId = button.dataset.reservaId;
  const modalDetalhe = document.getElementById("modal-detalhe-reserva");
  const justificativaInput = document.getElementById("modal-detalhe-reserva-sindico-justificativa");
  const justificativa = justificativaInput ? justificativaInput.value : "";

  const originalButtonText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = 'Aprovando... <span class="inline-spinner"></span>';
  if (modalDetalhe) clearModalError(modalDetalhe);

  try {
    await apiClient.put(`/api/v1/app/reservas/${reservaId}/aprovar`, { justificativaAprovacaoRecusa: justificativa });
    showGlobalFeedback("Reserva aprovada com sucesso!", "success", 2500);
    if (modalDetalhe) modalDetalhe.style.display = "none";
    reloadDataForActiveTab();
  } catch (error) {
    console.error("Erro ao aprovar reserva:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao aprovar reserva.";
    if (modalDetalhe && modalDetalhe.style.display !== "none") {
       showModalError(modalDetalhe, errorMessage);
    } else {
        showGlobalFeedback(errorMessage, "error");
    }
  } finally {
    button.disabled = false;
    button.innerHTML = originalButtonText;
  }
}
async function handleRecusarReserva(event) {
  const button = event.target;
  const reservaId = button.dataset.reservaId;
  const modalDetalhe = document.getElementById("modal-detalhe-reserva");
  const justificativaInput = document.getElementById("modal-detalhe-reserva-sindico-justificativa");
  const justificativa = justificativaInput ? justificativaInput.value : "";

  if (!justificativa && reservaId) {
    if (modalDetalhe && modalDetalhe.style.display !== "none") showModalError(modalDetalhe, "A justificativa é obrigatória para recusar.");
    else showGlobalFeedback("A justificativa é obrigatória para recusar.", "warning");
    button.disabled = false; // Re-enable button if validation fails before API call
    return;
  }

  const originalButtonText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = 'Recusando... <span class="inline-spinner"></span>';
  if (modalDetalhe) clearModalError(modalDetalhe);

  try {
    await apiClient.put(`/api/v1/app/reservas/${reservaId}/recusar`, { justificativaAprovacaoRecusa: justificativa });
    showGlobalFeedback("Reserva recusada com sucesso!", "success", 2500);
    if (modalDetalhe) modalDetalhe.style.display = "none";
    reloadDataForActiveTab();
  } catch (error) {
    console.error("Erro ao recusar reserva:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao recusar reserva.";
    if (modalDetalhe && modalDetalhe.style.display !== "none") {
        showModalError(modalDetalhe, errorMessage);
    } else {
        showGlobalFeedback(errorMessage, "error");
    }
  } finally {
    button.disabled = false;
    button.innerHTML = originalButtonText;
  }
}

async function handleCancelarReserva(reservaId) {
  const modalDetalhe = document.getElementById("modal-detalhe-reserva");
  // Justificativa para cancelamento pelo usuário geralmente não é necessária ou não é um campo.
  // Se for uma ação de síndico cancelando, a justificativa pode vir de `modal-detalhe-reserva-sindico-justificativa`.
  // Para simplificar, vamos assumir que a API lida com isso ou não requer justificativa do usuário.

  if (!confirm("Tem certeza que deseja cancelar esta reserva?")) {
      return;
  }

  const btnCancelarReservaModal = document.getElementById("btn-cancelar-reserva-modal");
  let originalButtonTextCancelar = "";
  let wasButtonDisabled = false;

  if (btnCancelarReservaModal && btnCancelarReservaModal.dataset.reservaId === reservaId) {
      originalButtonTextCancelar = btnCancelarReservaModal.innerHTML;
      btnCancelarReservaModal.disabled = true;
      btnCancelarReservaModal.innerHTML = 'Cancelando... <span class="inline-spinner"></span>';
      wasButtonDisabled = true;
  }
  if (modalDetalhe) clearModalError(modalDetalhe);

  try {
    await apiClient.post(`/api/v1/app/reservas/${reservaId}/cancelar`); // Sem corpo de justificativa para usuário
    showGlobalFeedback("Reserva cancelada com sucesso!", "success", 2500);
    if (modalDetalhe && modalDetalhe.style.display !== "none") {
        modalDetalhe.style.display = "none";
    }
    reloadDataForActiveTab();
  } catch (error) {
    console.error("Erro ao cancelar reserva:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao cancelar reserva.";
    if (modalDetalhe && modalDetalhe.style.display !== "none" && wasButtonDisabled) {
        showModalError(modalDetalhe, errorMessage);
    } else {
        showGlobalFeedback(errorMessage, "error");
    }
  } finally {
      if (wasButtonDisabled && btnCancelarReservaModal && btnCancelarReservaModal.dataset.reservaId === reservaId) {
          btnCancelarReservaModal.disabled = false;
          btnCancelarReservaModal.innerHTML = originalButtonTextCancelar;
      }
  }
}

function abrirModalEditarReservaPeloSindico(event) {
    const reservaOriginal = JSON.parse(event.target.dataset.reservaOriginal);
    const modalNovaReserva = document.getElementById("modal-nova-reserva");
    const formNovaReserva = document.getElementById("form-nova-reserva");
    if (!modalNovaReserva || !formNovaReserva) return;

    formNovaReserva.reset();
    document.getElementById("modal-nova-reserva-title").textContent = "Editar Reserva (Síndico)";
    document.getElementById("btn-submit-nova-reserva").textContent = "Salvar Alterações";
    document.getElementById("modal-reserva-id").value = reservaOriginal.id;

    document.getElementById("modal-reserva-espaco").value = reservaOriginal.espacoComumId;
    exibirInfoEspacoSelecionadoModal(reservaOriginal.espacoComumId);
    document.getElementById("modal-reserva-data").value = reservaOriginal.inicio.split('T')[0];
    document.getElementById("modal-reserva-inicio").value = reservaOriginal.inicio.split('T')[1].substring(0,5);
    document.getElementById("modal-reserva-fim").value = reservaOriginal.fim.split('T')[1].substring(0,5);
    document.getElementById("modal-reserva-observacoes").value = reservaOriginal.observacoes || "";

    // Campo de unidade para síndico
    const unidadeGroup = document.getElementById("modal-reserva-unidade-sindico-group");
    const unidadeInput = document.getElementById("modal-reserva-unidade-sindico");
    if (unidadeGroup && unidadeInput && (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador"))) {
        unidadeGroup.style.display = "block";
        unidadeInput.value = reservaOriginal.unidadeId || ""; // Assumindo que o DTO da reserva tem unidadeId
    }

    document.getElementById("modal-reserva-termos").checked = true; // Termos já foram aceitos
    document.getElementById("modal-reserva-termos").disabled = true; // Não pode desmarcar

    // Fechar modal de detalhes primeiro
    const modalDetalhe = document.getElementById("modal-detalhe-reserva");
    if (modalDetalhe) modalDetalhe.style.display = "none";

    modalNovaReserva.style.display = "flex";
}
