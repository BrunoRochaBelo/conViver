import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js';

// --- Global state & constants ---
// Unified Feed (replaces Notices for Mural Tab)
let currentFeedPage = 1; let isLoadingFeedItems = false; let noMoreFeedItems = false;
const feedContainerSelector = '.js-avisos'; // Using existing container for Mural feed
const feedScrollSentinelId = 'notice-scroll-sentinel'; // Reusing existing sentinel ID
let fetchedFeedItems = [];

// Modals (Avisos)
let criarAvisoModal; let formCriarAviso; let avisoIdField;

// Modals (Enquetes)
let criarEnqueteModal; let formCriarEnquete; let enqueteIdField;
let modalEnqueteTitle; let formEnqueteSubmitButton;
let modalEnqueteDetalhe; let modalEnqueteDetalheTitulo; let modalEnqueteDetalheDescricao;
let modalEnqueteDetalheOpcoesContainer; let modalEnqueteDetalheStatus; let modalEnqueteSubmitVotoButton;


// Modals (Chamados / Solicitações)
let criarChamadoModal; let formCriarChamado; let chamadoIdFieldModal;
let modalChamadoTitle; let formChamadoSubmitButtonModal;
let modalChamadoDetalhe; let modalChamadoDetalheTitulo; let modalChamadoDetalheConteudo;
let modalChamadoDetalheInteracoes; let modalChamadoAddCommentSection;
let modalChamadoCommentText; let modalChamadoSubmitCommentButton;

// Modal specific form groups (still needed as modals are global)
let chamadoStatusModalFormGroup;
let chamadoCategoriaModalFormGroup;


document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();

    // Avisos Modal
    criarAvisoModal = document.getElementById('modal-criar-aviso');
    formCriarAviso = document.getElementById('form-criar-aviso');
    avisoIdField = document.getElementById('aviso-id');

    // Enquetes Modals
    criarEnqueteModal = document.getElementById('modal-criar-enquete');
    formCriarEnquete = document.getElementById('form-criar-enquete');
    enqueteIdField = document.getElementById('enquete-id');
    modalEnqueteTitle = document.getElementById('modal-enquete-title');
    formEnqueteSubmitButton = document.getElementById('form-enquete-submit-button');
    modalEnqueteDetalhe = document.getElementById('modal-enquete-detalhe');
    modalEnqueteDetalheTitulo = document.getElementById('modal-enquete-detalhe-titulo');
    modalEnqueteDetalheDescricao = document.getElementById('modal-enquete-detalhe-descricao');
    modalEnqueteDetalheOpcoesContainer = document.getElementById('modal-enquete-detalhe-opcoes-container');
    modalEnqueteDetalheStatus = document.getElementById('modal-enquete-detalhe-status');
    modalEnqueteSubmitVotoButton = document.getElementById('modal-enquete-submit-voto');

    // Chamados Modals
    criarChamadoModal = document.getElementById('modal-criar-chamado');
    formCriarChamado = document.getElementById('form-criar-chamado');
    chamadoIdFieldModal = document.getElementById('chamado-id'); // This is for the modal's hidden ID field
    modalChamadoTitle = document.getElementById('modal-chamado-title');
    formChamadoSubmitButtonModal = document.getElementById('form-chamado-submit-button');
    modalChamadoDetalhe = document.getElementById('modal-chamado-detalhe');
    modalChamadoDetalheTitulo = document.getElementById('modal-chamado-detalhe-titulo');
    modalChamadoDetalheConteudo = document.getElementById('modal-chamado-detalhe-conteudo');
    modalChamadoDetalheInteracoes = document.getElementById('modal-chamado-detalhe-interacoes');
    modalChamadoAddCommentSection = document.getElementById('modal-chamado-add-comment-section'); // General comment section in modal
    modalChamadoCommentText = document.getElementById('modal-chamado-comment-text'); // Textarea for general comment
    modalChamadoSubmitCommentButton = document.getElementById('modal-chamado-submit-comment'); // Button for general comment

    // References to elements within modals (these are fine as modals are global)
    chamadoStatusModalFormGroup = document.querySelector('#modal-criar-chamado .js-chamado-status-form-group');
    chamadoCategoriaModalFormGroup = document.querySelector('#modal-criar-chamado .js-chamado-categoria-form-group');

    setupTabs();
    await loadInitialFeedItems();
    setupFeedObserver();
    setupFeedContainerClickListener();
    updateUserSpecificUI();
    setupFilterButtonListener();
    setupModalEventListeners();
});

// --- Tab System ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.cv-tab-button');
    const tabContents = document.querySelectorAll('.cv-tab-content'); // These are #content-mural, #content-enquetes, etc.
    const muralContent = document.getElementById('content-mural'); // The main feed display area
    const muralCategoryFilter = document.getElementById('category-filter');
    const sindicoOnlyMessages = document.querySelectorAll('.js-sindico-only-message');

    const userRoles = getUserRoles(); // Assuming getUserRoles() is available and returns array of roles
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

    sindicoOnlyMessages.forEach(msg => {
        msg.style.display = isSindico ? 'inline' : 'none'; // Show message if Sindico
    });

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabContents.forEach(content => {
                if (content.id !== 'content-mural') {
                    content.style.display = 'none';
                }
            });
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (muralContent) muralContent.style.display = 'block';

            let categoryToFilter = '';
            if (button.id === 'tab-enquetes') {
                categoryToFilter = 'enquete';
                if (!button.dataset.initialized) {
                    setupEnquetesTab();
                    button.dataset.initialized = 'true';
                }
            } else if (button.id === 'tab-solicitacoes') {
                categoryToFilter = 'solicitacoes';
                if (!button.dataset.initialized) {
                    setupSolicitacoesTab();
                    button.dataset.initialized = 'true';
                }
            }

            if (muralCategoryFilter) muralCategoryFilter.value = categoryToFilter;
            loadInitialFeedItems();
            updateUserSpecificUI(button.id);
        });
    });

    const activeTab = document.querySelector('.cv-tab-button.active');
    if (activeTab) {
        activeTab.click();
    } else {
        const firstTab = document.querySelector('.cv-tab-button');
        if (firstTab) firstTab.click();
    }
}


