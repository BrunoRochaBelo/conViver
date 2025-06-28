import apiClient, { ApiError } from './apiClient.js';
import { requireAuth, getCurrentUser } from './auth.js';
import { createProgressBar, showProgress, xhrPost } from './progress.js';
import {
    showGlobalFeedback,
    createErrorStateElement,
    createEmptyStateElement,
    showModalError,
    clearModalError,
    showSkeleton,
    hideSkeleton
} from './main.js'; // Importar helpers de UI

// --- DOM Elements ---
const listaOcorrenciasEl = document.getElementById('listaOcorrencias');
const ocorrenciasLoadingEl = document.getElementById('ocorrenciasLoading');
const noOcorrenciasMessageEl = document.getElementById('noOcorrenciasMessage');
const tabsContainer = document.querySelector('.ocorrencias-tabs');
const tabTodasOcorrencias = document.getElementById('tabTodasOcorrencias');

// Nova Ocorrência Modal
const btnNovaOcorrencia = document.getElementById('btnNovaOcorrencia');
const modalNovaOcorrencia = document.getElementById('modalNovaOcorrencia');
const closeNovaOcorrenciaModalBtn = document.getElementById('closeNovaOcorrenciaModal');
const formNovaOcorrencia = document.getElementById('formNovaOcorrencia');
const ocorrenciaTituloInput = document.getElementById('ocorrenciaTitulo');
const ocorrenciaDescricaoInput = document.getElementById('ocorrenciaDescricao');
const ocorrenciaCategoriaSelect = document.getElementById('ocorrenciaCategoria');
const ocorrenciaPrioridadeSelect = document.getElementById('ocorrenciaPrioridade');
const ocorrenciaAnexosInput = document.getElementById('ocorrenciaAnexos');
const anexosPreviewContainer = document.getElementById('anexosPreviewContainer');
const cancelNovaOcorrenciaBtn = document.getElementById('cancelNovaOcorrencia');
const formNovaOcorrenciaErrorsEl = document.getElementById('formNovaOcorrenciaErrors');
const novaOcorrenciaProgress = createProgressBar();


// Detalhe Ocorrência Modal
const modalDetalheOcorrencia = document.getElementById('modalDetalheOcorrencia');
const closeDetalheOcorrenciaModalBtn = document.getElementById('closeDetalheOcorrenciaModal');
const detalheTituloEl = document.getElementById('detalheTitulo');
const detalheCategoriaEl = document.getElementById('detalheCategoria');
const detalheStatusEl = document.getElementById('detalheStatus');
const detalhePrioridadeEl = document.getElementById('detalhePrioridade');
const detalheDataAberturaEl = document.getElementById('detalheDataAbertura');
const detalheDataAtualizacaoEl = document.getElementById('detalheDataAtualizacao');
const detalheUsuarioNomeEl = document.getElementById('detalheUsuarioNome');
const detalheUsuarioUnidadeEl = document.getElementById('detalheUsuarioUnidade');
const detalheDescricaoEl = document.getElementById('detalheDescricao');
const detalheAnexosContainerEl = document.getElementById('detalheAnexosContainer');
const detalheHistoricoStatusEl = document.getElementById('detalheHistoricoStatus');
const detalheComentariosContainerEl = document.getElementById('detalheComentariosContainer');
const novoComentarioTextoInput = document.getElementById('novoComentarioTexto');
const btnAdicionarComentario = document.getElementById('btnAdicionarComentario');
const formComentarioErrorsEl = document.getElementById('formComentarioErrors');
const detalheNovosAnexosInput = document.getElementById('detalheNovosAnexos');
const btnAdicionarNovosAnexos = document.getElementById('btnAdicionarNovosAnexos');
const novosAnexosPreviewContainer = document.getElementById('novosAnexosPreviewContainer');
const novosAnexosProgress = createProgressBar();


// Detalhe Modal Action Buttons
const btnAlterarStatus = document.getElementById('btnAlterarStatus');
const btnExcluirOcorrencia = document.getElementById('btnExcluirOcorrencia');
// const btnCancelarOcorrencia = document.getElementById('btnCancelarOcorrencia'); // Not in HTML, use Alterar Status to CANCELADA
// const btnFinalizarOcorrencia = document.getElementById('btnFinalizarOcorrencia'); // Not in HTML, use Alterar Status to RESOLVIDA


// Alterar Status Modal
const modalAlterarStatus = document.getElementById('modalAlterarStatus');
const closeAlterarStatusModalBtn = document.getElementById('closeAlterarStatusModal');
const formAlterarStatus = document.getElementById('formAlterarStatus');
const selectNovoStatus = document.getElementById('selectNovoStatus');
const ocorrenciaIdParaAlterarStatusInput = document.getElementById('ocorrenciaIdParaAlterarStatus'); // Hidden input in modal
const formAlterarStatusErrorsEl = document.getElementById('formAlterarStatusErrors');


// --- State Variables ---
let currentUser = null; // To store user ID, roles { id: 'guid', nome: 'User', roles: ['Morador'] }
let currentOcorrenciaId = null;
let currentPage = 1;
let currentFilter = 'minhas'; // Default filter
let isLoading = false;
let allCategories = [];
const PAGE_SIZE = 10; // Or get from config

