import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js';

// --- Global state & constants ---
// Unified Feed (replaces Notices for Mural Tab)
let currentFeedPage = 1; isLoadingFeedItems = false; noMoreFeedItems = false;
const feedContainerSelector = '.js-avisos'; // Using existing container for Mural feed
const feedScrollSentinelId = 'notice-scroll-sentinel'; // Reusing existing sentinel ID
let fetchedFeedItems = [];

// Modals (Avisos - still used for creating content that might appear in feed)
let criarAvisoModal; let formCriarAviso; let avisoIdField;

// Modals (Enquetes)
let criarEnqueteModal; let formCriarEnquete; let enqueteIdField;
let modalEnqueteTitle; let formEnqueteSubmitButton;

// Chamados / Solicitações Modal Globals (for creating new Chamados)
let criarChamadoModal; let formCriarChamado; let chamadoIdFieldModal;
let modalChamadoTitle; let formChamadoSubmitButtonModal;
// DOM elements for the content of #content-solicitacoes (now mostly unused for display)
// These might be removed if no longer referenced by any retained modal helper functions.
let chamadosListContainer; // Points to #content-solicitacoes .js-chamados-list
let chamadoDetailSection;  // Points to #content-solicitacoes #chamado-detail-section
let chamadoDetailContent;
let chamadoDetailTitle;
let chamadosFiltersSection; // Points to #content-solicitacoes #chamados-filters-section
let chamadosListSection;   // Points to #content-solicitacoes #chamados-list-section
let backToChamadosListButton;
let submitChamadoCommentButton;
let chamadoCommentText;
let chamadoInteractionsContainer;
// Modal specific (global as modal is global)
let chamadoStatusModalFormGroup;
let chamadoCategoriaModalFormGroup;


document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();

    criarAvisoModal = document.getElementById('modal-criar-aviso');
    formCriarAviso = document.getElementById('form-criar-aviso');
    avisoIdField = document.getElementById('aviso-id');

    criarEnqueteModal = document.getElementById('modal-criar-enquete');
    formCriarEnquete = document.getElementById('form-criar-enquete');
    enqueteIdField = document.getElementById('enquete-id');
    modalEnqueteTitle = document.getElementById('modal-enquete-title');
    formEnqueteSubmitButton = document.getElementById('form-enquete-submit-button');

    criarChamadoModal = document.getElementById('modal-criar-chamado');
    formCriarChamado = document.getElementById('form-criar-chamado');
    chamadoIdFieldModal = document.getElementById('chamado-id');
    modalChamadoTitle = document.getElementById('modal-chamado-title');
    formChamadoSubmitButtonModal = document.getElementById('form-chamado-submit-button');
    // Solicitacoes (formerly Chamados) related DOM elements for its dedicated tab content (which will be mostly unused)
    // Retaining references for now in case any part of modals or existing functions are reused.
    chamadosListContainer = document.querySelector('#content-solicitacoes .js-chamados-list'); // Adjusted selector
    chamadoDetailSection = document.getElementById('chamado-detail-section'); // This is inside content-solicitacoes
    chamadoDetailContent = document.querySelector('#content-solicitacoes .js-chamado-detail-content');
    chamadoDetailTitle = document.querySelector('#content-solicitacoes .js-chamado-detail-title');
    chamadosFiltersSection = document.getElementById('chamados-filters-section'); // Inside content-solicitacoes
    chamadosListSection = document.getElementById('chamados-list-section'); // Inside content-solicitacoes
    backToChamadosListButton = document.querySelector('#content-solicitacoes .js-back-to-chamados-list');
    submitChamadoCommentButton = document.getElementById('submit-chamado-comment'); // Inside content-solicitacoes
    chamadoCommentText = document.getElementById('chamado-comment-text'); // Inside content-solicitacoes
    chamadoInteractionsContainer = document.querySelector('#content-solicitacoes .js-chamado-interactions');
    chamadoStatusModalFormGroup = document.querySelector('#modal-criar-chamado .js-chamado-status-form-group'); // Modal is global
    chamadoCategoriaModalFormGroup = document.querySelector('#modal-criar-chamado .js-chamado-categoria-form-group'); // Modal is global

    setupTabs();

    // Mural Tab (Unified Feed)
    // await loadStickyNotices(); // Removed as sticky items are part of the main feed logic
    await loadInitialFeedItems();
    setupFeedObserver();
    setupFeedContainerClickListener(); // Added for item clicks

    updateUserSpecificUI(); // This might need review if FAB actions change per tab
    setupFilterButtonListener(); // This will now apply to the feed
    setupModalEventListeners(); // Generic modal listeners (close, etc.)
});

// --- Tab System ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.cv-tab-button');
    const tabContents = document.querySelectorAll('.cv-tab-content');
    const fabMural = document.querySelector('.js-fab-mural');
    const fabEnquetes = document.querySelector('.js-fab-enquetes');
    const fabSolicitacoes = document.querySelector('.js-fab-chamados');
    const categoryFilterModal = document.getElementById('category-filter-modal'); // Get the filter dropdown

    // Ensure #content-mural is visible, others are not (as they are placeholders or managed differently)
    document.getElementById('content-mural').style.display = 'block';
    document.getElementById('content-enquetes').style.display = 'none'; // Keep placeholder hidden
    document.getElementById('content-solicitacoes').style.display = 'none'; // Keep placeholder hidden

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // FAB visibility
            if (fabMural) fabMural.style.display = 'none';
            if (fabEnquetes) fabEnquetes.style.display = 'none';
            if (fabSolicitacoes) fabSolicitacoes.style.display = 'none';

            let newCategoryFilter = ''; // Default to 'Todas'

            if (button.id === 'tab-mural') {
                if (fabMural) fabMural.style.display = 'block';
                newCategoryFilter = ''; // 'Todas'
                // Initialize create aviso modal if not done (assuming setupAvisoModalAndFAB exists or is part of general modal setup)
                if (!button.dataset.initializedMural) {
                    // setupAvisoModalAndFAB(); // Or ensure it's covered by setupModalEventListeners
                    button.dataset.initializedMural = 'true';
                }
            } else if (button.id === 'tab-enquetes') {
                if (fabEnquetes) fabEnquetes.style.display = 'block';
                newCategoryFilter = 'enquete'; // Value for filtering enquetes
                if (!button.dataset.initializedEnquetes) {
                    setupEnqueteModalAndFAB();
                    button.dataset.initializedEnquetes = 'true';
                }
            } else if (button.id === 'tab-solicitacoes') {
                if (fabSolicitacoes) fabSolicitacoes.style.display = 'block';
                newCategoryFilter = 'solicitacoes'; // Value for filtering solicitações
                if (!button.dataset.initializedSolicitacoes) {
                    setupChamadoModalAndFAB();
                    button.dataset.initializedSolicitacoes = 'true';
                }
            }

            // Apply the filter if it has changed
            if (categoryFilterModal && categoryFilterModal.value !== newCategoryFilter) {
                categoryFilterModal.value = newCategoryFilter;
                loadInitialFeedItems(); // Reload feed with the new category
            } else if (!categoryFilterModal && newCategoryFilter !== '') {
                // If filter modal doesn't exist but we want to filter, this is an issue.
                // For now, assume it exists. If it might not, we'd need to handle it.
                loadInitialFeedItems(); // Load if filter should be applied but modal wasn't there to compare
            } else if (button.dataset.initialClick !== 'true') {
                 // If it's the first click on this tab (after page load) and filter didn't change, still load.
                 // This handles the case where the default active tab on load needs its specific items.
                loadInitialFeedItems();
            }
            button.dataset.initialClick = 'true'; // Mark that this tab has been clicked at least once
        });
    });

    // Programmatically click the default active tab to apply its filter and load content
    const activeTab = document.querySelector('.cv-tab-button.active');
    if (activeTab) {
        activeTab.click(); // Trigger the click handler to set up content and FABs
    } else {
        // If no tab is active by default, activate the first one
        const firstTab = document.querySelector('.cv-tab-button');
        if (firstTab) {
            firstTab.click();
        }
    }
}