// --- Unified Feed (Mural Tab) ---
function openCriarAvisoModal() { if (criarAvisoModal && formCriarAviso && avisoIdField) { formCriarAviso.reset(); avisoIdField.value = ''; criarAvisoModal.querySelector('h2').textContent = 'Criar Novo Aviso'; formCriarAviso.querySelector('button[type="submit"]').textContent = 'Salvar Aviso'; criarAvisoModal.style.display = 'flex'; } }

function openEditFeedItemModal(itemType, itemId) {
    if (itemType === 'Aviso') {
        const itemData = fetchedFeedItems.find(i => i.id.toString() === itemId.toString() && i.itemType === 'Aviso');
        if (!itemData || !itemData.detalhesAdicionais || typeof itemData.detalhesAdicionais.corpo === 'undefined') {
             showGlobalFeedback('Erro: Dados do aviso não encontrados para edição.', 'error'); return;
        }
        if (criarAvisoModal && formCriarAviso && avisoIdField) {
            formCriarAviso.reset();
            avisoIdField.value = itemData.id;
            document.getElementById('aviso-titulo').value = itemData.titulo || '';
            document.getElementById('aviso-corpo').value = itemData.detalhesAdicionais.corpo || '';

            const categoriasSelect = document.getElementById('aviso-categorias');
            if (categoriasSelect) {
                Array.from(categoriasSelect.options).forEach(option => option.selected = false);
                if (itemData.categoria) {
                    const optionToSelect = Array.from(categoriasSelect.options).find(opt => opt.value === itemData.categoria);
                    if (optionToSelect) optionToSelect.selected = true;
                }
            }
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
    // Aviso Modal
    if (criarAvisoModal) {
        document.querySelectorAll('.js-modal-criar-aviso-close').forEach(btn => btn.addEventListener('click', closeCriarAvisoModal));
        window.addEventListener('click', (event) => { if (event.target === criarAvisoModal) closeCriarAvisoModal(); });

        if (formCriarAviso && avisoIdField) {
            formCriarAviso.addEventListener('submit', async (event) => {
                event.preventDefault();
                const currentAvisoId = avisoIdField.value;
                const formData = new FormData(formCriarAviso);

                const titulo = formData.get('titulo');
                const corpo = formData.get('corpo');
                const categoriasSelecionadas = Array.from(document.getElementById('aviso-categorias').selectedOptions).map(opt => opt.value);
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
                // O código atual envia JSON. Para uploads, seria necessário construir um FormData e
                // o apiClient.post/put precisaria lidar com isso. Esta parte é um TODO para backend.

                try {
                    showGlobalFeedback(currentAvisoId ? 'Salvando alterações...' : 'Criando aviso...', 'info');
                    if (currentAvisoId) {
                        await apiClient.put(`/api/v1/avisos/syndic/avisos/${currentAvisoId}`, avisoDataPayload);
                        showGlobalFeedback('Aviso atualizado com sucesso!', 'success');
                    } else {
                        await apiClient.post('/api/v1/avisos/syndic/avisos', avisoDataPayload);
                        showGlobalFeedback('Aviso criado com sucesso!', 'success');
                    }
                    closeCriarAvisoModal();
                    await loadInitialFeedItems();
                } catch (error) {
                    console.error("Erro ao salvar aviso:", error);
                    if (!error.handledByApiClient) {
                        showGlobalFeedback(error.message || 'Falha ao salvar o aviso.', 'error');
                    }
                }
            });
        }
    }

    // Enquete Detail Modal
    if (modalEnqueteDetalhe) {
        const closeButtons = modalEnqueteDetalhe.querySelectorAll('.js-modal-enquete-detalhe-close');
        closeButtons.forEach(btn => btn.addEventListener('click', () => modalEnqueteDetalhe.style.display = 'none'));
        window.addEventListener('click', (event) => {
            if (event.target === modalEnqueteDetalhe) modalEnqueteDetalhe.style.display = 'none';
        });
    }

    // Chamado Detail Modal
    if (modalChamadoDetalhe) {
        const closeButtonsChamado = modalChamadoDetalhe.querySelectorAll('.js-modal-chamado-detalhe-close');
        closeButtonsChamado.forEach(btn => btn.addEventListener('click', () => modalChamadoDetalhe.style.display = 'none'));
        window.addEventListener('click', (event) => {
            if (event.target === modalChamadoDetalhe) modalChamadoDetalhe.style.display = 'none';
        });
    }

    // Listeners for Criar Enquete Modal
    if (criarEnqueteModal) {
        document.querySelectorAll('.js-modal-criar-enquete-close').forEach(b => b.addEventListener('click', () => criarEnqueteModal.style.display = 'none'));
        window.addEventListener('click', e => { if (e.target === criarEnqueteModal) criarEnqueteModal.style.display = 'none'; });
        if (formCriarEnquete) {
            formCriarEnquete.addEventListener('submit', async e => {
                e.preventDefault();
                const id = enqueteIdField.value;
                const perguntaOuTitulo = document.getElementById('enquete-pergunta').value;
                const opcoesTexto = document.getElementById('enquete-opcoes').value;
                const prazo = document.getElementById('enquete-prazo').value;
                const tipoEnquete = document.getElementById('enquete-tipo').value;

                const opcoesDto = opcoesTexto.split('\n')
                                            .map(opt => opt.trim())
                                            .filter(opt => opt !== '')
                                            .map(desc => ({ Descricao: desc }));
                if (opcoesDto.length < 2) {
                    showGlobalFeedback('Uma enquete deve ter pelo menos duas opções.', 'error'); return;
                }
                const enqueteData = {
                    Titulo: perguntaOuTitulo,
                    Descricao: `Tipo: ${tipoEnquete}`,
                    DataFim: prazo ? prazo : null,
                    Opcoes: opcoesDto
                };
                if (id) {
                    await handleUpdateEnquete(id, enqueteData);
                } else {
                    await handleCreateEnquete(enqueteData);
                }
                if (criarEnqueteModal) criarEnqueteModal.style.display = 'none';
                formCriarEnquete.reset();
            });
        }
    }

    // Listeners for Criar Chamado Modal
    if (criarChamadoModal) {
        document.querySelectorAll('.js-modal-criar-chamado-close').forEach(btn => {
            btn.addEventListener('click', () => { if (criarChamadoModal) criarChamadoModal.style.display = 'none'; });
        });
        window.addEventListener('click', (event) => {
            if (event.target === criarChamadoModal) criarChamadoModal.style.display = 'none';
        });
        if (formCriarChamado && chamadoIdFieldModal && formChamadoSubmitButtonModal) {
            formCriarChamado.addEventListener('submit', async (event) => {
                event.preventDefault();
                const currentChamadoId = chamadoIdFieldModal.value;
                // Nota: Upload de anexos requer backend e FormData.
                const chamadoData = {
                    titulo: document.getElementById('chamado-titulo-modal').value,
                    descricao: document.getElementById('chamado-descricao-modal').value,
                    categoria: document.getElementById('chamado-categoria-modal').value,
                };
                if (currentChamadoId) { // Edição (atualmente não usado para usuário final)
                    chamadoData.status = document.getElementById('chamado-status-modal').value;
                    await handleUpdateChamado(currentChamadoId, chamadoData);
                } else { // Criação
                    await handleCreateChamado(chamadoData);
                }
                if (criarChamadoModal) criarChamadoModal.style.display = 'none';
                formCriarChamado.reset();
            });
        }
    }
}

function setupFeedItemActionButtons() {
    const userRoles = getUserRoles();
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

    document.querySelectorAll('.js-edit-feed-item').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        if (isSindico && newButton.dataset.itemType === 'Aviso') { // Apenas Sindico edita Avisos
            newButton.style.display = 'inline-block';
            newButton.addEventListener('click', (event) => {
                const itemType = event.target.dataset.itemType;
                const itemId = event.target.dataset.itemId;
                openEditFeedItemModal(itemType, itemId);
            });
        } else {
            newButton.style.display = 'none';
        }
    });

    document.querySelectorAll('.js-delete-feed-item').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        if (isSindico && newButton.dataset.itemType === 'Aviso') { // Apenas Sindico deleta Avisos
            newButton.style.display = 'inline-block';
            newButton.addEventListener('click', async (event) => {
                const itemType = event.target.dataset.itemType;
                const itemId = event.target.dataset.itemId;
                if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
                    if (itemType === "Aviso") {
                        await handleDeleteAviso(itemId);
                    } else {
                        showGlobalFeedback(`Exclusão para ${itemType} não implementada diretamente do feed.`, 'info');
                    }
                }
            });
        } else {
            newButton.style.display = 'none';
        }
    });

    document.querySelectorAll('.js-end-enquete-item').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        if (isSindico) {
            newButton.style.display = 'inline-block';
            newButton.addEventListener('click', async (event) => {
                const itemId = event.target.dataset.itemId;
                if (confirm('Tem certeza que deseja encerrar esta enquete manualmente?')) {
                    await handleEndEnquete(itemId);
                }
            });
        } else {
            newButton.style.display = 'none';
        }
    });

    document.querySelectorAll('.js-generate-ata-enquete-item').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        if (isSindico) {
            newButton.style.display = 'inline-block';
            newButton.addEventListener('click', async (event) => {
                const itemId = event.target.dataset.itemId;
                await handleGenerateAtaEnquete(itemId);
            });
        } else {
            newButton.style.display = 'none';
        }
    });
}

