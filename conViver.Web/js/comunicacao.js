import apiClient from "./apiClient.js";
import { requireAuth, getUserInfo } from "./auth.js"; // Importa getUserInfo
import {
    showGlobalFeedback,
    showSkeleton,
    hideSkeleton,
    showInlineSpinner,
    // createErrorStateElement, // Agora importado de pageLoader (ou uiUtils)
    // createEmptyStateElement, // Agora importado de pageLoader (ou uiUtils)
    showModalError,
    clearModalError
} from "./main.js";
import {
    showErrorState,
    showEmptyState,
    showLoadingState
} from "./pageLoader.js"; // Supondo que as funções estão em pageLoader.js
import { initFabMenu } from "./fabMenu.js";
import { xhrPost } from './progress.js'; // Importar xhrPost


// --- Global state & constants ---
let currentFeedPage = 1;
let isLoadingFeedItems = false;
let noMoreFeedItems = false;
const feedContainerSelector = ".js-avisos"; // This is specific to the Mural tab's feed section
const feedScrollSentinelId = "notice-scroll-sentinel";
let fetchedFeedItems = [];
let currentSortOrder = "desc";
// const skeletonCount = 3; // Will be determined by HTML or specific tab logic

function showFeedSkeleton(tabContentId = "content-mural") {
  const tabContentElement = document.getElementById(tabContentId);
  if (!tabContentElement) return;

  // Hide existing content and messages within this specific tab
  const infoMessage = tabContentElement.querySelector(".cv-info-message");
  if (infoMessage) infoMessage.style.display = "none";

  const noItemsMessage = tabContentElement.querySelector(".cv-no-items-message");
  if (noItemsMessage) noItemsMessage.style.display = "none";

  const errorMessage = tabContentElement.querySelector(".cv-error-message");
  if (errorMessage) errorMessage.style.display = "none";

  if (tabContentId === "content-mural") {
    const muralFeedContainer = tabContentElement.querySelector(feedContainerSelector);
    if (muralFeedContainer) {
        // Clear out actual feed items, but not the skeleton container itself
        muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)").forEach(el => el.remove());
    }
  }

  showSkeleton(tabContentElement);
}

function hideFeedSkeleton(tabContentId = "content-mural") {
  const tabContentElement = document.getElementById(tabContentId);
  if (!tabContentElement) return;
  hideSkeleton(tabContentElement);
  // A lógica de exibir EmptyState para abas específicas será tratada
  // após o carregamento do feed principal em fetchAndDisplayFeedItems.
}

function getActiveTabContentId() {
    const activeButton = document.querySelector(".cv-tab-button.active");
    if (activeButton) {
        return "content-" + activeButton.id.split("-")[1];
    }
    return "content-mural"; // Default
}


// Modals
let criarAvisoModal, formCriarAviso, avisoIdField;
let criarEnqueteModal,
  formCriarEnquete,
  enqueteIdField,
  modalEnqueteTitle,
  formEnqueteSubmitButton;
let modalEnqueteDetalhe,
  modalEnqueteDetalheTitulo,
  modalEnqueteDetalheDescricao,
  modalEnqueteDetalheOpcoesContainer,
  modalEnqueteDetalheStatus,
  modalEnqueteSubmitVotoButton;
let criarChamadoModal,
  formCriarChamado,
  chamadoIdFieldModal,
  modalChamadoTitle,
  formChamadoSubmitButtonModal;
let modalChamadoDetalhe,
  modalChamadoDetalheTitulo,
  modalChamadoDetalheConteudo,
  modalChamadoDetalheInteracoes,
  modalChamadoAddCommentSection,
  modalChamadoCommentText,
  modalChamadoSubmitCommentButton;
let modalFiltros; // Novo modal de filtros

// Modal specific form groups
let chamadoStatusModalFormGroup;
let chamadoCategoriaModalFormGroup;
let criarOcorrenciaModal,
  formCriarOcorrencia,
  ocorrenciaTituloInput,
  ocorrenciaDescricaoInput,
  ocorrenciaCategoriaSelect,
  ocorrenciaPrioridadeSelect,
  ocorrenciaAnexosInput,
  ocorrenciaAnexosPreviewContainer;

export async function initialize() {
  requireAuth();

  // Modals Init
  criarAvisoModal = document.getElementById("modal-criar-aviso");
  formCriarAviso = document.getElementById("form-criar-aviso");
  avisoIdField = document.getElementById("aviso-id");

  criarEnqueteModal = document.getElementById("modal-criar-enquete");
  formCriarEnquete = document.getElementById("form-criar-enquete");
  enqueteIdField = document.getElementById("enquete-id");
  modalEnqueteTitle = document.getElementById("modal-enquete-title");
  formEnqueteSubmitButton = document.getElementById(
    "form-enquete-submit-button"
  );
  modalEnqueteDetalhe = document.getElementById("modal-enquete-detalhe");
  modalEnqueteDetalheTitulo = document.getElementById(
    "modal-enquete-detalhe-titulo"
  );
  modalEnqueteDetalheDescricao = document.getElementById(
    "modal-enquete-detalhe-descricao"
  );
  modalEnqueteDetalheOpcoesContainer = document.getElementById(
    "modal-enquete-detalhe-opcoes-container"
  );
  modalEnqueteDetalheStatus = document.getElementById(
    "modal-enquete-detalhe-status"
  );
  modalEnqueteSubmitVotoButton = document.getElementById(
    "modal-enquete-submit-voto"
  );

  criarChamadoModal = document.getElementById("modal-criar-chamado");
  formCriarChamado = document.getElementById("form-criar-chamado");
  chamadoIdFieldModal = document.getElementById("chamado-id");
  modalChamadoTitle = document.getElementById("modal-chamado-title");
  formChamadoSubmitButtonModal = document.getElementById(
    "form-chamado-submit-button"
  );
  modalChamadoDetalhe = document.getElementById("modal-chamado-detalhe");
  modalChamadoDetalheTitulo = document.getElementById(
    "modal-chamado-detalhe-titulo"
  );
  modalChamadoDetalheConteudo = document.getElementById(
    "modal-chamado-detalhe-conteudo"
  );
  modalChamadoDetalheInteracoes = document.getElementById(
    "modal-chamado-detalhe-interacoes"
  );
  modalChamadoAddCommentSection = document.getElementById(
    "modal-chamado-add-comment-section"
  );
  modalChamadoCommentText = document.getElementById(
    "modal-chamado-comment-text"
  );
  modalChamadoSubmitCommentButton = document.getElementById(
    "modal-chamado-submit-comment"
  );

  modalFiltros = document.getElementById("modal-filtros");

  chamadoStatusModalFormGroup = document.querySelector(
    "#modal-criar-chamado .js-chamado-status-form-group"
  );
  chamadoCategoriaModalFormGroup = document.querySelector(
    "#modal-criar-chamado .js-chamado-categoria-form-group"
  );

  criarOcorrenciaModal = document.getElementById("modalNovaOcorrencia");
  formCriarOcorrencia = document.getElementById("formNovaOcorrencia");
  ocorrenciaTituloInput = document.getElementById("ocorrenciaTitulo");
  ocorrenciaDescricaoInput = document.getElementById("ocorrenciaDescricao");
  ocorrenciaCategoriaSelect = document.getElementById("ocorrenciaCategoria");
  ocorrenciaPrioridadeSelect = document.getElementById("ocorrenciaPrioridade");
  ocorrenciaAnexosInput = document.getElementById("ocorrenciaAnexos");
  ocorrenciaAnexosPreviewContainer = document.getElementById(
    "anexosPreviewContainer"
  );

  setupTabs();
  await loadInitialFeedItems();
  setupFeedObserver();
  setupFeedContainerClickListener();
  setupFabMenu();
  setupFilterModalAndButton();
  setupSortModalAndButton();
  setupModalEventListeners();
  setupTryAgainButtons(); // Adicionado aqui
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
  const globalCategoryFilter = document.getElementById("category-filter-modal"); // Filter is now in modal

  const userRoles = getUserRoles();
  const isSindico =
    userRoles.includes("Sindico") || userRoles.includes("Administrador");

  document.querySelectorAll(".js-sindico-only-message").forEach((msg) => {
    msg.style.display = isSindico ? "inline" : "none";
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTabContentId = "content-" + button.id.split("-")[1];

      // Hide all tab contents and skeletons first
      tabContents.forEach((content) => {
        content.style.display = "none";
        hideFeedSkeleton(content.id); // Hide skeleton for inactive tabs
      });

      // Show the target tab's content area
      const activeTabContent = document.getElementById(targetTabContentId);
      if (activeTabContent) {
        activeTabContent.style.display = "block";
      }

      // Show skeleton for the now active tab before loading data
      showFeedSkeleton(targetTabContentId);


      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      let categoryToSetInGlobalFilter = "";
      let loadFeed = true;

      if (button.id === "tab-mural") {
        // No specific category for mural, it shows all or respects current filter
        // categoryToSetInGlobalFilter will remain "" or current filter value
      } else if (button.id === "tab-enquetes") {
        categoryToSetInGlobalFilter = "enquete";
        // The content is primarily on the mural, so we show skeleton on mural
        showFeedSkeleton("content-mural");
        if (!button.dataset.initialized) {
          setupEnquetesTab(); // This function currently just logs.
          button.dataset.initialized = "true";
        }
      } else if (button.id === "tab-solicitacoes") {
        categoryToSetInGlobalFilter = "solicitacoes";
        // The content is primarily on the mural, so we show skeleton on mural
        showFeedSkeleton("content-mural");
        if (!button.dataset.initialized) {
          setupSolicitacoesTab(); // This function currently just logs.
          button.dataset.initialized = "true";
        }
      } else if (button.id === "tab-ocorrencias") {
        categoryToSetInGlobalFilter = "ocorrencias";
        showFeedSkeleton("content-mural");
        if (!button.dataset.initialized) {
          setupOcorrenciasTab();
          button.dataset.initialized = "true";
        }
      }

      if (globalCategoryFilter && categoryToSetInGlobalFilter) {
        globalCategoryFilter.value = categoryToSetInGlobalFilter;
      } else if (button.id === "tab-mural" && globalCategoryFilter) {
        // If switching to Mural, and filter was set by Enquetes/Solicitacoes, clear it
        // Or, decide to keep the filter. For now, let's clear it for a fresh mural view.
        // globalCategoryFilter.value = ""; // Optional: clear filter when going to mural explicitly
      }


      // All tabs currently use loadInitialFeedItems which loads into #content-mural's .js-avisos
      // So, the skeleton for #content-mural should be shown.
      // If the active tab is not mural, its own skeleton (simpler one) was shown above.
      // And its message will be restored by hideFeedSkeleton if no items in mural.
      if (loadFeed) {
        loadInitialFeedItems(); // This function will handle its own skeleton for content-mural's feed
      }
    });
  });

  // Set initial active tab and load its content
  const initialActiveTabButton = document.querySelector(".cv-tab-button.active") || document.querySelector(".cv-tab-button");
  if (initialActiveTabButton) {
    initialActiveTabButton.click();
  } else {
    // Fallback if no tab buttons found, ensure mural skeleton is managed if needed
    showFeedSkeleton("content-mural"); // Show skeleton for default view
    loadInitialFeedItems(); // Load default items
  }
}

