import { showGlobalFeedback } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
import { initFabMenu } from "./fabMenu.js";
import apiClient from "./apiClient.js";
import FullCalendar from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

let espacosComunsList = [];
let calendarioReservas = null;
let currentUserId = null;
let currentUserRoles = [];

// List View (Agenda e Disponibilidade)
let currentPageListView = 1;
let isLoadingListView = false;
let noMoreItemsListView = false;
const listViewItemsContainerId = "list-view-reservas-items";
const listViewSentinelId = "list-view-sentinel";

// Minhas Reservas List View
let currentPageMinhasReservas = 1;
let isLoadingMinhasReservas = false;
let noMoreItemsMinhasReservas = false;
const minhasReservasListContainerId = "minhas-reservas-list"; // Already in HTML
const minhasReservasSentinelId = "minhas-reservas-list-sentinel"; // Will need to be added to HTML

// DOM Elements - Views
let calendarioViewContainer, listViewContainer;
let btnViewCalendario, btnViewLista;
let tabAgendaBtn, tabMinhasBtn;
let contentAgenda, contentMinhas;
let openFilterReservasButton, filtrosModal, aplicarFiltrosModalButton, limparFiltrosModalButton;
let filtroEspacoModal, filtroStatusModal, filtroPeriodoModal; // Unified modal filters

// Declarations for deleted local filter elements are removed below:
// let filtroMinhasEspaco,
//   filtroMinhasStatus,
//   filtroMinhasPeriodo,
//   btnAplicarFiltrosMinhas;

// let filtroEspacoLista,
//   filtroStatusLista,
//   filtroPeriodoLista,
//   btnAplicarFiltrosLista;

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
  // Unified Modal Filter Elements
  filtrosModal = document.getElementById("modal-filtros-reservas");
  aplicarFiltrosModalButton = document.getElementById("aplicar-filtros-modal-reservas");
  limparFiltrosModalButton = document.getElementById("limpar-filtros-modal-reservas");
  filtroEspacoModal = document.getElementById("filtro-espaco-modal-reservas");
  filtroStatusModal = document.getElementById("filtro-status-modal-reservas");
  filtroPeriodoModal = document.getElementById("filtro-periodo-modal-reservas");

  // DOM lookups for deleted local filter elements are removed:
  // filtroMinhasEspaco = document.getElementById("filtro-minhas-espaco");
  // filtroMinhasStatus = document.getElementById("filtro-minhas-status");
  // filtroMinhasPeriodo = document.getElementById("filtro-minhas-periodo");
  // btnAplicarFiltrosMinhas = document.getElementById("btn-aplicar-filtros-minhas");

  // filtroEspacoLista = document.getElementById("filtro-espaco-lista");
  // filtroStatusLista = document.getElementById("filtro-status-lista");
  // filtroPeriodoLista = document.getElementById("filtro-periodo-lista");
  // btnAplicarFiltrosLista = document.getElementById("btn-aplicar-filtros-lista");

  // Toggle views
  btnViewCalendario?.addEventListener("click", () =>
    toggleReservasView("calendario")
  );
  btnViewLista?.addEventListener("click", () => toggleReservasView("lista"));

  setupTabs();

  // Event listener for btnAplicarFiltrosLista removed as button is deleted.
  // Logic is now handled by aplicarFiltrosUnificados.

  // Modal de filtros gerais
  if (openFilterReservasButton && filtrosModal) {
    openFilterReservasButton.addEventListener("click", () => {
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

  aplicarFiltrosModalButton?.addEventListener("click", aplicarFiltrosUnificados);
  limparFiltrosModalButton?.addEventListener("click", limparFiltrosUnificados);

  // Event listener for btnAplicarFiltrosMinhas removed as button is deleted.
  // Logic is now handled by aplicarFiltrosUnificados when "Minhas Reservas" tab is active.

  // Inicializa tudo
  await initReservasPage();
  setupFabMenu();
});

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
  const adminEspacosSection = document.getElementById("admin-espacos-section");
  const btnAdicionarEspaco = document.getElementById("btn-adicionar-espaco");
  const modalGerenciarEspaco = document.getElementById(
    "modal-gerenciar-espaco-comum"
  );
  const closeModalGerenciarEspaco = modalGerenciarEspaco?.querySelector(
    ".js-modal-gerenciar-espaco-close"
  );
  const formGerenciarEspaco = document.getElementById(
    "form-gerenciar-espaco-comum"
  );

  function openGerenciarEspacoModal() {
    document.getElementById("modal-gerenciar-espaco-title").textContent =
      "Adicionar Novo Espaço Comum";
    formGerenciarEspaco.reset();
    modalGerenciarEspaco.style.display = "flex";
  }

  // Abre modal de nova reserva
  function openNovaReservaModal() {
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

    let esp = "";
    if (calendarioViewContainer.style.display !== "none")
      esp = selectEspacoComumCalendario.value;
    else esp = filtroEspacoLista.value;
    modalSelectEspaco.value = esp;
    exibirInfoEspacoSelecionadoModal(esp);
  }

  fabNovaReserva?.addEventListener("click", openNovaReservaModal);
  btnAdicionarEspaco?.addEventListener("click", openGerenciarEspacoModal);

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

  // Event listener for selectEspacoComumCalendario (local calendar filter) removed as element is deleted.
  // Filtering is now handled by the unified modal.

  // Carrega dados e inicializa componentes
  await carregarEspacosComuns();
  initializeFullCalendar();
  setupListViewObserver(); // For Agenda's list view
  setupMinhasReservasObserver(); // For Minhas Reservas list view
  // await carregarMinhasReservas(); // This will be called when tab becomes active or filters applied

  // Define view inicial
  toggleReservasView("calendario");
}