async function handleDeleteAviso(itemId) {
    showGlobalFeedback('Excluindo aviso...', 'info');
    try {
        await apiClient.delete(`/api/v1/avisos/syndic/avisos/${itemId}`);
        showGlobalFeedback('Aviso excluído com sucesso!', 'success');
        fetchedFeedItems = fetchedFeedItems.filter(i => !(i.id.toString() === itemId.toString() && i.itemType === 'Aviso'));
        const cardToRemove = document.querySelector(`${feedContainerSelector} .cv-card[data-item-id="${itemId}"][data-item-type="Aviso"]`);
        if (cardToRemove) {
            cardToRemove.remove();
        } else {
            await loadInitialFeedItems();
        }
    } catch (error) {
        console.error("Erro ao excluir aviso:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao excluir o aviso.', 'error');
        }
    }
}

// MOCK getUserRoles - REMOVE THIS WHEN auth.js IS UPDATED
function getUserRoles() {
    const user = JSON.parse(localStorage.getItem('userInfo'));
    if (user && user.roles) return user.roles;
    // return ['Sindico'];
    return ['Condomino'];
}
// FIM DO MOCK

function updateUserSpecificUI(activeTabId = 'tab-mural') {
    const userRoles = getUserRoles();
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

    const fabMural = document.querySelector('.js-fab-mural');
    const fabEnquetes = document.querySelector('.js-fab-enquetes');
    const fabSolicitacoes = document.querySelector('.js-fab-chamados');

    if (fabMural) fabMural.style.display = 'none';
    if (fabEnquetes) fabEnquetes.style.display = 'none';
    if (fabSolicitacoes) fabSolicitacoes.style.display = 'none';

    if (fabMural && !fabMural.dataset.listenerAttached) {
        fabMural.addEventListener('click', openCriarAvisoModal);
        fabMural.dataset.listenerAttached = 'true';
    }
    if (fabEnquetes && !fabEnquetes.dataset.listenerAttached) {
        fabEnquetes.addEventListener('click', openCreateEnqueteModal);
        fabEnquetes.dataset.listenerAttached = 'true';
    }
    if (fabSolicitacoes && !fabSolicitacoes.dataset.listenerAttached) {
        fabSolicitacoes.addEventListener('click', openCreateChamadoModal);
        fabSolicitacoes.dataset.listenerAttached = 'true';
    }

    if (activeTabId === 'tab-mural') {
        if (isSindico) {
            if (fabMural) fabMural.style.display = 'block';
        } else {
            if (fabSolicitacoes) fabSolicitacoes.style.display = 'block';
        }
    } else if (activeTabId === 'tab-enquetes') {
        if (isSindico) {
            if (fabEnquetes) fabEnquetes.style.display = 'block';
        }
    } else if (activeTabId === 'tab-solicitacoes') {
        if (fabSolicitacoes) fabSolicitacoes.style.display = 'block';
    }

     const sindicoOnlyMessages = document.querySelectorAll('.js-sindico-only-message');
     sindicoOnlyMessages.forEach(msg => {
        msg.style.display = isSindico ? 'inline' : 'none';
    });
}