// --- Filter Modal ---
function setupFilterModalAndButton() {
  const openFilterButton = document.getElementById("open-filter-modal-button");
  const closeFilterModalButton = document.querySelector(
    ".js-modal-filtros-close"
  );
  const applyFiltersModalButton = document.getElementById(
    "apply-filters-button-modal"
  );
  const clearFiltersModalButton = document.getElementById( // Botão Limpar Filtros
    "clear-filters-button-modal"
  );

  if (openFilterButton && modalFiltros) {
    openFilterButton.addEventListener("click", () => {
      const activeTab = document.querySelector(".cv-tab-button.active")?.id;
      modalFiltros.querySelectorAll("[data-filter-context]").forEach((el) => {
        el.style.display = "none";
      });
      if (activeTab === "tab-enquetes") {
        modalFiltros.querySelectorAll('[data-filter-context="enquetes"]').forEach((el) => (el.style.display = "block"));
        modalFiltros.querySelector("h2").textContent = "Filtros de Enquetes";
      } else if (activeTab === "tab-solicitacoes") {
        modalFiltros.querySelectorAll('[data-filter-context="solicitacoes"]').forEach((el) => (el.style.display = "block"));
        modalFiltros.querySelector("h2").textContent = "Filtros de Solicitações";
      } else if (activeTab === "tab-ocorrencias") {
        modalFiltros.querySelectorAll('[data-filter-context="ocorrencias"]').forEach((el) => (el.style.display = "block"));
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
    // Close on outside click
    window.addEventListener("click", (event) => {
      if (event.target === modalFiltros) {
        modalFiltros.style.display = "none";
      }
    });
  }
  if (applyFiltersModalButton) {
    applyFiltersModalButton.addEventListener("click", () => {
      // Determine active tab to show skeleton correctly.
      // Since filters apply to the mural, mural's skeleton is key.
      const activeTabContentId = getActiveTabContentId();
      showFeedSkeleton("content-mural"); // Always show skeleton on mural for filter changes
      if (activeTabContentId !== "content-mural") {
          // If a different tab is active (e.g., Enquetes), show its specific skeleton too.
          showFeedSkeleton(activeTabContentId);
      }
      // showGlobalFeedback("Aplicando filtros ao feed...", "info"); // Skeleton provides visual feedback
      loadInitialFeedItems(); // Reloads feed using values from modal's filters
      if (modalFiltros) modalFiltros.style.display = "none"; // Close modal after applying

      if (openFilterButton) {
        const hasFilters = Array.from(
          modalFiltros.querySelectorAll("select, input")
        ).some(
          (el) => el.value && el.value !== "" && el.value !== "todas"
        );
        if (hasFilters) openFilterButton.classList.add("has-indicator");
        else openFilterButton.classList.remove("has-indicator");
      }
    });
  }

  // Event listener para o botão Limpar Filtros
  if (clearFiltersModalButton && modalFiltros) {
    clearFiltersModalButton.addEventListener("click", () => {
      // Resetar filtros gerais
      const categoryFilterModal = document.getElementById("category-filter-modal");
      if (categoryFilterModal) categoryFilterModal.value = "";

      const periodFilterModal = document.getElementById("period-filter-modal");
      if (periodFilterModal) periodFilterModal.value = "";

      // Resetar filtros de contexto (enquetes, solicitações, ocorrências)
      // Enquetes
      const enqueteAuthorFilter = document.getElementById("enquete-author-filter");
      if (enqueteAuthorFilter) enqueteAuthorFilter.value = "todas";
      const enqueteStatusFilter = document.getElementById("enquete-status-filter");
      if (enqueteStatusFilter) enqueteStatusFilter.value = "";
      // Solicitações
      const solicitacaoAuthorFilter = document.getElementById("solicitacao-author-filter");
      if (solicitacaoAuthorFilter) solicitacaoAuthorFilter.value = "todas";
      const solicitacaoStatusFilter = document.getElementById("solicitacao-status-filter");
      if (solicitacaoStatusFilter) solicitacaoStatusFilter.value = "";
      // Ocorrências
      const ocorrenciaAuthorFilter = document.getElementById("ocorrencia-author-filter");
      if (ocorrenciaAuthorFilter) ocorrenciaAuthorFilter.value = "todas";
      const ocorrenciaStatusFilter = document.getElementById("ocorrencia-status-filter");
      if (ocorrenciaStatusFilter) ocorrenciaStatusFilter.value = "";

      // Recarregar o feed
      const activeTabContentId = getActiveTabContentId();
      showFeedSkeleton("content-mural");
      if (activeTabContentId !== "content-mural") {
          showFeedSkeleton(activeTabContentId);
      }
      loadInitialFeedItems();
      if (modalFiltros) modalFiltros.style.display = "none"; // Fechar modal
      if (openFilterButton) openFilterButton.classList.remove("has-indicator"); // Remover indicador
    });
  }
}

function setupSortModalAndButton() {
  const openSortButton = document.getElementById("open-sort-button");
  const sortModal = document.getElementById("modal-sort");
  const closeSortButtons = document.querySelectorAll(".js-modal-sort-close");
  const applySortButton = document.getElementById("apply-sort-button");
  const clearSortButton = document.getElementById("clear-sort-button-modal"); // Botão Limpar Ordenação
  const sortSelect = document.getElementById("sort-order-select");

  if (openSortButton && sortModal) {
    openSortButton.addEventListener("click", () => {
      if (sortSelect) sortSelect.value = currentSortOrder;
      sortModal.style.display = "flex";
      openSortButton.classList.add("rotated");
    });
  }
  closeSortButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      sortModal.style.display = "none";
      openSortButton.classList.remove("rotated");
    })
  );
  window.addEventListener("click", (e) => {
    if (e.target === sortModal) {
      sortModal.style.display = "none";
      openSortButton.classList.remove("rotated");
    }
  });
  if (applySortButton && sortSelect) {
    applySortButton.addEventListener("click", () => {
      currentSortOrder = sortSelect.value;
      sortModal.style.display = "none";
      openSortButton.classList.remove("rotated");
      if (currentSortOrder !== "desc")
        openSortButton.classList.add("has-indicator");
      else openSortButton.classList.remove("has-indicator");

      const activeTabContentId = getActiveTabContentId();
      showFeedSkeleton("content-mural");
        if (activeTabContentId !== "content-mural") {
            showFeedSkeleton(activeTabContentId);
        }
      loadInitialFeedItems();
    });
  }

  // Event listener para o botão Limpar Ordenação
  if (clearSortButton && sortSelect && sortModal) {
    clearSortButton.addEventListener("click", () => {
      sortSelect.value = "desc"; // Valor padrão
      currentSortOrder = "desc";
      sortModal.style.display = "none";
      openSortButton.classList.remove("rotated");
      openSortButton.classList.remove("has-indicator"); // Remover indicador

      const activeTabContentId = getActiveTabContentId();
      showFeedSkeleton("content-mural");
      if (activeTabContentId !== "content-mural") {
          showFeedSkeleton(activeTabContentId);
      }
      loadInitialFeedItems();
    });
  }
}

// --- Unified Feed (Mural Tab) ---
function openCriarAvisoModal() {
  if (criarAvisoModal && formCriarAviso && avisoIdField) {
    formCriarAviso.reset();
    avisoIdField.value = "";
    criarAvisoModal.querySelector("h2").textContent = "Criar Novo Aviso";
    formCriarAviso.querySelector('button[type="submit"]').textContent = "Salvar Aviso";
    // Resetar e esconder preview da imagem
    const imgPreview = document.getElementById("aviso-imagem-preview");
    if (imgPreview) {
        imgPreview.style.display = "none";
        imgPreview.src = "#";
    }
    document.getElementById("aviso-imagem").value = ""; // Limpar o input file
    criarAvisoModal.style.display = "flex";
  }
}

function openEditFeedItemModal(itemType, itemId) {
  if (itemType === "Aviso") {
    // Resetar e esconder preview da imagem ao abrir para edição também
    const imgPreview = document.getElementById("aviso-imagem-preview");
    if (imgPreview) {
        imgPreview.style.display = "none";
        imgPreview.src = "#";
    }
    document.getElementById("aviso-imagem").value = "";
    const itemData = fetchedFeedItems.find(
      (i) => i.id.toString() === itemId.toString() && i.itemType === "Aviso"
    );
    if (
      !itemData ||
      !itemData.detalhesAdicionais ||
      typeof itemData.detalhesAdicionais.corpo === "undefined"
    ) {
      showGlobalFeedback(
        "Erro: Dados do aviso não encontrados para edição.",
        "error"
      );
      return;
    }
    if (criarAvisoModal && formCriarAviso && avisoIdField) {
      formCriarAviso.reset();
      avisoIdField.value = itemData.id;
      document.getElementById("aviso-titulo").value = itemData.titulo || "";
      document.getElementById("aviso-corpo").value =
        itemData.detalhesAdicionais.corpo || "";

      const categoriasSelect = document.getElementById("aviso-categorias");
      if (categoriasSelect) {
        Array.from(categoriasSelect.options).forEach(
          (option) => (option.selected = false)
        );
        if (itemData.categoria) {
          // Avisos (no DTO atual) têm uma única categoria
          const optionToSelect = Array.from(categoriasSelect.options).find(
            (opt) => opt.value === itemData.categoria
          );
          if (optionToSelect) optionToSelect.selected = true;
        }
      }
      criarAvisoModal.querySelector("h2").textContent = "Editar Aviso";
      formCriarAviso.querySelector('button[type="submit"]').textContent =
        "Salvar Alterações";
      criarAvisoModal.style.display = "flex";
    }
  } else {
    showGlobalFeedback(
      `Edição para ${itemType} ainda não implementada diretamente do feed.`,
      "info"
    );
  }
}
function closeCriarAvisoModal() {
  if (criarAvisoModal) criarAvisoModal.style.display = "none";
}