// --- Unified Feed (Mural Tab) ---
function openCriarAvisoModal() { if (criarAvisoModal && formCriarAviso && avisoIdField) { formCriarAviso.reset(); avisoIdField.value = ''; criarAvisoModal.querySelector('h2').textContent = 'Criar Novo Aviso'; formCriarAviso.querySelector('button[type="submit"]').textContent = 'Salvar Aviso'; criarAvisoModal.style.display = 'flex'; } }
// openEditAvisoModal might need to be rethought for feed items or become generic
function openEditFeedItemModal(itemType, itemId) {
    // For now, only Avisos are directly editable from feed via this old path
    if (itemType === 'Aviso') {
        const itemData = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Aviso');
        if (!itemData || !itemData.detalhesAdicionais || !itemData.detalhesAdicionais.corpo) { // Assuming corpo is in DetalhesAdicionais for Aviso
             showGlobalFeedback('Erro: Dados do aviso não encontrados para edição.', 'error'); return;
        }
        if (criarAvisoModal && formCriarAviso && avisoIdField) {
            formCriarAviso.reset();
            avisoIdField.value = itemData.id;
            document.getElementById('aviso-titulo').value = itemData.titulo || '';
            document.getElementById('aviso-corpo').value = itemData.detalhesAdicionais.corpo || '';
            // TODO: Handle categories if they are part of DetalhesAdicionais or another field
            // const categoriasSelect = document.getElementById('aviso-categorias');
            // if (itemData.categorias && categoriasSelect) { ... }
            criarAvisoModal.querySelector('h2').textContent = 'Editar Aviso';
            formCriarAviso.querySelector('button[type="submit"]').textContent = 'Salvar Alterações';
            criarAvisoModal.style.display = 'flex';
        }
    } else {
        showGlobalFeedback(`Edição para ${itemType} ainda não implementada diretamente do feed.`, 'info');
    }
}
function closeCriarAvisoModal() { if (criarAvisoModal) criarAvisoModal.style.display = 'none'; }
function setupModalEventListeners() {
    document.querySelectorAll('.js-modal-criar-aviso-close').forEach(btn => btn.addEventListener('click', closeCriarAvisoModal));
    if (criarAvisoModal) window.addEventListener('click', (event) => { if (event.target === criarAvisoModal) closeCriarAvisoModal(); });

    if (formCriarAviso && avisoIdField) {
        formCriarAviso.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentAvisoId = avisoIdField.value;
            // This is a simplified simulation. Real implementation would call apiClient.post or .put
            if (currentAvisoId) {
                showGlobalFeedback('Salvando alterações do aviso... (simulado)', 'info');
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                showGlobalFeedback('Aviso atualizado! (simulado)', 'success');
            } else {
                showGlobalFeedback('Criando novo aviso... (simulado)', 'info');
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 1000));
                showGlobalFeedback('Aviso criado! (simulado)', 'success');
            }
            closeCriarAvisoModal();
            await loadInitialFeedItems(); // Reload feed to show changes/new item
        });
    }
}
function setupFeedItemActionButtons() {
    // Edit action (currently specific to Aviso type for simplicity)
    document.querySelectorAll('.js-edit-feed-item').forEach(button => {
        const newButton = button.cloneNode(true); // Avoid duplicate listeners
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (event) => {
            const itemType = event.target.dataset.itemType;
            const itemId = event.target.dataset.itemId; // Ensure IDs are strings if Guids
            openEditFeedItemModal(itemType, itemId);
        });
    });

    // Delete action (currently specific to Aviso type for simplicity)
    document.querySelectorAll('.js-delete-feed-item').forEach(button => {
        const newButton = button.cloneNode(true); // Avoid duplicate listeners
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', async (event) => {
            const itemType = event.target.dataset.itemType;
            const itemId = event.target.dataset.itemId;
            if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
                // For now, only simulate delete for Avisos
                if (itemType === "Aviso") {
                    await handleDeleteAviso(itemId); // Assuming this function is adapted or still relevant
                } else {
                    showGlobalFeedback(`Exclusão para ${itemType} não implementada. (simulado)`, 'info');
                }
            }
        });
    });
}
async function handleDeleteAviso(itemId) { // Parameter changed to itemId
    showGlobalFeedback('Excluindo aviso... (simulado)', 'info');
    await new Promise(resolve => setTimeout(resolve, 1000));
    // This would be an API call: await apiClient.delete(`/api/v1/avisos/${itemId}`);
    fetchedFeedItems = fetchedFeedItems.filter(i => !(i.id === itemId && i.itemType === 'Aviso'));
    const cardToRemove = document.querySelector(`${feedContainerSelector} .cv-card[data-item-id="${itemId}"][data-item-type="Aviso"]`);
    if (cardToRemove) {
        cardToRemove.remove();
    } else {
        // If card not found (e.g. due to UI changes), reload the whole feed as a fallback
        await loadInitialFeedItems();
    }
    showGlobalFeedback('Aviso excluído! (simulado)', 'success');
}