function setupFilterButtonListener() {
    const btn = document.getElementById('apply-filters-button');
    if (btn) btn.addEventListener('click', () => {
        showGlobalFeedback("Aplicando filtros ao feed...", 'info');
        loadInitialFeedItems();
    });
}
async function loadInitialFeedItems() {
    currentFeedPage = 1;
    noMoreFeedItems = false;
    isLoadingFeedItems = false;
    const container = document.querySelector(feedContainerSelector);
    if (!container) return;

    const existingSentinel = document.getElementById(feedScrollSentinelId);
    let sentinel = existingSentinel;
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = feedScrollSentinelId;
        sentinel.style.height = '10px';
    }
    if (container.lastChild !== sentinel) { // Ensure sentinel is last for correct observation
        container.appendChild(sentinel);
    }
    sentinel.style.display = 'block';

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
    const container = document.querySelector(feedContainerSelector);
    if (!container) { isLoadingFeedItems = false; return; }

    const sentinelElement = document.getElementById(feedScrollSentinelId);
    const loadingMessageClass = 'cv-loading-message';
    let loadingP = container.querySelector(`.${loadingMessageClass}`);

    if (!append) {
        const CategoriaFilterValue = document.getElementById('category-filter')?.value?.toLowerCase() || '';
        document.querySelectorAll(`${feedContainerSelector} > .feed-item:not(.prio-0)`).forEach(el => el.remove());

        fetchedFeedItems = fetchedFeedItems.filter(fi => {
            return fi.prioridadeOrdenacao === 0 &&
                   (CategoriaFilterValue === '' ||
                    fi.categoria?.toLowerCase() === CategoriaFilterValue ||
                    fi.itemType?.toLowerCase() === CategoriaFilterValue);
        });

        const noItemsMsg = container.querySelector('.cv-no-items-message');
        if (noItemsMsg) noItemsMsg.remove();
        const errorMsg = container.querySelector('.cv-error-message');
        if (errorMsg) errorMsg.remove();

        if (!loadingP) {
            loadingP = document.createElement('p');
            loadingP.className = loadingMessageClass;
            if (sentinelElement) container.insertBefore(loadingP, sentinelElement);
            else container.appendChild(loadingP);
        }
        loadingP.textContent = 'Carregando feed...';
        loadingP.style.display = 'block';

    } else {
        if (sentinelElement && (!loadingP || loadingP.parentElement !== container) ) {
            loadingP = document.createElement('p');
            loadingP.className = loadingMessageClass;
            container.insertBefore(loadingP, sentinelElement);
        }
        if (loadingP) {
          loadingP.textContent = 'Carregando mais itens...';
          loadingP.style.display = 'block';
        }
    }
    if (sentinelElement) sentinelElement.style.display = 'block';


    const categoriaFilter = document.getElementById('category-filter')?.value || null;
    const periodoFilterInput = document.getElementById('period-filter')?.value;
    let periodoInicio = null, periodoFim = null;
    if (periodoFilterInput) {
        const [year, monthStr] = periodoFilterInput.split('-');
        const yearNum = parseInt(year);
        const monthNum = parseInt(monthStr);
        if (!isNaN(yearNum) && !isNaN(monthNum)) {
            periodoInicio = new Date(Date.UTC(yearNum, monthNum - 1, 1));
            periodoFim = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
        }
    }

    try {
        const response = await apiClient.get('/api/v1/feed', {
            pageNumber: page,
            pageSize: 10,
            categoria: categoriaFilter,
            periodoInicio: periodoInicio ? periodoInicio.toISOString() : null,
            periodoFim: periodoFim ? periodoFim.toISOString() : null
        });

        const items = response || [];

        if (loadingP) loadingP.style.display = 'none';

        if (items.length > 0) {
            items.forEach(item => {
                if (fetchedFeedItems.some(fi => fi.id === item.id && fi.itemType === item.itemType)) {
                    if (item.prioridadeOrdenacao === 0) return;
                }

                const itemElement = renderFeedItem(item);
                if (sentinelElement) container.insertBefore(itemElement, sentinelElement);
                else container.appendChild(itemElement);

                if (!fetchedFeedItems.some(fi => fi.id === item.id && fi.itemType === item.itemType)) {
                    fetchedFeedItems.push(item);
                }
            });

            const allRenderedItems = Array.from(container.querySelectorAll('.feed-item'));
            allRenderedItems.sort((a, b) => {
                const itemA = fetchedFeedItems.find(fi => fi.id === a.dataset.itemId && fi.itemType === a.dataset.itemType) || {prioridadeOrdenacao: 1, dataHoraPrincipal: 0};
                const itemB = fetchedFeedItems.find(fi => fi.id === b.dataset.itemId && fi.itemType === b.dataset.itemType) || {prioridadeOrdenacao: 1, dataHoraPrincipal: 0};

                if (itemA.prioridadeOrdenacao !== itemB.prioridadeOrdenacao) {
                    return itemA.prioridadeOrdenacao - itemB.prioridadeOrdenacao;
                }
                return new Date(itemB.dataHoraPrincipal) - new Date(itemA.dataHoraPrincipal);
            });
            allRenderedItems.forEach(el => container.insertBefore(el, sentinelElement));


        } else {
            if (page === 1 && !append) {
                const currentVisibleItems = container.querySelectorAll('.feed-item');
                if (currentVisibleItems.length === 0) {
                    const noItemsMsgCheck = container.querySelector('.cv-no-items-message');
                    if (noItemsMsgCheck) noItemsMsgCheck.remove();
                    const noItemsP = document.createElement('p');
                    noItemsP.className = 'cv-no-items-message';
                    noItemsP.textContent = 'Nenhum item encontrado para os filtros atuais.';
                    if (sentinelElement) container.insertBefore(noItemsP, sentinelElement);
                    else container.appendChild(noItemsP);
                }
            }
            noMoreFeedItems = true;
            if (sentinelElement) sentinelElement.style.display = 'none';
        }
        setupFeedItemActionButtons();
    } catch (error) {
        console.error("Erro ao buscar feed:", error);
        if (loadingP) loadingP.style.display = 'none';

        const currentVisibleItemsOnError = container.querySelectorAll('.feed-item');
        if (currentVisibleItemsOnError.length === 0) {
            const errorMsgCheck = container.querySelector('.cv-error-message');
            if (errorMsgCheck) errorMsgCheck.remove();
            const errorP = document.createElement('p');
            errorP.className = 'cv-error-message';
            errorP.textContent = 'Erro ao carregar o feed. Tente novamente mais tarde.';
            if (sentinelElement) container.insertBefore(errorP, sentinelElement);
            else container.appendChild(errorP);
        } else if (append) {
            showGlobalFeedback("Erro ao carregar mais itens.", "error");
        }
         if (sentinelElement) sentinelElement.style.display = 'none';
    } finally {
        isLoadingFeedItems = false;
    }
}

