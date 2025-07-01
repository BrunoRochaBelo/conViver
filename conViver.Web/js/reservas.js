import { showGlobalFeedback, createErrorStateElement, createEmptyStateElement } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
import apiClient from "./apiClient.js";
import { initFabMenu } from "./fabMenu.js";
// FullCalendar is loaded globally via CDN in reservas.html. Here we pull the
// needed constructors/plugins from the global object to avoid module
// resolution issues when running without a bundler.
const {
  Calendar: FullCalendarCalendar,
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
} = window.FullCalendar || {};

let espacosComunsList = [];
let calendarioReservas = null;
let currentUserId = null;
let currentUserRoles = [];
let agendaDiaListContainer, agendaDiaLoading, agendaDiaSkeleton;
let dataSelecionadaAgenda = new Date().toISOString().split("T")[0];
function getStatusBadgeHtml(status) {
  const s = status ? status.toLowerCase() : "";
  let type = "success";
  if (s.includes("pendente") || s.includes("aguardando")) type = "warning";
  else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) type = "danger";
  return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${type}"></span>${status}</span>`;
}


// List View (Agenda Tab)
let currentPageListView = 1;
let isLoadingListView = false;
let noMoreItemsListView = false;
const listViewItemsContainerId = "list-view-reservas-items";
const listViewSentinelId = "list-view-sentinel";

// Minhas Reservas View
let currentPageMinhasReservas = 1;
let isLoadingMinhasReservas = false;
let noMoreItemsMinhasReservas = false;
const minhasReservasItemsContainerId = "minhas-reservas-list";
const minhasReservasSentinelId = "minhas-reservas-sentinel";

// DOM Elements - Views
let calendarioViewContainer, listViewContainer;
let btnViewCalendario, btnViewLista;
let tabAgendaBtn, tabMinhasBtn;
let contentAgenda, contentMinhas;
let openFilterReservasButton, filtrosModal, aplicarFiltrosModalButton;
// Variáveis de filtro inline para Minhas Reservas removidas:
// let filtroMinhasEspaco,
//   filtroMinhasStatus,
//   filtroMinhasPeriodo,
//   btnAplicarFiltrosMinhas;

// DOM Elements - List View Filters (agora apenas os do modal são usados para Agenda List)
// let filtroEspacoLista, // Removido ou usado apenas para referência de ID do modal
//   filtroStatusLista, // Removido
//   filtroPeriodoLista, // Removido
//   btnAplicarFiltrosLista; // Removido

// Modal filter elements for Agenda Tab
let filtroEspacoModalAgenda, filtroDataModalAgenda, filtroStatusModalAgenda;

// Modal filter elements for Minhas Reservas Tab
let filtroDataModalMinhas, filtroEspacoModalMinhas, filtroStatusModalMinhas;

// Sort
let currentReservasSortOrder = "dataReservaDesc"; // Default sort order
let openSortReservasButton, modalSortReservas, sortOrderSelectReservas, applySortButtonReservas, clearSortButtonReservasModal;

// Admin Espaços Comuns
let adminEspacosSection,
  adminEspacosGrid,
  btnAdicionarEspaco,
  modalGerenciarEspaco,
  closeModalGerenciarEspaco,
  formGerenciarEspaco;