function updateUserSpecificUI() {
    const fabMural = document.querySelector('.js-fab-mural');
    if (fabMural) {
        fabMural.style.display = 'block'; // Or based on user role for creating Avisos
        fabMural.addEventListener('click', openCriarAvisoModal);
    }
    // Update other FABs based on current tab or general permissions
    const currentActiveTabId = activeTabId || document.querySelector('.cv-tab-button.active')?.id;
    const fabEnquetes = document.querySelector('.js-fab-enquetes');
    const fabSolicitacoes = document.querySelector('.js-fab-chamados');

    // Hide all FABs first
    if (fabMural) fabMural.style.display = 'none';
    if (fabEnquetes) fabEnquetes.style.display = 'none';
    if (fabSolicitacoes) fabSolicitacoes.style.display = 'none';

    // Show the correct FAB based on the active tab
    if (currentActiveTabId === 'tab-mural') {
        if (fabMural) {
            fabMural.style.display = 'block';
            // Ensure event listener is attached (it's currently attached in DOMContentLoaded, which is fine)
        }
    } else if (currentActiveTabId === 'tab-enquetes') {
        if (fabEnquetes) {
            fabEnquetes.style.display = 'block';
            // Event listener for fabEnquetes is attached in setupEnqueteModalAndFAB
        }
    } else if (currentActiveTabId === 'tab-solicitacoes') {
        if (fabSolicitacoes) {
            fabSolicitacoes.style.display = 'block';
            // Event listener for fabSolicitacoes is attached in setupChamadoModalAndFAB
        }
    }
}
function setupFilterButtonListener() {
    const btn = document.getElementById('apply-filters-button');
    if (btn) btn.addEventListener('click', () => {
        // Filter values are now read directly in fetchAndDisplayFeedItems
        showGlobalFeedback("Aplicando filtros ao feed...", 'info');
        loadInitialFeedItems();
    });
}
async function loadInitialFeedItems() {
    currentFeedPage = 1;
    noMoreFeedItems = false;
    isLoadingFeedItems = false;
    // fetchedFeedItems = []; // Do not clear here if filters are meant to preserve existing items before new load
    const container = document.querySelector(feedContainerSelector);
    if (!container) return;

    let sentinel = document.getElementById(feedScrollSentinelId);
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = feedScrollSentinelId;
        sentinel.style.height = '10px';
        if (container.lastChild?.id !== feedScrollSentinelId) {
            container.appendChild(sentinel);
        }
    }
    sentinel.style.display = 'block';

    await fetchAndDisplayFeedItems(currentFeedPage, false); // `false` for append means clear container
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
    const container = document.querySelector(feedContainerSelector);
    if (!container) { isLoadingFeedItems = false; return; }

    const sentinelElement = document.getElementById(feedScrollSentinelId);
    const loadingMessageClass = 'cv-loading-message';

    if (!append) {
        // fetchedFeedItems = []; // Clearing here means filters always start fresh.
        container.innerHTML = '';
        if (sentinelElement) container.appendChild(sentinelElement);

        const loadingP = document.createElement('p');
        loadingP.className = loadingMessageClass;
        loadingP.textContent = 'Carregando feed...';
        if (sentinelElement) container.insertBefore(loadingP, sentinelElement);
        else container.appendChild(loadingP);
    } else {
        if (sentinelElement && sentinelElement.previousSibling?.className !== loadingMessageClass) {
             const loadingP = document.createElement('p');
             loadingP.className = loadingMessageClass;
             loadingP.textContent = 'Carregando mais itens...';
             container.insertBefore(loadingP, sentinelElement);
        }
    }

    const categoriaFilter = document.getElementById('category-filter')?.value || null;
    const periodoFilterInput = document.getElementById('period-filter')?.value;
    let periodoInicio = null, periodoFim = null;
    if (periodoFilterInput) {
        const [year, monthStr] = periodoFilterInput.split('-');
        const yearNum = parseInt(year);
        const monthNum = parseInt(monthStr);
        periodoInicio = new Date(yearNum, monthNum - 1, 1);
        periodoFim = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    }

    try {
        const response = await apiClient.get('/api/v1/feed', {
            pageNumber: page,
            pageSize: 10,
            categoria: categoriaFilter,
            periodoInicio: periodoInicio ? periodoInicio.toISOString() : null,
            periodoFim: periodoFim ? periodoFim.toISOString() : null
        });

        const items = response;

        const loadingP = container.querySelector(`.${loadingMessageClass}`);
        if (loadingP) loadingP.remove();

        if (!append) {
             container.innerHTML = '';
             if (sentinelElement) container.appendChild(sentinelElement);
        }

        if (items && items.length > 0) {
            if (!append) fetchedFeedItems = []; // Clear if it's a fresh load (page 1, not appending)
            items.forEach(item => {
                const itemElement = renderFeedItem(item);
                if (sentinelElement) container.insertBefore(itemElement, sentinelElement);
                else container.appendChild(itemElement);
            });
            fetchedFeedItems.push(...items); // Add new items to the list
        } else {
            if (page > 1) {
                noMoreFeedItems = true;
                if (sentinelElement) sentinelElement.style.display = 'none';
            } else if (!append) { // Page 1 and no items
                 container.innerHTML = '<p>Nenhum item encontrado para os filtros atuais.</p>';
                 if (sentinelElement) container.appendChild(sentinelElement);
                 if (sentinelElement) sentinelElement.style.display = 'none';
            }
        }
        setupFeedItemActionButtons();
    } catch (error) {
        console.error("Erro ao buscar feed:", error);
        const loadingP = container.querySelector(`.${loadingMessageClass}`);
        if (loadingP) loadingP.remove();
        if (!append) {
            container.innerHTML = '<p class="cv-error-message">Erro ao carregar o feed. Tente novamente mais tarde.</p>';
            if (sentinelElement) container.appendChild(sentinelElement);
        } else {
            showGlobalFeedback("Erro ao carregar mais itens.", "error");
        }
    } finally {
        isLoadingFeedItems = false;
    }
}

function renderFeedItem(item) {
    const card = document.createElement('article');
    card.className = `cv-card feed-item feed-item-${item.itemType.toLowerCase()} prio-${item.prioridadeOrdenacao}`;
    card.dataset.itemId = item.id;
    card.dataset.itemType = item.itemType;

    const pinLabel = item.prioridadeOrdenacao === 0 ? '<span class="feed-item__pin">Fixo</span>' : '';
    let contentHtml = `
        <h3 class="feed-item__title">${pinLabel} ${item.titulo}</h3>
        <p class="feed-item__summary">${item.resumo}</p>
        <div class="feed-item__meta">
            <span class="feed-item__type">Tipo: ${item.itemType}</span>
            <span class="feed-item__date">Data: ${new Date(item.dataHoraPrincipal).toLocaleString()}</span>
            ${item.status ? `<span class="feed-item__status">Status: ${item.status}</span>` : ''}
            ${item.categoria ? `<span class="feed-item__category">Categoria: ${item.categoria}</span>` : ''}
        </div>
    `;

    // Basic actions - Details link and specific actions for some types
    let actionsHtml = `<div class="feed-item__actions">`;
    if (item.urlDestino) {
        // For now, assume urlDestino is a relative path for internal navigation
        // In future, this could be a full URL or trigger a JS function
        actionsHtml += `<a href="${item.urlDestino}" class="cv-button-link js-view-item-detail">Ver Detalhes</a>`;
    }

    // Example: Add edit/delete for Avisos (if user has permission - not checked here)
    if (item.itemType === 'Aviso') {
        actionsHtml += `<button class="cv-button-link js-edit-feed-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Editar</button>`;
        actionsHtml += `<button class="cv-button-link danger js-delete-feed-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Excluir</button>`;
    }
    // TODO: Add specific actions for other item types as needed

    actionsHtml += `</div>`;
    card.innerHTML = contentHtml + actionsHtml;
    return card;
}

