import { showGlobalFeedback } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
import apiClient from "./apiClient.js";
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
// filtroMinhasEspaco, filtroMinhasStatus, filtroMinhasPeriodo, btnAplicarFiltrosMinhas; // Removidos

// DOM Elements - List View Filters (on-page, though now mostly superseded by modal for Agenda)
let filtroEspacoLista,
  filtroStatusLista, // This specific element might not be used anymore if all filters are modal-driven for Agenda
  filtroPeriodoLista,
  btnAplicarFiltrosLista;

// Modal filter elements for Agenda Tab
let filtroEspacoModalAgenda, filtroDataModalAgenda, filtroStatusModalAgenda, filtroUnidadeModalAgenda;

// Variables to store applied modal filters for Agenda tab
let filtroStatusModalAgendaAplicado = '';
let filtroUnidadeModalAgendaAplicado = '';

// Variables to store applied modal filters for Minhas Reservas tab
let filtroEspacoMinhasAplicado = '';
let filtroStatusMinhasAplicado = '';
let filtroPeriodoMinhasAplicado = '';

// Modal filter elements for Minhas Reservas Tab
let filtroDataModalMinhas, filtroEspacoModalMinhas, filtroStatusModalMinhas;

// DOM Elements for "Reservas do Dia"
let reservasDiaSelecionadoContainer, dataSelecionadaAgendaSpan, reservasDiaListaDiv;