// --- Utility Functions ---
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dateString; // return original if parsing fails
    }
}

function renderStatusTag(statusKey, statusText) {
    const statusClass = `status-tag--${statusKey ? statusKey.toLowerCase().replace(/_/g, '-') : 'default'}`;
    return `<span class="status-tag ${statusClass}">${statusText || statusKey}</span>`;
}

function renderPrioridadeTag(prioridadeKey, prioridadeText) {
    if (!prioridadeKey || prioridadeKey.toUpperCase() === 'NORMAL') return '';
    const prioClass = `ocorrencia-card__prioridade--${prioridadeKey.toLowerCase()}`;
    return `<span class="ocorrencia-card__prioridade ${prioClass}">${prioridadeText || prioridadeKey}</span>`;
}

function displayFormErrors(element, errors) {
    if (!element) return;
    if (errors && errors.length > 0) {
        element.innerHTML = errors.map(err => `<p class="cv-form__error-message">${err.ErrorMessage || err.errorMessage || err}</p>`).join('');
        element.style.display = 'block';
    } else {
        element.innerHTML = '';
        element.style.display = 'none';
    }
}

// --- API Communication ---

/**
 * Helper function to post FormData using fetch.
 * This is used for requests involving file uploads.
 * Could be integrated into apiClient.js for reusability.
 */
async function postWithFiles(path, formData, onProgress) {
    return xhrPost(path, formData, onProgress, true);
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    initOcorrenciasPage();
});

async function initOcorrenciasPage() {
    await fetchCurrentUser(); // Fetch user details (ID, roles)

    if (!currentUser) {
        console.error("Usuário não carregado. Funcionalidades da página de ocorrências podem ser limitadas.");
        // Potentially redirect or show a global error
        ocorrenciasLoadingEl.textContent = 'Erro ao carregar dados do usuário. Tente recarregar a página.';
        return;
    }

    if (tabTodasOcorrencias && (currentUser.roles.includes('Sindico') || currentUser.roles.includes('Administrador'))) {
        tabTodasOcorrencias.style.display = 'inline-block';
    } else if (tabTodasOcorrencias) {
         tabTodasOcorrencias.style.display = 'none';
    }

    const normalizedRoles = normalizeRoles(currentUser.roles || []);
    const canCreate = ['Morador','Sindico','Administrador'].some(r => normalizedRoles.includes(r));
    if (!canCreate && btnNovaOcorrencia) {
        btnNovaOcorrencia.style.display = 'none';
    }


    await loadCategorias();
    await loadOcorrencias(currentPage, currentFilter);

    // Attach Event Listeners
    if (formNovaOcorrencia) {
        formNovaOcorrencia.appendChild(novaOcorrenciaProgress);
    }
    if (detalheNovosAnexosInput) {
        const grp = detalheNovosAnexosInput.closest('.cv-form__group') || detalheNovosAnexosInput.parentElement;
        if (grp) grp.appendChild(novosAnexosProgress);
    }
    tabsContainer.addEventListener('click', handleTabClick);
    btnNovaOcorrencia.addEventListener('click', openNovaOcorrenciaModal);
    closeNovaOcorrenciaModalBtn.addEventListener('click', closeNovaOcorrenciaModal);
    cancelNovaOcorrenciaBtn.addEventListener('click', closeNovaOcorrenciaModal);
    formNovaOcorrencia.addEventListener('submit', handleNovaOcorrenciaSubmit);
    ocorrenciaAnexosInput.addEventListener('change', handleAnexoInputChange);

    closeDetalheOcorrenciaModalBtn.addEventListener('click', closeDetalheOcorrenciaModal);
    btnAdicionarComentario.addEventListener('click', handleAddComentario);
    btnAlterarStatus.addEventListener('click', openAlterarStatusModal); // Button in detail modal
    detalheNovosAnexosInput.addEventListener('change', handleDetalheNovosAnexosChange);
    btnAdicionarNovosAnexos.addEventListener('click', handleAdicionarNovosAnexosSubmit);


    closeAlterarStatusModalBtn.addEventListener('click', closeAlterarStatusModal);
    formAlterarStatus.addEventListener('submit', handleAlterarStatusSubmit);
    btnExcluirOcorrencia.addEventListener('click', handleDeleteOcorrencia);


    // Event delegation for dynamically created occurrence cards
    listaOcorrenciasEl.addEventListener('click', (event) => {
        const card = event.target.closest('.ocorrencia-card');
        if (card && card.dataset.ocorrenciaId) {
            openDetalheOcorrenciaModal(card.dataset.ocorrenciaId);
        }
    });
}

