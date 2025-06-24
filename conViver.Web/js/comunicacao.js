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

    // Modal Detalhe Enquete
    modalEnqueteDetalhe = document.getElementById('modal-enquete-detalhe');
    modalEnqueteDetalheTitulo = document.getElementById('modal-enquete-detalhe-titulo');
    modalEnqueteDetalheDescricao = document.getElementById('modal-enquete-detalhe-descricao');
    modalEnqueteDetalheOpcoesContainer = document.getElementById('modal-enquete-detalhe-opcoes-container');
    modalEnqueteDetalheStatus = document.getElementById('modal-enquete-detalhe-status');
    modalEnqueteSubmitVotoButton = document.getElementById('modal-enquete-submit-voto');

    // Modal Detalhe Chamado
    modalChamadoDetalhe = document.getElementById('modal-chamado-detalhe');
    modalChamadoDetalheTitulo = document.getElementById('modal-chamado-detalhe-titulo');
    modalChamadoDetalheConteudo = document.getElementById('modal-chamado-detalhe-conteudo');
    modalChamadoDetalheInteracoes = document.getElementById('modal-chamado-detalhe-interacoes');
    modalChamadoAddCommentSection = document.getElementById('modal-chamado-add-comment-section');
    modalChamadoCommentText = document.getElementById('modal-chamado-comment-text');
    modalChamadoSubmitCommentButton = document.getElementById('modal-chamado-submit-comment');


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
    // await loadStickyNotices(); // Removido - itens fixos são tratados pelo PrioridadeOrdenacao no feed principal
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
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabContents.forEach(content => content.style.display = 'none');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => content.style.display = 'none');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const muralContent = document.getElementById('content-mural');
            const muralCategoryFilter = document.getElementById('category-filter');
            // const periodFilter = document.getElementById('period-filter'); // If we want to reset period

            if (button.id === 'tab-mural') {
                if (muralCategoryFilter) muralCategoryFilter.value = ''; // 'Todas'
                // if (periodFilter) periodFilter.value = ''; // Reset period
                if (!button.dataset.initializedFeed) { // Different flag if Mural itself has specific init
                    loadInitialFeedItems(); // Load all items
                    button.dataset.initializedFeed = 'true';
                } else {
                    loadInitialFeedItems(); // Still reload if filters changed or just to refresh
                }
                if (muralContent) muralContent.style.display = 'block';
            } else if (button.id === 'tab-enquetes') {
                if (!button.dataset.initialized) {
                    setupEnquetesTab(); // Sets up one-time things for this filter mode
                    button.dataset.initialized = 'true';
                }
                // Subsequent clicks also apply the filter and show mural
                if (muralCategoryFilter) muralCategoryFilter.value = 'enquetes';
                // if (periodFilter) periodFilter.value = ''; // Reset period
                loadInitialFeedItems();
                if (muralContent) muralContent.style.display = 'block';
            } else if (button.id === 'tab-solicitacoes') {
                if (!button.dataset.initialized) {
                    setupSolicitacoesTab(); // Sets up one-time things for this filter mode
                    button.dataset.initialized = 'true';
                }
                // Subsequent clicks also apply the filter and show mural
                if (muralCategoryFilter) muralCategoryFilter.value = 'solicitacoes';
                // if (periodFilter) periodFilter.value = ''; // Reset period
                loadInitialFeedItems();
                if (muralContent) muralContent.style.display = 'block';
            }
            updateUserSpecificUI(button.id); // Passar o ID da aba ativa
        });
    });

    // Ensure the default active tab's logic is triggered correctly
    const activeTab = document.querySelector('.cv-tab-button.active');
    if (activeTab) {
        // Manually trigger the click handler to ensure correct content display and filtering
        activeTab.click();
        // The above click() will also handle dataset.initialized flags.
    } else {
        // Fallback if no tab is active by default (shouldn't happen with current HTML)
        const firstTab = document.querySelector('.cv-tab-button');
        if (firstTab) firstTab.click();
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

    // Listeners para fechar o modal de detalhe da enquete
    if (modalEnqueteDetalhe) {
        const closeButtons = modalEnqueteDetalhe.querySelectorAll('.js-modal-enquete-detalhe-close');
        closeButtons.forEach(btn => btn.addEventListener('click', () => modalEnqueteDetalhe.style.display = 'none'));
        window.addEventListener('click', (event) => {
            if (event.target === modalEnqueteDetalhe) modalEnqueteDetalhe.style.display = 'none';
        });
    }

    // Listeners para fechar o modal de detalhe do chamado
    if (modalChamadoDetalhe) {
        const closeButtonsChamado = modalChamadoDetalhe.querySelectorAll('.js-modal-chamado-detalhe-close');
        closeButtonsChamado.forEach(btn => btn.addEventListener('click', () => modalChamadoDetalhe.style.display = 'none'));
        window.addEventListener('click', (event) => {
            if (event.target === modalChamadoDetalhe) modalChamadoDetalhe.style.display = 'none';
        });
        // Listener para o botão de submeter comentário será adicionado dinamicamente em handleChamadoClick
    }


    if (formCriarAviso && avisoIdField) {
        formCriarAviso.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentAvisoId = avisoIdField.value;
            const formData = new FormData(formCriarAviso);

            // O AvisoInputDto no backend espera: Categoria, Titulo, Corpo.
            // O form HTML tem: titulo, corpo, imagem, anexos, categorias (select multiple).
            // Vamos montar o DTO para o backend com os campos de texto.
            // Upload de arquivos e múltiplas categorias precisariam de tratamento especial.

            const titulo = formData.get('titulo');
            const corpo = formData.get('corpo');
            // Para 'categorias' (select multiple), precisamos pegar todos os valores selecionados.
            // O DTO do backend (AvisoInputDto) parece esperar uma string 'Categoria'.
            // Por simplicidade, vamos pegar a primeira categoria selecionada ou um valor padrão.
            // Idealmente, o backend suportaria uma lista de strings para categorias.
            const categoriasSelecionadas = Array.from(document.getElementById('aviso-categorias').selectedOptions).map(opt => opt.value);
            const categoriaParaApi = categoriasSelecionadas.length > 0 ? categoriasSelecionadas[0] : "Comunicados Gerais"; // Ou a primeira da lista

            const avisoData = {
                titulo: titulo,
                corpo: corpo,
                categoria: categoriaParaApi, // Ajustar se o backend mudar para aceitar múltiplas ou se houver um campo diferente
                // Campos de imagem e anexos não estão no AvisoInputDto atual do backend.
            };

            try {
                if (currentAvisoId) {
                    // Editar Aviso
                    showGlobalFeedback('Salvando alterações do aviso...', 'info');
                    // Endpoint: PUT /api/v1/syndic/avisos/{id}
                    await apiClient.put(`/api/v1/syndic/avisos/${currentAvisoId}`, avisoData);
                    showGlobalFeedback('Aviso atualizado com sucesso!', 'success');
                } else {
                    // Criar Aviso
                    showGlobalFeedback('Criando novo aviso...', 'info');
                    // Endpoint: POST /api/v1/syndic/avisos
                    await apiClient.post('/api/v1/syndic/avisos', avisoData);
                    showGlobalFeedback('Aviso criado com sucesso!', 'success');
                }
                closeCriarAvisoModal();
                await loadInitialFeedItems(); // Recarregar o feed
            } catch (error) {
                console.error("Erro ao salvar aviso:", error);
                // A mensagem de erro já deve ser exibida pelo showGlobalFeedback dentro do apiClient
                // Mas podemos adicionar um fallback se necessário.
                if (!error.handledByApiClient) { // Supondo que apiClient adicione essa flag
                    showGlobalFeedback(error.message || 'Falha ao salvar o aviso.', 'error');
                }
            }
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
    try {
        showGlobalFeedback('Excluindo aviso...', 'info');
        // Endpoint: DELETE /api/v1/syndic/avisos/{id}
        await apiClient.delete(`/api/v1/syndic/avisos/${itemId}`);
        showGlobalFeedback('Aviso excluído com sucesso!', 'success');

        // Remover do DOM ou recarregar
        fetchedFeedItems = fetchedFeedItems.filter(i => !(i.id === itemId && i.itemType === 'Aviso'));
        const cardToRemove = document.querySelector(`${feedContainerSelector} .cv-card[data-item-id="${itemId}"][data-item-type="Aviso"]`);
        if (cardToRemove) {
            cardToRemove.remove();
        } else {
            await loadInitialFeedItems(); // Fallback: recarregar tudo
        }
    } catch (error) {
        console.error("Erro ao excluir aviso:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao excluir o aviso.', 'error');
        }
    }
}
// loadStickyNotices function removed as it's no longer needed.

// MOCK getUserRoles - REMOVE THIS WHEN auth.js IS UPDATED
function getUserRoles() {
    // Alterne para simular diferentes perfis:
    // return ['Sindico'];
    // return ['Condomino'];
    // return ['Inquilino'];
    const user = JSON.parse(localStorage.getItem('userInfo')); // Supondo que userInfo tenha 'roles'
    if (user && user.roles) return user.roles;
    return ['Condomino']; // Default para desenvolvimento se não houver info
}
// FIM DO MOCK

function updateUserSpecificUI(activeTabId) {
    const userRoles = getUserRoles(); // Usa o mock ou a função real de auth.js
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador'); // Adicionar 'Administrador' se for um papel válido

    const fabMural = document.querySelector('.js-fab-mural'); // Para criar Avisos
    const fabEnquetes = document.querySelector('.js-fab-enquetes'); // Para criar Enquetes
    const fabSolicitacoes = document.querySelector('.js-fab-chamados'); // Para criar Chamados/Solicitações

    // Reset all FABs
    if (fabMural) fabMural.style.display = 'none';
    if (fabEnquetes) fabEnquetes.style.display = 'none';
    if (fabSolicitacoes) fabSolicitacoes.style.display = 'none';

    // Configure FAB listeners (fazemos isso uma vez, mas a visibilidade muda)
    if (fabMural && !fabMural.dataset.listenerAttached) {
        fabMural.addEventListener('click', openCriarAvisoModal);
        fabMural.dataset.listenerAttached = 'true';
    }
    if (fabEnquetes && !fabEnquetes.dataset.listenerAttached) {
        // A função openCreateEnqueteModal já é definida em setupEnqueteModalAndFAB
        // que é chamado por setupEnquetesTab quando a aba é inicializada.
        // Se setupEnquetesTab não for mais chamada, precisamos garantir que openCreateEnqueteModal esteja disponível.
        // Por agora, setupEnquetesTab ainda configura o modal de criação.
        // Certificar que o listener do FAB é adicionado corretamente
        // if (typeof openCreateEnqueteModal === 'function') { // Checar se a função existe
        //     fabEnquetes.addEventListener('click', openCreateEnqueteModal);
        // } else {
        //     console.warn("openCreateEnqueteModal não definida ao tentar anexar listener ao FAB de enquetes.");
        // }
        // setupEnqueteModalAndFAB já adiciona o listener ao .js-fab-enquetes
        // Não precisamos adicionar outro aqui se setupEnquetesTab for chamado.
        // Se setupEnquetesTab for removida, então o listener precisa ser adicionado aqui.
        // Por ora, a lógica de setupEnquetesTab ainda existe e anexa o listener.
        fabEnquetes.dataset.listenerAttached = 'true'; // Marcamos para evitar múltiplas adições de qualquer forma
    }
    if (fabSolicitacoes && !fabSolicitacoes.dataset.listenerAttached) {
        // Similar para chamados, openCreateChamadoModal é configurado por setupChamadoModalAndFAB
        // if (typeof openCreateChamadoModal === 'function') {
        //    fabSolicitacoes.addEventListener('click', openCreateChamadoModal);
        // } else {
        //     console.warn("openCreateChamadoModal não definida ao tentar anexar listener ao FAB de chamados.");
        // }
        fabSolicitacoes.dataset.listenerAttached = 'true';
    }


    if (activeTabId === 'tab-mural') {
        if (isSindico) {
            if (fabMural) fabMural.style.display = 'block'; // Síndico pode criar Aviso
        } else {
            // Morador na aba Mural: o plano original dizia "Novo Chamado / Solicitação".
            // Para manter simples com os FABs existentes, vamos mostrar o FAB de chamados.
            if (fabSolicitacoes) fabSolicitacoes.style.display = 'block';
        }
    } else if (activeTabId === 'tab-enquetes') {
        if (isSindico) {
            if (fabEnquetes) fabEnquetes.style.display = 'block'; // Síndico pode criar Enquete
        }
        // Morador não tem FAB na aba Enquetes (apenas visualiza/vota no feed)
    } else if (activeTabId === 'tab-solicitacoes') {
        // Todos os usuários (Síndico e Morador) podem criar um novo chamado/solicitação
        if (fabSolicitacoes) fabSolicitacoes.style.display = 'block';
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
            ${item.categoria ? `<span class="feed-item__category">Categoria Principal: ${item.categoria}</span>` : ''}
        </div>
    `;

    // Tags / Chips
    let tagsHtml = '<div class="feed-item__tags">';
    // Tag para o ItemType
    if (item.itemType) {
        tagsHtml += `<span class="feed-item__tag feed-item__tag--${item.itemType.toLowerCase()}">${item.itemType}</span>`;
    }
    // Tag para a Categoria específica do item, se diferente do ItemType e existir
    if (item.categoria && item.categoria.toLowerCase() !== item.itemType.toLowerCase()) {
        tagsHtml += `<span class="feed-item__tag">${item.categoria}</span>`;
    }
    // Adicionar mais tags se necessário, ex: tags de prioridade, status específico etc.
    tagsHtml += '</div>';

    contentHtml += tagsHtml;


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

let currentEnqueteId = null; // Armazena o ID da enquete atualmente no modal de detalhes

async function handleEnqueteClick(itemId, targetElementOrCard) {
    currentEnqueteId = itemId; // Armazena o ID da enquete atual
    if (!modalEnqueteDetalhe || !apiClient) return; // Garantir que o modal e apiClient estão disponíveis

    modalEnqueteDetalheOpcoesContainer.innerHTML = '<p class="cv-loading-message">Carregando detalhes da enquete...</p>';
    modalEnqueteDetalheStatus.innerHTML = '';
    modalEnqueteSubmitVotoButton.style.display = 'none';
    modalEnqueteDetalhe.style.display = 'flex';

    try {
        // Endpoint: GET /api/v1/app/votacoes/{id}
        const enquete = await apiClient.get(`/api/v1/votacoes/app/votacoes/${itemId}`);

        if (!enquete) {
            modalEnqueteDetalheOpcoesContainer.innerHTML = '<p class="cv-error-message">Enquete não encontrada.</p>';
            return;
        }

        modalEnqueteDetalheTitulo.textContent = enquete.titulo;
        modalEnqueteDetalheDescricao.innerHTML = enquete.descricao ? `<p>${enquete.descricao.replace(/\n/g, '<br>')}</p>` : '<p><em>Sem descrição adicional.</em></p>';

        if (enquete.status === "Aberta" && !enquete.usuarioJaVotou) {
            renderOpcoesDeVoto(enquete.opcoes);
            modalEnqueteSubmitVotoButton.style.display = 'block';
            modalEnqueteSubmitVotoButton.onclick = () => submitVoto(itemId); // Passa o ID da enquete
            modalEnqueteDetalheStatus.innerHTML = `<p><strong>Status:</strong> Aberta para votação.</p> <p>Prazo: ${enquete.dataFim ? new Date(enquete.dataFim).toLocaleString() : 'Não definido'}</p>`;
        } else {
            renderResultadosEnquete(enquete.opcoes, enquete.status, enquete.usuarioJaVotou, enquete.dataFim);
        }

    } catch (error) {
        console.error("Erro ao buscar detalhes da enquete:", error);
        modalEnqueteDetalheOpcoesContainer.innerHTML = '<p class="cv-error-message">Erro ao carregar detalhes da enquete. Tente novamente.</p>';
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao carregar enquete.', 'error');
        }
    }
}

function renderOpcoesDeVoto(opcoes) {
    let html = '<h4>Escolha uma opção:</h4><form id="form-votar-enquete" class="cv-form">';
    opcoes.forEach(opcao => {
        html += `
            <div class="cv-form-group">
                <input type="radio" name="opcaoVoto" value="${opcao.id}" id="opcao-${opcao.id}" class="cv-input-radio">
                <label for="opcao-${opcao.id}">${opcao.descricao}</label>
            </div>
        `;
    });
    html += '</form>';
    modalEnqueteDetalheOpcoesContainer.innerHTML = html;
}

function renderResultadosEnquete(opcoes, status, usuarioJaVotou, dataFim) {
    let html = '<h4>Resultados:</h4>';
    const totalVotos = opcoes.reduce((sum, opt) => sum + opt.quantidadeVotos, 0);

    if (totalVotos === 0 && status === "Aberta") {
        html += '<p>Ainda não há votos registrados para esta enquete.</p>';
        if (usuarioJaVotou) {
             html += '<p class="poll-status voted">Você já votou.</p>';
        }
    } else if (totalVotos === 0 && status !== "Aberta") {
        html += '<p>Nenhum voto foi registrado nesta enquete.</p>';
    }
    else {
        opcoes.forEach(opcao => {
            const percentual = totalVotos > 0 ? ((opcao.quantidadeVotos / totalVotos) * 100).toFixed(1) : 0;
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

async function submitVoto(enqueteId) { // enqueteId é passado como argumento
    const form = document.getElementById('form-votar-enquete');
    if (!form) return;

    const selectedOption = form.querySelector('input[name="opcaoVoto"]:checked');
    if (!selectedOption) {
        showGlobalFeedback('Por favor, selecione uma opção para votar.', 'warning');
        return;
    }

    const opcaoId = selectedOption.value;

    try {
        showGlobalFeedback('Registrando seu voto...', 'info');
        // Endpoint: POST /api/v1/app/votacoes/{id}/votar
        // Body: VotoInputDto { OpcaoId: guid }
        await apiClient.post(`/api/v1/votacoes/app/votacoes/${enqueteId}/votar`, { OpcaoId: opcaoId });
        showGlobalFeedback('Voto registrado com sucesso!', 'success');
        modalEnqueteSubmitVotoButton.style.display = 'none'; // Esconde o botão de votar
        // Recarrega os detalhes da enquete para mostrar os resultados atualizados ou status de "já votou"
        await handleEnqueteClick(enqueteId, null); // Chama handleEnqueteClick novamente para atualizar o modal
    } catch (error) {
        console.error("Erro ao registrar voto:", error);
        // A mensagem de erro já deve ser exibida pelo showGlobalFeedback dentro do apiClient
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao registrar o voto.', 'error');
        }
        // Se o erro for "já votou" (Conflict 409), o apiClient deve tratar e mostrar a mensagem.
        // Se não, o handleEnqueteClick pode ser chamado para atualizar a view de qualquer forma.
        await handleEnqueteClick(enqueteId, null);
    }
}


let currentChamadoIdModal = null; // Armazena o ID do chamado no modal de detalhes

async function handleChamadoClick(itemId, targetElementOrCard) {
    currentChamadoIdModal = itemId;
    if (!modalChamadoDetalhe || !apiClient) return;

    modalChamadoDetalheConteudo.innerHTML = '<p class="cv-loading-message">Carregando detalhes do chamado...</p>';
    modalChamadoDetalheInteracoes.innerHTML = '<p class="cv-loading-message">Carregando interações...</p>'; // Limpa interações antigas
    modalChamadoAddCommentSection.style.display = 'none'; // Esconde por padrão
    modalChamadoDetalhe.style.display = 'flex';

    try {
        const userRoles = getUserRoles();
        const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');
        // Endpoint: GET /api/v1/app/chamados/{id} ou /api/v1/syndic/chamados/{id}
        // O ChamadoService.ObterChamadoPorIdAsync já lida com a lógica de permissão.
        // O controller /app/chamados/{id} chama ObterChamadoPorIdAsync com isSindico=User.IsInRole("Sindico")
        // Para simplificar, vamos usar o endpoint do app, o backend resolverá a permissão.
        // Se precisarmos forçar a visão de síndico, teríamos que chamar o endpoint /syndic/.
        const chamado = await apiClient.get(`/api/v1/chamados/app/chamados/${itemId}`);

        if (!chamado) {
            modalChamadoDetalheConteudo.innerHTML = '<p class="cv-error-message">Chamado não encontrado ou acesso não permitido.</p>';
            modalChamadoDetalheInteracoes.innerHTML = '';
            return;
        }

        modalChamadoDetalheTitulo.textContent = chamado.titulo || "Detalhes do Chamado";
        renderDetalhesChamado(chamado);
        await renderInteracoesChamado(itemId, chamado.usuarioId); // Passar o ID do criador do chamado

        // Lógica para permitir adicionar comentário
        // const currentUser = getCurrentUser(); // Supondo que getCurrentUser() de auth.js retorne {id, roles}
        // if (isSindico || (currentUser && currentUser.id === chamado.usuarioId)) {
        //     modalChamadoAddCommentSection.style.display = 'block';
        //     modalChamadoSubmitCommentButton.onclick = () => submitComentarioChamado(itemId);
        // }
        // Por enquanto, a adição de comentários/respostas será adiada para simplificar.
        // A API de Chamados tem AddComentario, mas é para Ocorrências, não para Chamados (precisa verificar).
        // O ChamadosController não tem endpoint para adicionar comentário/interação.
        // Esta funcionalidade precisaria de um novo endpoint no ChamadosController.

    } catch (error) {
        console.error("Erro ao buscar detalhes do chamado:", error);
        modalChamadoDetalheConteudo.innerHTML = '<p class="cv-error-message">Erro ao carregar detalhes do chamado.</p>';
        modalChamadoDetalheInteracoes.innerHTML = '';
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao carregar chamado.', 'error');
        }
    }
}

function renderDetalhesChamado(chamado) {
    // Formatar datas e outros campos conforme necessário
    const dataAbertura = new Date(chamado.dataAbertura).toLocaleString();
    const dataResolucao = chamado.dataResolucao ? new Date(chamado.dataResolucao).toLocaleString() : 'N/A';

    // Tentar extrair categoria da descrição se ela foi prefixada
    let descricaoPrincipal = chamado.descricao;
    let categoriaChamado = "Não especificada";
    const matchCategoria = chamado.descricao.match(/^Categoria: (.*?)\n\n/);
    if (matchCategoria && matchCategoria[1]) {
        categoriaChamado = matchCategoria[1];
        descricaoPrincipal = chamado.descricao.substring(matchCategoria[0].length);
    }


    modalChamadoDetalheConteudo.innerHTML = `
        <p><strong>Título:</strong> ${chamado.titulo}</p>
        <p><strong>Descrição:</strong></p>
        <p style="white-space: pre-wrap;">${descricaoPrincipal}</p>
        <p><strong>Categoria Informada:</strong> ${categoriaChamado}</p>
        <p><strong>Status:</strong> <span class="chamado-status-${chamado.status?.toLowerCase()}">${chamado.status || 'N/A'}</span></p>
        <p><strong>Aberto em:</strong> ${dataAbertura}</p>
        <p><strong>Resolvido em:</strong> ${dataResolucao}</p>
        <p><strong>Resposta do Síndico:</strong> ${chamado.respostaDoSindico || '<em>Aguardando resposta...</em>'}</p>
        ${chamado.avaliacaoNota ? `<p><strong>Sua Avaliação:</strong> ${chamado.avaliacaoNota}/5 - <em>${chamado.avaliacaoComentario || ''}</em></p>` : ''}
        <!-- Adicionar visualização de fotos se houver: chamado.fotos -->
    `;
}

async function renderInteracoesChamado(chamadoId, criadorId) {
    // Esta função é um placeholder.
    // O backend (ChamadosController) atualmente não tem um endpoint para listar interações/comentários de um chamado.
    // Isso seria uma nova funcionalidade no backend.
    // Se OcorrenciasController.GetComentarios fosse adaptável, poderíamos usar algo similar.
    // Por agora, vamos simular ou mostrar uma mensagem.
    modalChamadoDetalheInteracoes.innerHTML = `
        <div class="interaction-item">
            <p><strong>Síndico</strong> <span class="meta">em ${new Date().toLocaleDateString()}:</span></p>
            <p>Recebemos seu chamado e estamos analisando.</p>
        </div>
        <div class="interaction-item">
            <p><strong>Você</strong> <span class="meta">em ${new Date(Date.now() - 86400000).toLocaleDateString()}:</span></p>
            <p>O problema persiste na área da piscina.</p>
        </div>
        <p style="text-align:center; color: var(--current-text-placeholder);"><em>(Interações simuladas. Funcionalidade de comentários em desenvolvimento.)</em></p>
    `;
    // const currentUser = getCurrentUser();
    // const isSindico = getUserRoles().includes('Sindico');
    // if (isSindico || (currentUser && currentUser.id === criadorId)) {
    //     modalChamadoAddCommentSection.style.display = 'block';
    //     modalChamadoSubmitCommentButton.onclick = () => submitComentarioChamado(chamadoId);
    // }
}

// async function submitComentarioChamado(chamadoId) {
//     const textoComentario = modalChamadoCommentText.value.trim();
//     if (!textoComentario) {
//         showGlobalFeedback("O comentário não pode estar vazio.", "warning");
//         return;
//     }
//     // Esta função é um placeholder.
//     // Precisaria de um endpoint POST no ChamadosController para adicionar um comentário.
//     // Ex: apiClient.post(`/api/v1/chamados/app/chamados/${chamadoId}/comentarios`, { texto: textoComentario });
//     console.log("Submeter comentário para chamado:", chamadoId, textoComentario);
//     showGlobalFeedback("Comentário enviado (simulado).", "success");
//     modalChamadoCommentText.value = '';
//     // await renderInteracoesChamado(chamadoId); // Recarregar interações
// }


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
async function handleCreateEnquete(enqueteData) {
    try {
        showGlobalFeedback('Criando nova enquete...', 'info');
        // Endpoint: POST /api/v1/syndic/votacoes (conforme VotacoesController)
        // O controller espera VotacaoInputDto: { Titulo, Descricao?, DataFim?, Opcoes: [{Descricao}] }
        await apiClient.post('/api/v1/votacoes/syndic/votacoes', enqueteData); // Ajuste de rota
        showGlobalFeedback('Nova enquete criada com sucesso! Ela aparecerá no feed.', 'success');
        await loadInitialFeedItems(); // Recarrega o feed principal
    } catch (error) {
        console.error("Erro ao criar enquete:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao criar a enquete.', 'error');
        }
    }
}

async function handleUpdateEnquete(id, enqueteData) {
    // A API de Votações não possui um endpoint PUT para edição no controller atual.
    // A edição de enquetes/votações geralmente é complexa (ex: o que acontece se já houver votos?).
    // Por agora, a edição não será implementada no frontend até que o backend suporte.
    console.warn("handleUpdateEnquete chamado, mas o backend não suporta edição de votações no controller atual.", id, enqueteData);
    showGlobalFeedback('Funcionalidade de editar enquete não está disponível no momento.', 'warning');
    // try {
    //     showGlobalFeedback('Salvando alterações da enquete...', 'info');
    //     // await apiClient.put(`/api/v1/votacoes/syndic/votacoes/${id}`, enqueteData);
    //     showGlobalFeedback('Enquete atualizada com sucesso!', 'success');
    //     await loadInitialFeedItems();
    // } catch (error) {
    //     console.error("Erro ao atualizar enquete:", error);
    //     if (!error.handledByApiClient) {
    //         showGlobalFeedback(error.message || 'Falha ao atualizar a enquete.', 'error');
    //     }
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
            const id = enqueteIdField.value; // Usado para determinar se é criação ou edição

            const perguntaOuTitulo = document.getElementById('enquete-pergunta').value;
            const opcoesTexto = document.getElementById('enquete-opcoes').value;
            const prazo = document.getElementById('enquete-prazo').value;
            // O campo 'tipo' do formulário ('informal', 'formal_assembleia') não é usado diretamente pelo VotacaoInputDto.
            // O backend pode ter lógica interna para isso ou pode ser um campo a ser adicionado no DTO.

            const opcoesDto = opcoesTexto.split('\n')
                                        .map(opt => opt.trim())
                                        .filter(opt => opt !== '')
                                        .map(desc => ({ Descricao: desc }));

            if (opcoesDto.length < 2) {
                showGlobalFeedback('Uma enquete deve ter pelo menos duas opções.', 'error');
                return;
            }

            const enqueteData = {
                Titulo: perguntaOuTitulo, // Usando 'pergunta' como 'Titulo'
                Descricao: null, // Pode ser adicionado um campo 'Descrição' ao modal se necessário
                DataFim: prazo ? prazo : null, // Enviar null se vazio, backend pode ter default
                Opcoes: opcoesDto
            };

            if (id) {
                // A edição não é suportada pelo backend no momento, conforme handleUpdateEnquete.
                // Chamada a handleUpdateEnquete aqui, mas ela mostrará a mensagem de 'não suportado'.
                await handleUpdateEnquete(id, enqueteData);
            } else {
                await handleCreateEnquete(enqueteData);
            }

            if (criarEnqueteModal) criarEnqueteModal.style.display = 'none';
            formCriarEnquete.reset(); // Limpar o formulário
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
async function handleCreateChamado(chamadoData) {
    try {
        showGlobalFeedback('Abrindo novo chamado...', 'info');
        // Endpoint: POST /api/v1/chamados/app/chamados
        // ChamadoInputDto: { Titulo, Descricao, Fotos?, UnidadeId? }
        // O campo 'categoria' do formulário não está no DTO. Pode ser incluído na descrição.
        // Upload de fotos precisa de tratamento especial (upload separado, depois URLs no DTO).
        // Por agora, não enviaremos fotos.

        const dataParaApi = {
            Titulo: chamadoData.titulo,
            Descricao: chamadoData.descricao,
            // Fotos: [], // Adiar implementação de upload de fotos
            // UnidadeId: null, // O backend deve associar ao usuário/unidade do token
        };
        if (chamadoData.categoria) {
            dataParaApi.Descricao = `Categoria: ${chamadoData.categoria}\n\n${chamadoData.descricao}`;
        }


        await apiClient.post('/api/v1/chamados/app/chamados', dataParaApi);
        showGlobalFeedback('Novo chamado aberto com sucesso! Ele aparecerá no feed.', 'success');
        await loadInitialFeedItems(); // Recarregar o feed
    } catch (error) {
        console.error("Erro ao abrir chamado:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao abrir o chamado.', 'error');
        }
    }
}

// This function is potentially useful if editing a Chamado/Solicitacao is triggered from the feed
// and uses the same modal.
async function handleUpdateChamado(id, chamadoData) {
    // Edição de chamado pelo usuário não está no escopo atual dos endpoints do controller.
    // O endpoint PUT /api/v1/chamados/syndic/chamados/{id} é para o síndico.
    console.warn("handleUpdateChamado (usuário) chamado, mas não implementado.", id, chamadoData);
    showGlobalFeedback('Funcionalidade de editar chamado (usuário) não implementada.', 'warning');
    // try {
    //     showGlobalFeedback('Salvando alterações do chamado...', 'info');
    //     // Endpoint para síndico: PUT /api/v1/chamados/syndic/chamados/{id}
    //     // Precisa de um ChamadoUpdateDto: { Status, RespostaDoSindico? }
    //     // await apiClient.put(`/api/v1/chamados/syndic/chamados/${id}`, chamadoData);
    //     showGlobalFeedback('Chamado atualizado com sucesso!', 'success');
    //     await loadInitialFeedItems();
    // } catch (error) {
    //     console.error("Erro ao atualizar chamado:", error);
    //     if (!error.handledByApiClient) {
    //         showGlobalFeedback(error.message || 'Falha ao atualizar o chamado.', 'error');
    //     }
    // }
}


// This sets up the "Novo Chamado" FAB and the "Criar Chamado" modal. This is still relevant.
function setupChamadoModalAndFAB() {
    const fab = document.querySelector('.js-fab-chamados');
    if (fab && !fab.dataset.listenerAttachedFAB) { // Adicionar verificação de listener
        fab.addEventListener('click', openCreateChamadoModal);
        fab.dataset.listenerAttachedFAB = 'true';
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
            const currentChamadoId = chamadoIdFieldModal.value; // Para determinar se é criação ou edição (edição não implementada aqui)

            // Ignorar anexos por enquanto, pois requerem upload separado.
            // const anexos = document.getElementById('chamado-anexos-modal').files;

            const chamadoData = {
                titulo: document.getElementById('chamado-titulo-modal').value,
                descricao: document.getElementById('chamado-descricao-modal').value,
                categoria: document.getElementById('chamado-categoria-modal').value,
                // anexos: anexos // Adiar
            };


            if (currentChamadoId) {
                // Este modal é primariamente para criação. A edição pelo usuário não está implementada.
                // A edição pelo síndico (mudar status, adicionar resposta) seria um fluxo diferente.
                chamadoData.status = document.getElementById('chamado-status-modal').value; // Se fosse um admin editando
                await handleUpdateChamado(currentChamadoId, chamadoData); // Vai mostrar warning
            } else {
                await handleCreateChamado(chamadoData);
            }

            if (criarChamadoModal) criarChamadoModal.style.display = 'none';
            formCriarChamado.reset(); // Limpar formulário
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
