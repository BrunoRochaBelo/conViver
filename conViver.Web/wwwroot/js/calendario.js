import { showGlobalFeedback, createErrorStateElement, createEmptyStateElement, debugLog, showModalError, clearModalError, openModal, closeModal } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
import apiClient from "./apiClient.js";
import { initFabMenu } from "./fabMenu.js";

// FullCalendar (global)
const FullCalendarCalendar = window.FullCalendar?.Calendar;
// Os plugins (dayGridPlugin, timeGridPlugin, listPlugin) são incluídos automaticamente pelo bundle standard index.global.min.js

// --- State & Constants ---
let espacosComunsList = [];
let calendarioReservas = null;
let currentUserId = null;
let currentUserRoles = [];

// Agenda Tab - Dia List (abaixo do calendário)
let agendaDiaListContainer, agendaDiaSkeleton; // agendaDiaLoading removido, skeleton cobre
let dataSelecionadaAgenda = new Date().toISOString().split("T")[0]; // Para a lista de reservas do dia

// Agenda Tab - List View (alternativa ao calendário)
let currentPageListView = 1;
let isLoadingListView = false;
let noMoreItemsListView = false;
const listViewItemsContainerId = "list-view-reservas-items";
const listViewSentinelId = "list-view-sentinel";
let listViewContainerSkeleton;


// Minhas Reservas Tab
let currentPageMinhasReservas = 1;
let isLoadingMinhasReservas = false;
let noMoreItemsMinhasReservas = false;
const minhasReservasItemsContainerId = "minhas-reservas-list";
const minhasReservasSentinelId = "minhas-reservas-sentinel";
let minhasReservasContainerSkeleton;


// --- DOM Element References ---
// Abas e Conteúdos Principais
let tabAgendaBtn, tabMinhasBtn;
let contentAgenda, contentMinhas;

// Visualização da Agenda (Calendário vs Lista)
let viewToggleSwitch;
let calendarioViewContainer, listViewContainer;
let selectEspacoComumCalendarioDisplay; // Novo para display do filtro do calendário

// Botões Globais de Filtro e Ordenação (no header das abas)
let openFilterReservasButton, openSortReservasButton;

// Modal de Filtros e seus elementos internos
let filtrosModal, aplicarFiltrosModalButton, limparFiltrosModalButton, modalFiltrosReservasTitle;
let filtrosModalAgendaContent, filtroEspacoModalAgenda, filtroDataModalAgenda, filtroStatusModalAgenda, filtroUnidadeModalAgenda, filtrosAdminModalAgenda;
let filtrosModalMinhasReservasContent, filtroEspacoModalMinhas, filtroDataModalMinhas, filtroStatusModalMinhas;

// Modal de Ordenação e seus elementos
let modalSortReservas, sortOrderSelectReservas, applySortButtonReservas, clearSortButtonReservasModal;

// Seção de Admin (Gerenciar Espaços)
let adminEspacosSection, adminEspacosGrid, btnAdicionarEspacoAdmin; // Renomeado btnAdicionarEspaco

// Modais de CRUD (Nova Reserva, Detalhe, Gerenciar Espaço) - IDs permanecem os mesmos
// const modalNovaReserva = document.getElementById("modal-nova-reserva");
// ... (outros modais serão referenciados localmente ou quando necessário)

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

  // Cache DOM elements
  cacheDOMElements();

  setupEventListeners();
  setupTabs(); // Isso também vai carregar o conteúdo da aba inicial

  await carregarEspacosComuns(); // Carrega espaços para selects de filtro e modais
  initializeFullCalendar(); // Para a aba Agenda (Calendário)
  setupListViewObserver();    // Para scroll infinito da Lista da Agenda
  setupMinhasReservasObserver(); // Para scroll infinito de Minhas Reservas

  // Configurar o FAB apenas para perfis com permissão de gerenciamento
  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    const fabActions = [
      { label: "Solicitar Reserva", onClick: abrirModalNovaReserva },
      { label: "Adicionar Espaço", onClick: abrirModalAdicionarEspacoAdmin },
    ];
    initFabMenu(fabActions);
  }

  // Estado inicial da visualização da Agenda
  toggleAgendaView(viewToggleSwitch.checked); // Checked = Calendário
}

if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}