// Placeholder - needs actual implementation via API call
async function fetchCurrentUser() {
    try {
        // const userData = await apiClient.get('/api/auth/me'); // Example API call
        const userData = await getCurrentUser(); // from auth.js
        if (userData) {
            currentUser = {
                id: userData.id,
                nome: userData.nome, // Assuming 'nome' is part of userData
                roles: userData.roles || ['Morador'] // Default to 'Morador' if roles not present
            };
            console.log('Current user:', currentUser);
        } else {
             throw new Error("Dados do usuário não retornados pela API.");
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error.message);
        // Fallback to a default user or handle error appropriately
        // For now, let's allow page to proceed with currentUser = null, which initOcorrenciasPage checks.
        // Alternatively, redirect to login or show error.
        // This is critical for role-based UI.
        // For local testing without a /api/auth/me endpoint:
        // currentUser = { id: '00000000-0000-0000-0000-000000000001', nome: 'Usuário Teste', roles: ['Morador', 'Sindico'] };
        // console.warn('Using mock currentUser for testing.');
        currentUser = null; // Explicitly set to null on error.
    }
}

// --- Core Data Loading and Rendering ---

async function loadCategorias() {
    try {
        allCategories = await apiClient.get('/api/ocorrencias/categorias');
        if (ocorrenciaCategoriaSelect) {
            ocorrenciaCategoriaSelect.innerHTML = '<option value="">Selecione...</option>'; // Default option
            allCategories.forEach(categoria => {
                const option = document.createElement('option');
                option.value = categoria; // Assuming API returns string values that match enum names
                option.textContent = categoria.replace(/_/g, ' '); // Format for display
                ocorrenciaCategoriaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error.message);
        // Optionally display an error to the user
    }
}

function renderOcorrencias(ocorrencias, paginationInfo) { // paginationInfo is not used yet
    listaOcorrenciasEl.innerHTML = ''; // Clear previous list (skeletons, errors, or old items)
    if (noOcorrenciasMessageEl) noOcorrenciasMessageEl.style.display = 'none'; // Esconde a mensagem de texto antiga

    if (!ocorrencias || ocorrencias.length === 0) {
        let title = "Nenhuma Ocorrência";
        let description = "Ainda não há ocorrências registradas.";
        // Personalizar mensagem com base no filtro atual (currentFilter)
        if (currentFilter === 'minhas') {
            title = "Você Ainda Não Tem Ocorrências";
            description = "Você não registrou nenhuma ocorrência ou todas as suas foram resolvidas e arquivadas.";
        } else if (currentFilter === 'abertas') {
            title = "Nenhuma Ocorrência Aberta";
            description = "Não há ocorrências com status 'Aberta', 'Em Análise' ou 'Em Atendimento' no momento.";
        } else if (currentFilter === 'resolvidas') {
            title = "Nenhuma Ocorrência Resolvida";
            description = "Ainda não há ocorrências marcadas como 'Resolvida'.";
        } else if (currentFilter !== 'todas') { // Se for um filtro de categoria
            title = `Nenhuma Ocorrência em "${currentFilter.replace(/_/g, ' ')}"`;
            description = `Não foram encontradas ocorrências para esta categoria.`;
        }

        const emptyState = createEmptyStateElement({
            iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48px" height="48px"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 13h-2v-2h2v2zm0-4h-2V7h2v4z"/></svg>`, // Ícone de documento com exclamação
            title: title,
            description: description
        });
        listaOcorrenciasEl.appendChild(emptyState);
        return;
    }
    // noOcorrenciasMessageEl.style.display = 'none'; // Já tratado acima

    ocorrencias.forEach(ocorrencia => {
        const card = document.createElement('div');
        card.className = 'cv-card ocorrencia-card';
        card.dataset.ocorrenciaId = ocorrencia.id;

        // Categoria text might need mapping if API returns enum string and you want display text
        const categoriaDisplay = allCategories.find(c => c === ocorrencia.categoria) || ocorrencia.categoria;
        // Similar for status and prioridade if API returns keys but DTO has text

        card.innerHTML = `
            <div class="ocorrencia-card__header">
                <h3 class="ocorrencia-card__titulo">${ocorrencia.titulo}</h3>
                ${renderPrioridadeTag(ocorrencia.prioridade, ocorrencia.prioridade)}
            </div>
            <p class="ocorrencia-card__categoria"><i class="ocorrencia-card__categoria-icone">🔧</i> ${categoriaDisplay.replace(/_/g, ' ')}</p>
            <p class="ocorrencia-card__status">Status: ${renderStatusTag(ocorrencia.status, ocorrencia.status.replace(/_/g, ' '))}</p>
            <p class="ocorrencia-card__data-abertura">Abertura: ${formatDate(ocorrencia.dataAbertura)}</p>
            <p class="ocorrencia-card__data-atualizacao">Última atualização: ${formatDate(ocorrencia.dataAtualizacao)}</p>
            <p class="ocorrencia-card__aberta-por">Aberta por: ${ocorrencia.nomeUsuario || 'N/A'}</p>
        `;
        listaOcorrenciasEl.appendChild(card);
    });

    // TODO: Implement pagination controls if paginationInfo is provided and used
}

async function loadOcorrencias(page = 1, filter = currentFilter) {
    if (isLoading) return;
    isLoading = true;

    // Skeleton Logic:
    // Assumindo que listaOcorrenciasEl é o container onde os cards ou o skeleton devem aparecer.
    // Se não houver um elemento de skeleton dedicado no HTML, podemos criar um temporário
    // ou aplicar uma classe de skeleton ao próprio listaOcorrenciasEl.
    // Por simplicidade, vamos limpar e mostrar um texto de "Carregando..." se não houver skeleton global.
    // O ideal é ter um .feed-skeleton-container dentro ou em volta de listaOcorrenciasEl.
    // Para esta refatoração, vamos focar no ErrorState e EmptyState.
    // A mensagem de loading textual já existe (ocorrenciasLoadingEl).
    if (ocorrenciasLoadingEl) ocorrenciasLoadingEl.style.display = 'block';
    if (noOcorrenciasMessageEl) noOcorrenciasMessageEl.style.display = 'none'; // Esconde msg de 'sem ocorrências' ou erro antigo
    listaOcorrenciasEl.innerHTML = ''; // Limpa a lista para novos itens ou estado de erro/vazio

    // Remover ErrorState anterior, se houver
    const existingErrorState = listaOcorrenciasEl.querySelector('.cv-error-state');
    if (existingErrorState) existingErrorState.remove();
    const existingEmptyState = listaOcorrenciasEl.querySelector('.cv-empty-state');
    if (existingEmptyState) existingEmptyState.remove();


    currentPage = page;
    currentFilter = filter;

    let queryParams = `pagina=${currentPage}&tamanhoPagina=${PAGE_SIZE}`;

    // Status mapping based on filter tabs (adjust if API expects enum keys directly)
    // The API /api/ocorrencias endpoint uses OcorrenciaQueryParametersDto which has nullable OcorrenciaStatus and OcorrenciaCategoria.
    // The API also has a 'Minha' boolean.
    switch (filter) {
        case 'minhas':
            queryParams += '&minha=true';
            break;
        case 'abertas':
            // This requires knowing which statuses are considered "abertas"
            // For simplicity, let's assume API can filter by a group or we filter by specific statuses.
            // Example: queryParams += '&status=ABERTA&status=EM_ANALISE&status=EM_ATENDIMENTO';
            // If API only takes one status, this needs adjustment or multiple calls.
            // For now, let's assume the API handles a generic "abertas" concept or specific default open statuses.
            // The OcorrenciaQueryParametersDto does not have a general "abertas" flag, only specific status.
            // So, we might need to send multiple status values if the backend supports it, or filter client-side (not ideal for pagination).
            // Let's assume for now the backend can take a list of statuses or has a default for "abertas" if no status is sent.
            // For this implementation, I'll send specific statuses that are typically "open".
            queryParams += '&status=ABERTA&status=EM_ANALISE&status=EM_ATENDIMENTO'; // Example, API must support multiple status params
            break;
        case 'resolvidas':
            queryParams += '&status=RESOLVIDA';
            break;
        case 'todas':
            // No specific status filter, no 'minha' filter unless explicitly set by user controls (not implemented here)
            break;
        default: // e.g. if a specific category is a filter
            queryParams += `&categoria=${filter}`; // Assuming filter could be a category name
            break;
    }

    try {
        const result = await apiClient.get(`/api/ocorrencias?${queryParams}`);
        // renderOcorrencias agora lida com o caso de result.items ser vazio/nulo
        renderOcorrencias(result.items, { totalCount: result.totalCount, pageNumber: result.pageNumber, pageSize: result.pageSize });
    } catch (error) {
        console.error(`Erro ao carregar ocorrências (${filter}):`, error.message);
        listaOcorrenciasEl.innerHTML = ''; // Limpa qualquer resquício
        const errorState = createErrorStateElement({
            title: "Erro ao Carregar Ocorrências",
            message: error.message || "Não foi possível buscar as ocorrências. Verifique sua conexão e tente novamente.",
            retryButton: {
                text: "Tentar Novamente",
                onClick: () => loadOcorrencias(page, filter)
            }
        });
        listaOcorrenciasEl.appendChild(errorState);
        // noOcorrenciasMessageEl não é mais usado para erros
    } finally {
        isLoading = false;
        if (ocorrenciasLoadingEl) ocorrenciasLoadingEl.style.display = 'none';
        // Se usássemos um skeleton wrapper, o esconderíamos aqui:
        // if (document.getElementById('ocorrencias-skeleton-wrapper')) hideSkeleton(document.getElementById('ocorrencias-skeleton-wrapper'));
    }
}

function handleTabClick(event) {
    if (event.target.matches('.cv-tabs__button')) {
        const newFilter = event.target.dataset.tabFilter;
        if (newFilter === currentFilter && !isLoading) return; // Avoid reload if same tab or loading

        tabsContainer.querySelectorAll('.cv-tabs__button').forEach(btn => btn.classList.remove('cv-tabs__button--active'));
        event.target.classList.add('cv-tabs__button--active');

        document.querySelector('.ocorrencias-main__header h1').textContent = event.target.textContent;

        loadOcorrencias(1, newFilter);
    }
}

function openNovaOcorrenciaModal() {
    if (!canCreateOcorrencia()) {
        showGlobalFeedback('Apenas moradores, s\u00edndicos ou administradores podem abrir ocorr\u00eancias.', 'error');
        return;
    }
    formNovaOcorrencia.reset();
    anexosPreviewContainer.innerHTML = '';
    displayFormErrors(formNovaOcorrenciaErrorsEl, []); // Clear previous errors
    // Reset category dropdown (it's populated dynamically)
    if (allCategories.length > 0) {
        ocorrenciaCategoriaSelect.innerHTML = '<option value="">Selecione...</option>';
        allCategories.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria.replace(/_/g, ' ');
            ocorrenciaCategoriaSelect.appendChild(option);
        });
    } else {
        // Fallback if categories haven't loaded, though they should have by init.
        ocorrenciaCategoriaSelect.innerHTML = '<option value="">Categorias não carregadas</option>';
    }
    ocorrenciaPrioridadeSelect.value = 'NORMAL'; // Default priority
    modalNovaOcorrencia.style.display = 'flex';
}
function closeNovaOcorrenciaModal() { modalNovaOcorrencia.style.display = 'none'; }

async function handleNovaOcorrenciaSubmit(event) {
    event.preventDefault();
    if (isLoading) return;
    isLoading = true;
    displayFormErrors(formNovaOcorrenciaErrorsEl, []); // Clear previous errors

    const formData = new FormData();
    formData.append('titulo', ocorrenciaTituloInput.value.trim());
    formData.append('descricao', ocorrenciaDescricaoInput.value.trim());
    formData.append('categoria', ocorrenciaCategoriaSelect.value);
    formData.append('prioridade', ocorrenciaPrioridadeSelect.value);

    const files = ocorrenciaAnexosInput.files;
    if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            formData.append('anexos', files[i]);
        }
    }

    try {
        showProgress(novaOcorrenciaProgress, 0);
        showGlobalFeedback('Enviando...', 'info', 2000);
        const result = await postWithFiles('/api/ocorrencias', formData, p => showProgress(novaOcorrenciaProgress, p));
        showProgress(novaOcorrenciaProgress, 100);
        // The API returns the created object directly, no need to check _isFromLocationHeader if it's JSON
        console.log('Nova ocorrência criada:', result);
        closeNovaOcorrenciaModal();
        await loadOcorrencias(1, 'minhas'); // Refresh list to 'minhas' and go to first page
        // TODO: Show success message (e.g., using a global banner)
        // For now, just log it.
        showGlobalFeedback('Ocorrência criada com sucesso!', 'success', 4000);
    } catch (error) {
        novaOcorrenciaProgress.style.display = 'none';
        console.error('Erro ao criar nova ocorrência:', error);
        if (error.errors) { // Validation errors from API
            const errorMessages = error.errors.map(e => `${e.propertyName || ''}: ${e.errorMessage || e.ErrorMessage}`);
            displayFormErrors(formNovaOcorrenciaErrorsEl, errorMessages);
        } else {
            displayFormErrors(formNovaOcorrenciaErrorsEl, [error.message || 'Erro desconhecido ao criar ocorrência.']);
        }
    } finally {
        isLoading = false;
    }
}

function handleAnexoInputChange(event) {
    // console.log('handleAnexoInputChange called'); // Already have this log
    displayAnexoPreviews(event.target.files, anexosPreviewContainer);
}
function handleDetalheNovosAnexosChange(event) {
    // console.log('handleDetalheNovosAnexosChange called'); // Already have this log
    displayAnexoPreviews(event.target.files, novosAnexosPreviewContainer);
}

async function handleAdicionarNovosAnexosSubmit() {
    if (!currentOcorrenciaId || isLoading) return;

    const files = detalheNovosAnexosInput.files;
    if (modalDetalheOcorrencia) clearModalError(modalDetalheOcorrencia); // Limpa erros anteriores no modal de detalhe

    if (!files || files.length === 0) {
        // Tenta mostrar o erro no modal de detalhe, se possível, perto do input de anexos.
        // A função showModalError por padrão adiciona no final do .cv-modal-content ou antes do .cv-modal-footer.
        // Para um erro mais específico de campo, seria necessário um container de erro dedicado perto do input.
        // Por ora, o showModalError padrão é uma melhoria em relação ao toast global.
        if (modalDetalheOcorrencia) {
            showModalError(modalDetalheOcorrencia, 'Nenhum arquivo selecionado para adicionar.');
        } else {
            showGlobalFeedback('Nenhum arquivo selecionado para adicionar.', 'warning', 4000); // Fallback
        }
        return;
    }

    isLoading = true;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('anexos', files[i]);
    }

    try {
        showProgress(novosAnexosProgress, 0);
        await postWithFiles(`/api/ocorrencias/${currentOcorrenciaId}/anexos`, formData, p => showProgress(novosAnexosProgress, p));
        showProgress(novosAnexosProgress, 100);
        showGlobalFeedback('Novos anexos adicionados com sucesso!', 'success', 4000);
        // Refresh the anexos section in the detail modal
        const updatedOcorrencia = await apiClient.get(`/api/ocorrencias/${currentOcorrenciaId}`);
        renderAnexosDetalhe(updatedOcorrencia.anexos || []);
        detalheNovosAnexosInput.value = ''; // Clear file input
        novosAnexosPreviewContainer.innerHTML = ''; // Clear previews
    } catch (error) {
        novosAnexosProgress.style.display = 'none';
        console.error('Erro ao adicionar novos anexos:', error);
        const errorMessage = error.message || "Falha ao adicionar anexos.";
        if (modalDetalheOcorrencia) {
            showModalError(modalDetalheOcorrencia, errorMessage);
        } else {
            showGlobalFeedback(errorMessage, 'error', 6000); // Fallback
        }
    } finally {
        isLoading = false;
    }
}


function displayAnexoPreviews(files, container) {
    if (!container) return;
    container.innerHTML = ''; // Clear previous previews
    if (files && files.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'anexos-preview-list';
        for (const file of files) {
            const li = document.createElement('li');
            // Simple name and size. Could add icons or remove buttons here.
            li.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            ul.appendChild(li);
        }
        container.appendChild(ul);
    }
}

function renderAnexosDetalhe(anexos) {
    detalheAnexosContainerEl.innerHTML = '';
    if (anexos && anexos.length > 0) {
        const ul = document.createElement('ul');
        ul.className = 'anexos-lista-detalhe';
        anexos.forEach(anexo => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${anexo.url}" target="_blank" rel="noopener noreferrer">${anexo.nomeArquivo}</a> (${(anexo.tamanho / 1024).toFixed(2)} KB)`;
            ul.appendChild(li);
        });
        detalheAnexosContainerEl.appendChild(ul);
    } else {
        detalheAnexosContainerEl.innerHTML = '<p>Nenhum anexo encontrado.</p>';
    }
}

function renderHistoricoStatusDetalhe(historico) {
    detalheHistoricoStatusEl.innerHTML = '';
    if (historico && historico.length > 0) {
        historico.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `Status: ${renderStatusTag(item.status, item.status.replace(/_/g, ' '))} - Alterado por: ${item.alteradoPorNome || 'Sistema'} em ${formatDate(item.data)}`;
            detalheHistoricoStatusEl.appendChild(li);
        });
    } else {
        detalheHistoricoStatusEl.innerHTML = '<li>Nenhum histórico de status encontrado.</li>';
    }
}