function setupModalEventListeners() {
  // Aviso Modal
  if (criarAvisoModal) {
    document
      .querySelectorAll(".js-modal-criar-aviso-close")
      .forEach((btn) => btn.addEventListener("click", closeCriarAvisoModal));
    window.addEventListener("click", (event) => {
      if (event.target === criarAvisoModal) closeCriarAvisoModal();
    });

    if (formCriarAviso && avisoIdField) {
      formCriarAviso.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitBtn = formCriarAviso.querySelector('button[type="submit"]');
        const originalButtonText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `${avisoIdField.value ? 'Salvando...' : 'Criando...'} <span class="inline-spinner"></span>`;

        clearModalError(criarAvisoModal); // Limpar erros anteriores

        // const hideSpinner = showInlineSpinner(submitBtn); // Replaced by direct manipulation
        const currentAvisoId = avisoIdField.value;
        const formData = new FormData(formCriarAviso);

        const titulo = formData.get("titulo");
        const corpo = formData.get("corpo");
        const categoriasSelecionadas = Array.from(
          document.getElementById("aviso-categorias").selectedOptions
        ).map((opt) => opt.value);
        let categoriaParaApi = "Comunicados Gerais";
        if (categoriasSelecionadas.length > 0) {
          if (categoriasSelecionadas.includes("urgente")) {
            categoriaParaApi = "urgente";
          } else {
            categoriaParaApi = categoriasSelecionadas[0];
          }
        }

        const avisoDataPayload = {
          titulo: titulo,
          corpo: corpo,
          categoria: categoriaParaApi,
        };
        // Nota: Upload de arquivos (imagem, anexos) requer backend e apiClient preparados para FormData.

        try {
          showGlobalFeedback(
            currentAvisoId ? "Salvando alterações..." : "Criando aviso...",
            "info"
          );
          if (currentAvisoId) {
            await apiClient.put(
              `/api/v1/avisos/syndic/avisos/${currentAvisoId}`,
              avisoDataPayload
            );
            showGlobalFeedback("Aviso atualizado com sucesso!", "success", 2500);
          } else {
            await apiClient.post(
              "/api/v1/avisos/syndic/avisos",
              avisoDataPayload
            );
            showGlobalFeedback("Aviso criado com sucesso!", "success", 2500);
          }
          // Sucesso:
          closeCriarAvisoModal();
          await loadInitialFeedItems();
          // O showGlobalFeedback de sucesso (com duração reduzida) ainda é útil aqui
          // para confirmar que a ação em background (loadInitialFeedItems) também ocorreu bem,
          // e o modal fechou.
          showGlobalFeedback(currentAvisoId ? "Aviso atualizado com sucesso!" : "Aviso criado com sucesso!", "success", 2500);

        } catch (error) {
          console.error("Erro ao salvar aviso:", error);
          const errorMessage = error.detalhesValidacao || error.message || "Falha ao salvar o aviso. Verifique os dados e tente novamente.";
          showModalError(criarAvisoModal, errorMessage);
          // Não mostrar showGlobalFeedback de erro aqui, pois o erro já está no modal.
          // Apenas se o erro for TÃO genérico que o apiClient já o tratou com um toast global.
        } finally {
          // hideSpinner(); // Replaced by direct manipulation
          submitBtn.innerHTML = originalButtonText;
          submitBtn.disabled = false;
        }
      });
    }
  }

  // Enquete Detail Modal
  if (modalEnqueteDetalhe) {
    const closeButtons = modalEnqueteDetalhe.querySelectorAll(
      ".js-modal-enquete-detalhe-close"
    );
    closeButtons.forEach((btn) =>
      btn.addEventListener(
        "click",
        () => (modalEnqueteDetalhe.style.display = "none")
      )
    );
    window.addEventListener("click", (event) => {
      if (event.target === modalEnqueteDetalhe)
        modalEnqueteDetalhe.style.display = "none";
    });
  }

  // Chamado Detail Modal
  if (modalChamadoDetalhe) {
    const closeButtonsChamado = modalChamadoDetalhe.querySelectorAll(
      ".js-modal-chamado-detalhe-close"
    );
    closeButtonsChamado.forEach((btn) =>
      btn.addEventListener(
        "click",
        () => (modalChamadoDetalhe.style.display = "none")
      )
    );
    window.addEventListener("click", (event) => {
      if (event.target === modalChamadoDetalhe)
        modalChamadoDetalhe.style.display = "none";
    });
  }

  // Listeners for Criar Enquete Modal
  if (criarEnqueteModal) {
    document
      .querySelectorAll(".js-modal-criar-enquete-close")
      .forEach((b) =>
        b.addEventListener(
          "click",
          () => (criarEnqueteModal.style.display = "none")
        )
      );
    window.addEventListener("click", (e) => {
      if (e.target === criarEnqueteModal)
        criarEnqueteModal.style.display = "none";
    });
    if (formCriarEnquete) {
      formCriarEnquete.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = formCriarEnquete.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        const id = enqueteIdField.value; // Captura o ID antes de desabilitar/mudar texto

        submitButton.disabled = true;
        submitButton.innerHTML = `${id ? 'Salvando...' : 'Criando...'} <span class="inline-spinner"></span>`;
        clearModalError(criarEnqueteModal); // Limpar erros anteriores

        const perguntaOuTitulo =
          document.getElementById("enquete-pergunta").value;
        const opcoesTexto = document.getElementById("enquete-opcoes").value;
        const prazo = document.getElementById("enquete-prazo").value;
        const tipoEnquete = document.getElementById("enquete-tipo").value;

        const opcoesDto = opcoesTexto
          .split("\n")
          .map((opt) => opt.trim())
          .filter((opt) => opt !== "")
          .map((desc) => ({ Descricao: desc }));

        if (!perguntaOuTitulo.trim()) {
            showModalError(criarEnqueteModal, "O título/pergunta da enquete é obrigatório.");
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        if (opcoesDto.length < 2) {
          showModalError(criarEnqueteModal, "Uma enquete deve ter pelo menos duas opções.");
          // Restaurar botão e não retornar ainda, para que o finally seja alcançado se houver.
          // No entanto, o fluxo atual não tem um try/finally em volta desta validação.
          // Para consistência, restauramos o botão e retornamos.
          submitButton.innerHTML = originalButtonText;
          submitButton.disabled = false;
          return;
        }
        const enqueteData = {
          Titulo: perguntaOuTitulo,
          Descricao: `Tipo: ${tipoEnquete}`,
          DataFim: prazo ? prazo : null,
          Opcoes: opcoesDto,
        };

        try {
          if (id) {
            await handleUpdateEnquete(id, enqueteData); // Mostra warning global, não há erro de API esperado
            // Se fosse uma API call real, o sucesso seria tratado aqui:
            // if (criarEnqueteModal) criarEnqueteModal.style.display = "none";
            // formCriarEnquete.reset();
            // showGlobalFeedback("Enquete atualizada com sucesso!", "success", 2500);

            // Por ora, como só exibe warning, podemos fechar o modal se desejado.
            if (criarEnqueteModal) criarEnqueteModal.style.display = "none";
            formCriarEnquete.reset();

          } else {
            await handleCreateEnquete(enqueteData); // Agora só faz a chamada e recarrega o feed
            // Sucesso da criação:
            if (criarEnqueteModal) criarEnqueteModal.style.display = "none";
            formCriarEnquete.reset();
            showGlobalFeedback("Nova enquete criada com sucesso! Ela aparecerá no feed.", "success", 2500);
          }
        } catch (error) {
          // Este catch pegará erros de handleCreateEnquete (que agora propaga o erro)
          // ou erros inesperados.
          const errorMessage = error.detalhesValidacao || error.message || "Falha ao processar a enquete.";
          showModalError(criarEnqueteModal, errorMessage);
        } finally {
          submitButton.innerHTML = originalButtonText;
          submitButton.disabled = false;
        }
      });
    }
  }

  // Listeners for Criar Chamado Modal
  if (criarChamadoModal) {
    document
      .querySelectorAll(".js-modal-criar-chamado-close")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          if (criarChamadoModal) criarChamadoModal.style.display = "none";
        });
      });
    window.addEventListener("click", (event) => {
      if (event.target === criarChamadoModal)
        criarChamadoModal.style.display = "none";
    });
    if (
      formCriarChamado &&
      chamadoIdFieldModal &&
      formChamadoSubmitButtonModal
    ) {
      formCriarChamado.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = formCriarChamado.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        const currentChamadoId = chamadoIdFieldModal.value;

        submitButton.disabled = true;
        submitButton.innerHTML = `${currentChamadoId ? 'Salvando...' : 'Abrindo...'} <span class="inline-spinner"></span>`;
        clearModalError(criarChamadoModal);

        const chamadoData = {
          titulo: document.getElementById("chamado-titulo-modal").value,
          descricao: document.getElementById("chamado-descricao-modal").value,
          categoria: document.getElementById("chamado-categoria-modal").value,
        };

        try {
          if (currentChamadoId) {
            // Este é o modal de "Criar Chamado", mas o código permite um ID.
            // Se currentChamadoId existir, significa que estamos editando através deste modal,
            // o que é menos comum para "Criar Solicitação". A função handleUpdateChamado
            // atualmente só exibe um warning. Se fosse uma edição real, o tratamento seria similar.
            chamadoData.status = document.getElementById("chamado-status-modal").value;
            await handleUpdateChamado(currentChamadoId, chamadoData); // Mostra warning global
            if (criarChamadoModal) criarChamadoModal.style.display = "none"; // Fecha no "sucesso" do warning
            formCriarChamado.reset();
          } else {
            // Validação simples antes de chamar a API
            if (!chamadoData.titulo.trim() || !chamadoData.descricao.trim() || !chamadoData.categoria.trim()) {
              throw new Error("Título, descrição e categoria são obrigatórios.");
            }
            await handleCreateChamado(chamadoData);
            // Sucesso:
            if (criarChamadoModal) criarChamadoModal.style.display = "none";
            formCriarChamado.reset();
            showGlobalFeedback("Nova solicitação aberta com sucesso! Ela aparecerá no feed.", "success", 2500);
          }
        } catch (error) {
          const errorMessage = error.detalhesValidacao || error.message || "Falha ao processar a solicitação.";
          showModalError(criarChamadoModal, errorMessage);
        } finally {
          submitButton.innerHTML = originalButtonText;
          submitButton.disabled = false;
        }
      });
    }
  }

  // Listeners for Criar Ocorrencia Modal
  if (criarOcorrenciaModal) {
    document
      .querySelectorAll(".js-modal-criar-ocorrencia-close")
      .forEach((btn) =>
        btn.addEventListener(
          "click",
          () => (criarOcorrenciaModal.style.display = "none")
        )
      );
    window.addEventListener("click", (event) => {
      if (event.target === criarOcorrenciaModal)
        criarOcorrenciaModal.style.display = "none";
    });
    if (formCriarOcorrencia) {
      formCriarOcorrencia.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = formCriarOcorrencia.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.innerHTML = 'Enviando... <span class="inline-spinner"></span>';
        clearModalError(criarOcorrenciaModal); // Limpar erros anteriores

        try {
          // handleCreateOcorrencia fará a validação e a chamada de API.
          // Ele será modificado para mostrar erros de validação/API no modal.
          await handleCreateOcorrencia();
          // Se handleCreateOcorrencia for bem-sucedido, ele fecha o modal e mostra o feedback de sucesso.
        } catch (error) {
          // Este catch é para erros que handleCreateOcorrencia pode relançar
          // (especialmente erros de validação para que o botão seja resetado aqui)
          // ou erros inesperados no próprio listener.
          // Se showModalError já foi chamado em handleCreateOcorrencia, não há problema em chamar de novo,
          // ou podemos fazer handleCreateOcorrencia retornar um booleano de sucesso/falha.
          // Por ora, se handleCreateOcorrencia já mostrou o erro no modal, este catch pode não ser necessário
          // para erros de API, mas sim para reset do botão em caso de erro de validação.
          // A refatoração de handleCreateOcorrencia cuidará de mostrar o erro no modal.
          // Este catch aqui garante que o botão seja redefinido.
          const errorMessage = error.message || "Ocorreu um problema ao enviar a ocorrência.";
          if (!criarOcorrenciaModal.querySelector('.cv-modal-error-message[style*="display: block"]')) {
            // Só mostra erro aqui se handleCreateOcorrencia não o fez.
            showModalError(criarOcorrenciaModal, errorMessage);
          }
        } finally {
          submitButton.innerHTML = originalButtonText;
          submitButton.disabled = false;
        }
      });
    }
  }
}

function setupFeedItemActionButtons() {
  const userRoles = getUserRoles();
  const isSindico =
    userRoles.includes("Sindico") || userRoles.includes("Administrador");

  document.querySelectorAll(".js-edit-feed-item").forEach((button) => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    if (isSindico && newButton.dataset.itemType === "Aviso") {
      newButton.style.display = "inline-block";
      newButton.addEventListener("click", (event) => {
        const itemType = event.target.dataset.itemType;
        const itemId = event.target.dataset.itemId;
        openEditFeedItemModal(itemType, itemId);
      });
    } else {
      newButton.style.display = "none";
    }
  });

  document.querySelectorAll(".js-delete-feed-item").forEach((button) => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    if (isSindico && newButton.dataset.itemType === "Aviso") {
      newButton.style.display = "inline-block";
      newButton.addEventListener("click", async (event) => {
        const itemType = event.target.dataset.itemType;
        const itemId = event.target.dataset.itemId;
        if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
          if (itemType === "Aviso") {
            await handleDeleteAviso(itemId);
          } else {
            showGlobalFeedback(
              `Exclusão para ${itemType} não implementada diretamente do feed.`,
              "info"
            );
          }
        }
      });
    } else {
      newButton.style.display = "none";
    }
  });

  document.querySelectorAll(".js-end-enquete-item").forEach((button) => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    if (isSindico) {
      newButton.style.display = "inline-block";
      newButton.addEventListener("click", async (event) => {
        const buttonElement = event.currentTarget; // Use currentTarget
        const itemId = buttonElement.dataset.itemId;
        if (
          confirm("Tem certeza que deseja encerrar esta enquete manualmente?")
        ) {
          const originalButtonText = buttonElement.textContent; // Use textContent for plain text
          buttonElement.disabled = true;
          // Clear existing content and add spinner
          buttonElement.innerHTML = '<span class="inline-spinner"></span> Encerrando...';
          try {
            await handleEndEnquete(itemId);
            // On success, the feed reloads, button might be gone or updated.
            // If it's still there and action was successful, it should reflect new state.
          } catch (error) {
            // On error, restore button text and re-enable
            buttonElement.textContent = originalButtonText;
            buttonElement.disabled = false;
          }
          // No finally needed if success path removes/replaces button via feed reload
          // and error path explicitly restores it.
        }
      });
    } else {
      newButton.style.display = "none";
    }
  });

  document
    .querySelectorAll(".js-generate-ata-enquete-item")
    .forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      if (isSindico) {
        newButton.style.display = "inline-block";
        newButton.addEventListener("click", async (event) => {
          const buttonElement = event.currentTarget;
          const itemId = buttonElement.dataset.itemId;
        const originalButtonText = buttonElement.textContent; // Use textContent
          buttonElement.disabled = true;
        buttonElement.innerHTML = '<span class="inline-spinner"></span> Gerando...';
          try {
            await handleGenerateAtaEnquete(itemId);
          // Assuming success means the ata is downloaded and button state doesn't change,
          // or if it does, it's handled by a feed reload if that occurs.
        } catch (error) {
          // Error is likely handled by showGlobalFeedback in handleGenerateAtaEnquete
          } finally {
          // Always restore the button after attempt, regardless of success/failure of download
          buttonElement.textContent = originalButtonText;
            buttonElement.disabled = false;
          }
        });
      } else {
        newButton.style.display = "none";
      }
    });
}