function cacheDOMElements() {
  // Abas
  tabAgendaBtn = document.getElementById("tab-agenda");
  tabMinhasBtn = document.getElementById("tab-minhas-reservas");
  contentAgenda = document.getElementById("content-agenda");
  contentMinhas = document.getElementById("content-minhas-reservas");

  // Toggle de Visualização da Agenda
  viewToggleSwitch = document.getElementById("view-toggle-switch");
  calendarioViewContainer = document.getElementById("calendario-view-container");
  listViewContainer = document.getElementById("list-view-container");
  selectEspacoComumCalendarioDisplay = document.getElementById("select-espaco-comum-calendario-display");

  // Lista de Reservas do Dia (abaixo do calendário)
  agendaDiaListContainer = document.getElementById("agenda-dia-reservas-items");
  agendaDiaSkeleton = document.querySelector("#agenda-dia-list .feed-skeleton-container");

  // Skeletons para listas principais
  listViewContainerSkeleton = document.querySelector("#list-view-container .feed-skeleton-container");
  minhasReservasContainerSkeleton = document.querySelector("#content-minhas-reservas .feed-skeleton-container");


  // Botões Globais de Filtro/Ordenação
  openFilterReservasButton = document.getElementById("open-filter-reservas-button");
  openSortReservasButton = document.getElementById("open-sort-reservas-button");

  // Modal de Filtros
  filtrosModal = document.getElementById("modal-filtros-reservas");
  aplicarFiltrosModalButton = document.getElementById("aplicar-filtros-modal-reservas");
  limparFiltrosModalButton = document.getElementById("limpar-filtros-modal-reservas");
  modalFiltrosReservasTitle = document.getElementById("modal-filtros-reservas-title");
  filtrosModalAgendaContent = document.getElementById("filtros-modal-agenda-content");
  filtroEspacoModalAgenda = document.getElementById("filtro-espaco-modal-agenda");
  filtroDataModalAgenda = document.getElementById("filtro-data-modal-agenda");
  filtroStatusModalAgenda = document.getElementById("filtro-status-modal-agenda");
  filtrosAdminModalAgenda = document.getElementById("filtros-admin-modal-agenda");
  filtroUnidadeModalAgenda = document.getElementById("filtro-unidade-modal-agenda");

  filtrosModalMinhasReservasContent = document.getElementById("filtros-modal-minhas-reservas-content");
  filtroEspacoModalMinhas = document.getElementById("filtro-espaco-modal-minhas");
  filtroDataModalMinhas = document.getElementById("filtro-data-modal-minhas");
  filtroStatusModalMinhas = document.getElementById("filtro-status-modal-minhas");

  // Modal de Ordenação
  modalSortReservas = document.getElementById("modal-sort-reservas");
  sortOrderSelectReservas = document.getElementById("sort-order-select-reservas");
  applySortButtonReservas = document.getElementById("apply-sort-button-reservas");
  clearSortButtonReservasModal = document.getElementById("clear-sort-button-reservas-modal");

  // Admin Espaços
  adminEspacosSection = document.getElementById("admin-espacos-section");
  adminEspacosGrid = document.getElementById("admin-espacos-grid");
  btnAdicionarEspacoAdmin = document.getElementById("btn-adicionar-espaco-admin"); // Renomeado
}

function setupEventListeners() {
  // Toggle de visualização da Agenda
  if (viewToggleSwitch) {
    viewToggleSwitch.addEventListener("change", (e) => toggleAgendaView(e.target.checked));
  }

  // Botão Abrir Modal de Filtros
  if (openFilterReservasButton) {
    openFilterReservasButton.addEventListener("click", abrirModalFiltros);
  }
  // Botões do Modal de Filtros
  if (filtrosModal) {
    filtrosModal.querySelectorAll(".js-modal-filtros-reservas-close").forEach(btn =>
      btn.addEventListener("click", () => closeModal(filtrosModal))
    );
    window.addEventListener("click", (e) => { if (e.target === filtrosModal) closeModal(filtrosModal); });
    if (aplicarFiltrosModalButton) aplicarFiltrosModalButton.addEventListener("click", aplicarFiltrosDoModal);
    if (limparFiltrosModalButton) limparFiltrosModalButton.addEventListener("click", limparFiltrosDoModal);
  }

  // Botão Abrir Modal de Ordenação
  if (openSortReservasButton) {
    openSortReservasButton.addEventListener("click", () => {
      if (modalSortReservas) {
        sortOrderSelectReservas.value = currentReservasSortOrder; // Supondo que currentReservasSortOrder existe
        openModal(modalSortReservas);
        openSortReservasButton.classList.add("rotated");
      }
    });
  }
  // Botões do Modal de Ordenação
  if (modalSortReservas) {
    modalSortReservas.querySelectorAll(".js-modal-sort-reservas-close").forEach(btn => {
      btn.addEventListener("click", () => {
        closeModal(modalSortReservas);
        if (openSortReservasButton) openSortReservasButton.classList.remove("rotated");
      });
    });
    window.addEventListener("click", (event) => {
      if (event.target === modalSortReservas) {
        closeModal(modalSortReservas);
        if (openSortReservasButton) openSortReservasButton.classList.remove("rotated");
      }
    });
    if (applySortButtonReservas) applySortButtonReservas.addEventListener("click", aplicarOrdenacaoDoModal);
    if (clearSortButtonReservasModal) clearSortButtonReservasModal.addEventListener("click", limparOrdenacaoDoModal);
  }

  // Modais de CRUD (Nova Reserva, Detalhes, Gerenciar Espaço, Termos)
  setupModalCrudListeners();

  // Botão Adicionar Espaço (Admin)
  if (btnAdicionarEspacoAdmin) {
    btnAdicionarEspacoAdmin.addEventListener("click", abrirModalAdicionarEspacoAdmin);
  }
}