function renderComentariosDetalhe(comentarios) {
    detalheComentariosContainerEl.innerHTML = '';
    if (comentarios && comentarios.length > 0) {
        comentarios.forEach(comentario => {
            const div = document.createElement('div');
            div.className = 'comentario-item';
            div.innerHTML = `
                <p class="comentario-item__autor"><strong>${comentario.usuarioNome || 'Usuário Desconhecido'}</strong> em ${formatDate(comentario.data)}:</p>
                <p class="comentario-item__texto">${comentario.texto}</p>
            `;
            detalheComentariosContainerEl.appendChild(div);
        });
    } else {
        detalheComentariosContainerEl.innerHTML = '<p>Nenhum comentário ainda.</p>';
    }
}


async function openDetalheOcorrenciaModal(ocorrenciaId) {
    if (isLoading) return;
    isLoading = true;
    currentOcorrenciaId = ocorrenciaId; // Set for context (comments, status change)

    try {
        const ocorrencia = await apiClient.get(`/api/ocorrencias/${ocorrenciaId}`);

        detalheTituloEl.textContent = ocorrencia.titulo;
        detalheCategoriaEl.textContent = ocorrencia.categoria.replace(/_/g, ' ');
        detalheStatusEl.innerHTML = renderStatusTag(ocorrencia.status, ocorrencia.status.replace(/_/g, ' '));
        detalhePrioridadeEl.innerHTML = renderPrioridadeTag(ocorrencia.prioridade, ocorrencia.prioridade) || 'Normal';
        detalheDataAberturaEl.textContent = formatDate(ocorrencia.dataAbertura);
        detalheDataAtualizacaoEl.textContent = formatDate(ocorrencia.dataAtualizacao);
        detalheUsuarioNomeEl.textContent = ocorrencia.usuario?.nome || 'N/A';
        detalheUsuarioUnidadeEl.textContent = ocorrencia.usuario?.unidade || 'N/A';
        detalheDescricaoEl.textContent = ocorrencia.descricao;

        renderAnexosDetalhe(ocorrencia.anexos || []);
        renderHistoricoStatusDetalhe(ocorrencia.historicoStatus || []);
        renderComentariosDetalhe(ocorrencia.comentarios || []);

        // Reset "add more anexos"
        detalheNovosAnexosInput.value = '';
        novosAnexosPreviewContainer.innerHTML = '';

        // Control visibility of action buttons
        if (canUserChangeStatus(ocorrencia)) { // Admin/Sindico for general status change
            btnAlterarStatus.style.display = 'inline-block';
        } else {
            btnAlterarStatus.style.display = 'none';
        }

        if (canUserManageOcorrencia(ocorrencia)) { // Admin/Sindico for delete
             btnExcluirOcorrencia.style.display = 'inline-block';
        } else {
            btnExcluirOcorrencia.style.display = 'none';
        }

        // Show/Hide comment form based on permissions or if occurrence is closed
        const isResolvidaOuCancelada = ocorrencia.status === 'RESOLVIDA' || ocorrencia.status === 'CANCELADA';
        const formComentarioContainer = document.getElementById('comentarioFormContainer');
        if (formComentarioContainer) {
            formComentarioContainer.style.display = (isResolvidaOuCancelada && !canUserManageOcorrencia(ocorrencia)) ? 'none' : 'block';
        }
        // Show/Hide "add more anexos" based on permissions or if occurrence is closed
        const detalheNovosAnexosFormGroup = detalheNovosAnexosInput.closest('.cv-form__group');
         if (detalheNovosAnexosFormGroup) {
            detalheNovosAnexosFormGroup.style.display = (isResolvidaOuCancelada && !canUserManageOcorrencia(ocorrencia)) ? 'none' : 'block';
        }


        modalDetalheOcorrencia.style.display = 'flex';
    } catch (error) {
        console.error(`Erro ao carregar detalhes da ocorrência ${ocorrenciaId}:`, error);
        // Limpar e esconder o modal em caso de erro grave ao carregar
        closeDetalheOcorrenciaModal();
        showGlobalFeedback(`Erro ao carregar detalhes da ocorrência: ${error.message || 'Tente novamente.'}`, 'error', 6000);
        currentOcorrenciaId = null;
        // Poderia, alternativamente, mostrar um ErrorState dentro do modal se a estrutura HTML do modal fosse preparada para isso.
        // Ex: const modalBody = modalDetalheOcorrencia.querySelector('.cv-modal-body');
        // if(modalBody) {
        //   modalBody.innerHTML = ''; // Limpa
        //   const errState = createErrorStateElement({ title: "Erro", message: `Falha ao carregar dados da ocorrência. ${error.message}`});
        //   modalBody.appendChild(errState);
        //   modalDetalheOcorrencia.style.display = 'flex'; // Garante que o modal com o erro seja visível
        // }
    } finally {
        isLoading = false;
    }
}