async function handleDeleteAviso(itemId) {
  const card = document.querySelector(
    `${feedContainerSelector} .cv-card[data-item-id="${itemId}"][data-item-type="Aviso"]`
  );
  if (card) card.style.display = "none";
  try {
    await apiClient.delete(`/api/v1/avisos/syndic/avisos/${itemId}`);
    showGlobalFeedback("Aviso excluído com sucesso!", "success", 2500);
    fetchedFeedItems = fetchedFeedItems.filter(
      (i) => !(i.id.toString() === itemId.toString() && i.itemType === "Aviso")
    );
    if (card) card.remove();
    else {
      await loadInitialFeedItems();
    }
  } catch (error) {
    console.error("Erro ao excluir aviso:", error);
    if (card) card.style.display = "";
    showGlobalFeedback("Falha ao remover aviso.", "error");
  }
}

// Returns the raw roles saved in localStorage by the authentication flow.
// Residents may appear as "Condomino" or "Inquilino" but the Ocorrências
// endpoints expect the more generic role "Morador". Permission checks that
// rely on that role should treat "Condomino" and "Inquilino" as synonyms of
// "Morador".
function getUserRoles() {
  // const user = JSON.parse(localStorage.getItem("userInfo")); // LINHA ANTIGA
  // if (user && user.roles) return user.roles; // LINHA ANTIGA
  const userInfo = getUserInfo(); // NOVA LINHA: Usa a função de auth.js
  if (userInfo && userInfo.roles) { // NOVA LINHA
    return userInfo.roles; // NOVA LINHA
  }
  return ["Condomino"]; // Mantém o fallback
}


function normalizeRoles(roles) {
  return roles.map((r) =>
    r === "Condomino" || r === "Inquilino" ? "Morador" : r
  );
}

function setupFabMenu() {
  const roles = getUserRoles();
  const normalizedRoles = normalizeRoles(roles);
  const isSindico =
    normalizedRoles.includes("Sindico") ||
    normalizedRoles.includes("Administrador");

  const actions = [];
  if (isSindico) {
    actions.push({ label: "Criar Aviso", onClick: openCriarAvisoModal });
    actions.push({ label: "Criar Enquete", onClick: openCreateEnqueteModal });
  }

  // Todos podem abrir um chamado (solicitação)
  actions.push({ label: "Criar Solicitação", onClick: openCreateChamadoModal });

  // Moradores, síndicos e administradores podem registrar ocorrências
  const canCreateOcorrencia =
    normalizedRoles.includes("Morador") || isSindico;
  if (canCreateOcorrencia) {
    actions.push({ label: "Criar Ocorrência", onClick: openCreateOcorrenciaModal });
  }

  initFabMenu(actions);
}


// This function was replaced by setupFilterModalAndButton
// function setupFilterButtonListener() { ... }

async function loadInitialFeedItems() {
  currentFeedPage = 1;
  noMoreFeedItems = false;
  isLoadingFeedItems = false;
  const container = document.querySelector(feedContainerSelector); // This is #content-mural .js-avisos
  if (!container) return;

  const existingSentinel = document.getElementById(feedScrollSentinelId);
  let sentinel = existingSentinel;
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = feedScrollSentinelId;
    sentinel.style.height = "10px"; // Small, non-visual element
    // Ensure sentinel is always the last child of its direct parent for correct observation
    const feedContentArea = document.querySelector(feedContainerSelector);
    if (feedContentArea) {
        feedContentArea.appendChild(sentinel);
    }
  }
  // Ensure sentinel is visible for observer to trigger, but it's non-visual itself.
  sentinel.style.display = "block";

  // Show skeleton specifically for the mural's feed area
  showFeedSkeleton("content-mural");

  await fetchAndDisplayFeedItems(currentFeedPage, false);
}

function setupFeedObserver() {
  const sentinel = document.getElementById(feedScrollSentinelId);
  if (!sentinel) return;

  const observer = new IntersectionObserver(
    async (entries) => {
      if (
        entries[0].isIntersecting &&
        !isLoadingFeedItems &&
        !noMoreFeedItems
      ) {
        currentFeedPage++;
        // showFeedSkeleton("content-mural"); // Show skeleton for loading more items as well
        await fetchAndDisplayFeedItems(currentFeedPage, true);
      }
    },
    { root: null, threshold: 0.1 }
  );
  observer.observe(sentinel);
}

