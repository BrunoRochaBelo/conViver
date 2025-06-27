import { showGlobalFeedback, showSkeleton, hideSkeleton } from "./main.js";
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
let filtroMinhasEspaco,
  filtroMinhasStatus,
  filtroMinhasPeriodo,
  btnAplicarFiltrosMinhas;

// DOM Elements - List View Filters
let filtroEspacoLista,
  filtroStatusLista,
  filtroPeriodoLista,
  btnAplicarFiltrosLista;

// Modal filter elements for Agenda Tab
let filtroEspacoModalAgenda, filtroDataModalAgenda;

// Modal filter elements for Minhas Reservas Tab
let filtroDataModalMinhas, filtroEspacoModalMinhas, filtroStatusModalMinhas;

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
  if (!userInfo?.id) {
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
  filtroMinhasEspaco = document.getElementById("filtro-minhas-espaco");
  filtroMinhasStatus = document.getElementById("filtro-minhas-status");
  filtroMinhasPeriodo = document.getElementById("filtro-minhas-periodo");
  btnAplicarFiltrosMinhas = document.getElementById(
    "btn-aplicar-filtros-minhas"
  );

  filtroEspacoLista = document.getElementById("filtro-espaco-lista");
  filtroStatusLista = document.getElementById("filtro-status-lista");
  filtroPeriodoLista = document.getElementById("filtro-periodo-lista");
  btnAplicarFiltrosLista = document.getElementById("btn-aplicar-filtros-lista");

  agendaDiaListContainer = document.getElementById("agenda-dia-reservas-items");
  agendaDiaLoading = document.getElementById("agenda-dia-loading");
  agendaDiaSkeleton = document.querySelector("#agenda-dia-list .feed-skeleton-container");

  // Modal Filter elements for Agenda
  filtroEspacoModalAgenda = document.getElementById("filtro-espaco-modal-agenda");
  filtroDataModalAgenda = document.getElementById("filtro-data-modal-agenda");

  // Modal Filter elements for Minhas Reservas
  filtroDataModalMinhas = document.getElementById("filtro-data-modal-minhas");
  filtroEspacoModalMinhas = document.getElementById("filtro-espaco-modal-minhas");
  filtroStatusModalMinhas = document.getElementById("filtro-status-modal-minhas");


  // Toggle views
  btnViewCalendario?.addEventListener("click", () =>
    toggleReservasView("calendario")
  );
  btnViewLista?.addEventListener("click", () => toggleReservasView("lista"));

  btnViewLista?.addEventListener("click", () => toggleReservasView("lista"));

  setupTabs(); // This will also trigger initial load for the active tab.

  // Filtros da lista (on-page for Agenda Tab's List View)
  btnAplicarFiltrosLista?.addEventListener("click", () => {
    currentPageListView = 1;
    noMoreItemsListView = false;
    const c = document.getElementById(listViewItemsContainerId);
    if (c) c.dataset.loadedOnce = "false"; // Force reload
    carregarReservasListView(1, false);
  });

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
        // Pre-fill modal filters from current page filters for Agenda
        if (filtroEspacoModalAgenda) filtroEspacoModalAgenda.value = document.getElementById("select-espaco-comum-calendario").value;
        if (filtroDataModalAgenda) filtroDataModalAgenda.value = filtroPeriodoLista.value; // Assuming YYYY-MM format
      } else {
        if (filtrosAgendaContent) filtrosAgendaContent.style.display = "none";
      }

      if (minhasReservasTabActive && filtrosMinhasReservasContent) {
        filtrosMinhasReservasContent.style.display = "block";
        // Pre-fill modal filters for Minhas Reservas from current on-page filters
        if (filtroDataModalMinhas) filtroDataModalMinhas.value = filtroMinhasPeriodo.value;
        if (filtroEspacoModalMinhas) filtroEspacoModalMinhas.value = filtroMinhasEspaco.value;
        if (filtroStatusModalMinhas) filtroStatusModalMinhas.value = filtroMinhasStatus.value;
      } else {
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

  aplicarFiltrosModalButton?.addEventListener("click", () => {
    const agendaTabActive = tabAgendaBtn.classList.contains("active");

    if (agendaTabActive) {
      const espacoSelecionadoModal = filtroEspacoModalAgenda.value;
      const dataSelecionadaModal = filtroDataModalAgenda.value; // YYYY-MM

      // Atualizar filtros da página principal (Agenda e Disponibilidade)
      document.getElementById("select-espaco-comum-calendario").value = espacoSelecionadoModal;
      filtroEspacoLista.value = espacoSelecionadoModal; // Para a visualização em lista

      // Para o filtro de período da lista, que é type="month"
      filtroPeriodoLista.value = dataSelecionadaModal;

      // Fechar o modal
      if (filtrosModal) filtrosModal.style.display = "none";

      // Disparar atualizações das visualizações
      // Calendário: refetchEvents() irá pegar o novo valor de 'select-espaco-comum-calendario'.
      // O filtro de data para o calendário é mais complexo se quisermos substituir a navegação interna.
      // Por enquanto, o calendário continuará usando seu próprio fetchInfo para datas, mas filtrará por espaço.
      // Se quisermos que o calendário salte para o mês do filtroDataModalAgenda:
      if (dataSelecionadaModal && calendarioReservas) {
        const [year, month] = dataSelecionadaModal.split('-');
        calendarioReservas.gotoDate(`${year}-${month}-01`);
      } else {
        calendarioReservas?.refetchEvents(); // Refetch com base no espaço e data atual do calendário
      }

      // Lista: recarregar com os novos filtros (incluindo o período da modal)
      currentPageListView = 1;
      noMoreItemsListView = false;
      const c = document.getElementById(listViewItemsContainerId);
      if (c) c.dataset.loadedOnce = "false";
      carregarReservasListView(1, false); // Esta função já usa filtroEspacoLista e filtroPeriodoLista

    } else if (tabMinhasBtn.classList.contains("active")) { // Minhas Reservas tab is active
      const dataSelecionadaModalMinhas = filtroDataModalMinhas.value;
      const espacoSelecionadoModalMinhas = filtroEspacoModalMinhas.value;
      const statusSelecionadoModalMinhas = filtroStatusModalMinhas.value;

      // Atualizar filtros da página principal (Minhas Reservas)
      filtroMinhasPeriodo.value = dataSelecionadaModalMinhas;
      filtroMinhasEspaco.value = espacoSelecionadoModalMinhas;
      filtroMinhasStatus.value = statusSelecionadoModalMinhas;

      // Fechar o modal
      if (filtrosModal) filtrosModal.style.display = "none";

      // Disparar atualização da lista "Minhas Reservas"
      currentPageMinhasReservas = 1;
      noMoreItemsMinhasReservas = false;
      const cMinhas = document.getElementById(minhasReservasItemsContainerId);
      if (cMinhas) cMinhas.dataset.loadedOnce = "false"; // Force reload
      carregarMinhasReservas(1, false); // Esta função usa os filtros da página que acabamos de atualizar
    }
  });

  btnAplicarFiltrosMinhas?.addEventListener("click", () => {
    currentPageMinhasReservas = 1;
    noMoreItemsMinhasReservas = false;
    // Ensure container is marked as not loaded once if we want a full refresh
    const c = document.getElementById(minhasReservasItemsContainerId);
    if (c) c.dataset.loadedOnce = "false";
    carregarMinhasReservas(1, false);
  });

  // Inicializa tudo
  await initReservasPage();

  const actions = [
    {
      label: "Nova Reserva",
      onClick: () => document.getElementById("fab-nova-reserva")?.click(),
    },
  ];
  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    actions.push({
      label: "Novo Espaço Comum",
      onClick: () => document.getElementById("btn-adicionar-espaco")?.click(),
    });
  }
  initFabMenu(actions);
}