function closeDetalheOcorrenciaModal() {
    modalDetalheOcorrencia.style.display = 'none';
    // Clear previews for "add more anexos" if any
    if(novosAnexosPreviewContainer) novosAnexosPreviewContainer.innerHTML = '';
    if(detalheNovosAnexosInput) detalheNovosAnexosInput.value = ''; // Reset file input
    displayFormErrors(formComentarioErrorsEl, []); // Clear comment errors
}

async function handleAddComentario() {
    if (!currentOcorrenciaId || isLoading) return;
    const texto = novoComentarioTextoInput.value.trim();
    if (!texto) {
        displayFormErrors(formComentarioErrorsEl, ['O texto do comentário não pode estar vazio.']);
        return;
    }
    displayFormErrors(formComentarioErrorsEl, []);
    isLoading = true;

    try {
        const novoComentario = await apiClient.post(`/api/ocorrencias/${currentOcorrenciaId}/comentarios`, { texto });
        novoComentarioTextoInput.value = ''; // Clear textarea
        // Refresh comments section
        const updatedOcorrencia = await apiClient.get(`/api/ocorrencias/${currentOcorrenciaId}`);
        renderComentariosDetalhe(updatedOcorrencia.comentarios || []);
        detalheDataAtualizacaoEl.textContent = formatDate(updatedOcorrencia.dataAtualizacao); // Update last updated time
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        displayFormErrors(formComentarioErrorsEl, [error.message || 'Erro desconhecido.']);
    } finally {
        isLoading = false;
    }
}