async function fetchAndDisplayFeedItems(page, append = false) {
  if (isLoadingFeedItems) return;
  isLoadingFeedItems = true;

  // Always target the main feed container in the Mural tab
  const muralFeedContainer = document.querySelector("#content-mural " + feedContainerSelector);
  if (!muralFeedContainer) {
    isLoadingFeedItems = false;
    // Não precisa mais chamar hideFeedSkeleton aqui, pois showLoadingState/showErrorState limparão o container.
    // hideFeedSkeleton("content-mural");
    // const activeTabId = getActiveTabContentId();
    // if (activeTabId !== "content-mural") hideFeedSkeleton(activeTabId);
    return;
  }

  const sentinelElement = document.getElementById(feedScrollSentinelId);

  if (!append) {
    // Fresh load: Show loading state in the mural feed container
    showLoadingState(muralFeedContainer, "Carregando comunicados e atualizações...");

    const activeTabId = getActiveTabContentId();
    if (activeTabId !== "content-mural") {
        const activeTabContentElement = document.getElementById(activeTabId);
        if (activeTabContentElement) {
            // Se a aba ativa não for o mural, mostrar loading state nela também
            showLoadingState(activeTabContentElement, `Carregando ${activeTabId.replace('content-', '')}...`);
        }
    }

    // fetchedFeedItems é limpo de itens não fixos, mantendo os fixos se o filtro permitir
    const CategoriaFilterValue =
      document.getElementById("category-filter-modal")?.value?.toLowerCase() || "";
    fetchedFeedItems = fetchedFeedItems.filter((fi) => {
      return (
        fi.prioridadeOrdenacao === 0 &&
        (CategoriaFilterValue === "" ||
          fi.categoria?.toLowerCase() === CategoriaFilterValue ||
          fi.itemType?.toLowerCase() === CategoriaFilterValue)
      );
    });

  } else {
    // Infinite scroll: Show a small spinner near the sentinel
    if (sentinelElement) {
      let spinner = sentinelElement.previousElementSibling;
      if (!spinner || !spinner.classList.contains('load-more-spinner')) {
        spinner = document.createElement('div');
        spinner.className = 'load-more-spinner cv-loading-state'; // Usar cv-loading-state para estilização base
        spinner.style.minHeight = 'auto'; // Override min-height para ser menor
        spinner.style.padding = 'var(--cv-spacing-md)';
        spinner.innerHTML = `<div class="cv-loading-state__icon" style="width: 32px; height: 32px;">${getDefaultLoadingIcon()}</div> <p class="cv-loading-state__message">Carregando mais...</p>`;
        sentinelElement.insertAdjacentElement('beforebegin', spinner);
      }
      spinner.style.display = 'flex';
    }
  }
  if (sentinelElement) sentinelElement.style.display = "block";

  // Read filters from the modal
  const categoriaFilter =
    document.getElementById("category-filter-modal")?.value || null;
  const periodoFilterInput = document.getElementById(
    "period-filter-modal"
  )?.value;
  const activeTabId = document.querySelector(".cv-tab-button.active")?.id || "tab-mural";
  let autorFilter = null;
  let statusFilter = null;
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
  let periodoInicio = null,
    periodoFim = null;
  if (periodoFilterInput) {
    const [year, monthStr] = periodoFilterInput.split("-");
    const yearNum = parseInt(year);
    const monthNum = parseInt(monthStr);
    if (!isNaN(yearNum) && !isNaN(monthNum)) {
      periodoInicio = new Date(Date.UTC(yearNum, monthNum - 1, 1));
      periodoFim = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
    }
  }

  try {
    const response = await apiClient.get("/api/v1/feed", {
      pageNumber: page,
      pageSize: 10,
      categoria: categoriaFilter,
      periodoInicio: periodoInicio ? periodoInicio.toISOString() : null,
      periodoFim: periodoFim ? periodoFim.toISOString() : null,
      status: statusFilter,
      minhas: autorFilter === "minhas" ? true : null,
    });

    const items = response || [];
    const activeTabContentId = getActiveTabContentId();
    const activeTabElement = document.getElementById(activeTabContentId); // Elemento da aba ativa

    // Limpar container do mural antes de adicionar novos itens ou estado de vazio/erro
    // As funções showEmptyState/showErrorState já limpam, mas é bom garantir se formos adicionar itens.
    if (!append) { // Apenas para o carregamento inicial, não para 'carregar mais'
        muralFeedContainer.innerHTML = '';
        if (activeTabElement && activeTabContentId !== "content-mural") {
            activeTabElement.innerHTML = ''; // Limpar também a aba específica
        }
    }


    if (items.length > 0) {
      // Esconder o spinner de "carregar mais" se estiver visível
      const loadMoreSpinner = sentinelElement?.previousElementSibling;
      if (loadMoreSpinner && loadMoreSpinner.classList.contains('load-more-spinner')) {
        loadMoreSpinner.style.display = 'none';
      }

      items.forEach((item) => {
        if (
          fetchedFeedItems.some(
            (fi) => fi.id === item.id && fi.itemType === item.itemType
          )
        ) {
          if (item.prioridadeOrdenacao !== 0) return;
        }

        const itemElement = renderFeedItem(item);
        if (sentinelElement)
            muralFeedContainer.insertBefore(itemElement, sentinelElement);
        else muralFeedContainer.appendChild(itemElement);

        if (
          !fetchedFeedItems.some(
            (fi) => fi.id === item.id && fi.itemType === item.itemType
          )
        ) {
          fetchedFeedItems.push(item);
        }
        const imgElement = itemElement.querySelector('.feed-item__image');
        if (imgElement && imgElement.dataset.src) {
          const highResImage = new Image();
          highResImage.onload = () => {
            imgElement.src = highResImage.src;
            imgElement.classList.add('loaded');
          };
          highResImage.onerror = () => {
            imgElement.classList.add('loaded');
            console.error("Erro ao carregar imagem de alta resolução:", imgElement.dataset.src);
          };
          highResImage.src = imgElement.dataset.src;
        }
      });

      const allRenderedItems = Array.from(
        muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)")
      );
      allRenderedItems.sort((a, b) => {
        const itemAData = fetchedFeedItems.find(
          (fi) =>
            fi.id === a.dataset.itemId && fi.itemType === a.dataset.itemType
        ) || { prioridadeOrdenacao: 1, dataHoraPrincipal: 0 };
        const itemBData = fetchedFeedItems.find(
          (fi) =>
            fi.id === b.dataset.itemId && fi.itemType === b.dataset.itemType
        ) || { prioridadeOrdenacao: 1, dataHoraPrincipal: 0 };

        if (itemAData.prioridadeOrdenacao !== itemBData.prioridadeOrdenacao) {
          return itemAData.prioridadeOrdenacao - itemBData.prioridadeOrdenacao;
        }
        const diff = new Date(itemBData.dataHoraPrincipal) - new Date(itemAData.dataHoraPrincipal);
        return currentSortOrder === "desc" ? diff : -diff;
      });
      allRenderedItems.forEach((el) =>
        muralFeedContainer.insertBefore(el, sentinelElement)
      );
    } else { // No items returned from API
      // Esconder o spinner de "carregar mais" se estiver visível (caso de erro ao carregar mais)
      const loadMoreSpinner = sentinelElement?.previousElementSibling;
      if (loadMoreSpinner && loadMoreSpinner.classList.contains('load-more-spinner')) {
        loadMoreSpinner.style.display = 'none';
      }

      if (page === 1 && !append) {
        const currentVisibleItems = muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)");
        if (currentVisibleItems.length === 0) {
          const CategoriaFilterValue = document.getElementById("category-filter-modal")?.value?.toLowerCase() || "";
          const periodoFilterInput = document.getElementById("period-filter-modal")?.value;
          const hasActiveFilters = CategoriaFilterValue || periodoFilterInput; // Simplificado
          const userRolesForEmptyState = getUserRoles();
          const isSindicoForEmptyState = userRolesForEmptyState.includes("Sindico") || userRolesForEmptyState.includes("Administrador");

          let title = "Nenhum Item Encontrado";
          let message = "Não há comunicados, enquetes ou outras atualizações no momento.";
          let actions = [];
          let icon = getDefaultEmptyIcon(); // Usar o ícone padrão de "vazio"

          if (hasActiveFilters) {
            title = "Nenhum Item com Esses Filtros";
            message = "Tente ajustar seus filtros ou verificar mais tarde.";
            actions.push({
                text: "Limpar Filtros",
                action: () => {
                    const clearFiltersBtnModal = document.getElementById("clear-filters-button-modal");
                    if (clearFiltersBtnModal) clearFiltersBtnModal.click();
                },
                class: "cv-button--secondary"
            });
            icon = getDefaultSearchIcon(); // Ícone de busca/sem resultados
          } else {
            title = "Mural Vazio";
            message = "Ainda não há comunicados, enquetes ou outras atualizações.";
            if (isSindicoForEmptyState) {
                message += " Que tal criar o primeiro aviso?";
                actions.push({
                    text: "Criar Aviso",
                    action: openCriarAvisoModal,
                    class: "cv-button--primary"
                });
            }
          }
          showEmptyState(muralFeedContainer, title, message, icon, actions);
        }
      }
      noMoreFeedItems = true;
      if (sentinelElement) sentinelElement.style.display = "none";
    }
    setupFeedItemActionButtons();

  } catch (error) {
    console.error("Erro ao buscar feed:", error);
    const activeTabContentIdOnError = getActiveTabContentId();
    const targetErrorContainer = document.getElementById(activeTabContentIdOnError);

    // Esconder o spinner de "carregar mais" se estiver visível (caso de erro ao carregar mais)
    const loadMoreSpinner = sentinelElement?.previousElementSibling;
    if (loadMoreSpinner && loadMoreSpinner.classList.contains('load-more-spinner')) {
      loadMoreSpinner.style.display = 'none';
    }

    if (targetErrorContainer && !append) {
        const itemsInActiveTab = targetErrorContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item), .cv-card:not(.feed-skeleton-item)").length;
        if (itemsInActiveTab === 0 || activeTabContentIdOnError === "content-mural") {
            showErrorState(targetErrorContainer,
                error.message || `Não foi possível carregar o conteúdo de ${activeTabContentIdOnError}. Verifique sua conexão e tente novamente.`,
                // A função showErrorState já tem um ícone padrão, mas podemos passar um específico se quisermos
            );
            // Adicionar listener para o botão de tentar novamente, se ele foi adicionado por showErrorState
            const retryButton = targetErrorContainer.querySelector('.error-state__retry-button');
            if (retryButton) {
                retryButton.onclick = () => loadInitialFeedItems(); // Ou uma função específica para a aba
            }
        }
    } else if (append) {
      if (!error.handledByApiClient && error.message) {
         showGlobalFeedback(error.message || "Erro ao carregar mais itens.", "error");
      }
    }
    if (sentinelElement) sentinelElement.style.display = "none";
  } finally {
    isLoadingFeedItems = false;
    // A lógica de esconder skeletons/loading states já foi feita dentro do try/catch
    // ou será feita pelas funções showEmptyState/showErrorState que limpam o container.

    const finalActiveTab = getActiveTabContentId();
    const muralIsEmpty = noMoreFeedItems && page === 1 && muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)").length === 0;

    if (muralIsEmpty) {
        const tabSpecificContentArea = document.getElementById(finalActiveTab);
        if (tabSpecificContentArea && finalActiveTab !== "content-mural") {
            // Limpar área de conteúdo da aba específica
            tabSpecificContentArea.innerHTML = ''; // Limpa para o showEmptyState

            let title = "Nenhum Conteúdo";
            let message = "Não há itens para exibir nesta seção no momento.";
            let actions = [];
            let icon = getDefaultEmptyIcon();

            const userRoles = getUserRoles();
            const isSindico = userRoles.includes("Sindico") || userRoles.includes("Administrador");
            const hasActiveFilters = document.getElementById("open-filter-modal-button")?.classList.contains("has-indicator");

            if (finalActiveTab === "content-enquetes") {
                title = hasActiveFilters ? "Nenhuma Enquete Encontrada" : "Sem Enquetes no Momento";
                message = hasActiveFilters
                    ? "Nenhuma enquete corresponde aos filtros aplicados."
                    : "Ainda não há enquetes ativas ou encerradas.";
                if (isSindico) {
                    message += " Que tal criar a primeira?";
                    actions.push({ text: "Criar Nova Enquete", action: openCreateEnqueteModal, class: "cv-button--primary" });
                }
                icon = getDefaultPollIcon(); // Ícone de enquete
            } else if (finalActiveTab === "content-solicitacoes") {
                title = hasActiveFilters ? "Nenhuma Solicitação Encontrada" : "Caixa de Solicitações Vazia";
                message = hasActiveFilters
                    ? "Nenhuma solicitação corresponde aos filtros aplicados."
                    : "Ainda não foram abertas solicitações.";
                actions.push({ text: "Abrir Nova Solicitação", action: openCreateChamadoModal, class: "cv-button--primary" });
                icon = getDefaultRequestIcon(); // Ícone de solicitação
            } else if (finalActiveTab === "content-ocorrencias") {
                title = hasActiveFilters ? "Nenhuma Ocorrência Encontrada" : "Sem Ocorrências Registradas";
                message = hasActiveFilters
                    ? "Nenhuma ocorrência corresponde aos filtros atuais."
                    : "Ainda não há ocorrências registradas.";
                 actions.push({ text: "Relatar Nova Ocorrência", action: openCreateOcorrenciaModal, class: "cv-button--primary" });
                 icon = getDefaultOccurrenceIcon(); // Ícone de ocorrência
            }

            if (hasActiveFilters) {
                 actions.push({
                    text: "Limpar Filtros",
                    action: () => {
                        const clearFiltersBtnModal = document.getElementById("clear-filters-button-modal");
                        if (clearFiltersBtnModal) clearFiltersBtnModal.click();
                    },
                    class: "cv-button--secondary"
                });
            }
            showEmptyState(tabSpecificContentArea, title, message, icon, actions);
        }
    } else if (!muralIsEmpty && finalActiveTab !== "content-mural") {
        // Se o mural não está vazio, mas a aba específica poderia estar (se não fosse baseada no mural)
        // Aqui, como as abas filtram o mural, se o mural tem itens, a aba filtrada também terá (ou mostrará o mural).
        // Se a aba tivesse seu próprio conteúdo independente e estivesse vazia, limparíamos aqui.
        // Por ora, se o mural tem itens, as abas refletem isso, então não precisamos limpar explicitamente
        // o empty state da aba específica, a menos que a lógica de exibição de conteúdo mude.
    }
  }
}

function renderFeedItem(item) {
  const card = document.createElement("article");
  card.className = `cv-card feed-item feed-item-${item.itemType.toLowerCase()} prio-${
    item.prioridadeOrdenacao
  }`;
  card.dataset.itemId = item.id;
  card.dataset.itemType = item.itemType;

  const pinLabel =
    item.prioridadeOrdenacao === 0
      ? '<span class="feed-item__pin">📌 </span>'
      : "";

  let categoriaParaTag = item.categoria || item.itemType;
  if (item.itemType === "Enquete") categoriaParaTag = "Enquete";
  else if (item.itemType === "Chamado" || item.itemType === "Ocorrencia")
    categoriaParaTag = "Solicitações";
  else if (item.itemType === "OrdemServico") categoriaParaTag = "Serviços";
  else if (item.itemType === "BoletoLembrete") categoriaParaTag = "Financeiro";
  else if (item.itemType === "Documento") categoriaParaTag = "Documentos";
  else if (
    item.itemType === "Aviso" &&
    item.categoria?.toLowerCase() === "urgente"
  )
    categoriaParaTag = "Urgente";
  else if (item.itemType === "Aviso") categoriaParaTag = "Comunicados";
  else if (item.itemType === "Reserva") categoriaParaTag = "Reservas";
  else if (item.itemType === "Encomenda") categoriaParaTag = "Portaria";

  const categoriaMap = {
    manutenção: "🛠️ Manutenção",
    reservas: "🏡 Reservas",
    comunicados: "📢 Comunicados",
    enquete: "🗳️ Enquetes",
    assembleias: "🧑‍⚖️ Assembleias",
    urgente: "🚨 Urgente",
    serviços: "🛠️ Serviços",
    solicitações: "💬 Solicitações",
    financeiro: "💰 Financeiro",
    documentos: "📄 Documentos",
    portaria: "📦 Portaria",
  };

  let tagDisplay =
    categoriaMap[categoriaParaTag?.toLowerCase()] || categoriaParaTag;

  let contentHtml = "";
  // Adicionar imagem com lazy loading e preparo para progressive loading
  if (item.imagemUrl) {
    // Usaremos um placeholder simples por enquanto. Idealmente, seria uma LQIP real.
    // Poderia ser uma miniatura de 1x1 pixel ou um SVG placeholder.
    const placeholderSrc = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; // 1x1 pixel transparente
    contentHtml += `
      <div class="feed-item__image-container">
        <img src="${placeholderSrc}" data-src="${item.imagemUrl}" alt="Imagem do feed: ${item.titulo}" class="feed-item__image" loading="lazy">
      </div>`;
  }

  contentHtml += `
        <h3 class="feed-item__title">${pinLabel}${item.titulo}</h3>
        <p class="feed-item__summary">${item.resumo}</p>
        <div class="feed-item__meta">
            <span class="feed-item__date">Data: ${new Date(
              item.dataHoraPrincipal
            ).toLocaleString()}</span>
            ${
              item.status
                ? `<span class="feed-item__status">Status: ${item.status}</span>`
                : ""
            }
        </div>
    `;

  let tagsHtml = '<div class="feed-item__tags">';
  if (tagDisplay) {
    tagsHtml += `<span class="feed-item__tag feed-item__tag--${item.itemType.toLowerCase()}">${tagDisplay}</span>`;
  }
  tagsHtml += "</div>";
  contentHtml += tagsHtml;

  let actionsHtml = `<div class="feed-item__actions">`;
  if (
    item.urlDestino ||
    [
      "Enquete",
      "Chamado",
      "Ocorrencia",
      "OrdemServico",
      "BoletoLembrete",
      "Documento",
    ].includes(item.itemType)
  ) {
    actionsHtml += `<button class="cv-button-link js-view-item-detail" data-item-id="${item.id}" data-item-type="${item.itemType}">Ver Detalhes</button>`;
  }

  const userRoles = getUserRoles();
  const isSindico =
    userRoles.includes("Sindico") || userRoles.includes("Administrador");

  if (isSindico) {
    if (item.itemType === "Aviso") {
      actionsHtml += `<button class="cv-button-link js-edit-feed-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Editar</button>`;
      actionsHtml += `<button class="cv-button-link danger js-delete-feed-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Excluir</button>`;
    }
    if (item.itemType === "Enquete") {
      if (item.status && item.status.toLowerCase() === "aberta") {
        actionsHtml += `<button class="cv-button-link js-end-enquete-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Encerrar</button>`;
      } else if (item.status) {
        actionsHtml += `<button class="cv-button-link js-generate-ata-enquete-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Gerar Ata</button>`;
      }
    }
  }

  actionsHtml += `</div>`;
  card.innerHTML = contentHtml + actionsHtml;
  return card;
}