function setupFeedContainerClickListener() {
    const container = document.querySelector(feedContainerSelector);
    if (container) {
        container.addEventListener('click', handleFeedItemClick);
    }
}

async function handleFeedItemClick(event) {
    const clickedElement = event.target;

    // Find the card element for item ID and type
    const cardElement = clickedElement.closest('.feed-item');
    if (!cardElement) return;

    const itemId = cardElement.dataset.itemId;
    const itemType = cardElement.dataset.itemType;

    if (!itemId || !itemType) return;

    // Specific button actions within a card
    if (clickedElement.classList.contains('js-edit-feed-item')) {
        // Assumes edit is primarily for 'Aviso' for now via existing modal
        if (itemType === 'Aviso') {
            openEditFeedItemModal(itemType, itemId);
        } else {
            showGlobalFeedback(`Edição para ${itemType} não implementada aqui.`, 'info');
        }
        return;
    }

    if (clickedElement.classList.contains('js-delete-feed-item')) {
         // Assumes delete is primarily for 'Aviso' for now
        if (itemType === 'Aviso') {
            if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
                await handleDeleteAviso(itemId);
            }
        } else {
            showGlobalFeedback(`Exclusão para ${itemType} não implementada aqui.`, 'info');
        }
        return;
    }

    // Generic click on the card or "View Details" link
    // The 'js-view-item-detail' class can be on the <a> tag generated in renderFeedItem
    if (clickedElement.classList.contains('js-view-item-detail') || event.currentTarget === cardElement) {
        // If a specific "View Details" link is clicked, or if the click is on the card itself (but not on other buttons)
        // This simple check might need refinement if cards have many interactive elements.
        // For now, any click not on edit/delete on an Aviso, or any click on other item types, goes to specific handlers.

        switch (itemType) {
            case 'Aviso':
                handleAvisoClick(itemId, cardElement); // Pass cardElement or specific target
                break;
            case 'Enquete':
                handleEnqueteClick(itemId, cardElement);
                break;
            case 'Chamado':
                handleChamadoClick(itemId, cardElement);
                break;
            case 'Ocorrencia':
                handleOcorrenciaClick(itemId, cardElement);
                break;
            case 'Documento':
                handleDocumentoClick(itemId, cardElement);
                break;
            case 'Reserva':
                handleReservaClick(itemId, cardElement);
                break;
            case 'Encomenda':
                handleEncomendaClick(itemId, cardElement);
                break;
            case 'BoletoLembrete':
                handleBoletoLembreteClick(itemId, cardElement);
                break;
            default:
                showGlobalFeedback(`Interação para tipo '${itemType}' não definida.`, 'info');
                break;
        }
    }
}

// Specific Click Handlers
function handleAvisoClick(itemId, targetElementOrCard) {
    // Default action for Aviso click (if not edit/delete) could be to show details
    // For now, it's handled by edit/delete or the generic UrlDestino.
    // If a specific detail view is needed beyond what urlDestino provides:
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Aviso');
    if (item) {
        // Example: open a read-only modal or navigate
        // If item.urlDestino is used by js-view-item-detail, this might be redundant
        // unless the card itself is clickable to mean "details".
        showGlobalFeedback(`Visualizando Aviso: ${item.titulo}`, 'info');
        // Potentially open a modal with item.detalhesAdicionais.corpo etc.
        // Or rely on the generic UrlDestino navigation if that's the primary way.
        if(item.urlDestino && !targetElementOrCard.classList.contains('js-edit-feed-item') && !targetElementOrCard.classList.contains('js-delete-feed-item')) {
             // If urlDestino is meant to be a page navigation:
             // window.location.href = item.urlDestino;
             // If it's for a modal or specific JS action:
             console.log(`Aviso item ${itemId} clicked, target:`, targetElementOrCard, `URL: ${item.urlDestino}`);
        }
    }
}

function handleEnqueteClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Enquete');
    if (!item) {
        showGlobalFeedback('Detalhes da enquete não encontrados no feed local.', 'error');
        return;
    }
    openEnqueteDetalheModal(itemId);
}