function openAlterarStatusModal() {
    if (!currentOcorrenciaId) return;
    displayFormErrors(formAlterarStatusErrorsEl, []);

    // Fetch current status to pre-select or filter available statuses
    // For now, just populate all and let API validate if transition is allowed
    ocorrenciaIdParaAlterarStatusInput.value = currentOcorrenciaId; // Store ID in hidden input if needed by form handler

    // Populate selectNovoStatus (could be dynamic based on current status and roles)
    // Example: if current status is ABERTA, Sindico might see EM_ANALISE, CANCELADA
    // User might see CANCELADA (if they opened it)
    // For simplicity, all defined statuses are shown. API should enforce valid transitions.
    selectNovoStatus.innerHTML = ''; // Clear previous options
    const statusOptions = ["ABERTA", "EM_ANALISE", "EM_ATENDIMENTO", "RESOLVIDA", "CANCELADA"]; // From OcorrenciaStatus enum
    statusOptions.forEach(statusKey => {
        const option = document.createElement('option');
        option.value = statusKey;
        option.textContent = statusKey.replace(/_/g, ' ');
        selectNovoStatus.appendChild(option);
    });

    // Try to pre-select current status from the main detail view (detalheStatusEl)
    const currentStatusKey = detalheStatusEl.textContent.toUpperCase().replace(/ /g, '_');
    if(statusOptions.includes(currentStatusKey)) { // Corrected variable name here
      selectNovoStatus.value = currentStatusKey;
    }


    modalAlterarStatus.style.display = 'flex';
}

