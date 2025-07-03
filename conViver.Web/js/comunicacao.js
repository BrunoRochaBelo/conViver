import apiClient from "./apiClient.js";
import { requireAuth, getUserInfo } from "./auth.js";
import {
  showGlobalFeedback,
  showSkeleton,
  hideSkeleton,
  showInlineSpinner,
  createErrorStateElement,
  createEmptyStateElement,
  showModalError,
  clearModalError,
  debugLog,
  openModal,
  closeModal
} from "./main.js";
import { initFabMenu } from "./fabMenu.js";
import { xhrPost } from "./progress.js";

// --- Global state & constants ---
let currentFeedPage = 1;
let isLoadingFeedItems = false;
let noMoreFeedItems = false;
const feedContainerSelector = ".js-avisos";
const feedScrollSentinelId = "notice-scroll-sentinel";
let fetchedFeedItems = [];
let currentSortOrder = "desc";

// --- Helpers for Skeleton ---
function showFeedSkeleton(tabContentId = "content-mural") {
  const tabContentElement = document.getElementById(tabContentId);
  if (!tabContentElement) return;
  showSkeleton(tabContentElement);
}

function hideFeedSkeleton(tabContentId = "content-mural") {
  const tabContentElement = document.getElementById(tabContentId);
  if (!tabContentElement) return;
  hideSkeleton(tabContentElement);
}

function getActiveTabContentId() {
  const activeButton = document.querySelector(".cv-tab-button.active");
  if (activeButton) {
    return "content-" + activeButton.id.split("-")[1];
  }
  return "content-mural";
}

// --- Modal references ---
let criarAvisoModal, formCriarAviso, avisoIdField;
let criarEnqueteModal, formCriarEnquete, enqueteIdField, modalEnqueteTitle, formEnqueteSubmitButton;
let modalEnqueteDetalhe, modalEnqueteDetalheTitulo, modalEnqueteDetalheDescricao, modalEnqueteDetalheOpcoesContainer, modalEnqueteDetalheStatus, modalEnqueteSubmitVotoButton;
let criarChamadoModal, formCriarChamado, chamadoIdFieldModal, modalChamadoTitle, formChamadoSubmitButtonModal;
let modalChamadoDetalhe, modalChamadoDetalheTitulo, modalChamadoDetalheConteudo, modalChamadoDetalheInteracoes, modalChamadoAddCommentSection, modalChamadoCommentText, modalChamadoSubmitCommentButton;
let modalFiltros;
let chamadoStatusModalFormGroup, chamadoCategoriaModalFormGroup;
let criarOcorrenciaModal, formCriarOcorrencia, ocorrenciaTituloInput, ocorrenciaDescricaoInput, ocorrenciaCategoriaSelect, ocorrenciaPrioridadeSelect, ocorrenciaAnexosInput, ocorrenciaAnexosPreviewContainer;

// --- Initialization ---
export async function initialize() {
  requireAuth();

  // Captura referências dos modais e formulários
  criarAvisoModal = document.getElementById("modal-criar-aviso");
  formCriarAviso = document.getElementById("form-criar-aviso");
  avisoIdField = document.getElementById("aviso-id");

  criarEnqueteModal = document.getElementById("modal-criar-enquete");
  formCriarEnquete = document.getElementById("form-criar-enquete");
  enqueteIdField = document.getElementById("enquete-id");
  modalEnqueteTitle = document.getElementById("modal-enquete-title");
  formEnqueteSubmitButton = document.getElementById("form-enquete-submit-button");

  modalEnqueteDetalhe = document.getElementById("modal-enquete-detalhe");
  modalEnqueteDetalheTitulo = document.getElementById("modal-enquete-detalhe-titulo");
  modalEnqueteDetalheDescricao = document.getElementById("modal-enquete-detalhe-descricao");
  modalEnqueteDetalheOpcoesContainer = document.getElementById("modal-enquete-detalhe-opcoes-container");
  modalEnqueteDetalheStatus = document.getElementById("modal-enquete-detalhe-status");
  modalEnqueteSubmitVotoButton = document.getElementById("modal-enquete-submit-voto");

  criarChamadoModal = document.getElementById("modal-criar-chamado");
  formCriarChamado = document.getElementById("form-criar-chamado");
  chamadoIdFieldModal = document.getElementById("chamado-id");
  modalChamadoTitle = document.getElementById("modal-chamado-title");
  formChamadoSubmitButtonModal = document.getElementById("form-chamado-submit-button");

  modalChamadoDetalhe = document.getElementById("modal-chamado-detalhe");
  modalChamadoDetalheTitulo = document.getElementById("modal-chamado-detalhe-titulo");
  modalChamadoDetalheConteudo = document.getElementById("modal-chamado-detalhe-conteudo");
  modalChamadoDetalheInteracoes = document.getElementById("modal-chamado-detalhe-interacoes");
  modalChamadoAddCommentSection = document.getElementById("modal-chamado-add-comment-section");
  modalChamadoCommentText = document.getElementById("modal-chamado-comment-text");
  modalChamadoSubmitCommentButton = document.getElementById("modal-chamado-submit-comment");

  modalFiltros = document.getElementById("modal-filtros");

  chamadoStatusModalFormGroup = document.querySelector("#modal-criar-chamado .js-chamado-status-form-group");
  chamadoCategoriaModalFormGroup = document.querySelector("#modal-criar-chamado .js-chamado-categoria-form-group");

  criarOcorrenciaModal = document.getElementById("modalNovaOcorrencia");
  formCriarOcorrencia = document.getElementById("formNovaOcorrencia");
  ocorrenciaTituloInput = document.getElementById("ocorrenciaTitulo");
  ocorrenciaDescricaoInput = document.getElementById("ocorrenciaDescricao");
  ocorrenciaCategoriaSelect = document.getElementById("ocorrenciaCategoria");
  ocorrenciaPrioridadeSelect = document.getElementById("ocorrenciaPrioridade");
  ocorrenciaAnexosInput = document.getElementById("ocorrenciaAnexos");
  ocorrenciaAnexosPreviewContainer = document.getElementById("anexosPreviewContainer");

  setupTabs();
  await loadInitialFeedItems();
  setupFeedObserver();
  setupFeedContainerClickListener();
  setupFabMenu();
  setupFilterModalAndButton();
  setupSortModalAndButton();
  setupModalEventListeners();
}

