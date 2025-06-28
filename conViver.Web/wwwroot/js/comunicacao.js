import apiClient from "./apiClient.js";
import { requireAuth } from "./auth.js";
import { showGlobalFeedback, showSkeleton, hideSkeleton } from "./main.js";
import { initFabMenu } from "./fabMenu.js";

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
  // Restore info message if no actual content is loaded for certain tabs
  if (tabContentId === "content-enquetes" || tabContentId === "content-solicitacoes") {
    const infoMessage = tabContentElement.querySelector(".cv-info-message");
    // Check if feed items were loaded into mural (which these tabs might trigger)
    // For now, we assume the message should reappear if skeleton is hidden and no other specific content for these tabs.
    // This might need refinement based on whether these tabs get their own direct content later.
    const muralFeedHasItems = document.querySelector(`${feedContainerSelector} .feed-item`);
    if (infoMessage && !muralFeedHasItems && tabContentId !== getActiveTabContentId()) {
        // If the current active tab is mural, don't reshow messages for other tabs.
        // This logic is tricky because these tabs rely on the mural.
        // Simplification: If hiding skeleton for these specific tabs, ensure their default message is visible
        // if they are the active tab AND no items are in the mural (as they point to it).
    } else if (infoMessage) {
        // Default state for these tabs is to show their info message.
        // The skeleton should hide it, and data loading (which is for mural) won't explicitly show it.
        // So, if we hide skeleton, and this tab is active, show its message.
        if(getActiveTabContentId() === tabContentId) {
            infoMessage.style.display = "block";
        }
    }
  }
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
  setupFilterModalAndButton(); // Setup filter modal and its trigger
  setupSortModalAndButton();
  setupModalEventListeners(); // Setup generic close/submit for other modals
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
}

function setupSortModalAndButton() {
  const openSortButton = document.getElementById("open-sort-button");
  const sortModal = document.getElementById("modal-sort");
  const closeSortButtons = document.querySelectorAll(".js-modal-sort-close");
  const applySortButton = document.getElementById("apply-sort-button");
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
      showFeedSkeleton(getActiveTabContentId());
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
    formCriarAviso.querySelector('button[type="submit"]').textContent =
      "Salvar Aviso";
    criarAvisoModal.style.display = "flex";
  }
}