document.addEventListener("DOMContentLoaded", async () => {
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
  // // Filtros on-page para Minhas Reservas (removidos, agora via modal)
  // filtroMinhasEspaco = document.getElementById("filtro-minhas-espaco");
  // filtroMinhasStatus = document.getElementById("filtro-minhas-status");
  // filtroMinhasPeriodo = document.getElementById("filtro-minhas-periodo");
  // btnAplicarFiltrosMinhas = document.getElementById(
  //   "btn-aplicar-filtros-minhas"
  // );

  // Filtros on-page para Lista da Agenda (ainda podem ser usados se o modal não os substituir completamente)
  filtroEspacoLista = document.getElementById("filtro-espaco-lista");
  filtroStatusLista = document.getElementById("filtro-status-lista"); // Pode não ser mais usado
  filtroPeriodoLista = document.getElementById("filtro-periodo-lista");
  btnAplicarFiltrosLista = document.getElementById("btn-aplicar-filtros-lista");

  // Modal Filter elements for Agenda
  filtroEspacoModalAgenda = document.getElementById("filtro-espaco-modal-agenda");
  filtroDataModalAgenda = document.getElementById("filtro-data-modal-agenda");
  filtroStatusModalAgenda = document.getElementById("filtro-status-modal-agenda");
  filtroUnidadeModalAgenda = document.getElementById("filtro-unidade-modal-agenda");

  // DOM elements for "Reservas do Dia" section
  reservasDiaSelecionadoContainer = document.getElementById("reservas-do-dia-selecionado-container");
  dataSelecionadaAgendaSpan = document.getElementById("data-selecionada-agenda");
  reservasDiaListaDiv = document.getElementById("reservas-do-dia-lista");

  // Modal Filter elements for Minhas Reservas
  filtroDataModalMinhas = document.getElementById("filtro-data-modal-minhas");
  filtroEspacoModalMinhas = document.getElementById("filtro-espaco-modal-minhas");
  filtroStatusModalMinhas = document.getElementById("filtro-status-modal-minhas");


  // Toggle views
  btnViewCalendario?.addEventListener("click", () =>
    toggleReservasView("calendario")
  );
  btnViewLista?.addEventListener("click", () => toggleReservasView("lista"));

  setupTabs(); // This will also trigger initial load for the active tab.

  // Botão de aplicar filtros da lista (on-page para Agenda Tab's List View) - pode ser removido se o modal for exclusivo
  btnAplicarFiltrosLista?.addEventListener("click", () => {
    currentPageListView = 1;
    noMoreItemsListView = false;
    const c = document.getElementById(listViewItemsContainerId);
    if (c) c.dataset.loadedOnce = "false"; // Force reload
    carregarReservasListView(1, false);
  });

  // // Botão de aplicar filtros de Minhas Reservas (on-page) - Removido, agora via modal
  // btnAplicarFiltrosMinhas?.addEventListener("click", () => {
  //   currentPageMinhasReservas = 1;
  //   noMoreItemsMinhasReservas = false;
  //   const c = document.getElementById(minhasReservasItemsContainerId);
  //   if (c) c.dataset.loadedOnce = "false";
  //   carregarMinhasReservas(1, false);
  // });


  // Modal de filtros gerais
  if (openFilterReservasButton && filtrosModal) {
    openFilterReservasButton.addEventListener("click", () => {
      const agendaTabActive = tabAgendaBtn.classList.contains("active");
      const minhasReservasTabActive = tabMinhasBtn.classList.contains("active");

      const filtrosAgendaContent = document.getElementById("filtros-modal-agenda");
      const filtrosMinhasReservasContent = document.getElementById("filtros-modal-minhas-reservas");

      if (agendaTabActive && filtrosAgendaContent) {
        filtrosAgendaContent.style.display = "block";
        if (filtrosMinhasReservasContent) filtrosMinhasReservasContent.style.display = "none";
        // Pre-fill modal filters for Agenda
        if (filtroEspacoModalAgenda) filtroEspacoModalAgenda.value = document.getElementById("select-espaco-comum-calendario").value; // From calendar's own selector
        if (filtroDataModalAgenda && filtroPeriodoLista) filtroDataModalAgenda.value = filtroPeriodoLista.value;
        if (filtroStatusModalAgenda) filtroStatusModalAgenda.value = filtroStatusModalAgendaAplicado;
        if (filtroUnidadeModalAgenda) filtroUnidadeModalAgenda.value = filtroUnidadeModalAgendaAplicado;

      } else if (minhasReservasTabActive && filtrosMinhasReservasContent) {
        filtrosMinhasReservasContent.style.display = "block";
        if (filtrosAgendaContent) filtrosAgendaContent.style.display = "none";
        // Pre-fill modal filters for Minhas Reservas
        if (filtroDataModalMinhas && filtroMinhasPeriodo) filtroDataModalMinhas.value = filtroMinhasPeriodo.value;
        if (filtroEspacoModalMinhas && filtroMinhasEspaco) filtroEspacoModalMinhas.value = filtroMinhasEspaco.value;
        if (filtroStatusModalMinhas && filtroMinhasStatus) filtroStatusModalMinhas.value = filtroMinhasStatus.value;
      }
      filtrosModal.style.display = "flex";
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
      const dataSelecionadaModal = filtroDataModalAgenda.value;
      filtroStatusModalAgendaAplicado = filtroStatusModalAgenda.value;
      filtroUnidadeModalAgendaAplicado = filtroUnidadeModalAgenda.value;

      document.getElementById("select-espaco-comum-calendario").value = espacoSelecionadoModal;

      if (filtroEspacoLista) filtroEspacoLista.value = espacoSelecionadoModal;
      if (filtroPeriodoLista) filtroPeriodoLista.value = dataSelecionadaModal;

      if (filtrosModal) filtrosModal.style.display = "none";

      if (reservasDiaSelecionadoContainer) reservasDiaSelecionadoContainer.style.display = 'none';
      if (reservasDiaListaDiv) reservasDiaListaDiv.innerHTML = '<p class="cv-loading-message">Carregando reservas do dia...</p>';
      if (dataSelecionadaAgendaSpan) dataSelecionadaAgendaSpan.textContent = '';

      if (dataSelecionadaModal && calendarioReservas) {
        const [year, month] = dataSelecionadaModal.split('-');
        calendarioReservas.gotoDate(`${year}-${month}-01`);
      } else {
        calendarioReservas?.refetchEvents();
      }

      currentPageListView = 1;
      noMoreItemsListView = false;
      const c = document.getElementById(listViewItemsContainerId);
      if (c) c.dataset.loadedOnce = "false";
      carregarReservasListView(1, false);

    } else if (tabMinhasBtn.classList.contains("active")) {
      const dataSelecionadaModalMinhas = filtroDataModalMinhas.value;
      const espacoSelecionadoModalMinhas = filtroEspacoModalMinhas.value;
      const statusSelecionadoModalMinhas = filtroStatusModalMinhas.value;

      // Armazenar valores dos filtros do modal nas variáveis globais
      filtroPeriodoMinhasAplicado = dataSelecionadaModalMinhas;
      filtroEspacoMinhasAplicado = espacoSelecionadoModalMinhas;
      filtroStatusMinhasAplicado = statusSelecionadoModalMinhas;

      // As linhas que tentavam definir .value dos elementos on-page foram removidas na sobrescrita anterior.

      if (filtrosModal) filtrosModal.style.display = "none";

      currentPageMinhasReservas = 1;
      noMoreItemsMinhasReservas = false;
      const cMinhas = document.getElementById(minhasReservasItemsContainerId);
      if (cMinhas) cMinhas.dataset.loadedOnce = "false";
      carregarMinhasReservas(1, false);
    }
  });

  await initReservasPage();

  // Controlar visibilidade de filtros de admin no modal
  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    const adminOnlyModalFilters = document.querySelectorAll("#modal-filtros-reservas .js-admin-only-filter");
    adminOnlyModalFilters.forEach(el => el.style.display = "block");

    const adminUnidadeInputGroupNovaReserva = document.getElementById("modal-reserva-unidade-sindico-group");
    if(adminUnidadeInputGroupNovaReserva) {
        // A visibilidade deste é controlada ao abrir o modal de nova reserva,
        // para não mostrar para usuários normais que por acaso tenham role de admin em outro contexto.
    }
  }
});