if (document.readyState !== "loading") {
  initialize();
} else {
  document.addEventListener("DOMContentLoaded", initialize);
}

// --- Tab System ---
function setupTabs() {
  const tabButtons = document.querySelectorAll(".cv-tab-button");
  const tabContents = document.querySelectorAll(".cv-tab-content");

  const userRoles = getUserRoles();
  const isSindico = userRoles.includes("Sindico") || userRoles.includes("Administrador");
  document.querySelectorAll(".js-sindico-only-message").forEach(msg => {
    msg.style.display = isSindico ? "inline" : "none";
  });

  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetTabContentId = "content-" + button.id.split("-")[1];
      tabContents.forEach(content => content.style.display = "none");
      hideFeedSkeleton(targetTabContentId);
      document.getElementById(targetTabContentId).style.display = "block";

      tabButtons.forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");

      showFeedSkeleton(targetTabContentId);
      if (targetTabContentId !== "content-mural") {
        showFeedSkeleton("content-mural");
      }
      loadInitialFeedItems();
    });
  });

  const initial = document.querySelector(".cv-tab-button.active") || tabButtons[0];
  if (initial) initial.click();
}

// --- Filter Modal ---
function setupFilterModalAndButton() {
  const openFilterButton = document.getElementById("open-filter-modal-button");
  const closeFilterModalButton = document.querySelector(".js-modal-filtros-close");
  const applyFiltersModalButton = document.getElementById("apply-filters-button-modal");
  const clearFiltersModalButton = document.getElementById("clear-filters-button-modal");

  if (openFilterButton && modalFiltros) {
    openFilterButton.addEventListener("click", () => {
      const activeTab = document.querySelector(".cv-tab-button.active")?.id;
      modalFiltros.querySelectorAll("[data-filter-context]").forEach(el => el.style.display = "none");
      if (activeTab === "tab-enquetes") {
        modalFiltros.querySelectorAll('[data-filter-context="enquetes"]').forEach(el => el.style.display = "block");
        modalFiltros.querySelector("h2").textContent = "Filtros de Enquetes";
      } else if (activeTab === "tab-solicitacoes") {
        modalFiltros.querySelectorAll('[data-filter-context="solicitacoes"]').forEach(el => el.style.display = "block");
        modalFiltros.querySelector("h2").textContent = "Filtros de Solicitações";
      } else if (activeTab === "tab-ocorrencias") {
        modalFiltros.querySelectorAll('[data-filter-context="ocorrencias"]').forEach(el => el.style.display = "block");
        modalFiltros.querySelector("h2").textContent = "Filtros de Ocorrências";
      } else {
        modalFiltros.querySelector("h2").textContent = "Filtros do Mural";
      }
      modalFiltros.style.display = "flex";
    });
  }

  if (closeFilterModalButton && modalFiltros) {
    closeFilterModalButton.addEventListener("click", () => {
      modalFiltros.style.display = "none";
    });
  }
  if (modalFiltros) {
    window.addEventListener("click", event => {
      if (event.target === modalFiltros) modalFiltros.style.display = "none";
    });
  }

  if (applyFiltersModalButton) {
    applyFiltersModalButton.addEventListener("click", () => {
      showFeedSkeleton("content-mural");
      loadInitialFeedItems();
      modalFiltros.style.display = "none";

      if (openFilterButton) {
        const hasFilters = Array.from(modalFiltros.querySelectorAll("select, input"))
          .some(el => el.value && el.value !== "");
        openFilterButton.classList.toggle("has-indicator", hasFilters);
      }
    });
  }

  if (clearFiltersModalButton) {
    clearFiltersModalButton.addEventListener("click", () => {
      ["category-filter-modal", "period-filter-modal",
       "enquete-author-filter", "enquete-status-filter",
       "solicitacao-author-filter", "solicitacao-status-filter",
       "ocorrencia-author-filter", "ocorrencia-status-filter"]
        .forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
      showFeedSkeleton("content-mural");
      loadInitialFeedItems();
      modalFiltros.style.display = "none";
      const openFilterButton = document.getElementById("open-filter-modal-button");
      if (openFilterButton) openFilterButton.classList.remove("has-indicator");
    });
  }
}

// --- Sort Modal ---
function setupSortModalAndButton() {
  const openSortButton = document.getElementById("open-sort-button");
  const sortModal = document.getElementById("modal-sort");
  const closeSortButtons = document.querySelectorAll(".js-modal-sort-close");
  const applySortButton = document.getElementById("apply-sort-button");
  const clearSortButton = document.getElementById("clear-sort-button-modal");
  const sortSelect = document.getElementById("sort-order-select");

  if (openSortButton && sortModal) {
    openSortButton.addEventListener("click", () => {
      if (sortSelect) sortSelect.value = currentSortOrder;
      openModal(sortModal);
      openSortButton.classList.add("rotated");
    });
  }

  closeSortButtons.forEach(btn =>
    btn.addEventListener("click", () => {
      closeModal(sortModal);
      openSortButton.classList.remove("rotated");
    })
  );

  window.addEventListener("click", e => {
    if (e.target === sortModal) {
      closeModal(sortModal);
      openSortButton.classList.remove("rotated");
    }
  });

  if (applySortButton && sortSelect) {
    applySortButton.addEventListener("click", () => {
      currentSortOrder = sortSelect.value;
      closeModal(sortModal);
      openSortButton.classList.toggle("has-indicator", currentSortOrder !== "desc");
      showFeedSkeleton("content-mural");
      loadInitialFeedItems();
    });
  }

  if (clearSortButton && sortSelect) {
    clearSortButton.addEventListener("click", () => {
      sortSelect.value = "desc";
      currentSortOrder = "desc";
      closeModal(sortModal);
      openSortButton.classList.remove("rotated", "has-indicator");
      showFeedSkeleton("content-mural");
      loadInitialFeedItems();
    });
  }
}