export async function initialize() {
  // Autenticação e info do usuário
  requireAuth();
  const userInfo = getUserInfo();
  if (!userInfo || !userInfo.id) {
    console.error("Não foi possível obter o ID do usuário.");
    showGlobalFeedback(
      "Erro ao identificar usuário. Recarregue a página.",
      "error"
    );
    return;
  }
  currentUserId = userInfo.id;
  currentUserRoles = getRoles();

  // Referências de DOM
  calendarioViewContainer = document.getElementById(
    "calendario-view-container"
  );
  listViewContainer = document.getElementById("list-view-container");
  btnViewCalendario = document.getElementById("btn-view-calendario");
  btnViewLista = document.getElementById("btn-view-lista");
  tabAgendaBtn = document.getElementById("tab-agenda");
  tabMinhasBtn = document.getElementById("tab-minhas-reservas");
  contentAgenda = document.getElementById("content-agenda");
  contentMinhas = document.getElementById("content-minhas-reservas");
  openFilterReservasButton = document.getElementById(
    "open-filter-reservas-button"
  );
  filtrosModal = document.getElementById("modal-filtros-reservas");
  aplicarFiltrosModalButton = document.getElementById(
    "aplicar-filtros-modal-reservas"
  );
  // Referências para filtros inline de Minhas Reservas removidas:
  // filtroMinhasEspaco = document.getElementById("filtro-minhas-espaco");
  // filtroMinhasStatus = document.getElementById("filtro-minhas-status");
  // filtroMinhasPeriodo = document.getElementById("filtro-minhas-periodo");
  // btnAplicarFiltrosMinhas = document.getElementById(
  //   "btn-aplicar-filtros-minhas"
  // );

  // Referências para filtros inline da Lista da Agenda removidas:
  // filtroEspacoLista = document.getElementById("filtro-espaco-lista");
  // filtroStatusLista = document.getElementById("filtro-status-lista");
  // filtroPeriodoLista = document.getElementById("filtro-periodo-lista");
  // btnAplicarFiltrosLista = document.getElementById("btn-aplicar-filtros-lista");

  agendaDiaListContainer = document.getElementById("agenda-dia-reservas-items");
  agendaDiaLoading = document.getElementById("agenda-dia-loading");
  agendaDiaSkeleton = document.querySelector("#agenda-dia-list .feed-skeleton-container");

  // Modal Filter elements for Agenda
  filtroEspacoModalAgenda = document.getElementById("filtro-espaco-modal-agenda");
  filtroDataModalAgenda = document.getElementById("filtro-data-modal-agenda");
  filtroStatusModalAgenda = document.getElementById("filtro-status-modal-agenda"); // Adicionado

  // Modal Filter elements for Minhas Reservas
  filtroDataModalMinhas = document.getElementById("filtro-data-modal-minhas");
  filtroEspacoModalMinhas = document.getElementById("filtro-espaco-modal-minhas");
  filtroStatusModalMinhas = document.getElementById("filtro-status-modal-minhas");

  // Sort Modal elements
  openSortReservasButton = document.getElementById("open-sort-reservas-button");
  modalSortReservas = document.getElementById("modal-sort-reservas");
  sortOrderSelectReservas = document.getElementById("sort-order-select-reservas");
  applySortButtonReservas = document.getElementById("apply-sort-button-reservas");
  clearSortButtonReservasModal = document.getElementById("clear-sort-button-reservas-modal");

  // Toggle views
  if (btnViewCalendario)
    btnViewCalendario.addEventListener("click", () =>
      toggleReservasView("calendario")
    );
  if (btnViewLista) btnViewLista.addEventListener("click", () => toggleReservasView("lista"));

  if (btnViewLista) btnViewLista.addEventListener("click", () => toggleReservasView("lista"));

  setupTabs(); // This will also trigger initial load for the active tab.

  // Listener do btnAplicarFiltrosLista removido, pois os filtros da lista agora estão no modal.

  // Modal de filtros gerais
  if (openFilterReservasButton && filtrosModal) {
        console.log("Filter modal button and modal element found. Attaching listener."); // Log
    openFilterReservasButton.addEventListener("click", () => {
            console.log("Filter icon button clicked."); // Log
      // Determine active tab to show correct filters
      const agendaTabActive = tabAgendaBtn.classList.contains("active");
      const minhasReservasTabActive = tabMinhasBtn.classList.contains("active");

      const filtrosAgendaContent = document.getElementById("filtros-modal-agenda");
      const filtrosMinhasReservasContent = document.getElementById("filtros-modal-minhas-reservas");

      if (agendaTabActive && filtrosAgendaContent) {
        filtrosAgendaContent.style.display = "block";
        if (filtrosMinhasReservasContent) filtrosMinhasReservasContent.style.display = "none"; // Hide other section

        if (filtroEspacoModalAgenda) {
            if (calendarioViewContainer.style.display !== 'none') {
                filtroEspacoModalAgenda.value = document.getElementById("select-espaco-comum-calendario").value;
            }
        }
        if (filtroDataModalAgenda) {
            if (calendarioReservas && calendarioViewContainer.style.display !== 'none') {
                const currentDate = calendarioReservas.getDate();
                filtroDataModalAgenda.value = currentDate.toISOString().substring(0, 7);
            }
        }
        // filtroStatusModalAgenda keeps its last value or default
      } else if (minhasReservasTabActive && filtrosMinhasReservasContent) {
        filtrosMinhasReservasContent.style.display = "block";
        if (filtrosAgendaContent) filtrosAgendaContent.style.display = "none"; // Hide other section

        // Pre-fill for Minhas Reservas:
        // These elements (filtroMinhasPeriodo, filtroMinhasEspaco, filtroMinhasStatus) were removed.
        // So, the modal fields (filtroDataModalMinhas, etc.) will just retain their previous values or defaults.
        // This is fine, as the user will set them as needed.
      } else {
        // Default or error case: hide both specific filter sections
        if (filtrosAgendaContent) filtrosAgendaContent.style.display = "none";
        if (filtrosMinhasReservasContent) filtrosMinhasReservasContent.style.display = "none";
      }
      console.log(`Attempting to show modal. Current display: ${filtrosModal.style.display}`); // Log
      filtrosModal.style.display = "flex";
      console.log(`Modal display set to: ${filtrosModal.style.display}`); // Log
    });

    filtrosModal
      .querySelectorAll(".js-modal-filtros-reservas-close")
      .forEach((btn) =>
        btn.addEventListener(
          "click",
          () => (filtrosModal.style.display = "none")
        )
      );
    window.addEventListener("click", (e) => {
      if (e.target === filtrosModal) filtrosModal.style.display = "none";
    });
  }

  if (aplicarFiltrosModalButton) aplicarFiltrosModalButton.addEventListener("click", () => {
    const agendaTabActive = tabAgendaBtn.classList.contains("active");
    const minhasReservasTabActive = tabMinhasBtn.classList.contains("active");

    if (agendaTabActive) {
      const espacoSelecionadoModal = filtroEspacoModalAgenda.value;
      const dataSelecionadaModal = filtroDataModalAgenda.value; // YYYY-MM
      const statusSelecionadoModal = filtroStatusModalAgenda.value; // Novo

      // Atualizar o filtro de espaço principal do calendário (se visível)
      // Este select é usado pelo FullCalendar para seu filtro de espaço.
      document.getElementById("select-espaco-comum-calendario").value = espacoSelecionadoModal;

      // Fechar o modal
      if (filtrosModal) filtrosModal.style.display = "none";

      // Disparar atualizações das visualizações
      if (calendarioViewContainer.style.display !== "none") { // Se Calendário está visível
        if (dataSelecionadaModal && calendarioReservas) {
          const [year, month] = dataSelecionadaModal.split('-');
          calendarioReservas.gotoDate(`${year}-${month}-01`); // Mover calendário para o mês/ano
        } else {
          // Apenas refetch com o novo filtro de espaço (e data atual do calendário)
          calendarioReservas && calendarioReservas.refetchEvents();
        }
        // O filtro de status para o calendário ainda é o admin inline, não o do modal.
        // A lista de reservas do dia abaixo do calendário também será atualizada pelos filtros do modal.
        carregarReservasDia(dataSelecionadaModal || new Date().toISOString().split("T")[0]);


      } else if (listViewContainer.style.display !== "none") { // Se Lista está visível
        // Os valores para carregar a lista virão diretamente dos campos do modal
        // (filtroEspacoModalAgenda, filtroStatusModalAgenda, filtroDataModalAgenda)
        // A função carregarReservasListView será ajustada para ler deles.
        currentPageListView = 1;
        noMoreItemsListView = false;
        const c = document.getElementById(listViewItemsContainerId);
        if (c) c.dataset.loadedOnce = "false";
        carregarReservasListView(1, false);
      }

    } else if (minhasReservasTabActive) { // Minhas Reservas tab is active
      // Os valores para carregar 'Minhas Reservas' virão diretamente dos campos do modal:
      // filtroDataModalMinhas, filtroEspacoModalMinhas, filtroStatusModalMinhas.
      // A função carregarMinhasReservas será ajustada para ler deles.

      // Fechar o modal
      if (filtrosModal) filtrosModal.style.display = "none";

      // Disparar atualização da lista "Minhas Reservas"
      currentPageMinhasReservas = 1;
      noMoreItemsMinhasReservas = false;
      const cMinhas = document.getElementById(minhasReservasItemsContainerId);
      if (cMinhas) cMinhas.dataset.loadedOnce = "false"; // Force reload
      carregarMinhasReservas(1, false); // Esta função será ajustada para usar os filtros do modal
    }
  });

  // Listener do btnAplicarFiltrosMinhas removido.

  // Inicializa tudo
  await initReservasPage();

  const actions = [
    {
      label: "Solicitar Reserva",
      onClick: abrirModalNovaReserva,
    },
  ];
  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    actions.push({
      label: "Adicionar Espaço",
      onClick: abrirModalAdicionarEspaco,
    });
  }
  initFabMenu(actions);
  setupSortModalAndButtonReservas(); // Adicionado
}