async function initReservasPage() {
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

  const linkTermosUso = document.getElementById("link-termos-uso-reserva");
  const modalTermosUso = document.getElementById("modal-termos-uso-reserva");
  const closeModalTermosUso = modalTermosUso?.querySelector(
    ".js-modal-termos-uso-close"
  );

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

  fabNovaReserva?.addEventListener("click", () => {
    document.getElementById("modal-nova-reserva-title").textContent =
      "Solicitar Nova Reserva";
    formNovaReserva.reset();
    document.getElementById("modal-reserva-id").value = "";

    const adminUnidadeGroup = document.getElementById("modal-reserva-unidade-sindico-group");
    if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
        if(adminUnidadeGroup) adminUnidadeGroup.style.display = "block";
    } else {
        if(adminUnidadeGroup) adminUnidadeGroup.style.display = "none";
    }

    document.getElementById("btn-submit-nova-reserva").textContent =
      "Solicitar Reserva";
    document.getElementById("modal-reserva-termos").disabled = false;
    modalNovaReserva.style.display = "flex";

    let esp = "";
    if (calendarioViewContainer.style.display !== "none")
      esp = selectEspacoComumCalendario.value;
    else if (filtroEspacoLista) esp = filtroEspacoLista.value;
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

  closeModalDetalheReserva?.addEventListener(
    "click",
    () => (modalDetalheReserva.style.display = "none")
  );
  window.addEventListener("click", (e) => {
    if (e.target === modalDetalheReserva)
      modalDetalheReserva.style.display = "none";
  });

  async function obterDataInicioReservaDoModalDetalhes() {
    const reservaOriginalStr = document.getElementById('btn-editar-reserva-modal-trigger')?.dataset.reservaOriginal;
    if (reservaOriginalStr) {
        try {
            const reservaOriginal = JSON.parse(reservaOriginalStr);
            return reservaOriginal.inicio; // string ISO
        } catch (e) { console.error("Erro ao parsear reserva original:", e); }
    }
    return null;
  }

  btnCancelarReservaModal?.addEventListener("click", async () => {
    const id = btnCancelarReservaModal.dataset.reservaId;
    const dataInicio = await obterDataInicioReservaDoModalDetalhes();
    if (id) {
      await handleCancelarReserva(id);
      modalDetalheReserva.style.display = "none";
      calendarioReservas?.refetchEvents();
      if (document.getElementById("tab-minhas-reservas").classList.contains("active")) {
        carregarMinhasReservas(1, false); // Recarrega Minhas Reservas
      }
      if (document.getElementById("tab-agenda").classList.contains("active") && listViewContainer.style.display !== 'none') {
        carregarReservasListView(1, false); // Recarrega Lista da Agenda
      }
      if (dataInicio) {
          atualizarReservasDoDiaSeVisivel(dataInicio);
      }
    }
  });

  btnAprovarReservaModal?.addEventListener("click", async () => {
      const id = btnAprovarReservaModal.dataset.reservaId;
      const dataInicio = await obterDataInicioReservaDoModalDetalhes();
      await handleAprovarReserva(id, dataInicio);
  });
  btnRecusarReservaModal?.addEventListener("click", async () => {
      const id = btnRecusarReservaModal.dataset.reservaId;
      const dataInicio = await obterDataInicioReservaDoModalDetalhes();
      await handleRecusarReserva(id, dataInicio);
  });

  btnEditarReservaModalTrigger?.addEventListener(
    "click",
    abrirModalEditarReservaPeloSindico
  );

  selectEspacoComumCalendario?.addEventListener("change", () => {
    exibirInfoEspacoSelecionadoCalendario(selectEspacoComumCalendario.value);
    calendarioReservas?.refetchEvents();
    // Se a lista de reservas do dia estiver visível, recarregar com o novo espaço
    if (reservasDiaSelecionadoContainer && reservasDiaSelecionadoContainer.style.display !== 'none' && dataSelecionadaAgendaSpan) {
        const dataExibidaTexto = dataSelecionadaAgendaSpan.textContent;
        if(dataExibidaTexto){
            const partes = dataExibidaTexto.split('/');
            if(partes.length === 3) carregarReservasDoDia(`${partes[2]}-${partes[1]}-${partes[0]}`);
        }
    }
  });

  await carregarEspacosComuns();
  initializeFullCalendar();
  setupListViewObserver();
  setupMinhasReservasObserver();
  toggleReservasView("calendario");
}

async function handleSalvarReservaFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const reservaId = formData.get("reservaId");

  const inicioStr = formData.get("data") + "T" + formData.get("inicio");
  const fimStr = formData.get("data") + "T" + formData.get("fim");

  const payload = {
    espacoComumId: formData.get("espacoComumId"),
    inicio: new Date(inicioStr).toISOString(),
    fim: new Date(fimStr).toISOString(),
    observacoes: formData.get("observacoes"),
  };
  if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
    const unidadeIdSindico = formData.get("unidadeId");
    if (unidadeIdSindico) payload.unidadeId = unidadeIdSindico;
  }


  try {
    if (reservaId) {
      await apiClient.put(`/api/v1/app/reservas/${reservaId}`, payload);
    } else {
      await apiClient.post("/api/v1/app/reservas", payload);
    }

    form.reset();
    document.getElementById("modal-nova-reserva").style.display = "none";
    showGlobalFeedback("Reserva salva com sucesso!", "success");
    calendarioReservas?.refetchEvents();

    const dataReservaAfetada = formData.get("data"); // YYYY-MM-DD

    if (document.getElementById("tab-minhas-reservas").classList.contains("active")) {
        currentPageMinhasReservas = 1;
        noMoreItemsMinhasReservas = false;
        const cMinhas = document.getElementById(minhasReservasItemsContainerId);
        if (cMinhas) cMinhas.dataset.loadedOnce = "false";
        carregarMinhasReservas(1, false);
    }

    if (document.getElementById("tab-agenda").classList.contains("active") && listViewContainer.style.display !== 'none') {
        currentPageListView = 1;
        noMoreItemsListView = false;
        const cAgendaList = document.getElementById(listViewItemsContainerId);
        if (cAgendaList) cAgendaList.dataset.loadedOnce = "false";
        carregarReservasListView(1, false);
    }

    if (dataReservaAfetada) {
        atualizarReservasDoDiaSeVisivel(dataReservaAfetada + "T00:00:00.000Z");
    }

  } catch (err) {
    console.error("Erro ao salvar reserva:", err);
    const errorMsg = err.response?.data?.message || "Falha ao salvar reserva. Verifique os dados e horários.";
    showGlobalFeedback(errorMsg, "error");
  }
}