// --- FAB Menu ---
function setupFabMenu() {
  const roles = getUserRoles();
  const normalizedRoles = normalizeRoles(roles);
  const isSindico = normalizedRoles.includes("Sindico") || normalizedRoles.includes("Administrador");

  const actions = [];
  if (isSindico) {
    actions.push({ label: "Criar Aviso", onClick: openCriarAvisoModal });
    actions.push({ label: "Criar Enquete", onClick: openCreateEnqueteModal });
  }
  actions.push({ label: "Criar Solicitação", onClick: openCreateChamadoModal });
  if (normalizedRoles.includes("Morador") || isSindico) {
    actions.push({ label: "Criar Ocorrência", onClick: openCreateOcorrenciaModal });
  }

  initFabMenu(actions);
}

function getUserRoles() {
  const userInfo = getUserInfo();
  if (userInfo && userInfo.roles) return userInfo.roles;
  return ["Condomino"];
}

function normalizeRoles(roles) {
  return roles.map(r => (r === "Condomino" || r === "Inquilino" ? "Morador" : r));
}

// --- Feed Loading & Rendering ---
async function loadInitialFeedItems() {
  currentFeedPage = 1;
  noMoreFeedItems = false;
  isLoadingFeedItems = false;

  const container = document.querySelector(feedContainerSelector);
  if (!container) return;

  let sentinel = document.getElementById(feedScrollSentinelId);
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = feedScrollSentinelId;
    sentinel.style.height = "10px";
    container.appendChild(sentinel);
  }
  sentinel.style.display = "block";

  showFeedSkeleton("content-mural");
  await fetchAndDisplayFeedItems(currentFeedPage, false);
}

function setupFeedObserver() {
  const sentinel = document.getElementById(feedScrollSentinelId);
  if (!sentinel) return;
  const observer = new IntersectionObserver(async entries => {
    if (entries[0].isIntersecting && !isLoadingFeedItems && !noMoreFeedItems) {
      currentFeedPage++;
      await fetchAndDisplayFeedItems(currentFeedPage, true);
    }
  }, { root: null, threshold: 0.1 });
  observer.observe(sentinel);
}

async function fetchAndDisplayFeedItems(page, append = false) {
  if (isLoadingFeedItems) return;
  isLoadingFeedItems = true;

  const muralFeedContainer = document.querySelector("#content-mural " + feedContainerSelector);
  if (!muralFeedContainer) {
    hideFeedSkeleton("content-mural");
    isLoadingFeedItems = false;
    return;
  }

  const sentinelElement = document.getElementById(feedScrollSentinelId);
  if (!append) {
    showFeedSkeleton("content-mural");
    muralFeedContainer.querySelectorAll(`.feed-item:not(.feed-skeleton-item)`).forEach(el => el.remove());
    fetchedFeedItems = fetchedFeedItems.filter(fi => fi.prioridadeOrdenacao === 0);
    muralFeedContainer.querySelectorAll(".cv-error-state, .cv-empty-state").forEach(el => el.remove());
  } else {
    if (sentinelElement) {
      const spinner = document.createElement("span");
      spinner.className = "inline-spinner";
      sentinelElement.insertAdjacentElement("beforebegin", spinner);
    }
  }
  sentinelElement.style.display = "block";

  // Read filters
  const categoriaFilter = document.getElementById("category-filter-modal")?.value || null;
  const periodoFilterInput = document.getElementById("period-filter-modal")?.value;
  let periodoInicio = null, periodoFim = null;
  if (periodoFilterInput) {
    const [y,m] = periodoFilterInput.split("-");
    const year = parseInt(y), month = parseInt(m);
    if (!isNaN(year) && !isNaN(month)) {
      periodoInicio = new Date(Date.UTC(year, month-1, 1)).toISOString();
      periodoFim    = new Date(Date.UTC(year, month, 0,23,59,59,999)).toISOString();
    }
  }
  const activeTabId = document.querySelector(".cv-tab-button.active")?.id;
  let autorFilter = null, statusFilter = null;
  if (activeTabId === "tab-enquetes") {
    autorFilter = document.getElementById("enquete-author-filter")?.value;
    statusFilter = document.getElementById("enquete-status-filter")?.value;
  } else if (activeTabId === "tab-solicitacoes") {
    autorFilter = document.getElementById("solicitacao-author-filter")?.value;
    statusFilter = document.getElementById("solicitacao-status-filter")?.value;
  } else if (activeTabId === "tab-ocorrencias") {
    autorFilter = document.getElementById("ocorrencia-author-filter")?.value;
    statusFilter = document.getElementById("ocorrencia-status-filter")?.value;
  }

  try {
    const response = await apiClient.get("/api/v1/feed", {
      pageNumber: page,
      pageSize: 10,
      categoria: categoriaFilter,
      periodoInicio,
      periodoFim,
      status: statusFilter,
      minhas: autorFilter === "minhas"
    });
    const items = response || [];

    hideFeedSkeleton("content-mural");
    if (items.length > 0) {
      items.forEach(item => {
        if (!append && fetchedFeedItems.some(fi => fi.id === item.id && fi.itemType === item.itemType)) return;
        const el = renderFeedItem(item);
        if (sentinelElement) muralFeedContainer.insertBefore(el, sentinelElement);
        else muralFeedContainer.appendChild(el);
        if (!fetchedFeedItems.some(fi => fi.id === item.id && fi.itemType === item.itemType)) {
          fetchedFeedItems.push(item);
        }
      });
      sortAndInsertAll(muralFeedContainer, sentinelElement);
    } else {
      if (page === 1 && !append) {
        const existing = muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)").length;
        if (existing === 0) {
          const isSindico = getUserRoles().some(r => ["Sindico","Administrador"].includes(r));
          const hasFilters = !!categoriaFilter || !!periodoFilterInput;
          const cfg = {
            title: hasFilters ? "Nenhum Item Encontrado" : "Mural Vazio",
            description: hasFilters
              ? "Tente ajustar seus filtros ou verificar mais tarde."
              : "Ainda não há itens no mural.",
            actionButton: hasFilters
              ? {
                  text: "Limpar Filtros",
                  onClick: () => document.getElementById("clear-filters-button-modal").click(),
                  classes: ["cv-button--secondary"]
                }
              : isSindico
              ? { text: "Criar Aviso", onClick: openCriarAvisoModal, classes: ["cv-button--primary"] }
              : null
          };
          const emptyEl = createEmptyStateElement(cfg);
          if (sentinelElement) muralFeedContainer.insertBefore(emptyEl, sentinelElement);
          else muralFeedContainer.appendChild(emptyEl);
        }
      }
      noMoreFeedItems = true;
      sentinelElement.style.display = "none";
    }

    setupFeedItemActionButtons();

  } catch (error) {
    console.error("Erro ao buscar feed:", error);
    hideFeedSkeleton("content-mural");

    const targetTab = getActiveTabContentId();
    const container = targetTab === "content-mural"
      ? document.querySelector("#content-mural " + feedContainerSelector)
      : document.getElementById(targetTab);

    if (container) {
      const errorState = createErrorStateElement({
        title: "Falha ao Carregar",
        message: error.message || "Verifique sua conexão e tente novamente.",
        retryButton: {
          text: "Tentar Novamente",
          onClick: () => {
            errorState.remove();
            loadInitialFeedItems();
          }
        }
      });
      container.appendChild(errorState);
    }
  } finally {
    isLoadingFeedItems = false;
  }
}