function closeAlterarStatusModal() {
    modalAlterarStatus.style.display = 'none';
    displayFormErrors(formAlterarStatusErrorsEl, []); // Clear status errors
}

async function handleAlterarStatusSubmit(event) {
    event.preventDefault();
    if (!currentOcorrenciaId || isLoading) return;

    const novoStatus = selectNovoStatus.value;
    if (!novoStatus) {
        displayFormErrors(formAlterarStatusErrorsEl, ['Selecione um novo status.']);
        return;
    }
    displayFormErrors(formAlterarStatusErrorsEl, []);
    isLoading = true;

    try {
        await apiClient.post(`/api/ocorrencias/${currentOcorrenciaId}/status`, { status: novoStatus });
        closeAlterarStatusModal();
        // Refresh detail modal and main list
        const updatedOcorrencia = await apiClient.get(`/api/ocorrencias/${currentOcorrenciaId}`);
        detalheStatusEl.innerHTML = renderStatusTag(updatedOcorrencia.status, updatedOcorrencia.status.replace(/_/g, ' '));
        detalheDataAtualizacaoEl.textContent = formatDate(updatedOcorrencia.dataAtualizacao);
        renderHistoricoStatusDetalhe(updatedOcorrencia.historicoStatus || []); // Refresh history

        // Check if comment/anexo forms should be hidden due to new status
        const isResolvidaOuCancelada = updatedOcorrencia.status === 'RESOLVIDA' || updatedOcorrencia.status === 'CANCELADA';
        const formComentarioContainer = document.getElementById('comentarioFormContainer');
        if (formComentarioContainer) {
            formComentarioContainer.style.display = (isResolvidaOuCancelada && !canUserManageOcorrencia(updatedOcorrencia)) ? 'none' : 'block';
        }
        const detalheNovosAnexosFormGroup = detalheNovosAnexosInput.closest('.cv-form__group');
         if (detalheNovosAnexosFormGroup) {
            detalheNovosAnexosFormGroup.style.display = (isResolvidaOuCancelada && !canUserManageOcorrencia(updatedOcorrencia)) ? 'none' : 'block';
        }


        await loadOcorrencias(currentPage, currentFilter); // Refresh main list
        showGlobalFeedback('Status da ocorrência alterado com sucesso!', 'success', 4000);

    } catch (error) {
        console.error('Erro ao alterar status:', error);
         if (error.errors) {
            const errorMessages = error.errors.map(e => `${e.propertyName || ''}: ${e.errorMessage || e.ErrorMessage}`);
            displayFormErrors(formAlterarStatusErrorsEl, errorMessages);
        } else {
            displayFormErrors(formAlterarStatusErrorsEl, [error.message || 'Erro desconhecido ao alterar status.']);
        }
    } finally {
        isLoading = false;
    }
}