function setupFeedContainerClickListener() {
  const container = document.querySelector(feedContainerSelector);
  if (container) {
    container.addEventListener("click", handleFeedItemClick);
  }
}

async function handleFeedItemClick(event) {
  const clickedElement = event.target;
  const cardElement = clickedElement.closest(".feed-item");
  if (!cardElement) return;

  const itemId = cardElement.dataset.itemId;
  const itemType = cardElement.dataset.itemType;
  if (!itemId || !itemType) return;

  if (clickedElement.classList.contains("js-edit-feed-item")) {
    openEditFeedItemModal(itemType, itemId);
    return;
  }
  if (clickedElement.classList.contains("js-delete-feed-item")) {
    if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
      if (itemType === "Aviso") await handleDeleteAviso(itemId);
      else
        showGlobalFeedback(
          `Exclusão para ${itemType} não implementada aqui.`,
          "info"
        );
    }
    return;
  }
  if (clickedElement.classList.contains("js-end-enquete-item")) {
    if (confirm("Tem certeza que deseja encerrar esta enquete manualmente?")) {
      // Spinner logic is now inside the event listener in setupFeedItemActionButtons
      await handleEndEnquete(itemId); // This will be called by the setup listener
    }
    return;
  }
  if (clickedElement.classList.contains("js-generate-ata-enquete-item")) {
    // Spinner logic is now inside the event listener in setupFeedItemActionButtons
    await handleGenerateAtaEnquete(itemId); // This will be called by the setup listener
    return;
  }

  if (
    clickedElement.classList.contains("js-view-item-detail") ||
    event.target === cardElement ||
    cardElement.contains(event.target)
  ) {
    if (
      clickedElement.closest(".feed-item__actions") &&
      !clickedElement.classList.contains("js-view-item-detail")
    ) {
      return;
    }

    switch (itemType) {
      case "Aviso":
        showGlobalFeedback(
          `Visualizando detalhes do Aviso (se houver modal dedicado).`,
          "info"
        );
        break;
      case "Enquete":
        handleEnqueteClick(itemId, cardElement);
        break;
      case "Chamado":
      case "Ocorrencia":
      case "OrdemServico":
        handleChamadoClick(itemId, cardElement, itemType);
        break;
      case "Documento":
        handleDocumentoClick(itemId, cardElement);
        break;
      case "Reserva":
        handleReservaClick(itemId, cardElement);
        break;
      case "Encomenda":
        handleEncomendaClick(itemId, cardElement);
        break;
      case "BoletoLembrete":
        handleBoletoLembreteClick(itemId, cardElement);
        break;
      default:
        showGlobalFeedback(
          `Interação para tipo '${itemType}' não definida.`,
          "info"
        );
        break;
    }
  }
}

// Specific Click Handlers

let currentEnqueteId = null;

async function handleEnqueteClick(itemId, targetElementOrCard) {
  currentEnqueteId = itemId;
  if (!modalEnqueteDetalhe || !apiClient) return;

  // Use showLoadingState para o container de opções dentro do modal
  showLoadingState(modalEnqueteDetalheOpcoesContainer, "Carregando detalhes da enquete...");
  modalEnqueteDetalheStatus.innerHTML = ""; // Limpar status anterior
  modalEnqueteSubmitVotoButton.style.display = "none"; // Esconder botão de voto
  modalEnqueteDetalhe.style.display = "flex"; // Mostrar o modal

  try {
    const enquete = await apiClient.get(
      `/api/v1/votacoes/app/votacoes/${itemId}`
    );
    if (!enquete) {
      showErrorState(modalEnqueteDetalheOpcoesContainer,
        "A enquete que você está tentando visualizar não foi encontrada ou você não tem permissão para acessá-la.",
        // Ícone padrão de erro será usado por showErrorState
      );
      // Adicionar botão de tentar novamente se necessário, a função showErrorState pode ser estendida para isso
      // Por ora, o usuário pode fechar e tentar reabrir o modal.
      return;
    }
    // Limpar o container antes de adicionar conteúdo real (showLoadingState já faz isso)
    // modalEnqueteDetalheOpcoesContainer.innerHTML = '';

    modalEnqueteDetalheTitulo.textContent = enquete.titulo;
    modalEnqueteDetalheDescricao.innerHTML = enquete.descricao
      ? `<p>${enquete.descricao.replace(/\n/g, "<br>")}</p>`
      : "<p><em>Sem descrição adicional.</em></p>";

    if (enquete.status === "Aberta" && !enquete.usuarioJaVotou) {
      renderOpcoesDeVoto(enquete.opcoes); // Esta função popula modalEnqueteDetalheOpcoesContainer
      modalEnqueteSubmitVotoButton.style.display = "block";
      modalEnqueteSubmitVotoButton.onclick = () => submitVoto(itemId);
      modalEnqueteDetalheStatus.innerHTML = `<p><strong>Status:</strong> Aberta para votação.</p> <p>Prazo: ${
        enquete.dataFim
          ? new Date(enquete.dataFim).toLocaleString()
          : "Não definido"
      }</p>`;
    } else {
      renderResultadosEnquete( // Esta função também popula modalEnqueteDetalheOpcoesContainer
        enquete.opcoes,
        enquete.status,
        enquete.usuarioJaVotou,
        enquete.dataFim
      );
    }
  } catch (error) {
    console.error("Erro ao buscar detalhes da enquete:", error);
    showErrorState(modalEnqueteDetalheOpcoesContainer,
        error.message || "Não foi possível carregar os detalhes da enquete. Verifique sua conexão e tente novamente.",
        // Ícone padrão de erro será usado
    );
    // Adicionar listener para o botão de tentar novamente, se ele foi adicionado por showErrorState
    const retryButton = modalEnqueteDetalheOpcoesContainer.querySelector('.error-state__retry-button');
    if (retryButton) {
        retryButton.onclick = () => handleEnqueteClick(itemId, null);
    }
  }
}

function renderOpcoesDeVoto(opcoes) {
  // Assegurar que o container está limpo antes de renderizar
  modalEnqueteDetalheOpcoesContainer.innerHTML = '';
  let html =
    '<h4>Escolha uma opção:</h4><form id="form-votar-enquete" class="cv-form">';
  opcoes.forEach((opcao) => {
    html += `
            <div class="cv-form-group">
                <input type="radio" name="opcaoVoto" value="${opcao.id}" id="opcao-${opcao.id}" class="cv-input-radio">
                <label for="opcao-${opcao.id}">${opcao.descricao}</label>
            </div>
        `;
  });
  html += "</form>";
  modalEnqueteDetalheOpcoesContainer.innerHTML = html;
}

function renderResultadosEnquete(opcoes, status, usuarioJaVotou, dataFim) {
  let html = "<h4>Resultados:</h4>";
  const totalVotos = opcoes.reduce((sum, opt) => sum + opt.quantidadeVotos, 0);

  if (totalVotos === 0 && status === "Aberta") {
    html += "<p>Ainda não há votos registrados para esta enquete.</p>";
    if (usuarioJaVotou) {
      html += '<p class="poll-status voted">Você já votou.</p>';
    }
  } else if (totalVotos === 0 && status !== "Aberta") {
    html += "<p>Nenhum voto foi registrado nesta enquete.</p>";
  } else {
    opcoes.forEach((opcao) => {
      const percentual =
        totalVotos > 0
          ? ((opcao.quantidadeVotos / totalVotos) * 100).toFixed(1)
          : 0;
      html += `
                <div class="poll-result-item">
                    <span class="poll-result-option-text">${opcao.descricao}: ${opcao.quantidadeVotos} voto(s)</span>
                    <div class="poll-result-bar-container">
                        <div class="poll-result-bar" style="width: ${percentual}%; background-color: var(--current-primary-blue);">
                            ${percentual}%
                        </div>
                    </div>
                </div>
            `;
    });
  }

  modalEnqueteDetalheOpcoesContainer.innerHTML = html;
  let statusText = `<strong>Status:</strong> ${status}.`;
  if (status === "Aberta" && usuarioJaVotou) {
    statusText += ' <span class="poll-status voted">Você já votou.</span>';
  }
  if (dataFim) {
    statusText += ` <p>Encerrada em: ${new Date(dataFim).toLocaleString()}</p>`;
  }
  modalEnqueteDetalheStatus.innerHTML = `<p>${statusText}</p>`;
}

async function submitVoto(enqueteId) {
  const form = document.getElementById("form-votar-enquete");
  if (!form) return;

  const submitButton = document.getElementById("modal-enquete-submit-voto");
  if (!submitButton) return; // Safety check
  const originalButtonText = submitButton.innerHTML;

  clearModalError(modalEnqueteDetalhe); // Limpar erros anteriores

  const selectedOption = form.querySelector('input[name="opcaoVoto"]:checked');
  if (!selectedOption) {
    showModalError(modalEnqueteDetalhe, "Por favor, selecione uma opção para votar.");
    // Não desabilitar o botão ou mudar texto, pois o usuário precisa poder tentar de novo.
    return;
  }
  const opcaoId = selectedOption.value;

  // UI Otimista e Desabilitar botão durante a submissão
  submitButton.disabled = true;
  submitButton.innerHTML = 'Registrando... <span class="inline-spinner"></span>';

  // A UI otimista de esconder opções e mostrar "voto registrado" pode ser mantida,
  // mas precisa ser revertida em caso de erro.
  const originalOpcoesHTML = modalEnqueteDetalheOpcoesContainer.innerHTML;
  modalEnqueteDetalheOpcoesContainer.innerHTML = '<p class="poll-status voted">Seu voto foi registrado. Atualizando resultados...</p>';
  // modalEnqueteSubmitVotoButton.style.display = "none"; // O botão já está desabilitado e com spinner

  try {
    await apiClient.post(`/api/v1/votacoes/app/votacoes/${enqueteId}/votar`, { OpcaoId: opcaoId });
    showGlobalFeedback("Voto confirmado pelo servidor!", "success", 2000);
    // O handleEnqueteClick no finally vai recarregar e mostrar o estado correto (resultados/já votou).
    // Não precisa mais esconder o botão aqui explicitamente, o handleEnqueteClick vai determinar.
  } catch (error) {
    console.error("Erro ao registrar voto:", error);
    // Reverter UI otimista
    modalEnqueteDetalheOpcoesContainer.innerHTML = originalOpcoesHTML; // Restaura as opções de voto

    const errorMessage = error.message || "Falha ao registrar o voto. Tente novamente.";
    showModalError(modalEnqueteDetalhe, errorMessage);

    // Restaurar botão para permitir nova tentativa
    submitButton.innerHTML = originalButtonText;
    submitButton.disabled = false;
    // Não chamar showGlobalFeedback de erro aqui.
  } finally {
    // Se não houve erro, o botão já estará com spinner. Se houve erro, foi resetado.
    // O `handleEnqueteClick` vai re-renderizar o estado do modal, incluindo o botão.
    // Se o voto foi bem sucedido, o botão não deve reaparecer (pois usuarioJaVotou será true).
    // Se falhou, o botão já foi re-ativado no catch.
    // Então, o reset do texto/estado do botão aqui pode não ser sempre necessário,
    // mas é mais seguro garantir que ele volte ao estado original se não for ser escondido.
    if (!submitButton.disabled) { // Se o catch já reabilitou.
        // submitButton.innerHTML = originalButtonText; // Já feito no catch
    } else if(modalEnqueteSubmitVotoButton.style.display !== 'none') { // Se ainda estiver visível e desabilitado (sucesso)
        // O handleEnqueteClick vai esconder ou mudar o botão, então não precisa resetar aqui.
    }

    await handleEnqueteClick(enqueteId, null); // Recarrega os detalhes da enquete
  }
}

let currentChamadoIdModal = null;