function sortAndInsertAll(container, sentinel) {
  const items = Array.from(container.querySelectorAll(".feed-item:not(.feed-skeleton-item)"));
  items.sort((a,b) => {
    const ia = fetchedFeedItems.find(fi => fi.id.toString() === a.dataset.itemId && fi.itemType === a.dataset.itemType) || {};
    const ib = fetchedFeedItems.find(fi => fi.id.toString() === b.dataset.itemId && fi.itemType === b.dataset.itemType) || {};
    if ((ia.prioridadeOrdenacao||1) !== (ib.prioridadeOrdenacao||1)) {
      return (ia.prioridadeOrdenacao||1) - (ib.prioridadeOrdenacao||1);
    }
    const da = new Date(ia.dataHoraPrincipal||0);
    const db = new Date(ib.dataHoraPrincipal||0);
    return currentSortOrder === "desc" ? db - da : da - db;
  });
  items.forEach(item => container.insertBefore(item, sentinel));
}

function renderFeedItem(item) {
  const card = document.createElement("article");
  card.className = `cv-card feed-item prio-${item.prioridadeOrdenacao}`;
  card.dataset.itemId = item.id;
  card.dataset.itemType = item.itemType;
  let html = "";
  // Imagem
  if (item.imagemUrl) {
    const placeholder = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    html += `
      <div class="feed-item__image-container">
        <img src="${placeholder}" data-src="${item.imagemUrl}" alt="${item.titulo}" class="feed-item__image" loading="lazy">
      </div>`;
  }
  const pin = item.prioridadeOrdenacao === 0 ? "📌 " : "";
  html += `
    <h3 class="feed-item__title">${pin}${item.titulo}</h3>
    <p class="feed-item__summary">${item.resumo || ""}</p>
    <div class="feed-item__meta">
      <span class="feed-item__date">${new Date(item.dataHoraPrincipal).toLocaleString()}</span>
      ${item.status ? `<span class="feed-item__status">${item.status}</span>` : ""}
    </div>
    <div class="feed-item__actions">
      <button class="cv-button-link js-view-item-detail" data-item-id="${item.id}" data-item-type="${item.itemType}">Ver Detalhes</button>
    </div>`;
  card.innerHTML = html;
  return card;
}

function setupFeedContainerClickListener() {
  const container = document.querySelector(feedContainerSelector);
  if (container) {
    container.addEventListener("click", handleFeedItemClick);
  }
}

async function handleFeedItemClick(event) {
  const btn = event.target;
  const card = btn.closest(".feed-item");
  if (!card) return;
  const itemId = card.dataset.itemId;
  const itemType = card.dataset.itemType;
  if (btn.classList.contains("js-edit-feed-item")) {
    openEditFeedItemModal(itemType, itemId);
  } else if (btn.classList.contains("js-delete-feed-item")) {
    if (confirm("Deseja realmente excluir?")) {
      if (itemType === "Aviso") await handleDeleteAviso(itemId);
    }
  } else if (btn.classList.contains("js-end-enquete-item")) {
    if (confirm("Encerrar enquete?")) await handleEndEnquete(itemId);
  } else if (btn.classList.contains("js-generate-ata-enquete-item")) {
    await handleGenerateAtaEnquete(itemId);
  } else if (btn.classList.contains("js-view-item-detail")) {
    if (itemType === "Enquete") handleEnqueteClick(itemId);
    else if (["Chamado","Ocorrencia","OrdemServico"].includes(itemType)) handleChamadoClick(itemId, null, itemType);
    else if (itemType === "Documento") handleDocumentoClick(itemId);
    else if (itemType === "Reserva") handleReservaClick(itemId);
    else if (itemType === "Encomenda") handleEncomendaClick(itemId);
    else if (itemType === "BoletoLembrete") handleBoletoLembreteClick(itemId);
  }
}