async function openEnqueteDetalheModal(enqueteId) {
    const modal = document.getElementById('modal-enquete-detalhe');
    const tituloEl = document.getElementById('modal-enquete-detalhe-titulo');
    const descricaoEl = document.getElementById('modal-enquete-detalhe-descricao');
    const opcoesContainerEl = document.getElementById('modal-enquete-detalhe-opcoes-container');
    const statusEl = document.getElementById('modal-enquete-detalhe-status');
    const votarBtn = document.getElementById('modal-enquete-submit-voto');
    const fecharBtn = modal.querySelector('.js-modal-enquete-detalhe-close');

    if (!modal || !tituloEl || !descricaoEl || !opcoesContainerEl || !statusEl || !votarBtn || !fecharBtn) {
        console.error("Elementos do modal de detalhe da enquete não encontrados.");
        return;
    }

    // Clear previous content
    tituloEl.textContent = 'Carregando enquete...';
    descricaoEl.innerHTML = '';
    opcoesContainerEl.innerHTML = '';
    statusEl.innerHTML = '';
    votarBtn.style.display = 'none';
    votarBtn.onclick = null; // Remove previous listener

    modal.style.display = 'flex';

    try {
        // Path updated based on VotacoesController
        const enqueteDetalhe = await apiClient.get(`/api/v1/Votacoes/app/votacoes/${enqueteId}`);

        tituloEl.textContent = enqueteDetalhe.titulo;
        descricaoEl.innerHTML = enqueteDetalhe.descricao ? `<p>${enqueteDetalhe.descricao.replace(/\n/g, '<br>')}</p>` : '<p><em>Sem descrição adicional.</em></p>';

        let statusContent = `Status: ${enqueteDetalhe.status}`;
        if (enqueteDetalhe.dataFim) {
            statusContent += ` | Termina em: ${new Date(enqueteDetalhe.dataFim).toLocaleString()}`;
        }
        statusEl.innerHTML = statusContent;

        if (enqueteDetalhe.status !== 'Aberta' || enqueteDetalhe.usuarioJaVotou) {
            // Poll closed or user already voted - show results
            opcoesContainerEl.innerHTML = '<h4>Resultados:</h4>';
            if (enqueteDetalhe.opcoes && enqueteDetalhe.opcoes.length > 0) {
                const totalVotos = enqueteDetalhe.opcoes.reduce((sum, opt) => sum + opt.quantidadeVotos, 0);
                enqueteDetalhe.opcoes.forEach(opcao => {
                    const percentual = totalVotos > 0 ? ((opcao.quantidadeVotos / totalVotos) * 100).toFixed(1) : 0;
                    const resultadoDiv = document.createElement('div');
                    resultadoDiv.className = 'enquete-resultado-opcao';
                    resultadoDiv.innerHTML = `
                        <p>${opcao.descricao}: ${opcao.quantidadeVotos} voto(s) (${percentual}%)</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${percentual}%;"></div>
                        </div>
                    `;
                    opcoesContainerEl.appendChild(resultadoDiv);
                });
                if (enqueteDetalhe.usuarioJaVotou) {
                     const jaVotouMsg = document.createElement('p');
                     jaVotouMsg.style.marginTop = '10px';
                     jaVotouMsg.innerHTML = '<em>Você já votou nesta enquete.</em>';
                     opcoesContainerEl.appendChild(jaVotouMsg);
                }
            } else {
                opcoesContainerEl.innerHTML += '<p>Ainda não há resultados ou opções para esta enquete.</p>';
            }
            votarBtn.style.display = 'none';
        } else {
            // Poll is open and user has not voted - show options for voting
            opcoesContainerEl.innerHTML = '<h4>Opções:</h4>';
            if (enqueteDetalhe.opcoes && enqueteDetalhe.opcoes.length > 0) {
                enqueteDetalhe.opcoes.forEach(opcao => {
                    const label = document.createElement('label');
                    label.className = 'cv-radio-option';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = 'enquete_opcao';
                    input.value = opcao.id;
                    input.required = true;
                    label.appendChild(input);
                    label.appendChild(document.createTextNode(` ${opcao.descricao}`));
                    opcoesContainerEl.appendChild(label);
                });
                votarBtn.style.display = 'block';
                votarBtn.dataset.enqueteId = enqueteId; // Store enqueteId for the submit handler
                votarBtn.onclick = handleSubmitVoto; // Assign new listener
            } else {
                opcoesContainerEl.innerHTML += '<p>Não há opções de voto disponíveis.</p>';
                votarBtn.style.display = 'none';
            }
        }

    } catch (error) {
        console.error("Erro ao buscar detalhes da enquete:", error);
        tituloEl.textContent = 'Erro ao carregar enquete';
        descricaoEl.innerHTML = `<p class="cv-error-message">Não foi possível carregar os detalhes: ${error.message}</p>`;
    }

    // Ensure close button works
    const currentCloseHandler = () => {
        modal.style.display = 'none';
        fecharBtn.removeEventListener('click', currentCloseHandler); // Clean up listener
    };
    fecharBtn.addEventListener('click', currentCloseHandler);

    // Close on clicking outside modal content
    const currentWindowClickHandler = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            window.removeEventListener('click', currentWindowClickHandler); // Clean up listener
        }
    };
    window.addEventListener('click', currentWindowClickHandler);
}


async function handleSubmitVoto(event) {
    const votarBtn = event.target;
    const enqueteId = votarBtn.dataset.enqueteId;
    const opcoesContainerEl = document.getElementById('modal-enquete-detalhe-opcoes-container');
    const selectedOptionInput = opcoesContainerEl.querySelector('input[name="enquete_opcao"]:checked');

    if (!selectedOptionInput) {
        showGlobalFeedback('Por favor, selecione uma opção para votar.', 'warning');
        return;
    }
    const opcaoId = selectedOptionInput.value;

    try {
        // Path updated
        await apiClient.post(`/api/v1/Votacoes/app/votacoes/${enqueteId}/votar`, { opcaoId });
        showGlobalFeedback('Voto registrado com sucesso!', 'success');
        votarBtn.style.display = 'none';
        // Refresh modal content to show results
        await openEnqueteDetalheModal(enqueteId);
        // Optionally, refresh the main feed if the item's appearance might change (e.g., status in summary)
        loadInitialFeedItems(); // This will re-fetch and re-render all items
    } catch (error) {
        console.error("Erro ao registrar voto:", error);
        let errorMessage = 'Erro ao registrar voto.';
        if (error.response && error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
        } else if (error.message) {
            errorMessage = error.message;
        }
        // Specific handling for 409 Conflict (already voted)
        if (error.response && error.response.status === 409) {
            errorMessage = "Você já votou nesta enquete.";
            // Refresh modal to show results, as the user might have voted in another session
            await openEnqueteDetalheModal(enqueteId);
        }
        showGlobalFeedback(errorMessage, 'error');
    }
}

function handleChamadoClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Chamado');
    if (!item) {
        showGlobalFeedback('Detalhes do chamado não encontrados no feed local.', 'error');
        return;
    }
    openChamadoDetalheModal(itemId);
}

