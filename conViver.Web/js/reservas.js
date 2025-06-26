import { showGlobalFeedback } from "./main.js";
import { requireAuth, getUserInfo, getRoles } from "./auth.js";
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

// List View
let currentPageListView = 1;
let isLoadingListView = false;
let noMoreItemsListView = false;
const listViewItemsContainerId = "list-view-reservas-items";
const listViewSentinelId = "list-view-sentinel";

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

  // Toggle views
  btnViewCalendario?.addEventListener("click", () =>
    toggleReservasView("calendario")
  );
  btnViewLista?.addEventListener("click", () => toggleReservasView("lista"));
  tabAgendaBtn?.addEventListener("click", () => switchTab("agenda"));
  tabMinhasBtn?.addEventListener("click", () => switchTab("minhas"));

  // Filtros da lista
  btnAplicarFiltrosLista?.addEventListener("click", () => {
    currentPageListView = 1;
    noMoreItemsListView = false;
    const c = document.getElementById(listViewItemsContainerId);
    if (c) c.dataset.loadedOnce = "false";
    carregarReservasListView(1, false);
  });

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

  aplicarFiltrosModalButton?.addEventListener("click", () => {
    const val = document.getElementById("filtro-espaco-modal-reservas").value;
    document.getElementById("select-espaco-comum-calendario").value = val;
    filtroEspacoLista.value = val;
    filtrosModal.style.display = "none";
    if (calendarioViewContainer?.style.display !== "none")
      calendarioReservas?.refetchEvents();
    if (listViewContainer?.style.display !== "none") {
      currentPageListView = 1;
      noMoreItemsListView = false;
      const c = document.getElementById(listViewItemsContainerId);
      if (c) c.dataset.loadedOnce = "false";
      carregarReservasListView(1, false);
    }
  });

  btnAplicarFiltrosMinhas?.addEventListener("click", () =>
    carregarMinhasReservas()
  );

  // Inicializa tudo
  await initReservasPage();
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
  initializeFullCalendar();
  setupListViewObserver();
  await carregarMinhasReservas();

  // Define aba e view iniciais
  switchTab("agenda");
  toggleReservasView("calendario");
}

async function carregarEspacosComuns() {
  const selects = [
    document.getElementById("select-espaco-comum-calendario"),
    document.getElementById("modal-reserva-espaco"),
    document.getElementById("filtro-espaco-lista"),
    document.getElementById("filtro-minhas-espaco"),
    document.getElementById("filtro-espaco-modal-reservas"),
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

    // MOCK
    await new Promise((r) => setTimeout(r, 700));
    const mockItems = [];
    const totalPages = 2;
    if (page <= totalPages) {
      for (let i = 0; i < 10; i++) {
        const statusRand = ["Confirmada", "Pendente", "CanceladaPeloUsuario"][
          Math.floor(Math.random() * 3)
        ];
        const esp = espacosComunsList.length
          ? espacosComunsList[
              Math.floor(Math.random() * espacosComunsList.length)
            ]
          : { id: `esp-mock-${i}`, nome: `Espaço Mock ${i + 1}` };
        let itemDate = new Date();
        if (params.periodoInicio && params.periodoFim) {
          const s = new Date(params.periodoInicio),
            e = new Date(params.periodoFim);
          itemDate = new Date(
            s.getTime() + Math.random() * (e.getTime() - s.getTime())
          );
        } else {
          itemDate.setDate(itemDate.getDate() + (i - 5 + (page - 1) * 10));
        }
        mockItems.push({
          id: `mock-${page}-${i}`,
          nomeEspacoComum: esp.nome,
          inicio: itemDate.toISOString(),
          fim: new Date(itemDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          status: params.status || statusRand,
          nomeUnidade: `Unid. ${100 + i}`,
          nomeUsuarioSolicitante: `Morador ${page}-${i}`,
          observacoes:
            statusRand === "Confirmada" ? "Evento de teste mockado" : null,
          pertenceAoUsuarioLogado: Math.random() > 0.5,
          espacoComumId: params.espacoComumId || esp.id,
          unidadeId: `unid-mock-${100 + i}`,
          usuarioId: `user-mock-${page}-${i}`,
          condominioId: `condo-mock-1`,
          dataSolicitacao: new Date(
            itemDate.getTime() - 24 * 60 * 60 * 1000
          ).toISOString(),
          taxaCobrada:
            Math.random() > 0.5 ? (Math.random() * 50).toFixed(2) : null,
          tituloReserva: `Reserva ${esp.nome} - Unid. ${100 + i}`,
        });
      }
    }
    loadingMsg.style.display = "none";

    if (mockItems.length) {
      if (!append) container.dataset.loadedOnce = "true";
      mockItems.forEach((r) =>
        container.appendChild(renderCardReservaListView(r))
      );
      currentPageListView = page;
      if (page >= totalPages) {
        noMoreItemsListView = true;
        if (sentinel) sentinel.style.display = "none";
        const fim = document.createElement("p");
        fim.className = "cv-info-message fim-lista";
        fim.textContent = "Fim das reservas.";
        fim.style.textAlign = "center";
        container.appendChild(fim);
      }
    } else if (!append) {
      container.innerHTML =
        '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada.</p>';
      noMoreItemsListView = true;
      if (sentinel) sentinel.style.display = "none";
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