// --- Feed Item Actions ---
function setupFeedItemActionButtons() {
  const isSindico = getUserRoles().some(r => ["Sindico","Administrador"].includes(r));

  document.querySelectorAll(".js-edit-feed-item").forEach(btn => {
    btn.style.display = isSindico ? "inline-block" : "none";
  });
  document.querySelectorAll(".js-delete-feed-item").forEach(btn => {
    btn.style.display = isSindico ? "inline-block" : "none";
  });
  document.querySelectorAll(".js-end-enquete-item").forEach(btn => {
    btn.style.display = isSindico ? "inline-block" : "none";
  });
  document.querySelectorAll(".js-generate-ata-enquete-item").forEach(btn => {
    btn.style.display = isSindico ? "inline-block" : "none";
  });
}

async function handleDeleteAviso(itemId) {
  const card = document.querySelector(`${feedContainerSelector} .feed-item[data-item-id="${itemId}"]`);
  if (card) card.style.display = "none";
  try {
    await apiClient.delete(`/api/v1/avisos/syndic/avisos/${itemId}`);
    showGlobalFeedback("Aviso excluído!", "success", 2500);
    fetchedFeedItems = fetchedFeedItems.filter(fi => fi.id.toString() !== itemId.toString());
    if (card) card.remove();
  } catch (err) {
    console.error("Erro ao excluir aviso:", err);
    if (card) card.style.display = "";
    showGlobalFeedback("Falha ao excluir.", "error");
  }
}

// --- Enquete Handlers ---
let currentEnqueteId = null;

async function handleEnqueteClick(itemId) {
  currentEnqueteId = itemId;
  if (!modalEnqueteDetalhe) return;
  modalEnqueteDetalheOpcoesContainer.innerHTML = `<p class="cv-loading-message"><span class="spinner spinner-small"></span> Carregando...</p>`;
  modalEnqueteDetalheStatus.innerHTML = "";
  modalEnqueteSubmitVotoButton.style.display = "none";
  openModal(modalEnqueteDetalhe);

  try {
    const enquete = await apiClient.get(`/api/v1/votacoes/app/votacoes/${itemId}`);
    if (!enquete) throw new Error("Enquete não encontrada.");
    modalEnqueteDetalheTitulo.textContent = enquete.titulo;
    modalEnqueteDetalheDescricao.innerHTML = enquete.descricao
      ? `<p>${enquete.descricao.replace(/\n/g, "<br>")}</p>`
      : "<p><em>Sem descrição.</em></p>";

    if (enquete.status === "Aberta" && !enquete.usuarioJaVotou) {
      renderOpcoesDeVoto(enquete.opcoes);
      modalEnqueteSubmitVotoButton.style.display = "block";
      modalEnqueteSubmitVotoButton.onclick = () => submitVoto(itemId);
      modalEnqueteDetalheStatus.innerHTML = `<p><strong>Status:</strong> Aberta até ${enquete.dataFim ? new Date(enquete.dataFim).toLocaleString() : "Não definido"}</p>`;
    } else {
      renderResultadosEnquete(enquete.opcoes, enquete.status, enquete.usuarioJaVotou, enquete.dataFim);
    }
  } catch (err) {
    console.error("Erro ao carregar enquete:", err);
    const errorState = createErrorStateElement({
      title: "Erro ao Carregar",
      message: err.message || "Falha ao obter enquete.",
      retryButton: {
        text: "Tentar Novamente",
        onClick: () => handleEnqueteClick(itemId)
      }
    });
    modalEnqueteDetalheOpcoesContainer.innerHTML = "";
    modalEnqueteDetalheOpcoesContainer.appendChild(errorState);
  }
}

function renderOpcoesDeVoto(opcoes) {
  let html = '<h4>Escolha uma opção:</h4><form id="form-votar-enquete" class="cv-form">';
  opcoes.forEach(opt => {
    html += `
      <div class="cv-form-group">
        <input type="radio" name="opcaoVoto" value="${opt.id}" id="opcao-${opt.id}" class="cv-input-radio">
        <label for="opcao-${opt.id}">${opt.descricao}</label>
      </div>`;
  });
  html += "</form>";
  modalEnqueteDetalheOpcoesContainer.innerHTML = html;
}

function renderResultadosEnquete(opcoes, status, usuarioJaVotou, dataFim) {
  let html = "<h4>Resultados:</h4>";
  const total = opcoes.reduce((s,o) => s + o.quantidadeVotos, 0);
  if (total === 0 && status === "Aberta") {
    html += "<p>Ainda não há votos.</p>";
    if (usuarioJaVotou) html += '<p class="poll-status voted">Você já votou.</p>';
  } else {
    opcoes.forEach(opt => {
      const pct = total>0 ? ((opt.quantidadeVotos/total)*100).toFixed(1) : 0;
      html += `
        <div class="poll-result-item">
          <span class="poll-result-option-text">${opt.descricao}: ${opt.quantidadeVotos} voto(s)</span>
          <div class="poll-result-bar-container">
            <div class="poll-result-bar" style="width:${pct}%;">
              ${pct}%
            </div>
          </div>
        </div>`;
    });
  }
  modalEnqueteDetalheOpcoesContainer.innerHTML = html;
  let statusTxt = `<strong>Status:</strong> ${status}.`;
  if (status === "Aberta" && usuarioJaVotou) statusTxt += ' <span class="poll-status voted">Você já votou.</span>';
  if (!status === "Aberta" && dataFim) statusTxt += ` <p>Encerrada em ${new Date(dataFim).toLocaleString()}</p>`;
  modalEnqueteDetalheStatus.innerHTML = `<p>${statusTxt}</p>`;
}