async function handleChamadoClick(
  itemId,
  targetElementOrCard,
  itemType = "Chamado"
) {
  currentChamadoIdModal = itemId;
  if (!modalChamadoDetalhe || !apiClient) return;

  // Usar showLoadingState para o conteúdo principal do modal de detalhes do chamado/ocorrência
  showLoadingState(modalChamadoDetalheConteudo, `Carregando detalhes de ${itemType}...`);
  modalChamadoDetalheInteracoes.innerHTML = ""; // Limpar interações anteriores

  const sindicoUpdateSection = document.getElementById(
    "sindico-chamado-update-section"
  );
  const statusUpdateGroup = document.getElementById(
    "modal-chamado-status-update-group"
  ); // Not used directly here, but part of section
  const respostaSindicoGroup = document.getElementById(
    "modal-chamado-resposta-sindico-group"
  ); // Not used directly here
  const submitSindicoUpdateButton = document.getElementById(
    "modal-chamado-submit-sindico-update"
  );

  if (sindicoUpdateSection) sindicoUpdateSection.style.display = "none";
  if (submitSindicoUpdateButton)
    submitSindicoUpdateButton.style.display = "none";

  const userCommentSection = document.getElementById(
    "modal-chamado-add-comment-section"
  );
  if (userCommentSection) userCommentSection.style.display = "none";

  modalChamadoDetalhe.style.display = "flex";

  let endpoint = "";
  if (itemType === "Chamado")
    endpoint = `/api/v1/chamados/app/chamados/${itemId}`;
  else if (itemType === "Ocorrencia")
    endpoint = `/api/v1/ocorrencias/app/ocorrencias/${itemId}`;
  else if (itemType === "OrdemServico")
    endpoint = `/api/v1/ordensservico/app/ordensservico/${itemId}`;
  else {
    showGlobalFeedback(`Detalhes para ${itemType} não suportados.`, "error");
    if (modalChamadoDetalhe) modalChamadoDetalhe.style.display = "none";
    return;
  }

  try {
    const itemData = await apiClient.get(endpoint);

    if (!itemData) {
      showErrorState(modalChamadoDetalheConteudo,
        `O item do tipo '${itemType}' que você está tentando visualizar não foi encontrado ou você não tem permissão para acessá-lo.`
      );
      // Adicionar listener para o botão de tentar novamente, se ele foi adicionado por showErrorState
      const retryButton = modalChamadoDetalheConteudo.querySelector('.error-state__retry-button');
      if (retryButton) {
          retryButton.onclick = () => handleChamadoClick(itemId, null, itemType);
      }
      return;
    }
    // Limpar o container antes de adicionar conteúdo real (showLoadingState já faz isso)
    // modalChamadoDetalheConteudo.innerHTML = '';

    modalChamadoDetalheTitulo.textContent =
      itemData.titulo || `Detalhes de ${itemType}`;
    renderDetalhesGenerico(itemData, itemType);

    modalChamadoDetalheInteracoes.innerHTML = `<p style="text-align:center; color: var(--current-text-placeholder);"><em>Funcionalidade de histórico de interações em desenvolvimento.</em></p>`;

    const userRoles = getUserRoles();
    const isSindico =
      userRoles.includes("Sindico") || userRoles.includes("Administrador");

    if (
      isSindico &&
      itemType === "Chamado" &&
      sindicoUpdateSection &&
      submitSindicoUpdateButton
    ) {
      sindicoUpdateSection.style.display = "block";
      document.getElementById("modal-chamado-status-select").value =
        itemData.status || "Aberto";
      document.getElementById("modal-chamado-resposta-textarea").value =
        itemData.respostaDoSindico || "";

      submitSindicoUpdateButton.style.display = "block";
      const newUpdateButton = submitSindicoUpdateButton.cloneNode(true);
      submitSindicoUpdateButton.parentNode.replaceChild(
        newUpdateButton,
        submitSindicoUpdateButton
      );
      newUpdateButton.onclick = () => submitChamadoUpdateBySindico(itemId);
    } else if (itemType === "Chamado" && userCommentSection) {
      // userCommentSection.style.display = 'block'; // Logic for user comments can be added here
    }
  } catch (error) {
    console.error(`Erro ao buscar detalhes de ${itemType}:`, error);
    showErrorState(modalChamadoDetalheConteudo,
        error.message || `Não foi possível carregar os detalhes de ${itemType}. Verifique sua conexão e tente novamente.`
    );
    const retryButton = modalChamadoDetalheConteudo.querySelector('.error-state__retry-button');
    if (retryButton) {
        retryButton.onclick = () => handleChamadoClick(itemId, null, itemType);
    }
  }
}

function renderDetalhesGenerico(itemData, itemType) {
  // Assegurar que o container está limpo antes de renderizar
  modalChamadoDetalheConteudo.innerHTML = '';
  const dataPrincipal =
    itemData.dataAbertura ||
    itemData.dataHoraPrincipal ||
    itemData.criadoEm ||
    itemData.publicadoEm;
  const dataResolucao =
    itemData.dataResolucao || itemData.concluidoEm || itemData.dataFim;

  let html = `<p><strong>Título:</strong> ${itemData.titulo || "N/A"}</p>`;
  if (itemData.descricao) {
    html += `<p><strong>Descrição:</strong></p><p style="white-space: pre-wrap;">${itemData.descricao}</p>`;
  }
  if (itemData.categoria || itemData.categoriaServico) {
    html += `<p><strong>Categoria:</strong> ${
      itemData.categoria || itemData.categoriaServico
    }</p>`;
  }
  if (itemData.status) {
    html += `<p><strong>Status:</strong> <span class="status-${itemData.status.toLowerCase()}">${
      itemData.status
    }</span></p>`;
  }
  if (dataPrincipal) {
    html += `<p><strong>Data Principal:</strong> ${new Date(
      dataPrincipal
    ).toLocaleString()}</p>`;
  }
  if (dataResolucao) {
    html += `<p><strong>Data Conclusão/Resolução:</strong> ${new Date(
      dataResolucao
    ).toLocaleString()}</p>`;
  }

  if (itemType === "Chamado") {
    if (itemData.respostaDoSindico) {
      html += `<p><strong>Resposta do Síndico:</strong> ${itemData.respostaDoSindico}</p>`;
    }
    if (itemData.avaliacaoNota) {
      html += `<p><strong>Sua Avaliação:</strong> ${itemData.avaliacaoNota}/5 ${
        itemData.avaliacaoComentario
          ? `- <em>${itemData.avaliacaoComentario}</em>`
          : ""
      }</p>`;
    }
  }
  if (itemType === "OrdemServico") {
    if (itemData.prestadorId)
      html += `<p><strong>Prestador ID:</strong> ${itemData.prestadorId}</p>`;
  }

  if (itemData.fotos && itemData.fotos.length > 0) {
    html += `<p><strong>Fotos:</strong></p><div class="item-photos">`;
    itemData.fotos.forEach((fotoUrl) => {
      // Adicionado loading="lazy"
      html += `<img src="${fotoUrl}" alt="Foto do item" style="max-width:100px; margin:5px; border:1px solid #ddd;" loading="lazy">`;
    });
    html += `</div>`;
  }

  modalChamadoDetalheConteudo.innerHTML = html;
}

async function submitChamadoUpdateBySindico(chamadoId) {
  const statusSelect = document.getElementById("modal-chamado-status-select");
  const respostaTextarea = document.getElementById(
    "modal-chamado-resposta-textarea"
  );
  const updateBtn = document.getElementById("modal-chamado-submit-sindico-update");
  const originalButtonText = updateBtn.innerHTML;
  updateBtn.disabled = true;
  updateBtn.innerHTML = 'Salvando... <span class="inline-spinner"></span>';
  clearModalError(modalChamadoDetalhe); // Limpar erros anteriores no modal de detalhes

  if (!statusSelect || !respostaTextarea) {
    // Este erro é de setup, um toast global é aceitável ou um erro no console.
    // Mas para consistência, tentaremos mostrar no modal se possível.
    showModalError(modalChamadoDetalhe, "Erro interno: Elementos do formulário não encontrados.");
    updateBtn.innerHTML = originalButtonText;
    updateBtn.disabled = false;
    return;
  }

  const status = statusSelect.value;
  const respostaDoSindico = respostaTextarea.value.trim();

  if (!status) {
    showModalError(modalChamadoDetalhe, "O novo status do chamado é obrigatório.");
    updateBtn.innerHTML = originalButtonText;
    updateBtn.disabled = false;
    return;
  }

  try {
    await apiClient.put(`/api/v1/chamados/syndic/chamados/${chamadoId}`, {
      status: status,
      respostaDoSindico: respostaDoSindico,
    });
    // Sucesso:
    if (modalChamadoDetalhe) modalChamadoDetalhe.style.display = "none";
    await loadInitialFeedItems();
    showGlobalFeedback("Chamado atualizado com sucesso!", "success", 2500);
  } catch (error) {
    console.error("Erro ao atualizar chamado pelo síndico:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao atualizar o chamado.";
    showModalError(modalChamadoDetalhe, errorMessage);
    // Não mostrar showGlobalFeedback de erro aqui.
  } finally {
    updateBtn.innerHTML = originalButtonText;
    updateBtn.disabled = false;
  }
}

function handleOcorrenciaClick(itemId, targetElementOrCard) {
  handleChamadoClick(itemId, targetElementOrCard, "Ocorrencia");
}
function handleOrdemServicoClick(itemId, targetElementOrCard) {
  handleChamadoClick(itemId, targetElementOrCard, "OrdemServico");
}

function handleDocumentoClick(itemId, targetElementOrCard) {
  const item = fetchedFeedItems.find(
    (i) => i.id.toString() === itemId.toString() && i.itemType === "Documento"
  );
  if (item && item.urlDestino) {
    window.open(item.urlDestino, "_blank");
  } else {
    showGlobalFeedback(
      `Documento: ${item?.titulo || itemId}. URL não encontrada.`,
      "warning"
    );
  }
}

function handleReservaClick(itemId, targetElementOrCard) {
  const item = fetchedFeedItems.find(
    (i) => i.id.toString() === itemId.toString() && i.itemType === "Reserva"
  );
  showGlobalFeedback(
    `Reserva: ${
      item?.titulo || itemId
    }. Detalhes da reserva seriam exibidos aqui.`,
    "info",
    5000
  );
}

function handleEncomendaClick(itemId, targetElementOrCard) {
  const item = fetchedFeedItems.find(
    (i) => i.id.toString() === itemId.toString() && i.itemType === "Encomenda"
  );
  showGlobalFeedback(
    `Encomenda: ${
      item?.titulo || itemId
    }. Detalhes da encomenda seriam exibidos aqui.`,
    "info",
    5000
  );
}

function handleBoletoLembreteClick(itemId, targetElementOrCard) {
  const item = fetchedFeedItems.find(
    (i) =>
      i.id.toString() === itemId.toString() && i.itemType === "BoletoLembrete"
  );
  if (item && item.urlDestino) {
    window.open(item.urlDestino, "_blank");
  } else {
    showGlobalFeedback(
      `Boleto: ${item?.titulo || itemId}. Link para detalhes não disponível.`,
      "info"
    );
  }
}

// --- Enquetes e Votações Tab ---
function setupEnquetesTab() {
  console.log("Modo de filtro de Enquetes ativado.");
}

function openCreateEnqueteModal() {
  if (criarEnqueteModal) {
    formCriarEnquete.reset();
    enqueteIdField.value = "";
    modalEnqueteTitle.textContent = "Nova Enquete";
    formEnqueteSubmitButton.textContent = "Salvar Enquete";
    criarEnqueteModal.style.display = "flex";
  }
}

async function handleCreateEnquete(enqueteData) {
  // Opcional: manter o feedback "info" se desejado, mas o spinner no botão já indica processamento.
  // showGlobalFeedback("Criando nova enquete...", "info", 1500);
  await apiClient.post("/api/v1/votacoes/syndic/votacoes", enqueteData);
  // Não mostra mais feedback de sucesso ou erro aqui. Deixa o chamador lidar.
  await loadInitialFeedItems();
  // Se apiClient.post lança um erro, ele será propagado para o chamador.
}

async function handleUpdateEnquete(id, enqueteData) {
  console.warn(
    "handleUpdateEnquete chamado, mas o backend não suporta edição de votações.",
    id,
    enqueteData
  );
  showGlobalFeedback(
    "Funcionalidade de editar enquete não está disponível.",
    "warning"
  );
}

async function handleEndEnquete(enqueteId) {
  try {
    showGlobalFeedback("Encerrando enquete...", "info");
    await apiClient.put(
      `/api/v1/votacoes/syndic/votacoes/${enqueteId}/encerrar`,
      {}
    );
    showGlobalFeedback("Enquete encerrada com sucesso!", "success", 2500);
    await loadInitialFeedItems();
  } catch (error) {
    console.error("Erro ao encerrar enquete:", error);
    if (!error.handledByApiClient) {
      showGlobalFeedback(
        error.message || "Falha ao encerrar a enquete.",
        "error"
      );
    }
  }
}

async function handleGenerateAtaEnquete(enqueteId) {
  try {
    showGlobalFeedback("Gerando ata da enquete...", "info");
    const response = await apiClient.getRawResponse(
      `/api/v1/votacoes/syndic/votacoes/${enqueteId}/gerar-ata`
    );

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/pdf")) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Ata_Enquete_${enqueteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showGlobalFeedback("Ata da enquete baixada.", "success");
      } else {
        const data = await response
          .json()
          .catch(() => ({
            message: "Formato de resposta inesperado ao gerar ata.",
          }));
        showGlobalFeedback(
          data.message || "Resposta inesperada ao gerar ata.",
          "warning"
        );
      }
    } else {
      const errorData = await response
        .json()
        .catch(() => ({
          message: `Falha ao gerar ata (Status: ${response.status})`,
        }));
      showGlobalFeedback(errorData.message, "error");
    }
  } catch (error) {
    console.error("Erro ao gerar ata da enquete:", error);
    showGlobalFeedback("Erro ao tentar gerar ata.", "error");
  }
}