function setupModalCrudListeners() {
    // Modal Nova Reserva
    const modalNovaReserva = document.getElementById("modal-nova-reserva");
    const formNovaReserva = document.getElementById("form-nova-reserva");
    if (modalNovaReserva) {
        // Adiciona listener para todos os botões de fechar dentro do modal de nova reserva
        modalNovaReserva.querySelectorAll(".js-modal-nova-reserva-close").forEach(btn => {
            btn.addEventListener("click", () => {
                modalNovaReserva.style.display = "none";
            });
        });
        window.addEventListener("click", (e) => { if (e.target === modalNovaReserva) modalNovaReserva.style.display = "none"; });
        formNovaReserva?.addEventListener("submit", handleSalvarReservaFormSubmit);
    }

    // Modal Detalhe Reserva
    const modalDetalheReserva = document.getElementById("modal-detalhe-reserva");
    if (modalDetalheReserva) {
        modalDetalheReserva.querySelector(".js-modal-detalhe-reserva-close")?.addEventListener("click", () => modalDetalheReserva.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalDetalheReserva) modalDetalheReserva.style.display = "none"; });
        document.getElementById("btn-cancelar-reserva-modal")?.addEventListener("click", async (e) => {
            const id = e.target.dataset.reservaId;
            if (id) {
                await handleCancelarReserva(id); // handleCancelarReserva precisa ser definida/adaptada
                modalDetalheReserva.style.display = "none";
            }
        });
        document.getElementById("btn-aprovar-reserva-modal")?.addEventListener("click", handleAprovarReserva);
        document.getElementById("btn-recusar-reserva-modal")?.addEventListener("click", handleRecusarReserva);
        document.getElementById("btn-editar-reserva-modal-trigger")?.addEventListener("click", abrirModalEditarReservaPeloSindico);
    }

    // Modal Gerenciar Espaço Comum (Admin)
    const modalGerenciarEspaco = document.getElementById("modal-gerenciar-espaco-comum");
    const formGerenciarEspaco = document.getElementById("form-gerenciar-espaco-comum");
    if (modalGerenciarEspaco) {
        modalGerenciarEspaco.querySelector(".js-modal-gerenciar-espaco-close")?.addEventListener("click", () => modalGerenciarEspaco.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalGerenciarEspaco) modalGerenciarEspaco.style.display = "none"; });
        formGerenciarEspaco?.addEventListener("submit", handleSalvarEspacoFormSubmit);
    }

    // Modal Termos de Uso
    const modalTermosUso = document.getElementById("modal-termos-uso-reserva");
    const linkTermosUso = document.getElementById("link-termos-uso-reserva");
    if (modalTermosUso) {
        modalTermosUso.querySelector(".js-modal-termos-uso-close")?.addEventListener("click", () => modalTermosUso.style.display = "none");
        window.addEventListener("click", (e) => { if (e.target === modalTermosUso) modalTermosUso.style.display = "none"; });
        linkTermosUso?.addEventListener("click", (e) => {
            e.preventDefault();
            modalTermosUso.style.display = "flex";
        });
    }
}


// --- Funções de Controle de UI ---