async function submitVoto(enqueteId) {
  const form = document.getElementById("form-votar-enquete");
  const submitButton = document.getElementById("modal-enquete-submit-voto");
  const originalText = submitButton.innerHTML;
  clearModalError(modalEnqueteDetalhe);

  const selected = form.querySelector('input[name="opcaoVoto"]:checked');
  if (!selected) {
    showModalError(modalEnqueteDetalhe, "Selecione uma opção.");
    return;
  }
  const opcaoId = selected.value;

  submitButton.disabled = true;
  submitButton.innerHTML = 'Registrando... <span class="inline-spinner"></span>';
  const originalHTML = modalEnqueteDetalheOpcoesContainer.innerHTML;
  modalEnqueteDetalheOpcoesContainer.innerHTML = "<p>Registrando seu voto...</p>";

  try {
    await apiClient.post(`/api/v1/votacoes/app/votacoes/${enqueteId}/votar`, { OpcaoId: opcaoId });
    showGlobalFeedback("Voto registrado!", "success", 2000);
    await handleEnqueteClick(enqueteId);
  } catch (err) {
    console.error("Erro ao votar:", err);
    modalEnqueteDetalheOpcoesContainer.innerHTML = originalHTML;
    showModalError(modalEnqueteDetalhe, err.message || "Falha ao votar.");
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
  }
}

// --- Chamado/Ocorrência Handlers ---
async function handleChamadoClick(itemId, _, itemType = "Chamado") {
  if (!modalChamadoDetalhe) return;
  modalChamadoDetalheConteudo.innerHTML = `<p class="cv-loading-message"><span class="spinner spinner-small"></span> Carregando...</p>`;
  modalChamadoDetalheInteracoes.innerHTML = "";
  closeModal(modalChamadoDetalhe); // reset
  openModal(modalChamadoDetalhe);

  const endpointMap = {
    Chamado: `/api/v1/chamados/app/chamados/${itemId}`,
    Ocorrencia: `/api/v1/ocorrencias/app/ocorrencias/${itemId}`,
    OrdemServico: `/api/v1/ordensservico/app/ordensservico/${itemId}`
  };
  const endpoint = endpointMap[itemType];
  if (!endpoint) {
    showGlobalFeedback(`Detalhes para ${itemType} não suportados.`, "error");
    closeModal(modalChamadoDetalhe);
    return;
  }

  try {
    const data = await apiClient.get(endpoint);
    if (!data) throw new Error("Item não encontrado.");
    modalChamadoDetalheTitulo.textContent = data.titulo || `Detalhes de ${itemType}`;
    renderDetalhesGenerico(data, itemType);

    const isSindico = getUserRoles().some(r => ["Sindico","Administrador"].includes(r));
    const sindicoSection = document.getElementById("sindico-chamado-update-section");
    const submitSindicoBtn = document.getElementById("modal-chamado-submit-sindico-update");
    if (isSindico && itemType === "Chamado" && sindicoSection && submitSindicoBtn) {
      sindicoSection.style.display = "block";
      document.getElementById("modal-chamado-status-select").value = data.status || "Aberto";
      document.getElementById("modal-chamado-resposta-textarea").value = data.respostaDoSindico || "";
      submitSindicoBtn.style.display = "block";
      submitSindicoBtn.onclick = () => submitChamadoUpdateBySindico(itemId);
    }
  } catch (err) {
    console.error("Erro ao carregar detalhe:", err);
    const errorState = createErrorStateElement({
      title: "Erro ao Carregar",
      message: err.message || "Falha na consulta.",
      retryButton: {
        text: "Tentar Novamente",
        onClick: () => handleChamadoClick(itemId, null, itemType)
      }
    });
    modalChamadoDetalheConteudo.innerHTML = "";
    modalChamadoDetalheConteudo.appendChild(errorState);
  }
}

function renderDetalhesGenerico(itemData, itemType) {
  const dataA = itemData.dataAbertura || itemData.dataHoraPrincipal || itemData.criadoEm;
  const dataF = itemData.dataResolucao || itemData.concluidoEm || itemData.dataFim;
  let html = `<p><strong>Título:</strong> ${itemData.titulo || "N/A"}</p>`;
  if (itemData.descricao) html += `<p><strong>Descrição:</strong><br>${itemData.descricao}</p>`;
  if (itemData.status) html += `<p><strong>Status:</strong> ${itemData.status}</p>`;
  if (dataA) html += `<p><strong>Abertura:</strong> ${new Date(dataA).toLocaleString()}</p>`;
  if (dataF) html += `<p><strong>Conclusão:</strong> ${new Date(dataF).toLocaleString()}</p>`;
  if (itemType === "Chamado" && itemData.respostaDoSindico) {
    html += `<p><strong>Resposta Síndico:</strong><br>${itemData.respostaDoSindico}</p>`;
  }
  if (itemData.fotos && itemData.fotos.length) {
    html += `<p><strong>Fotos:</strong></p><div class="item-photos">`;
    itemData.fotos.forEach(f => {
      html += `<img src="${f}" alt="Foto" style="max-width:100px;margin:5px;border:1px solid#ddd" loading="lazy">`;
    });
    html += `</div>`;
  }
  modalChamadoDetalheConteudo.innerHTML = html;
}