function setupEnqueteModalAndFAB() {
  // Listeners for modal form are in setupModalEventListeners
  console.log("setupEnqueteModalAndFAB (major logic moved)");
}

// --- Solicitações Tab (formerly Chamados) ---
function formatChamadoStatus(status) {
  const map = {
    aberto: "Aberto",
    em_andamento: "Em Andamento",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  return map[status.toLowerCase()] || status;
}
function formatChamadoCategoria(categoria) {
  const map = {
    limpeza: "Limpeza",
    seguranca: "Segurança",
    manutencao_geral: "Manutenção Geral",
    barulho: "Barulho",
    outros: "Outros",
  };
  return map[categoria.toLowerCase()] || categoria;
}

function setupSolicitacoesTab() {
  console.log("Modo de filtro de Solicitações ativado.");
  // setupChamadoModalAndFAB();
}

function setupOcorrenciasTab() {
  console.log("Modo de filtro de Ocorrências ativado.");
}

async function handleCreateChamado(chamadoData) {
  // showGlobalFeedback("Abrindo novo chamado...", "info", 1500); // Opcional
  const dataParaApi = {
    Titulo: chamadoData.titulo,
    Descricao: `Categoria: ${chamadoData.categoria}\n\n${chamadoData.descricao}`,
    // Fotos e UnidadeId são opcionais e seriam adicionados aqui se presentes em chamadoData e suportados pelo DTO.
  };
  await apiClient.post("/api/v1/chamados/app/chamados", dataParaApi);
  await loadInitialFeedItems(); // Propaga erro se houver
}

async function handleUpdateChamado(id, chamadoData) {
  console.warn(
    "handleUpdateChamado (usuário) chamado, mas não implementado.",
    id,
    chamadoData
  );
  showGlobalFeedback(
    "Funcionalidade de editar seu próprio chamado não está disponível.",
    "warning"
  );
}

function setupChamadoModalAndFAB() {
  // Listeners for modal form are in setupModalEventListeners
  console.log("setupChamadoModalAndFAB (major logic moved)");
}

function openCreateChamadoModal() {
  if (
    criarChamadoModal &&
    formCriarChamado &&
    chamadoIdFieldModal &&
    modalChamadoTitle &&
    formChamadoSubmitButtonModal &&
    chamadoStatusModalFormGroup &&
    chamadoCategoriaModalFormGroup
  ) {
    formCriarChamado.reset();
    chamadoIdFieldModal.value = "";
    modalChamadoTitle.textContent = "Nova Solicitação";
    formChamadoSubmitButtonModal.textContent = "Abrir Solicitação";
    chamadoStatusModalFormGroup.style.display = "none";
    chamadoCategoriaModalFormGroup.style.display = "block";
    document.getElementById("chamado-descricao-modal").disabled = false;
    criarChamadoModal.style.display = "flex";
  }
}

function openCreateOcorrenciaModal() {
  if (
    criarOcorrenciaModal &&
    formCriarOcorrencia &&
    ocorrenciaTituloInput &&
    ocorrenciaDescricaoInput
  ) {
    formCriarOcorrencia.reset();
    if (ocorrenciaAnexosPreviewContainer) {
      ocorrenciaAnexosPreviewContainer.innerHTML = "";
    }
    if (ocorrenciaPrioridadeSelect) {
      ocorrenciaPrioridadeSelect.value = "NORMAL";
    }
    criarOcorrenciaModal.style.display = "flex";
  }
}

async function handleCreateOcorrencia() {
  if (!formCriarOcorrencia) return;

  const titulo = ocorrenciaTituloInput.value.trim();
  const descricao = ocorrenciaDescricaoInput.value.trim();
  const categoria = ocorrenciaCategoriaSelect.value;
  const prioridade = ocorrenciaPrioridadeSelect.value || "NORMAL";

  if (!titulo || !descricao || !categoria) {
    const message = "Preencha título, descrição e categoria da ocorrência.";
    // Precisamos garantir que o modal de ocorrência seja passado ou acessível aqui
    // Se criarOcorrenciaModal é globalmente acessível:
    if (criarOcorrenciaModal) { // criarOcorrenciaModal é uma variável global no escopo do módulo
        showModalError(criarOcorrenciaModal, message);
    } else {
        // Fallback se o modal não estiver acessível (improvável neste contexto)
        showGlobalFeedback(message, "warning");
    }
    throw new Error(message); // Lança erro para que o listener do form possa resetar o botão no finally
  }

  const formData = new FormData();
  formData.append("titulo", titulo);
  formData.append("descricao", descricao);
  formData.append("categoria", categoria);
  formData.append("prioridade", prioridade);
  if (ocorrenciaAnexosInput && ocorrenciaAnexosInput.files) {
    Array.from(ocorrenciaAnexosInput.files).forEach(f =>
      formData.append("anexos", f)
    );
  }
  // Adicionar a barra de progresso ao formulário de ocorrências, se não existir
  let ocorrenciaProgressBar = formCriarOcorrencia.querySelector('.cv-progress');
  if (!ocorrenciaProgressBar) {
      ocorrenciaProgressBar = document.createElement('div');
      ocorrenciaProgressBar.className = 'cv-progress';
      const bar = document.createElement('div');
      bar.className = 'cv-progress__bar';
      ocorrenciaProgressBar.appendChild(bar);
      formCriarOcorrencia.appendChild(ocorrenciaProgressBar); // Adiciona no final do formulário
  }
  ocorrenciaProgressBar.style.display = 'block';
  ocorrenciaProgressBar.querySelector('.cv-progress__bar').style.width = '0%';


  try {
    // showGlobalFeedback("Enviando ocorrência...", "info"); // Spinner e barra são suficientes

    // Usar xhrPost de progress.js que já lida com FormData e token
    await xhrPost("/api/ocorrencias", formData, (progress) => {
        if (ocorrenciaProgressBar) {
            ocorrenciaProgressBar.querySelector('.cv-progress__bar').style.width = `${progress}%`;
        }
    }, true); // true indica que é FormData
    if(ocorrenciaProgressBar) ocorrenciaProgressBar.querySelector('.cv-progress__bar').style.width = '100%';
    showGlobalFeedback(
      "Ocorrência criada com sucesso! Ela aparecerá no feed.",
      "success",
      2500
    );
    if (criarOcorrenciaModal) {
      criarOcorrenciaModal.style.display = "none";
    }
    formCriarOcorrencia.reset();
    if (ocorrenciaAnexosPreviewContainer) {
      ocorrenciaAnexosPreviewContainer.innerHTML = "";
    }
    await loadInitialFeedItems();
    // Sucesso já tratado pelo showGlobalFeedback no try.
  } catch (error) {
    console.error("Erro ao criar ocorrência:", error);
    const errorMessage = error.detalhesValidacao || error.message || "Falha ao criar a ocorrência.";
    if (criarOcorrenciaModal) { // criarOcorrenciaModal é global
        showModalError(criarOcorrenciaModal, errorMessage);
    } else {
        // Fallback improvável
        showGlobalFeedback(errorMessage, "error");
    }
    throw error; // Relança o erro para o listener do form poder lidar com o finally (reset do botão)
  } finally {
    if (ocorrenciaProgressBar) ocorrenciaProgressBar.style.display = 'none';
  }
}

// Removido postWithFiles local, pois xhrPost de progress.js será usado.
//   const token = localStorage.getItem("cv_token");
//   const headers = {};
//   if (token) {
//     headers["Authorization"] = `Bearer ${token}`;
//   }
//   const response = await fetch(
//     (window.APP_CONFIG?.API_BASE_URL || "") + path,
//     {
//       method: "POST",
//       body: formData,
//       headers,
//       // Para XHR, a lógica de progresso é diferente.
//       // Esta função usa fetch, que não suporta onprogress diretamente para upload.
//       // Para progresso de upload com fetch, precisaríamos de um Service Worker
//       // ou usar XHR. Dado que `progress.js` usa XHR, vamos adaptar para usar XHR aqui
//       // ou modificar `xhrPost` para ser mais genérico se ele já não for.
//       // Por simplicidade, e assumindo que `xhrPost` já existe e é adequado:
//     }
//     // Se xhrPost já está em progress.js e faz o que precisamos:
//     // return xhrPost(path, formData, onProgress, true); // true para indicar que é uma chamada de API autenticada
//     // Caso contrário, implementamos uma lógica XHR básica aqui:
//   ); // Fim do fetch original

//   // A lógica de XHR para progresso de upload:
//   return new Promise((resolve, reject) => {
//     const xhr = new XMLHttpRequest();
//     xhr.open("POST", (window.APP_CONFIG?.API_BASE_URL || "") + path, true);
//     if (token) {
//       xhr.setRequestHeader("Authorization", `Bearer ${token}`);
//     }
//     // Não defina Content-Type para FormData, o XHR faz isso.

//     if (onProgress && typeof onProgress === 'function') {
//       xhr.upload.onprogress = (event) => {
//         if (event.lengthComputable) {
//           const percentComplete = (event.loaded / event.total) * 100;
//           onProgress(percentComplete);
//         }
//       };
//     }

//     xhr.onload = () => {
//       if (xhr.status >= 200 && xhr.status < 300) {
//         try {
//           const contentType = xhr.getResponseHeader("content-type");
//           if (contentType && contentType.includes("application/json")) {
//             resolve(JSON.parse(xhr.responseText));
//           } else {
//             resolve(null); // ou xhr.responseText se for texto simples
//           }
//         } catch (e) {
//           resolve(null); // Resposta não-JSON bem-sucedida
//         }
//       } else {
//         try {
//             const errorData = JSON.parse(xhr.responseText);
//             reject(new Error(errorData.message || `Falha ${xhr.status}`));
//         } catch (e) {
//             reject(new Error(`Falha ${xhr.status}: ${xhr.statusText}`));
//         }
//       }
//     };

//     xhr.onerror = () => {
//       reject(new Error("Falha de rede ou CORS ao enviar formulário."));
//     };

//     xhr.send(formData);
//   });
// }

// --- Botão Tentar Novamente nos Error States (agora tratado por showErrorState) ---
// Comentado pois showErrorState agora lida com a criação de botões de retry e seus listeners.
// A função setupTryAgainButtons foi removida.

// Importar ícones de pageLoader.js
import {
    getDefaultErrorIcon,
    getDefaultEmptyIcon,
    getDefaultLoadingIcon,
    getDefaultPollIcon,
    getDefaultRequestIcon,
    getDefaultOccurrenceIcon,
    getDefaultSearchIcon
    // getDefaultDocumentIcon não é usado diretamente em comunicacao.js, mas está disponível
} from "./pageLoader.js";