function setupTabs() {
  const tabsContainer = document.getElementById("reservas-tabs");
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
        toggleAgendaView(viewToggleSwitch.checked); // Força atualização da view ativa na agenda
      } else if (button.id === "tab-minhas-reservas") {
        const container = document.getElementById(minhasReservasItemsContainerId);
        if (!container.dataset.loadedOnce || !container.innerHTML.trim()) {
          currentPageMinhasReservas = 1;
          noMoreItemsMinhasReservas = false;
          carregarMinhasReservas(1, false);
        }
      }
      // Mostrar/ocultar seção admin se necessário (ex: se for uma aba separada)
      if (adminEspacosSection) {
        adminEspacosSection.style.display =
          (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador"))
            ? "block"
            : "none";
      }
    });
  });

  // Ativar aba inicial
  const initialActiveTab = tabsContainer.querySelector(".cv-tab-button.active") || tabButtons[0];
  if (initialActiveTab) initialActiveTab.click();
}

/**
 * Alterna a visualização na aba Agenda entre Calendário e Lista.
 * @param {boolean} showList Se true, mostra a Lista; senão, mostra o Calendário.
 */
function toggleAgendaView(showList) {
  if (showList) { // Mostrar Lista
    calendarioViewContainer.style.display = "none";
    listViewContainer.style.display = "block"; // Ou 'grid' se usar .feed-grid
    if (viewToggleSwitch) viewToggleSwitch.checked = true; // Switch marcado = Lista

    if (agendaDiaListContainer) agendaDiaListContainer.style.display = "";

    const listItemsEl = document.getElementById(listViewItemsContainerId);
    if (!listItemsEl.dataset.loadedOnce || !listItemsEl.innerHTML.trim()) {
      currentPageListView = 1;
      noMoreItemsListView = false;
      carregarReservasListView(1, false);
    }
  } else { // Mostrar Calendário
    calendarioViewContainer.style.display = "block";
    listViewContainer.style.display = "none";
    if (viewToggleSwitch) viewToggleSwitch.checked = false; // Switch desmarcado = Calendário

    if (agendaDiaListContainer) agendaDiaListContainer.style.display = "none";
    calendarioReservas?.refetchEvents();
  }
}

function abrirModalFiltros() {
    if (!filtrosModal) return;
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasBtn.classList.contains("active");

    // Preencher título e mostrar/ocultar seções de filtro
    if (agendaTabActive) {
        modalFiltrosReservasTitle.textContent = "Filtros da Agenda";
        filtrosModalAgendaContent.style.display = "block";
        filtrosModalMinhasReservasContent.style.display = "none";
        // Mostrar filtros de admin para agenda se for o caso
        filtrosAdminModalAgenda.style.display = (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) ? "block" : "none";

        // Preencher campos do modal com os filtros atuais da Agenda
        if (selectEspacoComumCalendarioDisplay)
            filtroEspacoModalAgenda.value = selectEspacoComumCalendarioDisplay.value; // O select display reflete o filtro real
        // Para data e status, eles são aplicados diretamente na carga, então o modal pode manter o último valor ou ser resetado
        // Se dataSelecionadaAgenda for relevante para o filtro de data da lista:
        // filtroDataModalAgenda.value = dataSelecionadaAgenda ? dataSelecionadaAgenda.substring(0, 7) : "";
        // filtroStatusModalAgenda.value = ... (valor atual do filtro de status da lista, se houver)
    } else if (minhasReservasTabActive) {
        modalFiltrosReservasTitle.textContent = "Filtros de Minhas Reservas";
        filtrosModalAgendaContent.style.display = "none";
        filtrosModalMinhasReservasContent.style.display = "block";
        filtrosAdminModalAgenda.style.display = "none"; // Esconder filtros de admin da agenda

        // Preencher campos do modal com os filtros atuais de Minhas Reservas
        // Ex: filtroEspacoModalMinhas.value = currentMinhasReservasFilters.espacoId || "";
    } else {
        // Caso padrão ou erro: esconder ambas as seções específicas
        modalFiltrosReservasTitle.textContent = "Filtros de Reservas";
        filtrosModalAgendaContent.style.display = "none";
        filtrosModalMinhasReservasContent.style.display = "none";
        filtrosAdminModalAgenda.style.display = "none";
    }
    filtrosModal.style.display = "flex";
}