function openEditFeedItemModal(itemType, itemId) {
  if (itemType === "Aviso") {
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
            showGlobalFeedback("Aviso atualizado com sucesso!", "success");
          } else {
            await apiClient.post(
              "/api/v1/avisos/syndic/avisos",
              avisoDataPayload
            );
            showGlobalFeedback("Aviso criado com sucesso!", "success");
          }
          closeCriarAvisoModal();
          await loadInitialFeedItems();
        } catch (error) {
          console.error("Erro ao salvar aviso:", error);
          if (!error.handledByApiClient) {
            showGlobalFeedback(
              error.message || "Falha ao salvar o aviso.",
              "error"
            );
          }
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
        const id = enqueteIdField.value;
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
        if (opcoesDto.length < 2) {
          showGlobalFeedback(
            "Uma enquete deve ter pelo menos duas opções.",
            "error"
          );
          return;
        }
        const enqueteData = {
          Titulo: perguntaOuTitulo,
          Descricao: `Tipo: ${tipoEnquete}`,
          DataFim: prazo ? prazo : null,
          Opcoes: opcoesDto,
        };
        if (id) {
          await handleUpdateEnquete(id, enqueteData);
        } else {
          await handleCreateEnquete(enqueteData);
        }
        if (criarEnqueteModal) criarEnqueteModal.style.display = "none";
        formCriarEnquete.reset();
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
        const currentChamadoId = chamadoIdFieldModal.value;
        const chamadoData = {
          titulo: document.getElementById("chamado-titulo-modal").value,
          descricao: document.getElementById("chamado-descricao-modal").value,
          categoria: document.getElementById("chamado-categoria-modal").value,
        };
        if (currentChamadoId) {
          chamadoData.status = document.getElementById(
            "chamado-status-modal"
          ).value;
          await handleUpdateChamado(currentChamadoId, chamadoData);
        } else {
          await handleCreateChamado(chamadoData);
        }
        if (criarChamadoModal) criarChamadoModal.style.display = "none";
      formCriarChamado.reset();
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
        await handleCreateOcorrencia();
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
        const itemId = event.target.dataset.itemId;
        if (
          confirm("Tem certeza que deseja encerrar esta enquete manualmente?")
        ) {
          await handleEndEnquete(itemId);
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
          const itemId = event.target.dataset.itemId;
          await handleGenerateAtaEnquete(itemId);
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
    showGlobalFeedback("Aviso excluído com sucesso!", "success");
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
  const user = JSON.parse(localStorage.getItem("userInfo"));
  if (user && user.roles) return user.roles;
  return ["Condomino"];
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
    actions.push(
      { label: "Criar Aviso", onClick: openCriarAvisoModal },
      { label: "Criar Enquete", onClick: openCreateEnqueteModal }
    );
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
    hideFeedSkeleton("content-mural"); // Hide mural skeleton if its container is missing
    const activeTabId = getActiveTabContentId();
    if (activeTabId !== "content-mural") hideFeedSkeleton(activeTabId);
    return;
  }

  const sentinelElement = document.getElementById(feedScrollSentinelId);
  const loadingMessageClass = "cv-loading-message"; // This was for text loading, less needed with skeleton
  let loadingP = muralFeedContainer.querySelector(`.${loadingMessageClass}`);
  if(loadingP) loadingP.style.display = 'none'; // Hide old text loading message

  if (!append) {
    // This is a fresh load (not infinite scroll)
    showFeedSkeleton("content-mural"); // Ensure mural skeleton is visible
    const activeTabId = getActiveTabContentId();
    if (activeTabId !== "content-mural") {
        // If another tab (like Enquetes) triggered this, show its skeleton too
        showFeedSkeleton(activeTabId);
    }

    // Clear previous items (non-pinned) from the DOM and from fetchedFeedItems array
    muralFeedContainer
      .querySelectorAll(`.feed-item:not(.prio-0):not(.feed-skeleton-item)`)
      .forEach((el) => el.remove());

    const CategoriaFilterValue =
      document.getElementById("category-filter-modal")?.value?.toLowerCase() || "";
    fetchedFeedItems = fetchedFeedItems.filter((fi) => {
      return (
        fi.prioridadeOrdenacao === 0 && // Keep pinned items
        (CategoriaFilterValue === "" ||
          fi.categoria?.toLowerCase() === CategoriaFilterValue ||
          fi.itemType?.toLowerCase() === CategoriaFilterValue)
      );
    });

    // Remove old "no items" or "error" messages from muralFeedContainer
    const noItemsMsg = muralFeedContainer.querySelector(".cv-no-items-message");
    if (noItemsMsg) noItemsMsg.remove();
    const errorMsg = muralFeedContainer.querySelector(".cv-error-message");
    if (errorMsg) errorMsg.remove();

  } else {
    // This is for infinite scroll, show a smaller loading indicator if desired, or rely on skeleton
    // For now, the main skeleton is shown by loadInitialFeedItems.
    // If we want a specific "loading more" visual, it would go here.
    // e.g., a small spinner near the sentinel.
    // For simplicity, we'll let the existing skeleton cover this or just load.
  }
  if (sentinelElement) sentinelElement.style.display = "block"; // Keep sentinel active

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

    hideFeedSkeleton("content-mural"); // Hide mural skeleton first
    if (activeTabContentId !== "content-mural") {
        hideFeedSkeleton(activeTabContentId); // Hide other active tab's skeleton
    }


    if (items.length > 0) {
      items.forEach((item) => {
        // Check if item (non-pinned) already exists from a previous fetch or is pinned
        if (
          fetchedFeedItems.some(
            (fi) => fi.id === item.id && fi.itemType === item.itemType
          )
        ) {
          // If it's a pinned item (prio 0), it might be in fetchedFeedItems from initial load
          // but we still need to ensure it's rendered if not already.
          // If it's not prio 0 and already in fetchedFeedItems, skip re-rendering.
          if (item.prioridadeOrdenacao !== 0) return;
        }

        const itemElement = renderFeedItem(item);
        // Always append to the muralFeedContainer before the sentinel
        if (sentinelElement)
            muralFeedContainer.insertBefore(itemElement, sentinelElement);
        else muralFeedContainer.appendChild(itemElement);

        // Add to fetchedFeedItems if it's genuinely new
        if (
          !fetchedFeedItems.some(
            (fi) => fi.id === item.id && fi.itemType === item.itemType
          )
        ) {
          fetchedFeedItems.push(item);
        }
      });

      // Sort all items in the DOM (including newly added and pinned ones)
      const allRenderedItems = Array.from(
        muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)")
      );
      allRenderedItems.sort((a, b) => {
        const itemAData = fetchedFeedItems.find(
          (fi) =>
            fi.id === a.dataset.itemId && fi.itemType === a.dataset.itemType
        ) || { prioridadeOrdenacao: 1, dataHoraPrincipal: 0 }; // Fallback for items not in fetchedFeedItems (should not happen)
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
        muralFeedContainer.insertBefore(el, sentinelElement) // Re-insert in sorted order
      );
    } else { // No items returned from API
      if (page === 1 && !append) { // First page and not appending
        const currentVisibleItems = muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)");
        if (currentVisibleItems.length === 0) { // No items at all (including pinned)
          const noItemsMsgCheck = muralFeedContainer.querySelector(".cv-no-items-message");
          if (noItemsMsgCheck) noItemsMsgCheck.remove(); // Remove old message if any

          const noItemsP = document.createElement("p");
          noItemsP.className = "cv-no-items-message";
          noItemsP.textContent = "Nenhum item encontrado para os filtros atuais.";
          if (sentinelElement)
            muralFeedContainer.insertBefore(noItemsP, sentinelElement);
          else muralFeedContainer.appendChild(noItemsP);
        }
      }
      noMoreFeedItems = true;
      if (sentinelElement) sentinelElement.style.display = "none"; // No more items, hide sentinel
    }
    setupFeedItemActionButtons(); // Re-attach event listeners if items were added/changed

  } catch (error) {
    console.error("Erro ao buscar feed:", error);
    const activeTabContentIdOnError = getActiveTabContentId();
    hideFeedSkeleton("content-mural");
    if (activeTabContentIdOnError !== "content-mural") {
        hideFeedSkeleton(activeTabContentIdOnError);
    }

    const currentVisibleItemsOnError = muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)");
    if (currentVisibleItemsOnError.length === 0) {
      const errorMsgCheck = muralFeedContainer.querySelector(".cv-error-message");
      if (errorMsgCheck) errorMsgCheck.remove();
      const errorP = document.createElement("p");
      errorP.className = "cv-error-message";
      errorP.textContent = "Erro ao carregar o feed. Tente novamente mais tarde.";
      if (sentinelElement) muralFeedContainer.insertBefore(errorP, sentinelElement);
      else muralFeedContainer.appendChild(errorP);
    } else if (append) {
      showGlobalFeedback("Erro ao carregar mais itens.", "error"); // Keep this for infinite scroll errors
    }
    if (sentinelElement) sentinelElement.style.display = "none"; // Stop trying to load more on error
  } finally {
    isLoadingFeedItems = false;
    // Skeletons should be hidden by now, but as a safeguard:
    const finalActiveTab = getActiveTabContentId();
    hideFeedSkeleton("content-mural");
    if(finalActiveTab !== "content-mural") hideFeedSkeleton(finalActiveTab);

    // Restore info messages for Enquetes/Solicitações if they are active and mural is empty
    if ((finalActiveTab === "content-enquetes" || finalActiveTab === "content-solicitacoes")) {
        const muralItems = muralFeedContainer.querySelectorAll(".feed-item:not(.feed-skeleton-item)");
        const infoMsg = document.querySelector(`#${finalActiveTab} .cv-info-message`);
        if (muralItems.length === 0 && infoMsg) {
            infoMsg.style.display = "block";
        }
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

  let contentHtml = `
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
      await handleEndEnquete(itemId);
    }
    return;
  }
  if (clickedElement.classList.contains("js-generate-ata-enquete-item")) {
    await handleGenerateAtaEnquete(itemId);
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

  modalEnqueteDetalheOpcoesContainer.innerHTML =
    '<p class="cv-loading-message"><span class="spinner spinner-small"></span> Carregando detalhes da enquete...</p>';
  modalEnqueteDetalheStatus.innerHTML = "";
  modalEnqueteSubmitVotoButton.style.display = "none";
  modalEnqueteDetalhe.style.display = "flex";

  try {
    const enquete = await apiClient.get(
      `/api/v1/votacoes/app/votacoes/${itemId}`
    );
    if (!enquete) {
      modalEnqueteDetalheOpcoesContainer.innerHTML =
        '<p class="cv-error-message">Enquete não encontrada.</p>';
      return;
    }
    modalEnqueteDetalheTitulo.textContent = enquete.titulo;
    modalEnqueteDetalheDescricao.innerHTML = enquete.descricao
      ? `<p>${enquete.descricao.replace(/\n/g, "<br>")}</p>`
      : "<p><em>Sem descrição adicional.</em></p>";
    if (enquete.status === "Aberta" && !enquete.usuarioJaVotou) {
      renderOpcoesDeVoto(enquete.opcoes);
      modalEnqueteSubmitVotoButton.style.display = "block";
      modalEnqueteSubmitVotoButton.onclick = () => submitVoto(itemId);
      modalEnqueteDetalheStatus.innerHTML = `<p><strong>Status:</strong> Aberta para votação.</p> <p>Prazo: ${
        enquete.dataFim
          ? new Date(enquete.dataFim).toLocaleString()
          : "Não definido"
      }</p>`;
    } else {
      renderResultadosEnquete(
        enquete.opcoes,
        enquete.status,
        enquete.usuarioJaVotou,
        enquete.dataFim
      );
    }
  } catch (error) {
    console.error("Erro ao buscar detalhes da enquete:", error);
    modalEnqueteDetalheOpcoesContainer.innerHTML =
      '<p class="cv-error-message">Erro ao carregar detalhes da enquete. Tente novamente.</p>';
    if (!error.handledByApiClient) {
      showGlobalFeedback(
        error.message || "Falha ao carregar enquete.",
        "error"
      );
    }
  }
}

function renderOpcoesDeVoto(opcoes) {
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
  const selectedOption = form.querySelector('input[name="opcaoVoto"]:checked');
  if (!selectedOption) {
    showGlobalFeedback("Por favor, selecione uma opção para votar.", "warning");
    return;
  }
  const opcaoId = selectedOption.value;
  try {
    showGlobalFeedback("Registrando seu voto...", "info");
    await apiClient.post(`/api/v1/votacoes/app/votacoes/${enqueteId}/votar`, {
      OpcaoId: opcaoId,
    });
    showGlobalFeedback("Voto registrado com sucesso!", "success");
    modalEnqueteSubmitVotoButton.style.display = "none";
    await handleEnqueteClick(enqueteId, null);
  } catch (error) {
    console.error("Erro ao registrar voto:", error);
    if (!error.handledByApiClient) {
      showGlobalFeedback(
        error.message || "Falha ao registrar o voto.",
        "error"
      );
    }
    await handleEnqueteClick(enqueteId, null);
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

  modalChamadoDetalheConteudo.innerHTML =
    '<p class="cv-loading-message"><span class="spinner spinner-small"></span> Carregando detalhes...</p>';
  modalChamadoDetalheInteracoes.innerHTML = "";

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
      modalChamadoDetalheConteudo.innerHTML =
        '<p class="cv-error-message">Item não encontrado ou acesso não permitido.</p>';
      return;
    }

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
    modalChamadoDetalheConteudo.innerHTML = `<p class="cv-error-message">Erro ao carregar detalhes de ${itemType}.</p>`;
    if (!error.handledByApiClient) {
      showGlobalFeedback(
        error.message || `Falha ao carregar ${itemType}.`,
        "error"
      );
    }
  }
}

function renderDetalhesGenerico(itemData, itemType) {
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
      html += `<img src="${fotoUrl}" alt="Foto do item" style="max-width:100px; margin:5px; border:1px solid #ddd;">`;
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

  if (!statusSelect || !respostaTextarea) {
    showGlobalFeedback(
      "Erro: Elementos do formulário de atualização do síndico não encontrados.",
      "error"
    );
    return;
  }

  const status = statusSelect.value;
  const respostaDoSindico = respostaTextarea.value.trim();

  if (!status) {
    showGlobalFeedback("O novo status do chamado é obrigatório.", "warning");
    return;
  }

  try {
    showGlobalFeedback("Atualizando chamado...", "info");
    await apiClient.put(`/api/v1/chamados/syndic/chamados/${chamadoId}`, {
      status: status,
      respostaDoSindico: respostaDoSindico,
    });
    showGlobalFeedback("Chamado atualizado com sucesso!", "success");
    if (modalChamadoDetalhe) modalChamadoDetalhe.style.display = "none";
    await loadInitialFeedItems();
  } catch (error) {
    console.error("Erro ao atualizar chamado pelo síndico:", error);
    if (!error.handledByApiClient) {
      showGlobalFeedback(
        error.message || "Falha ao atualizar o chamado.",
        "error"
      );
    }
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
  try {
    showGlobalFeedback("Criando nova enquete...", "info");
    await apiClient.post("/api/v1/votacoes/syndic/votacoes", enqueteData);
    showGlobalFeedback(
      "Nova enquete criada com sucesso! Ela aparecerá no feed.",
      "success"
    );
    await loadInitialFeedItems();
  } catch (error) {
    console.error("Erro ao criar enquete:", error);
    if (!error.handledByApiClient) {
      showGlobalFeedback(error.message || "Falha ao criar a enquete.", "error");
    }
  }
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
    showGlobalFeedback("Enquete encerrada com sucesso!", "success");
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
  try {
    showGlobalFeedback("Abrindo novo chamado...", "info");
    const dataParaApi = {
      Titulo: chamadoData.titulo,
      Descricao: `Categoria: ${chamadoData.categoria}\n\n${chamadoData.descricao}`,
      // Fotos e UnidadeId são opcionais e seriam adicionados aqui se presentes em chamadoData e suportados pelo DTO.
    };
    await apiClient.post("/api/v1/chamados/app/chamados", dataParaApi);
    showGlobalFeedback(
      "Novo chamado aberto com sucesso! Ele aparecerá no feed.",
      "success"
    );
    await loadInitialFeedItems();
  } catch (error) {
    console.error("Erro ao abrir chamado:", error);
    if (!error.handledByApiClient) {
      showGlobalFeedback(error.message || "Falha ao abrir o chamado.", "error");
    }
  }
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
    showGlobalFeedback(
      "Preencha título, descrição e categoria da ocorrência.",
      "warning"
    );
    return;
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

  try {
    showGlobalFeedback("Enviando ocorrência...", "info");
    await postWithFiles("/api/ocorrencias", formData);
    showGlobalFeedback(
      "Ocorrência criada com sucesso! Ela aparecerá no feed.",
      "success"
    );
    if (criarOcorrenciaModal) {
      criarOcorrenciaModal.style.display = "none";
    }
    formCriarOcorrencia.reset();
    if (ocorrenciaAnexosPreviewContainer) {
      ocorrenciaAnexosPreviewContainer.innerHTML = "";
    }
    await loadInitialFeedItems();
  } catch (error) {
    console.error("Erro ao criar ocorrência:", error);
    if (!error.handledByApiClient) {
      showGlobalFeedback(
        error.message || "Falha ao criar a ocorrência.",
        "error"
      );
    }
  }
}

async function postWithFiles(path, formData) {
  const token = localStorage.getItem("cv_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(
    (window.APP_CONFIG?.API_BASE_URL || "") + path,
    {
      method: "POST",
      body: formData,
      headers,
    }
  );
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ message: `Falha ${response.status}` }));
    throw new Error(data.message);
  }
  return response.headers.get("content-type")?.includes("application/json")
    ? await response.json()
    : null;
}