// Função para abrir modal de Nova Reserva (refatorada do listener existente)
function abrirModalNovaReserva() {
  const modalNovaReserva = document.getElementById("modal-nova-reserva");
  const formNovaReserva = document.getElementById("form-nova-reserva");
  const selectEspacoComumCalendario = document.getElementById("select-espaco-comum-calendario");
  const modalSelectEspaco = document.getElementById("modal-reserva-espaco");

  if (modalNovaReserva && formNovaReserva && modalSelectEspaco) {
    document.getElementById("modal-nova-reserva-title").textContent = "Solicitar Nova Reserva";
    formNovaReserva.reset();
    document.getElementById("modal-reserva-id").value = ""; // Limpa ID para garantir que é criação
    document.getElementById("modal-reserva-unidade-sindico-group").style.display = "none";
    document.getElementById("btn-submit-nova-reserva").textContent = "Solicitar Reserva";
    document.getElementById("modal-reserva-termos").checked = false; // Desmarcar termos
    document.getElementById("modal-reserva-termos").disabled = false; // Habilitar termos

    let espacoPreSelecionado = "";
    if (tabAgendaBtn && tabAgendaBtn.classList.contains("active")) {
        if (calendarioViewContainer && calendarioViewContainer.style.display !== "none") {
            espacoPreSelecionado = selectEspacoComumCalendario ? selectEspacoComumCalendario.value : "";
        } else if (listViewContainer && listViewContainer.style.display !== "none") {
            espacoPreSelecionado = filtroEspacoModalAgenda ? filtroEspacoModalAgenda.value : "";
        }
    }
    modalSelectEspaco.value = espacoPreSelecionado;
    exibirInfoEspacoSelecionadoModal(espacoPreSelecionado);

    modalNovaReserva.style.display = "flex";
  } else {
    console.error("Elementos do modal de nova reserva não encontrados.");
  }
}