if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}

async function initReservasPage() {
  // Elementos de nova reserva
  const fabNovaReserva = document.getElementById("fab-nova-reserva");
  const modalNovaReserva = document.getElementById("modal-nova-reserva");
  const closeModalNovaReservaButton = modalNovaReserva?.querySelector(
    ".js-modal-nova-reserva-close"
  );
  const formNovaReserva = document.getElementById("form-nova-reserva");
  const selectEspacoComumCalendario = document.getElementById(
    "select-espaco-comum-calendario"
  );
  const modalSelectEspaco = document.getElementById("modal-reserva-espaco");

  // Termos de uso
  const linkTermosUso = document.getElementById("link-termos-uso-reserva");
  const modalTermosUso = document.getElementById("modal-termos-uso-reserva");
  const closeModalTermosUso = modalTermosUso?.querySelector(
    ".js-modal-termos-uso-close"
  );

  // Detalhe de reserva
  const modalDetalheReserva = document.getElementById("modal-detalhe-reserva");
  const closeModalDetalheReserva = modalDetalheReserva?.querySelector(
    ".js-modal-detalhe-reserva-close"
  );
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
  closeModalGerenciarEspaco = modalGerenciarEspaco?.querySelector(
    ".js-modal-gerenciar-espaco-close"
  );
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
  fabNovaReserva?.addEventListener("click", () => {
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

  closeModalNovaReservaButton?.addEventListener(
    "click",
    () => (modalNovaReserva.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalNovaReserva) modalNovaReserva.style.display = "none";
  });
  formNovaReserva?.addEventListener("submit", handleSalvarReservaFormSubmit);

  // Termos de uso
  linkTermosUso?.addEventListener("click", (e) => {
    e.preventDefault();
    modalTermosUso.style.display = "flex";
  });
  closeModalTermosUso?.addEventListener(
    "click",
    () => (modalTermosUso.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalTermosUso) modalTermosUso.style.display = "none";
  });

  // Detalhe de reserva
  closeModalDetalheReserva?.addEventListener(
    "click",
    () => (modalDetalheReserva.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalDetalheReserva)
      modalDetalheReserva.style.display = "none";
  });

  btnCancelarReservaModal?.addEventListener("click", async () => {
    const id = btnCancelarReservaModal.dataset.reservaId;
    if (id) {
      await handleCancelarReserva(id);
      modalDetalheReserva.style.display = "none";
    }
  });
  btnAprovarReservaModal?.addEventListener("click", handleAprovarReserva);
  btnRecusarReservaModal?.addEventListener("click", handleRecusarReserva);
  btnEditarReservaModalTrigger?.addEventListener(
    "click",
    abrirModalEditarReservaPeloSindico
  );

  // Atualiza seleção de espaço no calendário
  selectEspacoComumCalendario?.addEventListener("change", () => {
    exibirInfoEspacoSelecionadoCalendario(selectEspacoComumCalendario.value);
    calendarioReservas?.refetchEvents();
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
      renderAdminEspacos();
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
    calendarioReservas?.refetchEvents();
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
  const tabButtons = document.querySelectorAll(".cv-tab-button");
  const tabContents = document.querySelectorAll(".cv-tab-content");
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      console.log(`Tab clicked: ${button.id}`); // Log: Tab button ID
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      tabContents.forEach((c) => {
        // console.log(`Hiding content: ${c.id}`); // Verbose
        c.style.display = "none";
      });
      const targetContentId = "content-" + button.id.replace("tab-", "");
      console.log(`Target content ID: ${targetContentId}`); // Log: Target content ID
      const target = document.getElementById(targetContentId);
      if (target) {
        target.style.display = "block";
        console.log(`Displayed content: ${target.id}`); // Log: Displayed content
      } else {
        console.error(`Target content pane with ID ${targetContentId} not found.`);
      }

      // Specific logic for tab activation
      if (button.id === "tab-minhas-reservas") {
        console.log("Handling 'tab-minhas-reservas' activation."); // Log
        const container = document.getElementById(minhasReservasItemsContainerId);
        if (!container) {
            console.error(`Container for minhas reservas list (#${minhasReservasItemsContainerId}) not found.`);
            return;
        }
        console.log(`'Minhas Reservas' container found. LoadedOnce: ${container.dataset.loadedOnce}, InnerHTML empty: ${container.innerHTML.trim() === ""}, Has loading msg: ${!!container.querySelector(".cv-loading-message")}`); // Log
        // Load only if not loaded once or if it's empty (e.g. after filters changed by on-page filters)
        // The `container.querySelector(".cv-loading-message")` checks if it's in its initial loading state.
        if (!container.dataset.loadedOnce || container.innerHTML.trim() === "" || container.querySelector(".cv-loading-message")) {
            console.log("Condition to load 'Minhas Reservas' met. Calling carregarMinhasReservas."); // Log
            currentPageMinhasReservas = 1;
            noMoreItemsMinhasReservas = false;
            carregarMinhasReservas(1, false); // Initial load for this tab
        }
      } else if (button.id === "tab-agenda") {
        // Refresh current view within agenda tab if needed
        if (calendarioViewContainer && calendarioViewContainer.style.display !== 'none') {
            calendarioReservas?.refetchEvents();
        } else if (listViewContainer && listViewContainer.style.display !== 'none') {
            // List view in agenda tab: only reload if it was never loaded or is empty
            const listContainer = document.getElementById(listViewItemsContainerId);
            if (!listContainer.dataset.loadedOnce || listContainer.innerHTML.trim() === "") {
                currentPageListView = 1;
                noMoreItemsListView = false;
                carregarReservasListView(1, false);
            }
        }
      }
    });
  });

  const initialActive =
    document.querySelector(".cv-tab-button.active") || tabButtons[0];
  if (initialActive) initialActive.click(); // This will trigger the specific logic above for the initially active tab.
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

  if (!append && skeleton) showSkeleton(skeleton);
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

    const responseData = await apiClient.get("/api/v1/app/reservas/minhas-reservas", params);
    // Assuming API returns { items: [], pageNumber: X, pageSize: Y, totalCount: Z, hasNextPage: bool }
    // or similar. For now, we'll use responseData.items and check length against pageSize.
    const items = responseData.items || [];

    if (!append && skeleton) hideSkeleton(skeleton);

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
      container.innerHTML =
        '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada com os filtros aplicados.</p>';
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
    if (!append && skeleton) hideSkeleton(skeleton);
    if (!append) {
      container.innerHTML =
        '<p class="cv-error-message" style="text-align:center;">Erro ao carregar suas reservas. Tente novamente mais tarde.</p>';
    } else {
        showGlobalFeedback("Erro ao carregar mais reservas.", "error");
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
  if (!append && skeleton) showSkeleton(skeleton);
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
    const responseData = await apiClient.get("/api/v1/app/reservas/lista", params);
    // Assumindo que a API retorna um objeto com 'items' e 'hasNextPage' ou similar
    // ou um array diretamente e verificamos o tamanho para 'noMoreItemsListView'
    // Para este exemplo, vou assumir que retorna um array de itens.
    // Se a API retornar estrutura de paginação (ex: { items: [], totalCount: X, page: Y, pageSize: Z }),
    // a lógica de noMoreItemsListView precisaria ser ajustada.

    const items = responseData.items || responseData; // Adaptar conforme a resposta da API

    if (!append && skeleton) hideSkeleton(skeleton);

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
      container.innerHTML =
        '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada para os filtros aplicados.</p>';
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
    if (!append && skeleton) hideSkeleton(skeleton);
    if (!append) {
      container.innerHTML =
        '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas. Tente novamente mais tarde.</p>';
    } else {
      showGlobalFeedback("Erro ao carregar mais reservas.", "error");
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

  let statusClass = "";
  if (reserva.status === "Confirmada") statusClass = "cv-text-success";
  else if (reserva.status === "Pendente") statusClass = "cv-text-warning";
  else if (reserva.status.startsWith("Cancelada"))
    statusClass = "cv-text-error";

  card.innerHTML = `
    <h3>${reserva.nomeEspacoComum}</h3>
    <p><strong>Data:</strong> ${inicioFmt} - ${fimFmt}</p>
    <p><strong>Status:</strong> <span class="${statusClass}">${
    reserva.status
  }</span></p>
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

  card
    .querySelector(".js-detalhe-reserva-lista")
    ?.addEventListener("click", () => {
      const fakeEv = {
        id: reserva.id,
        title: reserva.tituloReserva || reserva.nomeEspacoComum,
        startStr: reserva.inicio,
        endStr: reserva.fim,
        extendedProps: { ...reserva },
      };
      if (calendarioReservas?.options.eventClick) {
        calendarioReservas.options.eventClick({ event: fakeEv });
      } else {
        abrirModalDetalhesComDados(reserva);
      }
    });

  card
    .querySelector(".js-cancelar-reserva-lista")
    ?.addEventListener("click", async () => {
      if (confirm("Tem certeza que deseja cancelar esta reserva?")) {
        await handleCancelarReserva(reserva.id);
        currentPageListView = 1;
        noMoreItemsListView = false;
        const c = document.getElementById(listViewItemsContainerId);
        if (c) c.dataset.loadedOnce = "false";
        carregarReservasListView(1, false);
        calendarioReservas?.refetchEvents();
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
    if (esp?.antecedenciaMinimaCancelamentoHoras) {
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

        const stat = document.getElementById(
          "filtro-status-reserva-calendario"
        )?.value;
        const uni = document.getElementById(
          "filtro-unidade-reserva-calendario"
        )?.value;
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
  showSkeleton(agendaDiaSkeleton);
  if (agendaDiaLoading) agendaDiaLoading.style.display = "block";
  try {
    const params = {
      pageNumber: 1,
      pageSize: 50,
      espacoComumId: document.getElementById("select-espaco-comum-calendario").value || null,
      periodoInicio: new Date(`${dataStr}T00:00:00`).toISOString(),
      periodoFim: new Date(`${dataStr}T23:59:59`).toISOString(),
    };
    const resp = await apiClient.get("/api/v1/app/reservas/lista", params);
    const items = resp.items || resp;
    if (items.length > 0) {
      items.forEach((r) => agendaDiaListContainer.appendChild(renderCardReservaListView(r)));
    } else {
      agendaDiaListContainer.innerHTML = '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva para o dia selecionado.</p>';
    }
  } catch (err) {
    console.error("Erro ao carregar reservas do dia:", err);
    agendaDiaListContainer.innerHTML = '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas.</p>';
  } finally {
    hideSkeleton(agendaDiaSkeleton);
    if (agendaDiaLoading) agendaDiaLoading.style.display = "none";
  }
}