async function openChamadoDetalheModal(chamadoId) {
    const modal = document.getElementById('modal-chamado-detalhe');
    const tituloEl = document.getElementById('modal-chamado-detalhe-titulo');
    const conteudoEl = document.getElementById('modal-chamado-detalhe-conteudo');
    const interacoesEl = document.getElementById('modal-chamado-detalhe-interacoes');
    const sindicoUpdateSection = document.getElementById('sindico-chamado-update-section');
    const statusSelect = document.getElementById('modal-chamado-status-select');
    const respostaTextarea = document.getElementById('modal-chamado-resposta-textarea');
    const submitSindicoUpdateBtn = document.getElementById('modal-chamado-submit-sindico-update');
    const addCommentSection = document.getElementById('modal-chamado-add-comment-section');
    const commentTextarea = document.getElementById('modal-chamado-comment-text');
    const submitCommentBtn = document.getElementById('modal-chamado-submit-comment');
    const fecharBtn = modal.querySelector('.js-modal-chamado-detalhe-close');

    // Clear previous content
    tituloEl.textContent = 'Carregando chamado...';
    conteudoEl.innerHTML = '';
    interacoesEl.innerHTML = '<h4>Histórico de Interações:</h4>';
    sindicoUpdateSection.style.display = 'none';
    addCommentSection.style.display = 'none';
    submitSindicoUpdateBtn.onclick = null;
    submitCommentBtn.onclick = null;

    modal.style.display = 'flex';

    try {
        // Determine user role (simplified - real app would use a more robust check from auth context)
        const userRole = localStorage.getItem('userRole') || 'Condomino'; // Example: 'Sindico', 'Condomino'
        const isSindico = userRole === 'Sindico';

        const endpoint = isSindico ? `/api/v1/Chamados/syndic/chamados/${chamadoId}` : `/api/v1/Chamados/app/chamados/${chamadoId}`;
        const chamadoDetalhe = await apiClient.get(endpoint);

        tituloEl.textContent = `Chamado: ${chamadoDetalhe.titulo}`;

        let conteudoHtml = `
            <p><strong>ID:</strong> ${chamadoDetalhe.id}</p>
            <p><strong>Status:</strong> ${chamadoDetalhe.status}</p>
            <p><strong>Categoria:</strong> ${chamadoDetalhe.categoria}</p>
            <p><strong>Aberto em:</strong> ${new Date(chamadoDetalhe.dataAbertura).toLocaleString()}</p>
            ${chamadoDetalhe.dataResolucao ? `<p><strong>Resolvido em:</strong> ${new Date(chamadoDetalhe.dataResolucao).toLocaleString()}</p>` : ''}
            <p><strong>Descrição:</strong></p>
            <div class="cv-well">${chamadoDetalhe.descricao ? chamadoDetalhe.descricao.replace(/\n/g, '<br>') : 'N/A'}</div>
        `;
        // TODO: Display attachments if present in chamadoDetalhe.anexos
        conteudoEl.innerHTML = conteudoHtml;

        // Render interactions (assuming chamadoDetalhe.interacoes is an array)
        if (chamadoDetalhe.interacoes && chamadoDetalhe.interacoes.length > 0) {
            chamadoDetalhe.interacoes.forEach(int => {
                const p = document.createElement('p');
                p.innerHTML = `<strong>${new Date(int.dataHora).toLocaleString()} - ${int.autor}:</strong> ${int.texto}`;
                interacoesEl.appendChild(p);
            });
        } else {
            interacoesEl.innerHTML += '<p><em>Nenhuma interação registrada.</em></p>';
        }

        // Setup Síndico actions
        if (isSindico && chamadoDetalhe.status !== 'Concluido' && chamadoDetalhe.status !== 'Cancelado') { // Example condition
            sindicoUpdateSection.style.display = 'block';
            statusSelect.value = chamadoDetalhe.status; // Assuming status values match
            respostaTextarea.value = ''; // Clear previous
            submitSindicoUpdateBtn.style.display = 'block';
            submitSindicoUpdateBtn.dataset.chamadoId = chamadoId;
            submitSindicoUpdateBtn.onclick = handleSindicoChamadoUpdate;
        }

        // Setup Add Comment (for user or Sindico, if applicable)
        // For now, only if not Concluido/Cancelado. More complex logic might be needed.
        if (chamadoDetalhe.status !== 'Concluido' && chamadoDetalhe.status !== 'Cancelado') {
            addCommentSection.style.display = 'block';
            commentTextarea.value = '';
            submitCommentBtn.dataset.chamadoId = chamadoId;
            submitCommentBtn.onclick = handleAddChamadoComment;
        }

    } catch (error) {
        console.error("Erro ao buscar detalhes do chamado:", error);
        tituloEl.textContent = 'Erro ao carregar chamado';
        conteudoEl.innerHTML = `<p class="cv-error-message">Não foi possível carregar os detalhes: ${error.message}</p>`;
    }

    const currentCloseHandler = () => {
        modal.style.display = 'none';
        fecharBtn.removeEventListener('click', currentCloseHandler);
    };
    fecharBtn.addEventListener('click', currentCloseHandler);

    const currentWindowClickHandler = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            window.removeEventListener('click', currentWindowClickHandler);
        }
    };
    window.addEventListener('click', currentWindowClickHandler);
}

async function handleSindicoChamadoUpdate(event) {
    const chamadoId = event.target.dataset.chamadoId;
    const status = document.getElementById('modal-chamado-status-select').value;
    const resposta = document.getElementById('modal-chamado-resposta-textarea').value;

    const updateDto = { status, respostaDoSindico: resposta }; // Assuming ChamadoUpdateDto structure

    try {
        await apiClient.put(`/api/v1/Chamados/syndic/chamados/${chamadoId}`, updateDto);
        showGlobalFeedback('Chamado atualizado com sucesso!', 'success');
        await openChamadoDetalheModal(chamadoId); // Refresh modal
        loadInitialFeedItems(); // Refresh feed
    } catch (error) {
        console.error("Erro ao atualizar chamado:", error);
        showGlobalFeedback(`Erro ao atualizar chamado: ${error.message || 'Erro desconhecido'}`, 'error');
    }
}

async function handleAddChamadoComment(event) {
    const chamadoId = event.target.dataset.chamadoId;
    const comentario = document.getElementById('modal-chamado-comment-text').value;

    if (!comentario.trim()) {
        showGlobalFeedback('O comentário não pode estar vazio.', 'warning');
        return;
    }

    // Assuming a DTO like { texto: comentario } for the comment endpoint
    // And an endpoint like POST /api/v1/Chamados/app/chamados/{id}/comments
    try {
        // TODO: Replace with actual API call when endpoint is available
        // await apiClient.post(`/api/v1/Chamados/app/chamados/${chamadoId}/comments`, { texto: comentario });
        console.log(`Simulating add comment to ${chamadoId}: ${comentario}`);
        showGlobalFeedback('Comentário adicionado (simulado). Endpoint de comentários pendente.', 'info');
        // On actual success:
        // document.getElementById('modal-chamado-comment-text').value = ''; // Clear textarea
        // await openChamadoDetalheModal(chamadoId); // Refresh modal to show new comment
        // loadInitialFeedItems(); // Refresh feed if summaries change
    } catch (error) {
        console.error("Erro ao adicionar comentário:", error);
        showGlobalFeedback(`Erro ao adicionar comentário: ${error.message || 'Erro desconhecido'}`, 'error');
    }
}


function handleOcorrenciaClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Ocorrencia');
    showGlobalFeedback(`Ocorrência: ${item?.titulo || itemId}. Detalhes da ocorrência seriam exibidos aqui.`, 'info', 5000);
}

function handleDocumentoClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Documento');
    if (item && item.urlDestino) {
        window.open(item.urlDestino, '_blank');
    } else {
        showGlobalFeedback(`Documento: ${item?.titulo || itemId}. URL não encontrada.`, 'warning');
    }
}

function handleReservaClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Reserva');
    showGlobalFeedback(`Reserva: ${item?.titulo || itemId}. Detalhes da reserva seriam exibidos aqui.`, 'info', 5000);
}

function handleEncomendaClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'Encomenda');
    showGlobalFeedback(`Encomenda: ${item?.titulo || itemId}. Detalhes da encomenda seriam exibidos aqui.`, 'info', 5000);
}

function handleBoletoLembreteClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id === itemId && i.itemType === 'BoletoLembrete');
    if (item && item.urlDestino) {
        // Assuming urlDestino for boleto might be a link to second via or payment page
        window.open(item.urlDestino, '_blank');
    } else {
        showGlobalFeedback(`Boleto: ${item?.titulo || itemId}. Link para detalhes não disponível.`, 'info');
    }
}


// --- Enquetes e Votações Tab ---
// Sample data (active and past polls) are removed as enquetes now come from the unified feed.
// let userVotes = { 'poll2': 'opt2_1' }; // Example user vote data - interactions will be handled differently

function setupEnquetesTab() {
    console.log("Enquetes tab activated - filters main feed.");
    // Primary logic is now in setupTabs to set filter and reload main feed.
    // This function handles one-time setup for this tab's *filter mode* and its specific creation modal.

    // Old data loading and rendering functions (loadActiveEnquetes, loadHistoricoEnquetes, viewPollResults, etc.)
    // that populated #content-enquetes are removed.
    // The content for enquetes will be displayed in the main feed container on the Mural tab.

    // Setup for "Nova Enquete" FAB and modal. This is still needed.
    setupEnqueteModalAndFAB();

    // Filters specific to the old #content-enquetes (like #apply-enquete-filters-button)
    // are no longer primary for displaying enquetes, as the main feed filters are used.
    // If specific sub-filtering for enquetes (beyond what the main feed offers) is needed
    // when this tab is active, that would be a new feature. For now, removing old filter setup.
    // setupEnquetesFilters(); // This was for the old dedicated historic view.

    // The #content-enquetes div might show a helper message.
    const enquetesContent = document.getElementById('content-enquetes');
    if (enquetesContent && !enquetesContent.querySelector('.cv-info-message')) {
        // enquetesContent.innerHTML = '<p class="cv-info-message">As enquetes são exibidas no Mural principal, filtradas por esta categoria.</p>';
    }
}

// openCreateEnqueteModal and modal interactions are still needed for creating new enquetes.
function openCreateEnqueteModal() {
    if (criarEnqueteModal) {
        formCriarEnquete.reset();
        enqueteIdField.value = '';
        modalEnqueteTitle.textContent = 'Nova Enquete';
        formEnqueteSubmitButton.textContent = 'Salvar Enquete';
        criarEnqueteModal.style.display = 'flex';
    }
}

// handleCreateEnquete and handleUpdateEnquete would now be API calls.
// For this subtask, they are simplified to reflect they are called.
// After creation/update, the main feed should be refreshed to show changes.
async function handleCreateEnquete(data) {
    console.log("Creating enquete:", data);
    // This would be an API call: await apiClient.post('/api/v1/votacoes', data);
    try {
        const novaEnquete = await apiClient.post('/api/v1/Votacoes/syndic/votacoes', data); // Adjusted path
        showGlobalFeedback('Nova enquete criada com sucesso! Ela aparecerá no feed.', 'success');
        if (document.getElementById('tab-mural').classList.contains('active') ||
            document.getElementById('category-filter-modal')?.value === 'enquete') { // Check modal filter
           loadInitialFeedItems();
        }
        console.log("Enquete criada:", novaEnquete);
    } catch (error) {
        console.error("Erro ao criar enquete:", error);
        showGlobalFeedback(`Erro ao criar enquete: ${error.message || 'Erro desconhecido'}`, 'error');
    }
}
async function handleUpdateEnquete(id, data) {
    console.log("Updating enquete:", id, data);
    // TODO: Implement API call to PUT /api/v1/Votacoes/syndic/votacoes/{id} when backend endpoint is available
    showGlobalFeedback('Funcionalidade de atualizar enquete ainda não implementada no backend. (simulado)', 'info');
    // try {
    //     await apiClient.put(`/api/v1/Votacoes/syndic/votacoes/${id}`, data);
    //     showGlobalFeedback('Enquete atualizada com sucesso!', 'success');
    //     if (document.getElementById('tab-mural').classList.contains('active') ||
    //         document.getElementById('category-filter-modal')?.value === 'enquete') {
    //        loadInitialFeedItems();
    //     }
    // } catch (error) {
    //     console.error("Erro ao atualizar enquete:", error);
    //     showGlobalFeedback(`Erro ao atualizar enquete: ${error.message || 'Erro desconhecido'}`, 'error');
    // }
}

// This sets up the "Nova Enquete" FAB and the "Criar Enquete" modal.
function setupEnqueteModalAndFAB() {
    const fab = document.querySelector('.js-fab-enquetes');
    if (fab) {
        // Visibility is controlled by updateUserSpecificUI
        fab.addEventListener('click', openCreateEnqueteModal);
    }
    if (criarEnqueteModal) {
        document.querySelectorAll('.js-modal-criar-enquete-close').forEach(b => b.addEventListener('click', () => criarEnqueteModal.style.display = 'none'));
        window.addEventListener('click', e => { if (e.target === criarEnqueteModal) criarEnqueteModal.style.display = 'none'; });
    }
    if (formCriarEnquete) {
        formCriarEnquete.addEventListener('submit', async e => {
            e.preventDefault();
            const id = enqueteIdField.value;
            const data = {
                pergunta: document.getElementById('enquete-pergunta').value,
                opcoes: document.getElementById('enquete-opcoes').value.split('\n').filter(opt => opt.trim() !== ''),
                prazo: document.getElementById('enquete-prazo').value,
                tipo: document.getElementById('enquete-tipo').value
            };
            if (id) await handleUpdateEnquete(id, data);
            else await handleCreateEnquete(data);
            if (criarEnqueteModal) criarEnqueteModal.style.display = 'none';
        });
    }
}

// Old Enquete helper functions that are no longer needed as Enquetes are part of the feed:
// loadActiveEnquetes, attachEnqueteAdminActionListeners, openEditEnqueteModal (for direct edit from old list),
// handleEndEnquete, handleDeleteEnquete (direct from old list),
// attachVoteButtonListeners, attachViewResultsButtonListeners, getWinningOptionText,
// loadHistoricoEnquetes, viewPollResults, setupEnquetesFilters.
// Retain openCreateEnqueteModal, handleCreateEnquete, handleUpdateEnquete (as API stubs), setupEnqueteModalAndFAB.


// --- Solicitações Tab (formerly Chamados) ---
// The 'sampleChamados' array is removed as data comes from the feed.

// These formatters can be useful for rendering feed items of type Chamado/Ocorrencia if needed.
// Or if the "Criar Chamado" modal needs to display these formatted values.
function formatChamadoStatus(status) {
    const map = { 'aberto': 'Aberto', 'em_andamento': 'Em Andamento', 'concluido': 'Concluído' };
    return map[status] || status;
}
function formatChamadoCategoria(categoria) {
    const map = { 'limpeza': 'Limpeza', 'seguranca': 'Segurança', 'manutencao_geral': 'Manutenção Geral', 'barulho': 'Barulho', 'outros': 'Outros' };
    return map[categoria] || categoria;
}