// Função para abrir modal de Adicionar Espaço Comum
function abrirModalAdicionarEspaco() {
  const modalGerenciarEspaco = document.getElementById("modal-gerenciar-espaco-comum");
  const formGerenciarEspaco = document.getElementById("form-gerenciar-espaco-comum");
  if (modalGerenciarEspaco && formGerenciarEspaco) {
    document.getElementById("modal-gerenciar-espaco-title").textContent = "Adicionar Novo Espaço Comum";
    formGerenciarEspaco.reset();
    document.getElementById("espaco-comum-id").value = "";
    modalGerenciarEspaco.style.display = "flex";
  } else {
    console.error("Elementos do modal de gerenciar espaço não encontrados.");
  }
}


if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
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
    await carregarEspacosComuns();
    reloadDataForActiveTab();

  } catch (error) {
    console.error("Erro ao salvar espaço comum:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao salvar espaço comum.";
    if (modal) showModalError(modal, errorMessage);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
}

function setupSortModalAndButtonReservas() {
  if (openSortReservasButton && modalSortReservas && sortOrderSelectReservas && applySortButtonReservas && clearSortButtonReservasModal) {
    openSortReservasButton.addEventListener("click", () => {
      sortOrderSelectReservas.value = currentReservasSortOrder;
      modalSortReservas.style.display = "flex";
      openSortReservasButton.classList.add("rotated");
    });

    modalSortReservas.querySelectorAll(".js-modal-sort-reservas-close").forEach(btn => {
      btn.addEventListener("click", () => {
        modalSortReservas.style.display = "none";
        openSortReservasButton.classList.remove("rotated");
      });
    });

    window.addEventListener("click", (event) => {
      if (event.target === modalSortReservas) {
        modalSortReservas.style.display = "none";
        openSortReservasButton.classList.remove("rotated");
      }
    });

    applySortButtonReservas.addEventListener("click", () => {
      currentReservasSortOrder = sortOrderSelectReservas.value;
      modalSortReservas.style.display = "none";
      openSortReservasButton.classList.remove("rotated");
      if (currentReservasSortOrder !== "dataReservaDesc") { // Assuming dataReservaDesc is default
        openSortReservasButton.classList.add("has-indicator");
      } else {
        openSortReservasButton.classList.remove("has-indicator");
      }
      reloadDataForActiveTab();
    });

    clearSortButtonReservasModal.addEventListener("click", () => {
      sortOrderSelectReservas.value = "dataReservaDesc"; // Reset to default
      currentReservasSortOrder = "dataReservaDesc";
      modalSortReservas.style.display = "none";
      openSortReservasButton.classList.remove("rotated");
      openSortReservasButton.classList.remove("has-indicator");
      reloadDataForActiveTab();
    });
  }
}

function reloadDataForActiveTab() {
  if (tabAgendaBtn && tabAgendaBtn.classList.contains("active")) {
    if (calendarioViewContainer && calendarioViewContainer.style.display !== 'none') {
      // A ordenação pode não ser diretamente aplicável ao FullCalendar da mesma forma que uma lista.
      // O FullCalendar ordena por data de início por padrão.
      // Se a API de eventos do calendário suportar ordenação, refetchEvents() pode ser suficiente.
      // Por ora, vamos assumir que a ordenação se aplica mais à visualização em lista da Agenda.
      calendarioReservas && calendarioReservas.refetchEvents(); // Refetch para caso a API de eventos use a ordenação
      // Recarregar a lista de reservas do dia também, se ela for afetada pela ordenação.
      carregarReservasDia(dataSelecionadaAgenda); // dataSelecionadaAgenda deve estar atualizada
    } else if (listViewContainer && listViewContainer.style.display !== 'none') {
      currentPageListView = 1;
      noMoreItemsListView = false;
      const c = document.getElementById(listViewItemsContainerId);
      if (c) c.dataset.loadedOnce = "false";
      carregarReservasListView(1, false);
    }
  } else if (tabMinhasBtn && tabMinhasBtn.classList.contains("active")) {
    currentPageMinhasReservas = 1;
    noMoreItemsMinhasReservas = false;
    const cMinhas = document.getElementById(minhasReservasItemsContainerId);
    if (cMinhas) cMinhas.dataset.loadedOnce = "false";
    carregarMinhasReservas(1, false);
  }
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

  // Listener de fabNovaReserva removido pois o FAB agora chama abrirModalNovaReserva() diretamente.
  // O botão HTML fab-nova-reserva (se ainda existir e não for o próprio FAB) não terá mais um listener aqui.

  if (closeModalNovaReservaButton)
    closeModalNovaReservaButton.addEventListener(
      "click",
      () => (modalNovaReserva.style.display = "none")
    );
  window.addEventListener("click", (e) => {
    if (e.target === modalNovaReserva) modalNovaReserva.style.display = "none";
  });
  if (formNovaReserva) {
    formNovaReserva.addEventListener("submit", async (event) => {
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

        const dataPayload = { // Renomeado para evitar conflito com 'data' do form
          espacoComumId: formData.get("espacoComumId"),
          data: formData.get("data"), // Mantido como 'data' aqui, pois é o nome do campo
          inicio: formData.get("inicio"),
          fim: formData.get("fim"),
          observacoes: formData.get("observacoes"),
          unidadeId: currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador") ? formData.get("unidadeId") || null : null
        };

        if (!document.getElementById("modal-reserva-termos").checked && !reservaId) { // Só checa termos na criação
            throw new Error("Você deve aceitar os termos de uso para solicitar uma reserva.");
        }
        if (!dataPayload.espacoComumId || !dataPayload.data || !dataPayload.inicio || !dataPayload.fim) {
            throw new Error("Espaço, data e horários são obrigatórios.");
        }
        // Adicionar validação de horário (fim > início)
        if (dataPayload.inicio >= dataPayload.fim) {
            throw new Error("O horário de fim deve ser posterior ao horário de início.");
        }


        if (reservaId) {
          await apiClient.put(`/api/v1/app/reservas/${reservaId}`, dataPayload);
          showGlobalFeedback("Reserva atualizada com sucesso!", "success", 2500);
        } else {
          await apiClient.post("/api/v1/app/reservas", dataPayload);
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
    });
  }

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

  // Listener para o formulário de Gerenciar Espaço Comum
  if (formGerenciarEspaco) {
    formGerenciarEspaco.addEventListener("submit", handleSalvarEspacoFormSubmit);
  }

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
  const justificativaInput = document.getElementById("modal-detalhe-reserva-sindico-justificativa");
  // A justificativa para cancelamento pelo usuário pode não ser necessária/permitida pela API.
  // Se for uma ação de síndico, a justificativa pode vir do mesmo campo.
  const justificativa = justificativaInput ? justificativaInput.value : "";

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
    await apiClient.post(`/api/v1/app/reservas/${reservaId}/cancelar`, { justificativaAprovacaoRecusa: justificativa });
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
      // Usar os IDs dos filtros do modal de Minhas Reservas
      espacoComumId: filtroEspacoModalMinhas.value || null,
      status: filtroStatusModalMinhas.value || null,
      orderBy: currentReservasSortOrder, // Adicionado para ordenação
    };

    if (filtroDataModalMinhas.value) { // Este é o input type="month"
      const [year, month] = filtroDataModalMinhas.value.split("-").map(Number);
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
        // Usar os IDs dos filtros do modal da Agenda
        espacoComumId: filtroEspacoModalAgenda.value || null,
        status: filtroStatusModalAgenda.value || null,
        orderBy: currentReservasSortOrder, // Adicionado para ordenação
      };
      if (filtroDataModalAgenda.value) { // Este é o input type="month"
        const [year, month] = filtroDataModalAgenda.value.split("-").map(Number);
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
      try {
        const mesAno = new Date(fetchInfo.start).toISOString().slice(0, 7);
        const params = { mesAno };
        const sel = document.getElementById(
          "select-espaco-comum-calendario"
        ).value;
        if (sel) params.espacoComumId = sel;

        const statEl = document.getElementById(
          "filtro-status-reserva-calendario"
        );
        const stat = statEl ? statEl.value : undefined;
        const uniEl = document.getElementById(
          "filtro-unidade-reserva-calendario"
        );
        const uni = uniEl ? uniEl.value : undefined;
        if (
          currentUserRoles.includes("Sindico") ||
          currentUserRoles.includes("Administrador")
        ) {
          if (stat) params.status = stat;
          if (uni) params.unidadeId = uni;
        }

        const items = await apiClient.get(
          "/api/v1/app/reservas/agenda",
          params
        );
        const eventos = items.map((r) => {
          let color = "var(--fc-event-bg-color)",
            cls = ["fc-event-main"];
          if (r.status === "Confirmada") {
            color = "var(--current-semantic-success)";
            cls.push("fc-event-confirmed");
          }
          if (r.status === "Pendente") {
            color = "var(--current-semantic-warning)";
            cls.push("fc-event-pending");
          }
          if (new Date(r.inicio) < new Date()) cls.push("fc-event-past");
          if (r.pertenceAoUsuarioLogado) cls.push("fc-event-user");
          return {
            id: r.id,
            title: r.tituloReserva,
            start: r.inicio,
            end: r.fim,
            backgroundColor: color,
            borderColor: color,
            classNames: cls,
            extendedProps: { ...r },
          };
        });
        successCallback(eventos);
      } catch (err) {
        console.error("Erro ao buscar eventos:", err);
        showGlobalFeedback("Falha ao carregar agenda.", "error");
        failureCallback(err);
      }
    },
    dateClick: (info) => {
      dataSelecionadaAgenda = info.dateStr.split("T")[0];
      carregarReservasDia(dataSelecionadaAgenda);
      const m = document.getElementById("modal-nova-reserva");
      document.getElementById("modal-nova-reserva-title").textContent =
        "Solicitar Nova Reserva";
      document.getElementById("btn-submit-nova-reserva").textContent =
        "Solicitar Reserva";
      document.getElementById("form-nova-reserva").reset();
      document.getElementById("modal-reserva-id").value = "";
      document.getElementById(
        "modal-reserva-unidade-sindico-group"
      ).style.display = "none";
      document.getElementById("modal-reserva-termos").disabled = false;
      document.getElementById("modal-reserva-data").value =
        info.dateStr.split("T")[0];
      document.getElementById("modal-reserva-inicio").value =
        info.dateStr.includes("T")
          ? info.dateStr.split("T")[1].substring(0, 5)
          : "";
      const sel = document.getElementById(
        "select-espaco-comum-calendario"
      ).value;
      const msel = document.getElementById("modal-reserva-espaco");
      if (sel) {
        msel.value = sel;
        exibirInfoEspacoSelecionadoModal(sel);
      } else {
        msel.value = "";
        document.getElementById("modal-info-espaco-reserva").style.display =
          "none";
        const tx = document.getElementById("modal-reserva-taxa-info");
        if (tx) {
          tx.textContent = "";
          tx.style.display = "none";
        }
      }
      m.style.display = "flex";
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
      // Adicionar filtro de status do modal da agenda
      status: filtroStatusModalAgenda ? filtroStatusModalAgenda.value || null : null,
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