function renderFeedItem(item) {
    const card = document.createElement('article');
    card.className = `cv-card feed-item feed-item-${item.itemType.toLowerCase()} prio-${item.prioridadeOrdenacao}`;
    card.dataset.itemId = item.id;
    card.dataset.itemType = item.itemType;

    const pinLabel = item.prioridadeOrdenacao === 0 ? '<span class="feed-item__pin">📌 </span>' : '';

    let categoriaParaTag = item.categoria || item.itemType;
    if (item.itemType === "Enquete") categoriaParaTag = "Enquete";
    else if (item.itemType === "Chamado" || item.itemType === "Ocorrencia") categoriaParaTag = "Solicitações";
    else if (item.itemType === "OrdemServico") categoriaParaTag = "Serviços";
    else if (item.itemType === "BoletoLembrete") categoriaParaTag = "Financeiro";
    else if (item.itemType === "Documento") categoriaParaTag = "Documentos";
    else if (item.itemType === "Aviso" && item.categoria?.toLowerCase() === "urgente") categoriaParaTag = "Urgente";
    else if (item.itemType === "Aviso") categoriaParaTag = "Comunicados";
    else if (item.itemType === "Reserva") categoriaParaTag = "Reservas";
    else if (item.itemType === "Encomenda") categoriaParaTag = "Portaria";


    const categoriaMap = {
        "manutenção": "🛠️ Manutenção",
        "reservas": "🏡 Reservas",
        "comunicados": "📢 Comunicados",
        "enquete": "🗳️ Enquetes",
        "assembleias": "🧑‍⚖️ Assembleias",
        "urgente": "🚨 Urgente",
        "serviços": "🛠️ Serviços",
        "solicitações": "💬 Solicitações",
        "financeiro": "💰 Financeiro",
        "documentos": "📄 Documentos",
        "portaria": "📦 Portaria"
    };

    let tagDisplay = categoriaMap[categoriaParaTag?.toLowerCase()] || categoriaParaTag;


    let contentHtml = `
        <h3 class="feed-item__title">${pinLabel}${item.titulo}</h3>
        <p class="feed-item__summary">${item.resumo}</p>
        <div class="feed-item__meta">
            <span class="feed-item__date">Data: ${new Date(item.dataHoraPrincipal).toLocaleString()}</span>
            ${item.status ? `<span class="feed-item__status">Status: ${item.status}</span>` : ''}
        </div>
    `;

    let tagsHtml = '<div class="feed-item__tags">';
    if (tagDisplay) {
        tagsHtml += `<span class="feed-item__tag feed-item__tag--${item.itemType.toLowerCase()}">${tagDisplay}</span>`;
    }
    tagsHtml += '</div>';
    contentHtml += tagsHtml;

    let actionsHtml = `<div class="feed-item__actions">`;
    if (item.urlDestino || ['Enquete', 'Chamado', 'Ocorrencia', 'OrdemServico', 'BoletoLembrete', 'Documento'].includes(item.itemType)) {
        actionsHtml += `<button class="cv-button-link js-view-item-detail" data-item-id="${item.id}" data-item-type="${item.itemType}">Ver Detalhes</button>`;
    }

    const userRoles = getUserRoles();
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

    if (isSindico) {
        if (item.itemType === 'Aviso') {
            actionsHtml += `<button class="cv-button-link js-edit-feed-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Editar</button>`;
            actionsHtml += `<button class="cv-button-link danger js-delete-feed-item" data-item-id="${item.id}" data-item-type="${item.itemType}">Excluir</button>`;
        }
        if (item.itemType === 'Enquete') {
            if (item.status && item.status.toLowerCase() === 'aberta') {
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
        container.addEventListener('click', handleFeedItemClick);
    }
}

async function handleFeedItemClick(event) {
    const clickedElement = event.target;
    const cardElement = clickedElement.closest('.feed-item');
    if (!cardElement) return;

    const itemId = cardElement.dataset.itemId;
    const itemType = cardElement.dataset.itemType;
    if (!itemId || !itemType) return;

    if (clickedElement.classList.contains('js-edit-feed-item')) {
        openEditFeedItemModal(itemType, itemId); return;
    }
    if (clickedElement.classList.contains('js-delete-feed-item')) {
        if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
            if (itemType === "Aviso") await handleDeleteAviso(itemId);
            else showGlobalFeedback(`Exclusão para ${itemType} não implementada aqui.`, 'info');
        }
        return;
    }
    if (clickedElement.classList.contains('js-end-enquete-item')) {
        if (confirm('Tem certeza que deseja encerrar esta enquete manualmente?')) {
            await handleEndEnquete(itemId);
        }
        return;
    }
    if (clickedElement.classList.contains('js-generate-ata-enquete-item')) {
        await handleGenerateAtaEnquete(itemId);
        return;
    }

    if (clickedElement.classList.contains('js-view-item-detail') || event.target === cardElement || cardElement.contains(event.target)) {
        if (clickedElement.closest('.feed-item__actions') && !clickedElement.classList.contains('js-view-item-detail')) {
            return;
        }

        switch (itemType) {
            case 'Aviso':
                showGlobalFeedback(`Visualizando detalhes do Aviso (se houver modal dedicado).`, 'info');
                break;
            case 'Enquete':
                handleEnqueteClick(itemId, cardElement);
                break;
            case 'Chamado':
            case 'Ocorrencia':
            case 'OrdemServico':
                handleChamadoClick(itemId, cardElement, itemType);
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

let currentEnqueteId = null;

async function handleEnqueteClick(itemId, targetElementOrCard) {
    currentEnqueteId = itemId;
    if (!modalEnqueteDetalhe || !apiClient) return;

    modalEnqueteDetalheOpcoesContainer.innerHTML = '<p class="cv-loading-message">Carregando detalhes da enquete...</p>';
    modalEnqueteDetalheStatus.innerHTML = '';
    modalEnqueteSubmitVotoButton.style.display = 'none';
    modalEnqueteDetalhe.style.display = 'flex';

    try {
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
            modalEnqueteSubmitVotoButton.onclick = () => submitVoto(itemId);
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

async function submitVoto(enqueteId) {
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
        await apiClient.post(`/api/v1/votacoes/app/votacoes/${enqueteId}/votar`, { OpcaoId: opcaoId });
        showGlobalFeedback('Voto registrado com sucesso!', 'success');
        modalEnqueteSubmitVotoButton.style.display = 'none';
        await handleEnqueteClick(enqueteId, null);
    } catch (error) {
        console.error("Erro ao registrar voto:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao registrar o voto.', 'error');
        }
        await handleEnqueteClick(enqueteId, null);
    }
}


let currentChamadoIdModal = null;

async function handleChamadoClick(itemId, targetElementOrCard, itemType = 'Chamado') {
    currentChamadoIdModal = itemId;
    if (!modalChamadoDetalhe || !apiClient) return;

    modalChamadoDetalheConteudo.innerHTML = '<p class="cv-loading-message">Carregando detalhes...</p>';
    modalChamadoDetalheInteracoes.innerHTML = '';

    const sindicoUpdateSection = document.getElementById('sindico-chamado-update-section');
    const statusUpdateGroup = document.getElementById('modal-chamado-status-update-group'); // Not used directly here, but part of section
    const respostaSindicoGroup = document.getElementById('modal-chamado-resposta-sindico-group'); // Not used directly here
    const submitSindicoUpdateButton = document.getElementById('modal-chamado-submit-sindico-update');

    if (sindicoUpdateSection) sindicoUpdateSection.style.display = 'none';
    if (submitSindicoUpdateButton) submitSindicoUpdateButton.style.display = 'none';

    const userCommentSection = document.getElementById('modal-chamado-add-comment-section');
    if (userCommentSection) userCommentSection.style.display = 'none';


    modalChamadoDetalhe.style.display = 'flex';

    let endpoint = '';
    if (itemType === 'Chamado') endpoint = `/api/v1/chamados/app/chamados/${itemId}`;
    else if (itemType === 'Ocorrencia') endpoint = `/api/v1/ocorrencias/app/ocorrencias/${itemId}`;
    else if (itemType === 'OrdemServico') endpoint = `/api/v1/ordensservico/app/ordensservico/${itemId}`;
    else {
        showGlobalFeedback(`Detalhes para ${itemType} não suportados.`, 'error');
        if (modalChamadoDetalhe) modalChamadoDetalhe.style.display = 'none';
        return;
    }

    try {
        const itemData = await apiClient.get(endpoint);

        if (!itemData) {
            modalChamadoDetalheConteudo.innerHTML = '<p class="cv-error-message">Item não encontrado ou acesso não permitido.</p>';
            return;
        }

        modalChamadoDetalheTitulo.textContent = itemData.titulo || `Detalhes de ${itemType}`;
        renderDetalhesGenerico(itemData, itemType);

        modalChamadoDetalheInteracoes.innerHTML = `<p style="text-align:center; color: var(--current-text-placeholder);"><em>Funcionalidade de histórico de interações em desenvolvimento.</em></p>`;

        const userRoles = getUserRoles();
        const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

        if (isSindico && itemType === 'Chamado' && sindicoUpdateSection && submitSindicoUpdateButton) {
            sindicoUpdateSection.style.display = 'block';
            document.getElementById('modal-chamado-status-select').value = itemData.status || 'Aberto';
            document.getElementById('modal-chamado-resposta-textarea').value = itemData.respostaDoSindico || '';

            submitSindicoUpdateButton.style.display = 'block';
            const newUpdateButton = submitSindicoUpdateButton.cloneNode(true);
            submitSindicoUpdateButton.parentNode.replaceChild(newUpdateButton, submitSindicoUpdateButton);
            newUpdateButton.onclick = () => submitChamadoUpdateBySindico(itemId);
        } else if (itemType === 'Chamado' && userCommentSection) {
             // userCommentSection.style.display = 'block'; // Logic for user comments can be added here
        }

    } catch (error) {
        console.error(`Erro ao buscar detalhes de ${itemType}:`, error);
        modalChamadoDetalheConteudo.innerHTML = `<p class="cv-error-message">Erro ao carregar detalhes de ${itemType}.</p>`;
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || `Falha ao carregar ${itemType}.`, 'error');
        }
    }
}

function renderDetalhesGenerico(itemData, itemType) {
    const dataPrincipal = itemData.dataAbertura || itemData.dataHoraPrincipal || itemData.criadoEm || itemData.publicadoEm;
    const dataResolucao = itemData.dataResolucao || itemData.concluidoEm || itemData.dataFim;

    let html = `<p><strong>Título:</strong> ${itemData.titulo || 'N/A'}</p>`;
    if (itemData.descricao) {
        html += `<p><strong>Descrição:</strong></p><p style="white-space: pre-wrap;">${itemData.descricao}</p>`;
    }
    if (itemData.categoria || itemData.categoriaServico) {
         html += `<p><strong>Categoria:</strong> ${itemData.categoria || itemData.categoriaServico}</p>`;
    }
    if (itemData.status) {
        html += `<p><strong>Status:</strong> <span class="status-${itemData.status.toLowerCase()}">${itemData.status}</span></p>`;
    }
    if (dataPrincipal) {
        html += `<p><strong>Data Principal:</strong> ${new Date(dataPrincipal).toLocaleString()}</p>`;
    }
    if (dataResolucao) {
        html += `<p><strong>Data Conclusão/Resolução:</strong> ${new Date(dataResolucao).toLocaleString()}</p>`;
    }

    if (itemType === 'Chamado') {
        if (itemData.respostaDoSindico) {
            html += `<p><strong>Resposta do Síndico:</strong> ${itemData.respostaDoSindico}</p>`;
        }
        if (itemData.avaliacaoNota) {
            html += `<p><strong>Sua Avaliação:</strong> ${itemData.avaliacaoNota}/5 ${itemData.avaliacaoComentario ? `- <em>${itemData.avaliacaoComentario}</em>` : ''}</p>`;
        }
    }
    if (itemType === 'OrdemServico') {
        if(itemData.prestadorId) html += `<p><strong>Prestador ID:</strong> ${itemData.prestadorId}</p>`;
    }

    if (itemData.fotos && itemData.fotos.length > 0) {
        html += `<p><strong>Fotos:</strong></p><div class="item-photos">`;
        itemData.fotos.forEach(fotoUrl => {
            html += `<img src="${fotoUrl}" alt="Foto do item" style="max-width:100px; margin:5px; border:1px solid #ddd;">`;
        });
        html += `</div>`;
    }

    modalChamadoDetalheConteudo.innerHTML = html;
}

async function submitChamadoUpdateBySindico(chamadoId) {
    const statusSelect = document.getElementById('modal-chamado-status-select');
    const respostaTextarea = document.getElementById('modal-chamado-resposta-textarea');

    if (!statusSelect || !respostaTextarea) {
        showGlobalFeedback("Erro: Elementos do formulário de atualização do síndico não encontrados.", "error");
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
            respostaDoSindico: respostaDoSindico
        });
        showGlobalFeedback("Chamado atualizado com sucesso!", "success");
        if (modalChamadoDetalhe) modalChamadoDetalhe.style.display = 'none';
        await loadInitialFeedItems();
    } catch (error) {
        console.error("Erro ao atualizar chamado pelo síndico:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao atualizar o chamado.', 'error');
        }
    }
}


function handleOcorrenciaClick(itemId, targetElementOrCard) {
    handleChamadoClick(itemId, targetElementOrCard, 'Ocorrencia');
}
function handleOrdemServicoClick(itemId, targetElementOrCard) {
    handleChamadoClick(itemId, targetElementOrCard, 'OrdemServico');
}


function handleDocumentoClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id.toString() === itemId.toString() && i.itemType === 'Documento');
    if (item && item.urlDestino) {
        window.open(item.urlDestino, '_blank');
    } else {
        showGlobalFeedback(`Documento: ${item?.titulo || itemId}. URL não encontrada.`, 'warning');
    }
}

function handleReservaClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id.toString() === itemId.toString() && i.itemType === 'Reserva');
    showGlobalFeedback(`Reserva: ${item?.titulo || itemId}. Detalhes da reserva seriam exibidos aqui.`, 'info', 5000);
}

function handleEncomendaClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id.toString() === itemId.toString() && i.itemType === 'Encomenda');
    showGlobalFeedback(`Encomenda: ${item?.titulo || itemId}. Detalhes da encomenda seriam exibidos aqui.`, 'info', 5000);
}

function handleBoletoLembreteClick(itemId, targetElementOrCard) {
    const item = fetchedFeedItems.find(i => i.id.toString() === itemId.toString() && i.itemType === 'BoletoLembrete');
    if (item && item.urlDestino) {
        window.open(item.urlDestino, '_blank');
    } else {
        showGlobalFeedback(`Boleto: ${item?.titulo || itemId}. Link para detalhes não disponível.`, 'info');
    }
}


// --- Enquetes e Votações Tab ---
function setupEnquetesTab() {
    console.log("Modo de filtro de Enquetes ativado.");
    setupEnqueteModalAndFAB();
}

function openCreateEnqueteModal() {
    if (criarEnqueteModal) {
        formCriarEnquete.reset();
        enqueteIdField.value = '';
        modalEnqueteTitle.textContent = 'Nova Enquete';
        formEnqueteSubmitButton.textContent = 'Salvar Enquete';
        criarEnqueteModal.style.display = 'flex';
    }
}