// Renamed from setupChamadosTab
function setupSolicitacoesTab() {
    console.log("Solicitações tab activated - filters main feed.");
    // Primary logic is now in setupTabs to set filter and reload main feed.
    // This function handles one-time setup for this tab's *filter mode* and its specific creation modal.

    setupChamadoModalAndFAB(); // This sets up the modal for creating new Chamados (a type of Solicitação)

    const solicitacoesContent = document.getElementById('content-solicitacoes');
    if (solicitacoesContent && !solicitacoesContent.querySelector('.cv-info-message')) {
        // Optional: Add a helper message to the now empty #content-solicitacoes div
        // solicitacoesContent.innerHTML = '<p class="cv-info-message">As solicitações (Chamados, Ocorrências, etc.) são exibidas no Mural principal, filtradas por esta categoria.</p>';
    }
}

// This function is still useful for the "Criar Chamado" modal
async function handleCreateChamado(formData) { // formData will be a FormData object if files are included
    console.log("Creating chamado (Solicitação):", formData);

    // If sending JSON and not files:
    // const data = {
    //     titulo: formData.get('titulo'),
    //     descricao: formData.get('descricao'),
    //     categoria: formData.get('categoria')
    // };
    // Add other fields as necessary from ChamadoInputDto

    try {
        // Assuming apiClient can handle FormData directly if files are present.
        // If ChamadoInputDto expects files as base64 strings or URLs from a separate upload step,
        // this logic would need to be more complex. For now, direct FormData pass-through.
        const novoChamado = await apiClient.post('/api/v1/Chamados/app/chamados', formData, {
            // If apiClient needs explicit headers for FormData, set them here,
            // but usually it's automatic if FormData is detected.
            // headers: { 'Content-Type': 'multipart/form-data' } // Usually not needed with fetch/axios
        });
        showGlobalFeedback('Nova solicitação (chamado) criada com sucesso! Ela aparecerá no feed.', 'success');

        // Reload feed if current view might include this new chamado
        const categoryFilterModal = document.getElementById('category-filter-modal');
        if (categoryFilterModal && (categoryFilterModal.value === 'solicitacoes' || categoryFilterModal.value === '')) {
            loadInitialFeedItems();
        } else if (!categoryFilterModal) { // If filter doesn't exist, assume it might be relevant
            loadInitialFeedItems();
        }
        console.log("Chamado criado:", novoChamado);
        return true; // Indicate success
    } catch (error) {
        console.error("Erro ao criar chamado:", error);
        showGlobalFeedback(`Erro ao criar chamado: ${error.message || 'Erro desconhecido'}`, 'error');
        return false; // Indicate failure
    }
}

// This function is potentially useful if editing a Chamado/Solicitacao is triggered from the feed
// and uses the same modal.
async function handleUpdateChamado(id, data) {
    console.log("Updating chamado (Solicitação):", id, data);
    // API call: await apiClient.put(`/api/v1/chamados/${id}`, data);
    showGlobalFeedback('Solicitação (chamado) atualizada com sucesso! (simulado).', 'success');
    const muralCategoryFilter = document.getElementById('category-filter');
    if (muralCategoryFilter && (muralCategoryFilter.value === 'solicitacoes' || muralCategoryFilter.value === '')) {
        loadInitialFeedItems(); // Reload to see changes
    }
}


// This sets up the "Novo Chamado" FAB and the "Criar Chamado" modal. This is still relevant.
function setupChamadoModalAndFAB() {
    const fab = document.querySelector('.js-fab-chamados');
    if (fab) {
        fab.addEventListener('click', openCreateChamadoModal);
    }
    // Modal close buttons
    const closeButtons = document.querySelectorAll('.js-modal-criar-chamado-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (criarChamadoModal) criarChamadoModal.style.display = 'none';
        });
    });
    if (criarChamadoModal) {
        window.addEventListener('click', (event) => {
            if (event.target === criarChamadoModal) criarChamadoModal.style.display = 'none';
        });
    }
    // Form submission
    if (formCriarChamado && chamadoIdFieldModal && formChamadoSubmitButtonModal) {
        formCriarChamado.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentChamadoId = chamadoIdFieldModal.value; // For potential update logic later

            const formData = new FormData(formCriarChamado);
            // The 'id' field from the hidden input should not be sent for new chamados.
            // If 'chamado-id' is part of formData and it's empty, it's fine.
            // If the backend expects no 'id' field for creation, remove it:
            if (!currentChamadoId) {
                formData.delete('id'); // Remove 'id' if it was from the hidden input and is empty
            }

            // For file inputs, FormData handles them automatically.
            // Example: if you have <input type="file" name="anexos" multiple>
            // formData will contain 'anexos' with the file(s).

            let success = false;
            if (currentChamadoId) {
                // Update logic would go here, potentially also using FormData
                // success = await handleUpdateChamado(currentChamadoId, formData);
                showGlobalFeedback('Atualização de chamados ainda não implementada.', 'info'); // Placeholder
            } else {
                success = await handleCreateChamado(formData);
            }

            if (success && criarChamadoModal) {
                criarChamadoModal.style.display = 'none';
            }
        });
    }
}

// openCreateChamadoModal is still needed for the FAB
function openCreateChamadoModal() {
    if (criarChamadoModal && formCriarChamado && chamadoIdFieldModal && modalChamadoTitle && formChamadoSubmitButtonModal && chamadoStatusModalFormGroup && chamadoCategoriaModalFormGroup) {
        formCriarChamado.reset();
        chamadoIdFieldModal.value = '';
        modalChamadoTitle.textContent = 'Novo Chamado'; // Title for creating
        formChamadoSubmitButtonModal.textContent = 'Abrir Chamado';
        chamadoStatusModalFormGroup.style.display = 'none';
        chamadoCategoriaModalFormGroup.style.display = 'block';
        document.getElementById('chamado-descricao-modal').disabled = false;
        criarChamadoModal.style.display = 'flex';
    }
}

// The old openEditChamadoModal is no longer needed here as editing from feed items
// is handled by openEditFeedItemModal, which would call a more generic version or specific
// modal if required. The existing `modal-criar-chamado` is now primarily for creation.
// If an admin needs to edit a "Chamado" with more fields, a different modal/page would be better.

// All other functions previously under "Chamados e Solicitações Tab" that dealt with
// rendering lists (loadChamadosList), details (viewChamadoDetail), interactions,
// and specific filters within #content-solicitacoes are now obsolete because this tab
// now only filters the main feed displayed in #content-mural.