function aplicarFiltrosDoModal() {
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasBtn.classList.contains("active");

    if (agendaTabActive) {
        // Atualizar o select de display do calendário
        if (selectEspacoComumCalendarioDisplay)
            selectEspacoComumCalendarioDisplay.value = filtroEspacoModalAgenda.value;
        // Forçar a atualização da lista de espaços, se necessário, para que o select display mostre o nome correto
        // (Isso geralmente é tratado ao popular o select inicialmente)


        // Se a visualização de calendário estiver ativa
        if (viewToggleSwitch.checked) {
            calendarioReservas?.refetchEvents(); // FullCalendar usa seus próprios filtros internos + o que for passado no `events`
            // A data do calendário é alterada pela navegação do próprio calendário.
            // O filtro de data do modal (mês/ano) é mais para a lista.
            // Se o filtro de data do modal DEVE mudar o calendário:
            if (filtroDataModalAgenda.value) {
                const [year, month] = filtroDataModalAgenda.value.split('-');
                calendarioReservas?.gotoDate(`${year}-${month}-01`);
            }
             // Atualizar a lista de reservas do dia com base nos novos filtros também // dataSelecionadaAgenda é a data clicada no calendário
        } else { // Visualização de lista da agenda ativa
            currentPageListView = 1;
            noMoreItemsListView = false;
            carregarReservasListView(1, false); // Esta função usará os valores dos filtros do modal
        }
    } else if (minhasReservasTabActive) {
        currentPageMinhasReservas = 1;
        noMoreItemsMinhasReservas = false;
        carregarMinhasReservas(1, false); // Esta função usará os valores dos filtros do modal
    }
    filtrosModal.style.display = "none";
    if (openFilterReservasButton) {
        const hasFilters = [
            filtroEspacoModalAgenda.value, filtroDataModalAgenda.value, filtroStatusModalAgenda.value,
            filtroEspacoModalMinhas.value, filtroDataModalMinhas.value, filtroStatusModalMinhas.value,
            filtroUnidadeModalAgenda.value
        ].some(val => val && val !== "");
        if (hasFilters) openFilterReservasButton.classList.add("has-indicator");
        else openFilterReservasButton.classList.remove("has-indicator");
    }
}

function limparFiltrosDoModal() {
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasBtn.classList.contains("active");

    if (agendaTabActive) {
        filtroEspacoModalAgenda.value = "";
        filtroDataModalAgenda.value = "";
        filtroStatusModalAgenda.value = "";
        filtroUnidadeModalAgenda.value = "";
        if (selectEspacoComumCalendarioDisplay)
            selectEspacoComumCalendarioDisplay.value = ""; // Limpar também o display
    } else if (minhasReservasTabActive) {
        filtroEspacoModalMinhas.value = "";
        filtroDataModalMinhas.value = "";
        filtroStatusModalMinhas.value = "";
    }
    // Após limpar, reaplicar (que vai recarregar os dados sem filtros)
    aplicarFiltrosDoModal();
    if (openFilterReservasButton) openFilterReservasButton.classList.remove("has-indicator");
}

// --- Funções de Ordenação (Modal) ---
let currentReservasSortOrder = "dataReservaDesc"; // Valor padrão

function aplicarOrdenacaoDoModal() {
    if (modalSortReservas && sortOrderSelectReservas && openSortReservasButton) {
        currentReservasSortOrder = sortOrderSelectReservas.value;
        modalSortReservas.style.display = "none";
        openSortReservasButton.classList.remove("rotated");
        if (currentReservasSortOrder !== "dataReservaDesc") { // Assumindo que 'dataReservaDesc' é o padrão
            openSortReservasButton.classList.add("has-indicator");
        } else {
            openSortReservasButton.classList.remove("has-indicator");
        }
        reloadDataForActiveTab(); // Recarrega dados da aba/visualização ativa com a nova ordenação
    }
}

function limparOrdenacaoDoModal() {
    if (modalSortReservas && sortOrderSelectReservas && openSortReservasButton) {
        sortOrderSelectReservas.value = "dataReservaDesc"; // Resetar para o padrão
        currentReservasSortOrder = "dataReservaDesc";
        modalSortReservas.style.display = "none";
        openSortReservasButton.classList.remove("rotated");
        openSortReservasButton.classList.remove("has-indicator");
        reloadDataForActiveTab();
    }
}