async function submitChamadoUpdateBySindico(chamadoId) {
  const statusSelect = document.getElementById("modal-chamado-status-select");
  const respostaTextarea = document.getElementById("modal-chamado-resposta-textarea");
  const btn = document.getElementById("modal-chamado-submit-sindico-update");
  const originalText = btn.innerHTML;
  clearModalError(modalChamadoDetalhe);

  if (!statusSelect || !respostaTextarea) {
    showModalError(modalChamadoDetalhe, "Formulário incompleto.");
    return;
  }
  const status = statusSelect.value;
  const resposta = respostaTextarea.value.trim();
  if (!status) {
    showModalError(modalChamadoDetalhe, "Status obrigatório.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = 'Salvando... <span class="inline-spinner"></span>';
  try {
    await apiClient.put(`/api/v1/chamados/syndic/chamados/${chamadoId}`, {
      status,
      respostaDoSindico: resposta
    });
    closeModal(modalChamadoDetalhe);
    await loadInitialFeedItems();
    showGlobalFeedback("Chamado atualizado!", "success", 2500);
  } catch (err) {
    console.error("Erro ao atualizar chamado:", err);
    showModalError(modalChamadoDetalhe, err.message || "Falha ao atualizar.");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// --- Documento / Reserva / Encomenda / Boleto click handlers ---
function handleDocumentoClick(itemId) {
  const item = fetchedFeedItems.find(i => i.id.toString() === itemId && i.itemType === "Documento");
  if (item && item.urlDestino) window.open(item.urlDestino, "_blank");
  else showGlobalFeedback("Link não disponível.", "warning");
}
function handleReservaClick(itemId) {
  showGlobalFeedback("Detalhes de reserva em desenvolvimento.", "info", 3000);
}
function handleEncomendaClick(itemId) {
  showGlobalFeedback("Detalhes de encomenda em desenvolvimento.", "info", 3000);
}
function handleBoletoLembreteClick(itemId) {
  const item = fetchedFeedItems.find(i => i.id.toString() === itemId && i.itemType === "BoletoLembrete");
  if (item && item.urlDestino) window.open(item.urlDestino, "_blank");
  else showGlobalFeedback("Link não disponível.", "warning");
}

// --- Create / Edit Modals ---
function openCriarAvisoModal() {
  formCriarAviso.reset();
  avisoIdField.value = "";
  criarAvisoModal.querySelector("h2").textContent = "Criar Novo Aviso";
  formCriarAviso.querySelector('button[type="submit"]').textContent = "Salvar";
  const imgPreview = document.getElementById("aviso-imagem-preview");
  if (imgPreview) { imgPreview.style.display = "none"; imgPreview.src = "#"; }
  document.getElementById("aviso-imagem").value = "";
  openModal(criarAvisoModal);
}

function openEditFeedItemModal(itemType, itemId) {
  if (itemType !== "Aviso") {
    showGlobalFeedback(`Edição de ${itemType} ainda não disponível.`, "info");
    return;
  }
  const data = fetchedFeedItems.find(i => i.id.toString() === itemId && i.itemType === "Aviso");
  if (!data || !data.detalhesAdicionais) {
    showGlobalFeedback("Dados para edição não encontrados.", "error");
    return;
  }
  formCriarAviso.reset();
  avisoIdField.value = data.id;
  document.getElementById("aviso-titulo").value = data.titulo || "";
  document.getElementById("aviso-corpo").value = data.detalhesAdicionais.corpo || "";
  const sel = document.getElementById("aviso-categorias");
  Array.from(sel.options).forEach(o => o.selected = false);
  if (data.categoria) {
    const opt = Array.from(sel.options).find(o => o.value === data.categoria);
    if (opt) opt.selected = true;
  }
  criarAvisoModal.querySelector("h2").textContent = "Editar Aviso";
  formCriarAviso.querySelector('button[type="submit"]').textContent = "Salvar";
  openModal(criarAvisoModal);
}

function closeCriarAvisoModal() {
  closeModal(criarAvisoModal);
}

function setupModalEventListeners() {
  // Aviso
  if (criarAvisoModal) {
    document.querySelectorAll(".js-modal-criar-aviso-close").forEach(btn => btn.addEventListener("click", closeCriarAvisoModal));
    window.addEventListener("click", e => { if (e.target === criarAvisoModal) closeCriarAvisoModal(); });
    formCriarAviso.addEventListener("submit", async e => {
      e.preventDefault();
      const submitBtn = formCriarAviso.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      const isEdit = !!avisoIdField.value;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `${isEdit ? 'Salvando' : 'Criando'}... <span class="inline-spinner"></span>`;
      clearModalError(criarAvisoModal);
      const fd = new FormData(formCriarAviso);
      const titulo = fd.get("titulo");
      const corpo = fd.get("corpo");
      const cats = Array.from(document.getElementById("aviso-categorias").selectedOptions).map(o => o.value);
      let cat = "Comunicados Gerais";
      if (cats.includes("urgente")) cat = "urgente";
      else if (cats.length) cat = cats[0];
      try {
        if (isEdit) {
          await apiClient.put(`/api/v1/avisos/syndic/avisos/${avisoIdField.value}`, { titulo, corpo, categoria: cat });
          showGlobalFeedback("Aviso atualizado!", "success", 2500);
        } else {
          await apiClient.post("/api/v1/avisos/syndic/avisos", { titulo, corpo, categoria: cat });
          showGlobalFeedback("Aviso criado!", "success", 2500);
        }
        closeCriarAvisoModal();
        await loadInitialFeedItems();
      } catch (err) {
        console.error("Erro ao salvar aviso:", err);
        showModalError(criarAvisoModal, err.detalhesValidacao || err.message || "Falha ao salvar.");
      } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
      }
    });
  }

  // Enquete Detalhe
  if (modalEnqueteDetalhe) {
    modalEnqueteDetalhe.querySelectorAll(".js-modal-enquete-detalhe-close").forEach(b => b.addEventListener("click", () => closeModal(modalEnqueteDetalhe)));
    window.addEventListener("click", e => { if (e.target === modalEnqueteDetalhe) closeModal(modalEnqueteDetalhe); });
  }

  // Chamado Detalhe
  if (modalChamadoDetalhe) {
    modalChamadoDetalhe.querySelectorAll(".js-modal-chamado-detalhe-close").forEach(b => b.addEventListener("click", () => closeModal(modalChamadoDetalhe)));
    window.addEventListener("click", e => { if (e.target === modalChamadoDetalhe) closeModal(modalChamadoDetalhe); });
  }

  // Criar Enquete
  if (criarEnqueteModal) {
    document.querySelectorAll(".js-modal-criar-enquete-close").forEach(b => b.addEventListener("click", () => closeModal(criarEnqueteModal)));
    window.addEventListener("click", e => { if (e.target === criarEnqueteModal) closeModal(criarEnqueteModal); });
    formCriarEnquete.addEventListener("submit", async e => {
      e.preventDefault();
      const submitBtn = formCriarEnquete.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      const isEdit = !!enqueteIdField.value;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `${isEdit ? 'Salvando' : 'Criando'}... <span class="inline-spinner"></span>`;
      clearModalError(criarEnqueteModal);

      const pergunta = document.getElementById("enquete-pergunta").value.trim();
      const opcoesTxt = document.getElementById("enquete-opcoes").value;
      const prazo = document.getElementById("enquete-prazo").value;
      const tipo = document.getElementById("enquete-tipo").value;

      if (!pergunta) {
        showModalError(criarEnqueteModal, "Título obrigatório.");
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
        return;
      }
      const opcoesDto = opcoesTxt.split("\n").map(s => s.trim()).filter(s => s).map(d => ({ Descricao: d }));
      if (opcoesDto.length < 2) {
        showModalError(criarEnqueteModal, "Mínimo de 2 opções.");
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
        return;
      }

      const payload = {
        Titulo: pergunta,
        Descricao: `Tipo: ${tipo}`,
        DataFim: prazo || null,
        Opcoes: opcoesDto
      };

      try {
        if (isEdit) {
          debugLog("Edição de enquete não suportada.");
          showGlobalFeedback("Edição de enquete não disponível.", "warning");
        } else {
          await apiClient.post("/api/v1/votacoes/syndic/votacoes", payload);
          showGlobalFeedback("Enquete criada!", "success", 2500);
        }
        closeModal(criarEnqueteModal);
        formCriarEnquete.reset();
        await loadInitialFeedItems();
      } catch (err) {
        console.error("Erro na enquete:", err);
        showModalError(criarEnqueteModal, err.detalhesValidacao || err.message || "Falha.");
      } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
      }
    });
  }

  // Criar Chamado
  if (criarChamadoModal) {
    document.querySelectorAll(".js-modal-criar-chamado-close").forEach(b => b.addEventListener("click", () => closeModal(criarChamadoModal)));
    window.addEventListener("click", e => { if (e.target === criarChamadoModal) closeModal(criarChamadoModal); });
    formCriarChamado.addEventListener("submit", async e => {
      e.preventDefault();
      const submitBtn = formCriarChamado.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      const isEdit = !!chamadoIdFieldModal.value;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `${isEdit ? 'Salvando' : 'Enviando'}... <span class="inline-spinner"></span>`;
      clearModalError(criarChamadoModal);

      const data = {
        titulo: document.getElementById("chamado-titulo-modal").value.trim(),
        descricao: document.getElementById("chamado-descricao-modal").value.trim(),
        categoria: document.getElementById("chamado-categoria-modal").value
      };

      try {
        if (!data.titulo || !data.descricao || !data.categoria) {
          throw new Error("Preencha todos os campos.");
        }
        await apiClient.post("/api/v1/chamados/app/chamados", data);
        showGlobalFeedback("Solicitação enviada!", "success", 2500);
        closeModal(criarChamadoModal);
        formCriarChamado.reset();
        await loadInitialFeedItems();
      } catch (err) {
        console.error("Erro no chamado:", err);
        showModalError(criarChamadoModal, err.message || "Falha.");
      } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
      }
    });
  }

  // Criar Ocorrência
  if (criarOcorrenciaModal) {
    document.querySelectorAll(".js-modal-criar-ocorrencia-close").forEach(b => b.addEventListener("click", () => closeModal(criarOcorrenciaModal)));
    window.addEventListener("click", e => { if (e.target === criarOcorrenciaModal) closeModal(criarOcorrenciaModal); });
    formCriarOcorrencia.addEventListener("submit", async e => {
      e.preventDefault();
      const submitBtn = formCriarOcorrencia.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando... <span class="inline-spinner"></span>';
      clearModalError(criarOcorrenciaModal);
      try {
        await handleCreateOcorrencia();
      } catch {
        // Error já tratado em handleCreateOcorrencia
      } finally {
        submitBtn.innerHTML = origText;
        submitBtn.disabled = false;
      }
    });
  }
}

// --- Create Ocorrência Implementation ---
async function handleCreateOcorrencia() {
  const titulo = ocorrenciaTituloInput.value.trim();
  const descricao = ocorrenciaDescricaoInput.value.trim();
  const categoria = ocorrenciaCategoriaSelect.value;
  const prioridade = ocorrenciaPrioridadeSelect.value || "NORMAL";

  if (!titulo || !descricao || !categoria) {
    showModalError(criarOcorrenciaModal, "Título, descrição e categoria obrigatórios.");
    throw new Error("Validação");
  }

  const formData = new FormData();
  formData.append("titulo", titulo);
  formData.append("descricao", descricao);
  formData.append("categoria", categoria);
  formData.append("prioridade", prioridade);
  Array.from(ocorrenciaAnexosInput.files).forEach(f => formData.append("anexos", f));

  let progressBar = formCriarOcorrencia.querySelector(".cv-progress");
  if (!progressBar) {
    progressBar = document.createElement("div");
    progressBar.className = "cv-progress";
    const bar = document.createElement("div");
    bar.className = "cv-progress__bar";
    progressBar.appendChild(bar);
    formCriarOcorrencia.appendChild(progressBar);
  }
  progressBar.style.display = "block";
  progressBar.querySelector(".cv-progress__bar").style.width = "0%";

  try {
    await xhrPost("/api/ocorrencias", formData, pct => {
      progressBar.querySelector(".cv-progress__bar").style.width = `${pct}%`;
    }, true);
    progressBar.querySelector(".cv-progress__bar").style.width = "100%";
    showGlobalFeedback("Ocorrência criada!", "success", 2500);
    closeModal(criarOcorrenciaModal);
    formCriarOcorrencia.reset();
    ocorrenciaAnexosPreviewContainer.innerHTML = "";
    await loadInitialFeedItems();
  } catch (err) {
    console.error("Erro ao criar ocorrência:", err);
    showModalError(criarOcorrenciaModal, err.detalhesValidacao || err.message || "Falha.");
    throw err;
  } finally {
    progressBar.style.display = "none";
  }
}