async function handleCancelarReserva(reservaId) {
  if (!reservaId) return;
  try {
    await apiClient.delete(`/api/v1/app/reservas/${reservaId}`);
    showGlobalFeedback("Reserva cancelada.", "success");
    // As atualizações de UI (calendário, listas) são feitas pelos chamadores
  } catch (err) {
    console.error("Erro ao cancelar reserva:", err);
    showGlobalFeedback(err.response?.data?.message || "Falha ao cancelar reserva.", "error");
  }
}

async function handleAprovarReserva(reservaId, dataInicioReserva) {
  if (!reservaId) return;
  try {
    await apiClient.put(`/api/v1/app/reservas/${reservaId}/aprovar`);
    showGlobalFeedback("Reserva aprovada!", "success");
    document.getElementById("modal-detalhe-reserva").style.display = "none";
    calendarioReservas?.refetchEvents();
    if (document.getElementById("tab-minhas-reservas").classList.contains("active")) carregarMinhasReservas(1, false);
    if (document.getElementById("tab-agenda").classList.contains("active") && listViewContainer.style.display !== 'none') carregarReservasListView(1, false);
    if (dataInicioReserva) atualizarReservasDoDiaSeVisivel(dataInicioReserva);
  } catch (err) {
    console.error("Erro ao aprovar reserva:", err);
    showGlobalFeedback(err.response?.data?.message || "Falha ao aprovar reserva.", "error");
  }
}