async function handleCreateEnquete(enqueteData) {
    try {
        showGlobalFeedback('Criando nova enquete...', 'info');
        await apiClient.post('/api/v1/votacoes/syndic/votacoes', enqueteData);
        showGlobalFeedback('Nova enquete criada com sucesso! Ela aparecerá no feed.', 'success');
        await loadInitialFeedItems();
    } catch (error) {
        console.error("Erro ao criar enquete:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao criar a enquete.', 'error');
        }
    }
}

async function handleUpdateEnquete(id, enqueteData) {
    console.warn("handleUpdateEnquete chamado, mas o backend não suporta edição de votações.", id, enqueteData);
    showGlobalFeedback('Funcionalidade de editar enquete não está disponível.', 'warning');
}

async function handleEndEnquete(enqueteId) {
    try {
        showGlobalFeedback('Encerrando enquete...', 'info');
        await apiClient.put(`/api/v1/votacoes/syndic/votacoes/${enqueteId}/encerrar`, {});
        showGlobalFeedback('Enquete encerrada com sucesso!', 'success');
        await loadInitialFeedItems();
    } catch (error) {
        console.error("Erro ao encerrar enquete:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao encerrar a enquete.', 'error');
        }
    }
}

async function handleGenerateAtaEnquete(enqueteId) {
    try {
        showGlobalFeedback('Gerando ata da enquete...', 'info');
        const response = await apiClient.getRawResponse(`/api/v1/votacoes/syndic/votacoes/${enqueteId}/gerar-ata`);

        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/pdf")) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ata_Enquete_${enqueteId}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                showGlobalFeedback('Ata da enquete baixada.', 'success');
            } else {
                const data = await response.json().catch(() => ({ message: 'Formato de resposta inesperado ao gerar ata.' }));
                showGlobalFeedback(data.message || 'Resposta inesperada ao gerar ata.', 'warning');
            }
        } else {
            const errorData = await response.json().catch(() => ({ message: `Falha ao gerar ata (Status: ${response.status})` }));
            showGlobalFeedback(errorData.message, 'error');
        }
    } catch (error) {
        console.error("Erro ao gerar ata da enquete:", error);
        showGlobalFeedback('Erro ao tentar gerar ata.', 'error');
    }
}