async function carregarEspacosComuns() {
  const selectsToPopulate = [
    // document.getElementById("select-espaco-comum-calendario"), // DELETED
    document.getElementById("modal-reserva-espaco"), // Used in Nova Reserva Modal
    // document.getElementById("filtro-espaco-lista"), // DELETED
    // document.getElementById("filtro-minhas-espaco"), // DELETED
    document.getElementById("filtro-espaco-modal-reservas"), // Unified filter modal
  ].filter(sel => sel != null); // Filter out nulls if elements were indeed deleted

  selectsToPopulate.forEach((sel) => {
    sel.innerHTML = "<option>Carregando...</option>";
  });
  try {
    const espacos = await apiClient.get("/api/v1/app/reservas/espacos-comuns");
    espacosComunsList = espacos;
    selectsToPopulate.forEach((sel) => {
      // No need to check if (!sel) here due to .filter(sel => sel != null) above
      const currentValue = sel.value;
      // Determine if it's a filter select needing "Todos os Espaços"
      const isFiltro = sel.id === "filtro-espaco-modal-reservas";

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
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      tabContents.forEach((c) => (c.style.display = "none"));
      const target = document.getElementById(
        "content-" + button.id.replace("tab-", "")
      );
      if (target) target.style.display = "block";

      if (button.id === "tab-minhas-reservas") {
        carregarMinhasReservas();
      }
    });
  });

  const initialActive =
    document.querySelector(".cv-tab-button.active") || tabButtons[0];
  if (initialActive) initialActive.click();
}