async function handleDeleteOcorrencia() {
    if (!currentOcorrenciaId || isLoading) return;

    if (!confirm('Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.')) {
        return;
    }
    const card = document.querySelector(`.ocorrencia-card[data-ocorrencia-id="${currentOcorrenciaId}"]`);
    if (card) card.style.display = 'none';
    isLoading = true;

    try {
        await apiClient.delete(`/api/ocorrencias/${currentOcorrenciaId}`);
        if (card) card.remove();
        closeDetalheOcorrenciaModal();
        await loadOcorrencias(1, currentFilter); // Refresh list, go to first page
        showGlobalFeedback('Ocorrência excluída com sucesso!', 'success', 4000);
    } catch (error) {
        console.error('Erro ao excluir ocorrência:', error);
        if (card) card.style.display = '';
        showGlobalFeedback('Falha ao remover ocorrência.', 'error');
    } finally {
        isLoading = false;
    }
}


// --- Helper to check if user can manage (edit/delete/change status broadly) ---
// This is a simplified check. More granular checks might be needed per action.
function canUserManageOcorrencia(ocorrencia) {
    if (!currentUser || !ocorrencia) return false;
    return ocorrencia.usuario?.id === currentUser.id ||
           currentUser.roles.includes('Sindico') ||
           currentUser.roles.includes('Administrador');
}

function canUserComment(ocorrencia) { // Example: anyone can comment for now, or add specific logic
    return !!currentUser && !!ocorrencia;
}

// Example: Only Admin/Sindico can change status
function canUserChangeStatus(ocorrencia) {
    if (!currentUser || !ocorrencia) return false;
    return currentUser.roles.includes('Sindico') || currentUser.roles.includes('Administrador');
}

// Example: Owner or Admin/Sindico can add attachments
function canUserAddAttachment(ocorrencia) {
     if (!currentUser || !ocorrencia) return false;
    return ocorrencia.usuario?.id === currentUser.id ||
           currentUser.roles.includes('Sindico') ||
           currentUser.roles.includes('Administrador');
}

// Normalize roles so that "Condomino" and "Inquilino" are treated as "Morador".
function normalizeRoles(roles) {
    return roles.map(r => (r === 'Condomino' || r === 'Inquilino') ? 'Morador' : r);
}

function canCreateOcorrencia() {
    if (!currentUser || !Array.isArray(currentUser.roles)) return false;
    const normalized = normalizeRoles(currentUser.roles);
    return normalized.includes('Morador') || normalized.includes('Sindico') || normalized.includes('Administrador');
}


// --- Initial UI Setup ---
if (ocorrenciasLoadingEl) ocorrenciasLoadingEl.style.display = 'block';
if (noOcorrenciasMessageEl) noOcorrenciasMessageEl.style.display = 'none';

console.log('ocorrencias.js loaded and initial setup complete.');