function reloadDataForActiveTab() {
  if (tabAgendaBtn && tabAgendaBtn.classList.contains("active")) {
    if (viewToggleSwitch.checked) { // Calendário visível
      calendarioReservas?.refetchEvents();
    } else { // Lista da Agenda visível
      currentPageListView = 1;
      noMoreItemsListView = false;
      document.getElementById(listViewItemsContainerId).dataset.loadedOnce = "false";
      carregarReservasListView(1, false);
    }
  } else if (tabMinhasBtn && tabMinhasBtn.classList.contains("active")) {
    currentPageMinhasReservas = 1;
    noMoreItemsMinhasReservas = false;
    document.getElementById(minhasReservasItemsContainerId).dataset.loadedOnce = "false";
    carregarMinhasReservas(1, false);
  }
}

// --- Funções de Abertura de Modais de CRUD ---
function abrirModalNovaReserva() {
  const modal = document.getElementById("modal-nova-reserva");
  const form = document.getElementById("form-nova-reserva");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("modal-nova-reserva-title").textContent = "Solicitar Nova Reserva";
  document.getElementById("btn-submit-nova-reserva").textContent = "Solicitar Reserva";
  document.getElementById("modal-reserva-id").value = "";
  document.getElementById("modal-reserva-unidade-sindico-group").style.display = "none";
  document.getElementById("modal-reserva-termos").checked = false;
  document.getElementById("modal-reserva-termos").disabled = false;

  // Preencher espaço com base no filtro ativo da agenda, se possível
  const espacoFiltroAgenda = filtroEspacoModalAgenda.value;
  if (espacoFiltroAgenda && tabAgendaBtn.classList.contains("active")) {
    document.getElementById("modal-reserva-espaco").value = espacoFiltroAgenda;
    exibirInfoEspacoSelecionadoModal(espacoFiltroAgenda);
  } else {
     document.getElementById("modal-reserva-espaco").value = "";
     exibirInfoEspacoSelecionadoModal(""); // Limpa infos
  }
  modal.style.display = "flex";
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
async function handleSalvarReservaFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const modal = document.getElementById("modal-nova-reserva");
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    submitButton.disabled = true;
    submitButton.innerHTML = 'Salvando... <span class="inline-spinner"></span>';
    if (modal) clearModalError(modal);

    try {
        const formData = new FormData(form);
        const reservaId = formData.get("reservaId");
        const payload = {
            espacoComumId: formData.get("espacoComumId"),
            data: formData.get("data"),
            inicio: formData.get("inicio"),
            fim: formData.get("fim"),
            observacoes: formData.get("observacoes"),
            unidadeId: (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) ? formData.get("unidadeId") || null : null
        };

        if (!document.getElementById("modal-reserva-termos").checked && !reservaId) {
            throw new Error("Você deve aceitar os termos de uso para solicitar uma reserva.");
        }
        if (!payload.espacoComumId || !payload.data || !payload.inicio || !payload.fim) {
            throw new Error("Espaço, data e horários são obrigatórios.");
        }
        if (payload.inicio >= payload.fim) {
            throw new Error("O horário de fim deve ser posterior ao horário de início.");
        }

        if (reservaId) {
            await apiClient.put(`/api/v1/app/reservas/${reservaId}`, payload);
            showGlobalFeedback("Reserva atualizada com sucesso!", "success", 2500);
        } else {
            await apiClient.post("/api/v1/app/reservas", payload);
            showGlobalFeedback("Reserva solicitada com sucesso!", "success", 2500);
        }

        if (modal) modal.style.display = "none";
        form.reset();
        reloadDataForActiveTab();
    } catch (error) {
        console.error("Erro ao salvar reserva:", error);
        const errorMessage = error.detalhesValidacao || error.message || "Falha ao salvar reserva.";
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
  if (!el) {
    console.error("Elemento do FullCalendar (#calendario-reservas) não encontrado.");
    return;
  }
  if (!FullCalendarCalendar) {
    console.error("Biblioteca FullCalendar não encontrada globalmente (FullCalendar.Calendar). Verifique se o bundle index.global.min.js está carregado corretamente.");
    return;
  }
  calendarioReservas = new FullCalendarCalendar(el, {
    locale: "pt-br",
    // Não é necessário listar os plugins aqui se estiver usando o bundle standard (index.global.min.js)
    // que já os inclui (dayGrid, timeGrid, list).
    // plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
    nowIndicator: true, // Adiciona o indicador de hora atual
    // height: 'parent', // REVERTIDO - Deixar FullCalendar gerenciar altura automaticamente (padrão 'auto')
    initialView: "dayGridMonth",
    headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" },
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