async function handleRecusarReserva(reservaId, dataInicioReserva) {
  if (!reservaId) return;
  const justificativa = document.getElementById("modal-detalhe-reserva-sindico-justificativa")?.value;
  if (!justificativa) {
    showGlobalFeedback("Por favor, forneça uma justificativa para recusar.", "warning");
    return;
  }
  try {
    await apiClient.put(`/api/v1/app/reservas/${reservaId}/recusar`, { justificativa });
    showGlobalFeedback("Reserva recusada.", "success");
    document.getElementById("modal-detalhe-reserva").style.display = "none";
    calendarioReservas?.refetchEvents();
    if (document.getElementById("tab-minhas-reservas").classList.contains("active")) carregarMinhasReservas(1, false);
    if (document.getElementById("tab-agenda").classList.contains("active") && listViewContainer.style.display !== 'none') carregarReservasListView(1, false);
    if (dataInicioReserva) atualizarReservasDoDiaSeVisivel(dataInicioReserva);
  } catch (err) {
    console.error("Erro ao recusar reserva:", err);
    showGlobalFeedback(err.response?.data?.message || "Falha ao recusar reserva.", "error");
  }
}


async function carregarEspacosComuns() {
  const selects = [
    document.getElementById("select-espaco-comum-calendario"),
    document.getElementById("modal-reserva-espaco"),
    document.getElementById("filtro-espaco-lista"),
    filtroMinhasEspaco,
    filtroEspacoModalAgenda,
    filtroEspacoModalMinhas,
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
        "filtro-minhas-espaco", // ID do elemento, não a variável
        "filtro-espaco-modal-agenda", // ID do elemento
        "filtro-espaco-modal-minhas" // ID do elemento
      ].includes(sel.id);
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
  } else { // 'lista'
    calendarioViewContainer.style.display = "none";
    listViewContainer.style.display = "block";
    btnViewLista.classList.add("cv-button--primary");
    btnViewCalendario.classList.remove("cv-button--primary");
    const c = document.getElementById(listViewItemsContainerId);
    // Carrega a lista apenas se não tiver sido carregada antes ou se estiver vazia (e.g. filtros mudaram)
    if (c && (!c.dataset.loadedOnce || c.innerHTML.trim() === "" || c.querySelector(".cv-loading-message"))) {
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
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      tabContents.forEach((c) => c.style.display = "none");
      const targetContentId = "content-" + button.id.replace("tab-", "");
      const target = document.getElementById(targetContentId);
      if (target) {
        target.style.display = "block";
      }

      if (button.id === "tab-minhas-reservas") {
        const container = document.getElementById(minhasReservasItemsContainerId);
        if (container && (!container.dataset.loadedOnce || container.innerHTML.trim() === "" || container.querySelector(".cv-loading-message"))) {
            currentPageMinhasReservas = 1;
            noMoreItemsMinhasReservas = false;
            carregarMinhasReservas(1, false);
        }
      } else if (button.id === "tab-agenda") {
        if (calendarioViewContainer && calendarioViewContainer.style.display !== 'none') {
            calendarioReservas?.refetchEvents();
        } else if (listViewContainer && listViewContainer.style.display !== 'none') {
            const listContainer = document.getElementById(listViewItemsContainerId);
            if (listContainer && (!listContainer.dataset.loadedOnce || listContainer.innerHTML.trim() === "" || listContainer.querySelector(".cv-loading-message"))) {
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
  if (initialActive) initialActive.click();
}

async function carregarMinhasReservas(page = 1, append = false) {
  if (isLoadingMinhasReservas || (noMoreItemsMinhasReservas && append)) return;
  isLoadingMinhasReservas = true;

  const container = document.getElementById(minhasReservasItemsContainerId);
  const sentinel = document.getElementById(minhasReservasSentinelId);

  if (!container) {
    isLoadingMinhasReservas = false;
    return;
  }

  if (!append) {
    container.innerHTML = "";
    noMoreItemsMinhasReservas = false;
  }

  let loadingMsg = container.querySelector(".cv-loading-message");
  if (!loadingMsg && !append) {
    loadingMsg = document.createElement("p");
    loadingMsg.className = "cv-loading-message";
    container.appendChild(loadingMsg);
  }
  if (loadingMsg) {
    loadingMsg.textContent = append ? "Carregando mais reservas..." : "Carregando suas reservas...";
    loadingMsg.style.display = "block";
  }
  if (sentinel) sentinel.style.display = "block";


  try {
    const params = {
      pageNumber: page,
      pageSize: 10,
      espacoComumId: filtroEspacoMinhasAplicado || null,
      status: filtroStatusMinhasAplicado || null,
    };

    if (filtroPeriodoMinhasAplicado) {
      const [year, month] = filtroPeriodoMinhasAplicado.split("-").map(Number);
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
    const items = responseData.items || [];

    if (loadingMsg) loadingMsg.style.display = "none";

    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true";
      items.forEach((reserva) => {
        const card = renderCardReservaListView({ ...reserva, pertenceAoUsuarioLogado: true });
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
    } else if (!append) {
      container.innerHTML =
        '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada com os filtros aplicados.</p>';
      noMoreItemsMinhasReservas = true;
      if (sentinel) sentinel.style.display = "none";
    } else {
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
    if (loadingMsg) loadingMsg.style.display = "none";
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
    return;
  }

  if (!append) {
    container.innerHTML = "";
    noMoreItemsListView = false;
  }

  let loadingMsg = container.querySelector(".cv-loading-message");
  if (!loadingMsg) {
    loadingMsg = document.createElement("p");
    loadingMsg.className = "cv-loading-message";
    container.appendChild(loadingMsg);
  }
  loadingMsg.textContent = append
    ? "Carregando mais reservas..."
    : "Carregando lista de reservas...";
  loadingMsg.style.display = "block";
  if (sentinel) sentinel.style.display = "block";

    try {
      const params = {
        pageNumber: page,
        pageSize: 10,
        espacoComumId: filtroEspacoLista?.value || null,
      };

      if (filtroStatusModalAgendaAplicado) {
        params.status = filtroStatusModalAgendaAplicado;
      }
      if (filtroUnidadeModalAgendaAplicado &&
          (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador"))) {
        params.unidadeId = filtroUnidadeModalAgendaAplicado;
      }

      if (filtroPeriodoLista?.value) {
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

    const responseData = await apiClient.get("/api/v1/app/reservas/lista", params);
    const items = responseData.items || responseData;

    loadingMsg.style.display = "none";

    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true";
      items.forEach((reserva) =>
        container.appendChild(renderCardReservaListView(reserva))
      );
      currentPageListView = page;
      if (items.length < params.pageSize || (responseData.hasNextPage === false)) {
        noMoreItemsListView = true;
        if (sentinel) sentinel.style.display = "none";
        if (container.querySelector(".fim-lista") === null) {
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista";
            fim.textContent = "Fim das reservas.";
            fim.style.textAlign = "center";
            container.appendChild(fim);
        }
      }
    } else if (!append) {
      container.innerHTML =
        '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada para os filtros aplicados.</p>';
      noMoreItemsListView = true;
      if (sentinel) sentinel.style.display = "none";
    } else {
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
    loadingMsg.style.display = "none";
    if (!append) {
      container.innerHTML =
        '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas. Tente novamente mais tarde.</p>';
    } else {
      showGlobalFeedback("Erro ao carregar mais reservas.", "error");
    }
    noMoreItemsListView = true;
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
  else if (reserva.status?.startsWith("Cancelada")) // Checa se status existe
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
        const dataInicioReserva = reserva.inicio;
        await handleCancelarReserva(reserva.id);
        if (listViewContainer.style.display !== 'none') {
            currentPageListView = 1;
            noMoreItemsListView = false;
            const c = document.getElementById(listViewItemsContainerId);
            if (c) c.dataset.loadedOnce = "false";
            carregarReservasListView(1, false);
        }
        calendarioReservas?.refetchEvents();
        atualizarReservasDoDiaSeVisivel(dataInicioReserva);
      }
    });

  return card;
}

// Helper function to refresh the "reservas do dia" list if visible and relevant
function atualizarReservasDoDiaSeVisivel(dataReservaISO) {
    if (reservasDiaSelecionadoContainer && reservasDiaSelecionadoContainer.style.display !== 'none' && dataSelecionadaAgendaSpan) {
        const dataExibidaTexto = dataSelecionadaAgendaSpan.textContent;
        if (!dataExibidaTexto || !dataReservaISO) return;

        const partesDataExibida = dataExibidaTexto.split('/');
        if (partesDataExibida.length !== 3) return;
        const dataExibidaISO = `${partesDataExibida[2]}-${partesDataExibida[1]}-${partesDataExibida[0]}`;

        const dataReservaApenasData = dataReservaISO.substring(0, 10);

        if (dataReservaApenasData === dataExibidaISO) {
            carregarReservasDoDia(dataExibidaISO);
        }
    }
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
    !modal || !conteudo || !btnCanc || !btnApr || !btnRec || !btnEdt || !justGroup || !justText
  ) {
    return;
  }

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
    return;
  }
  if (!FullCalendarCalendar) {
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
        const espacoComumIdCalendario = document.getElementById("select-espaco-comum-calendario").value;
        if (espacoComumIdCalendario) params.espacoComumId = espacoComumIdCalendario;

        if (filtroStatusModalAgendaAplicado) {
            params.status = filtroStatusModalAgendaAplicado;
        }
        if (filtroUnidadeModalAgendaAplicado &&
            (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador"))) {
            params.unidadeId = filtroUnidadeModalAgendaAplicado;
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
        failureCallback(err);
      }
    },
    eventClick: (clickInfo) => {
      abrirModalDetalhesComDados(clickInfo.event.extendedProps);
    },
    dateClick: (info) => {
      const m = document.getElementById("modal-nova-reserva");
      document.getElementById("modal-nova-reserva-title").textContent = "Solicitar Nova Reserva";
      document.getElementById("btn-submit-nova-reserva").textContent = "Solicitar Reserva";
      document.getElementById("form-nova-reserva").reset();
      document.getElementById("modal-reserva-id").value = "";

      const adminUnidadeGroup = document.getElementById("modal-reserva-unidade-sindico-group");
      if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
        if(adminUnidadeGroup) adminUnidadeGroup.style.display = "block";
      } else {
        if(adminUnidadeGroup) adminUnidadeGroup.style.display = "none";
      }

      document.getElementById("modal-reserva-termos").disabled = false;
      document.getElementById("modal-reserva-data").value = info.dateStr.split("T")[0];
      document.getElementById("modal-reserva-inicio").value = info.dateStr.includes("T") ? info.dateStr.split("T")[1].substring(0, 5) : "";
      const sel = document.getElementById("select-espaco-comum-calendario").value;
      const msel = document.getElementById("modal-reserva-espaco");
      if (sel) {
        msel.value = sel;
        exibirInfoEspacoSelecionadoModal(sel);
      } else {
        msel.value = "";
        document.getElementById("modal-info-espaco-reserva").style.display = "none";
        const tx = document.getElementById("modal-reserva-taxa-info");
        if (tx) {
          tx.textContent = "";
          tx.style.display = "none";
        }
      }
      m.style.display = "flex";

      carregarReservasDoDia(info.dateStr.split("T")[0]);
    },
  });

  calendarioReservas.render();
}

async function carregarReservasDoDia(dataISO) {
  if (!reservasDiaSelecionadoContainer || !dataSelecionadaAgendaSpan || !reservasDiaListaDiv) {
    return;
  }

  dataSelecionadaAgendaSpan.textContent = new Date(dataISO + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
  reservasDiaListaDiv.innerHTML = '<p class="cv-loading-message">Carregando reservas...</p>';
  reservasDiaSelecionadoContainer.style.display = 'block';

  try {
    const params = {
      pageNumber: 1,
      pageSize: 50,
      espacoComumId: document.getElementById("select-espaco-comum-calendario").value || null,
      status: filtroStatusModalAgendaAplicado || null,
    };
    if (filtroUnidadeModalAgendaAplicado && (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador"))) {
      params.unidadeId = filtroUnidadeModalAgendaAplicado;
    }

    params.periodoInicio = new Date(dataISO + 'T00:00:00.000Z').toISOString();
    params.periodoFim = new Date(dataISO + 'T23:59:59.999Z').toISOString();

    const responseData = await apiClient.get("/api/v1/app/reservas/lista", params);
    const items = responseData.items || responseData;

    reservasDiaListaDiv.innerHTML = "";

    if (items.length > 0) {
      items.forEach(reserva => {
        const card = renderCardReservaListView(reserva);
        reservasDiaListaDiv.appendChild(card);
      });
    } else {
      reservasDiaListaDiv.innerHTML = '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada para este dia com os filtros atuais.</p>';
    }
  } catch (err) {
    reservasDiaListaDiv.innerHTML = '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas do dia.</p>';
    showGlobalFeedback("Erro ao buscar reservas para o dia selecionado.", "error");
  }
}

function abrirModalEditarReservaPeloSindico() {
    const reservaOriginalStr = this.dataset.reservaOriginal; // 'this' é o botão
    if (!reservaOriginalStr) {
        showGlobalFeedback("Dados da reserva original não encontrados.", "error");
        return;
    }
    try {
        const reserva = JSON.parse(reservaOriginalStr);
        const modal = document.getElementById("modal-nova-reserva");
        const form = document.getElementById("form-nova-reserva");

        document.getElementById("modal-nova-reserva-title").textContent = "Editar Reserva (Síndico)";
        form.reset(); // Limpa o formulário

        document.getElementById("modal-reserva-id").value = reserva.id;
        document.getElementById("modal-reserva-espaco").value = reserva.espacoComumId;
        exibirInfoEspacoSelecionadoModal(reserva.espacoComumId); // Mostra infos do espaço

        const dataObj = new Date(reserva.inicio);
        const dataFormatted = dataObj.toISOString().split('T')[0];
        const horaInicioFormatted = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

        const dataFimObj = new Date(reserva.fim);
        const horaFimFormatted = dataFimObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

        document.getElementById("modal-reserva-data").value = dataFormatted;
        document.getElementById("modal-reserva-inicio").value = horaInicioFormatted;
        document.getElementById("modal-reserva-fim").value = horaFimFormatted;
        document.getElementById("modal-reserva-observacoes").value = reserva.observacoes || "";

        const adminUnidadeGroup = document.getElementById("modal-reserva-unidade-sindico-group");
        const adminUnidadeInput = document.getElementById("modal-reserva-unidade-sindico");
        if (adminUnidadeGroup && adminUnidadeInput) {
            adminUnidadeGroup.style.display = "block"; // Mostrar para síndico
            adminUnidadeInput.value = reserva.unidadeId || ""; // Preencher se disponível
        }

        document.getElementById("modal-reserva-termos").checked = true; // Assume que termos já foram aceitos
        document.getElementById("modal-reserva-termos").disabled = true; // Não pode mudar termos ao editar

        document.getElementById("btn-submit-nova-reserva").textContent = "Salvar Alterações";
        document.getElementById("modal-detalhe-reserva").style.display = "none"; // Fecha modal de detalhes
        modal.style.display = "flex";

    } catch (e) {
        console.error("Erro ao parsear dados da reserva para edição:", e);
        showGlobalFeedback("Erro ao preparar edição da reserva.", "error");
    }
}