function setupEnqueteModalAndFAB() {
    console.log("setupEnqueteModalAndFAB called (listeners moved to central setupModalEventListeners)");
}


// --- Solicitações Tab (formerly Chamados) ---
function formatChamadoStatus(status) {
    const map = { 'aberto': 'Aberto', 'em_andamento': 'Em Andamento', 'concluido': 'Concluído', 'cancelado': 'Cancelado' };
    return map[status.toLowerCase()] || status;
}
function formatChamadoCategoria(categoria) {
    const map = { 'limpeza': 'Limpeza', 'seguranca': 'Segurança', 'manutencao_geral': 'Manutenção Geral', 'barulho': 'Barulho', 'outros': 'Outros' };
    return map[categoria.toLowerCase()] || categoria;
}

function setupSolicitacoesTab() {
    console.log("Modo de filtro de Solicitações ativado.");
    setupChamadoModalAndFAB();
}

async function handleCreateChamado(chamadoData) {
    try {
        showGlobalFeedback('Abrindo novo chamado...', 'info');
        const dataParaApi = {
            Titulo: chamadoData.titulo,
            Descricao: `Categoria: ${chamadoData.categoria}\n\n${chamadoData.descricao}`,
        };
        await apiClient.post('/api/v1/chamados/app/chamados', dataParaApi);
        showGlobalFeedback('Novo chamado aberto com sucesso! Ele aparecerá no feed.', 'success');
        await loadInitialFeedItems();
    } catch (error) {
        console.error("Erro ao abrir chamado:", error);
        if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao abrir o chamado.', 'error');
        }
    }
}

async function handleUpdateChamado(id, chamadoData) {
    console.warn("handleUpdateChamado (usuário) chamado, mas não implementado.", id, chamadoData);
    showGlobalFeedback('Funcionalidade de editar seu próprio chamado não está disponível.', 'warning');
}

function setupChamadoModalAndFAB() {
    console.log("setupChamadoModalAndFAB ensuring openCreateChamadoModal is available.");
}

function openCreateChamadoModal() {
    if (criarChamadoModal && formCriarChamado && chamadoIdFieldModal && modalChamadoTitle && formChamadoSubmitButtonModal && chamadoStatusModalFormGroup && chamadoCategoriaModalFormGroup) {
        formCriarChamado.reset();
        chamadoIdFieldModal.value = '';
        modalChamadoTitle.textContent = 'Novo Chamado';
        formChamadoSubmitButtonModal.textContent = 'Abrir Chamado';
        chamadoStatusModalFormGroup.style.display = 'none';
        chamadoCategoriaModalFormGroup.style.display = 'block';
        document.getElementById('chamado-descricao-modal').disabled = false;
        criarChamadoModal.style.display = 'flex';
    }
}