function switchTab(tab) {
  if (!tabAgendaBtn || !tabMinhasBtn) return;
  if (tab === "agenda") {
    contentAgenda.style.display = "block";
    contentMinhas.style.display = "none";
    tabAgendaBtn.classList.add("active");
    tabMinhasBtn.classList.remove("active");
  } else {
    contentAgenda.style.display = "none";
    contentMinhas.style.display = "block";
    tabMinhasBtn.classList.add("active");
    tabAgendaBtn.classList.remove("active");
    carregarMinhasReservas();
  }
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
    let params = getUnifiedFilters(); // Get base filters from modal
    params.pageNumber = page;
    params.pageSize = 10; // Or your desired page size

    // Note: getUnifiedFilters() already provides periodoInicio and periodoFim if a month is selected in modal.
    // If no period is set in modal, the API call will not include period filters,
    // effectively fetching all reservations based on other criteria (espaco, status).
    // This behavior should be confirmed against API capabilities (does it require a period for list view, or is it optional?)

    // The old local filters (filtroEspacoLista, filtroStatusLista, filtroPeriodoLista) are now IGNORED.
    // Their UI elements should ideally be removed later to avoid confusion.

    // Adicionar parâmetro para indicar que é uma requisição para a "lista geral" se necessário pela API
    // params.viewType = "list"; // Exemplo, dependente da API (Confirm if /agenda can serve lists or if another endpoint is better)

    const response = await apiClient.get("/api/v1/app/reservas/agenda", params);
    loadingMsg.style.display = "none";

    // A API precisa retornar uma estrutura que permita paginação.
    // Exemplo: { items: [], totalItems: N, pageNumber: P, pageSize: S }
    // Ou simplesmente um array, e verificamos o tamanho para 'noMoreItems'.
    // Para este exemplo, vamos assumir que a resposta é um objeto com 'items' e 'hasNextPage' ou similar.
    // Se for um array simples:
    // const items = response;
    // if (items.length === 0 && !append) { /* ... */ }
    // if (items.length < params.pageSize) noMoreItemsListView = true;

    // Assumindo uma estrutura de resposta paginada como:
    // { data: { items: [], pageNumber: 1, pageSize: 10, totalPages: 5, hasNextPage: true } }
    // Ou, se o apiClient.get já desestrutura para os dados:
    // { items: [], pageNumber: 1, pageSize: 10, totalPages: 5, hasNextPage: true }
    // Para simplificar, vamos assumir que 'response' é o array de itens e que a API retorna um array vazio se não há mais.
    // Ou que o apiClient.get retorna um objeto com uma propriedade `data` que é o array.

    let items = [];
    if (response && Array.isArray(response)) { // Se a resposta for diretamente um array
        items = response;
    } else if (response && response.data && Array.isArray(response.data)) { // Se a resposta for { data: [...] }
        items = response.data;
    } else if (response && response.items && Array.isArray(response.items)) { // Se a resposta for { items: [...], ...paginationInfo }
        items = response.items;
        // Idealmente, a API informaria se há mais páginas ou o total de itens/páginas
        // Ex: if (response.pageNumber >= response.totalPages) noMoreItemsListView = true;
        // Ex: if (!response.hasNextPage) noMoreItemsListView = true;
    }


    if (items.length > 0) {
      if (!append) container.dataset.loadedOnce = "true";
      items.forEach((r) =>
        container.appendChild(renderCardReservaListView(r))
      );
      currentPageListView = page; // Atualiza a página atual
      // Heurística simples: se retornou menos itens que o pedido, não há mais.
      if (items.length < params.pageSize) {
        noMoreItemsListView = true;
      }
    } else if (!append) { // Nenhuns itens retornados na primeira carga
      container.innerHTML =
        '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada para os filtros selecionados.</p>';
      noMoreItemsListView = true; // Não há itens para esta combinação de filtros
    } else { // Nenhuns itens retornados em uma carga subsequente (append)
        noMoreItemsListView = true; // Marca que não há mais itens para carregar
    }

    if (noMoreItemsListView && sentinel) {
        sentinel.style.display = "none";
        // Adiciona mensagem de fim de lista apenas se houver itens carregados
        if (container.children.length > 0 && !container.querySelector('.fim-lista')) {
            const fim = document.createElement("p");
            fim.className = "cv-info-message fim-lista";
            fim.textContent = "Fim das reservas.";
            fim.style.textAlign = "center";
            container.appendChild(fim);
        }
    } else if (sentinel) {
        sentinel.style.display = "block"; // Garante que o sentinel está visível se houver mais itens
    }

  } catch (err) {
    console.error("Erro ao carregar lista:", err);
    if (!append)
      container.innerHTML =
        '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas. Tente novamente.</p>';
    else showGlobalFeedback("Erro ao carregar mais reservas.", "error");
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
  calendarioReservas = new FullCalendar.Calendar(el, {
    locale: ptBrLocale,
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
    initialView: "dayGridMonth",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek,listDay,listMonth",
    },
    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      listWeek: "Lista Sem.",
      listDay: "Lista Dia",
      listMonth: "Lista Mês",
      // list: "Lista", // Generic fallback if specific not found
    },
    events: async (fetchInfo, successCallback, failureCallback) => {
      try {
        // const mesAno = new Date(fetchInfo.start).toISOString().slice(0, 7); // Original logic for mesAno
        // const params = { mesAno }; // Original params

        let params = getUnifiedFilters(); // Get filters from modal

        // FullCalendar's event fetching often relies on start/end dates of the current view
        // The `getUnifiedFilters` provides `periodoInicio` and `periodoFim` if a month is selected in modal.
        // If not, FullCalendar sends its own `fetchInfo.startStr` and `fetchInfo.endStr`.
        // We need to decide priority or how to merge.
        // For now, if modal has a period, it might override FC's default fetch range,
        // or we can use FC's range if modal period is not set.
        // Let's use FC's range by default, and allow modal filters to refine that.
        // The `mesAno` for API might be derived from `fetchInfo.start` if modal period is not set.

        if (!params.periodoInicio && fetchInfo) { // If modal doesn't set a period, use FullCalendar's view range.
            // params.periodoInicio = fetchInfo.startStr;
            // params.periodoFim = fetchInfo.endStr;
             // The existing API for calendar uses 'mesAno'. Let's try to stick to it or adapt.
             // If modal provides mesAno, use it. Otherwise, derive from fetchInfo.
            if (!params.mesAno) {
                 params.mesAno = new Date(fetchInfo.start).toISOString().slice(0, 7);
            }
        }
        // Remove periodInicio/Fim if mesAno is what the API expects for calendar view, to avoid conflict.
        // Or ensure API can handle both. Assuming API prefers mesAno for this calendar view.
        if (params.mesAno) {
            delete params.periodoInicio;
            delete params.periodoFim;
        }


        // Admin-specific filters from the calendar section (these are not in the unified modal yet)
        // These might need to be moved to the modal if they are for general use by admins,
        // or kept if they are truly specific to only the calendar view for admins.
        // For now, keeping them as they are, applied on top of unified filters.
        const adminStatusCal = document.getElementById("filtro-status-reserva-calendario")?.value;
        const adminUnidadeCal = document.getElementById("filtro-unidade-reserva-calendario")?.value;

        if (currentUserRoles.includes("Sindico") || currentUserRoles.includes("Administrador")) {
          if (adminStatusCal) params.status = adminStatusCal; // This could override modal status
          if (adminUnidadeCal) params.unidadeId = adminUnidadeCal;
        }
        // It might be better to have adminStatusCal apply only if params.status is not already set by modal.
        // Example: if (!params.status && adminStatusCal) params.status = adminStatusCal;

        const items = await apiClient.get(
          "/api/v1/app/reservas/agenda", // Endpoint for calendar events
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
}

async function carregarMinhasReservas(page = 1, append = false) {
  if (isLoadingMinhasReservas || (noMoreItemsMinhasReservas && append)) return;
  isLoadingMinhasReservas = true;
  const container = document.getElementById(minhasReservasListContainerId);
  const sentinel = document.getElementById(minhasReservasSentinelId);

  if (!container) {
    console.error("Container de 'Minhas Reservas' não encontrado.");
    isLoadingMinhasReservas = false;
    return;
  }

  if (!append) {
    container.innerHTML = ""; // Limpa resultados anteriores para nova filtragem/primeira página
    noMoreItemsMinhasReservas = false; // Reseta para nova consulta
    currentPageMinhasReservas = 1; // Reseta a página
  }

  let loadingMsg = container.querySelector(".cv-loading-message");
  if (!loadingMsg && !append) { // Adiciona mensagem de carregamento apenas se não existir e for a primeira carga
    loadingMsg = document.createElement("p");
    loadingMsg.className = "cv-loading-message";
    container.appendChild(loadingMsg);
  }
  if(loadingMsg) loadingMsg.textContent = append ? "Carregando mais..." : "Carregando suas reservas...";
  if(loadingMsg) loadingMsg.style.display = "block";

  if (sentinel) sentinel.style.display = "block";


  try {
    let params = getUnifiedFilters(); // Get base filters from modal
    params.pageNumber = page;
    params.pageSize = 10; // Or your desired page size

    // Note: getUnifiedFilters() provides periodoInicio and periodoFim if a month is selected.
    // If no period is set, the API call for "Minhas Reservas" will fetch all user's reservations
    // based on other criteria (espaco, status), across all time, unless the API defaults to a period.
    // This behavior should be confirmed.

    // The old local filters (filtroMinhasEspaco, filtroMinhasStatus, filtroMinhasPeriodo) are IGNORED.

    // const response = await apiClient.get("/api/v1/app/reservas/minhas", params);
    // MOCKING API CALL FOR NOW - Ensure mock data respects unified filters if possible
    console.warn("carregarMinhasReservas: USANDO DADOS MOCKADOS");
    await new Promise(resolve => setTimeout(resolve, 600));
    const mockResponse = { items: [], hasNextPage: false, pageNumber: page, totalPages: page }; // Default empty
    if (page <= 2) { // Simulate 2 pages of data
        for(let i = 0; i < 10; i++) {
            const espaco = espacosComunsList.length ? espacosComunsList[Math.floor(Math.random() * espacosComunsList.length)] : {id: 'mock-esp-1', nome: 'Espaço Mock'};
            mockResponse.items.push({
                id: `minha-res-${page}-${i}`,
                nomeEspacoComum: espaco.nome,
                inicio: new Date(Date.now() - Math.random() * 10 * 24 * 3600 * 1000).toISOString(),
                fim: new Date(Date.now() - (Math.random() * 10 * 24 * 3600 * 1000 - 3600*1000)).toISOString(),
                status: ["Confirmada", "Pendente", "CanceladaPeloUsuario"][Math.floor(Math.random()*3)],
                nomeUnidade: "Minha Unidade",
                nomeUsuarioSolicitante: getUserInfo()?.name || "Eu",
                pertenceAoUsuarioLogado: true,
                espacoComumId: espaco.id,
            });
        }
        mockResponse.hasNextPage = page < 2;
        mockResponse.totalPages = 2;
    }
    const response = mockResponse;
    // FIM DO MOCK

    if(loadingMsg) loadingMsg.style.display = "none";

    let items = [];
    if (response && response.items && Array.isArray(response.items)) {
        items = response.items;
        if (page >= response.totalPages || !response.hasNextPage) {
            noMoreItemsMinhasReservas = true;
        }
    } else if (response && Array.isArray(response)) { // Fallback se a API retornar apenas um array
        items = response;
        if (items.length < params.pageSize) {
            noMoreItemsMinhasReservas = true;
        }
    }


    if (items.length > 0) {
      items.forEach((r) => container.appendChild(renderCardReservaListView(r))); // Reutilizando o renderizador de card
      currentPageMinhasReservas = page;
    } else if (!append && items.length === 0) {
      container.innerHTML = '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada.</p>';
      noMoreItemsMinhasReservas = true;
    } else if (append && items.length === 0) {
      noMoreItemsMinhasReservas = true; // Chegou ao fim
    }

    if (noMoreItemsMinhasReservas && sentinel) {
      sentinel.style.display = "none";
      if (container.children.length > 0 && !container.querySelector('.fim-lista')) {
        const fim = document.createElement("p");
        fim.className = "cv-info-message fim-lista";
        fim.textContent = "Fim das suas reservas.";
        fim.style.textAlign = "center";
        container.appendChild(fim);
      }
    } else if (sentinel) {
      sentinel.style.display = "block";
    }

  } catch (err) {
    console.error("Erro ao carregar 'Minhas Reservas':", err);
    if(loadingMsg) loadingMsg.style.display = "none";
    if (!append) container.innerHTML = '<p class="cv-error-message" style="text-align:center;">Erro ao carregar suas reservas. Tente novamente.</p>';
    else showGlobalFeedback("Erro ao carregar mais reservas.", "error");
    noMoreItemsMinhasReservas = true; // Evita tentativas futuras em caso de erro
    if(sentinel) sentinel.style.display = "none";
  } finally {
    isLoadingMinhasReservas = false;
  }
}

function setupMinhasReservasObserver() {
  const sentinel = document.getElementById(minhasReservasSentinelId);
  if (!sentinel) {
    console.warn("Sentinel da lista 'Minhas Reservas' não encontrado.");
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoadingMinhasReservas && !noMoreItemsMinhasReservas) {
        carregarMinhasReservas(currentPageMinhasReservas + 1, true);
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(sentinel);
}

// --- Unified Filter Logic ---

function getUnifiedFilters() {
  const filters = {
    espacoComumId: filtroEspacoModal.value || null,
    status: filtroStatusModal.value || null,
    // pageNumber and pageSize will be added by the calling data load functions
  };

  const periodoValue = filtroPeriodoModal.value;
  if (periodoValue) {
    const [year, month] = periodoValue.split("-").map(Number);
    filters.periodoInicio = new Date(Date.UTC(year, month - 1, 1)).toISOString(); // First day of the month
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)); // Last day of the selected month
    filters.periodoFim = new Date(Date.UTC(lastDayOfMonth.getFullYear(), lastDayOfMonth.getMonth(), lastDayOfMonth.getDate(), 23, 59, 59, 999)).toISOString();
    filters.mesAno = periodoValue; // YYYY-MM format, useful for FullCalendar's initial visible range or specific API calls
  }
  return filters;
}

function aplicarFiltrosUnificados() {
  // Os filtros são obtidos por getUnifiedFilters() dentro de cada função de carregamento de dados.
  // Apenas precisamos disparar o recarregamento da view ativa.
  filtrosModal.style.display = "none";

  // Sincronizar filtros antigos (visuais) com o modal para consistência, se eles ainda estiverem visíveis.
  // Ou idealmente, remover os filtros antigos da UI. Por ora, vamos apenas logar.
  // console.log("Filtros unificados aplicados:", getUnifiedFilters());
  // document.getElementById("select-espaco-comum-calendario").value = filtroEspacoModal.value;
  // filtroEspacoLista.value = filtroEspacoModal.value;
  // etc. para status e período se existirem nos filtros locais antigos.

  if (contentAgenda.style.display !== "none") {
    // Agenda e Disponibilidade está ativa
    if (calendarioViewContainer.style.display !== "none") {
      // Visão de Calendário está ativa
      calendarioReservas?.refetchEvents();
    }
    if (listViewContainer.style.display !== "none") {
      // Visão de Lista (da Agenda) está ativa
      currentPageListView = 1;
      noMoreItemsListView = false;
      const c = document.getElementById(listViewItemsContainerId);
      if (c) {
        c.innerHTML = ''; // Limpar antes de carregar
        c.dataset.loadedOnce = "false";
      }
      carregarReservasListView(1, false);
    }
  } else if (contentMinhas.style.display !== "none") {
    // Minhas Reservas está ativa
    currentPageMinhasReservas = 1;
    noMoreItemsMinhasReservas = false;
    const c = document.getElementById(minhasReservasListContainerId);
    if (c) c.innerHTML = ''; // Limpar antes de carregar
    carregarMinhasReservas(1, false);
  }
}

function limparFiltrosUnificados() {
  filtroEspacoModal.value = "";
  filtroStatusModal.value = "";
  filtroPeriodoModal.value = "";
  // Após limpar, reaplica para mostrar tudo (ou o default)
  aplicarFiltrosUnificados();
}

function setupFabMenu() {
  const roles = getRoles();
  const actions = [{ label: "Reserva", onClick: openNovaReservaModal }];
  if (roles.includes("Sindico") || roles.includes("Administrador")) {
    actions.push({ label: "Espaço", onClick: openGerenciarEspacoModal });
  }
  initFabMenu(actions, { title: "Nova" });
}
