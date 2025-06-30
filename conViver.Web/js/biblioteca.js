import apiClient from './apiClient.js';
import { requireAuth, getUserRoles } from './auth.js'; // Supondo que getUserRoles exista ou será criado
import { showGlobalFeedback, createErrorStateElement, createEmptyStateElement, debounce } from './main.js';
import { showFeedSkeleton, hideFeedSkeleton } from './skeleton.js'; // skeleton.js re-exporta de main.js
import { createProgressBar, showProgress, xhrPost } from './progress.js';

let uploadProgressBar;

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    initializeBibliotecaPage();
    loadDocumentos();
});

function initializeBibliotecaPage() {
    const userRoles = getUserRoles(); // Esta função precisa retornar os papéis do usuário (ex: ['Sindico'])

    const adminSection = document.querySelector('.admin-only-section');
    const uploadDocButton = document.getElementById('uploadDocButton');
    const modalUpload = document.getElementById('modalUploadDocumento');
    const formUpload = document.getElementById('formUploadDocumento');
    uploadProgressBar = createProgressBar();
    const closeUploadModalButtons = document.querySelectorAll('.js-modal-upload-doc-close');

    if (userRoles.includes('Sindico') || userRoles.includes('Administrador')) {
        if (adminSection) adminSection.style.display = 'block';
        if (uploadDocButton) uploadDocButton.addEventListener('click', () => modalUpload.style.display = 'flex');
    }

    if (modalUpload) {
        closeUploadModalButtons.forEach(btn => btn.addEventListener('click', () => modalUpload.style.display = 'none'));
        window.addEventListener('click', (event) => {
            if (event.target === modalUpload) modalUpload.style.display = 'none';
        });
    }

    if (formUpload) {
        formUpload.appendChild(uploadProgressBar);
        formUpload.addEventListener('submit', handleUploadDocumento);
    }

    const searchInput = document.getElementById('docSearchInput');
    const categoryFilter = document.getElementById('docCategoryFilter');
    if (searchInput) searchInput.addEventListener('input', debounce(loadDocumentos, 300));
    if (categoryFilter) categoryFilter.addEventListener('change', () => loadDocumentos());

    console.log('Página da Biblioteca inicializada.');
}

async function loadDocumentos() {
    const listContainer = document.querySelector('.js-document-list');
    if (!listContainer) return;
    const skeleton = document.getElementById('biblioteca-skeleton');

    if (skeleton) showFeedSkeleton(skeleton);
    listContainer.innerHTML = '';

    const searchTerm = document.getElementById('docSearchInput')?.value || '';
    const category = document.getElementById('docCategoryFilter')?.value || '';

    try {
        // O endpoint /api/v1/app/docs espera 'categoria' como query param.
        // A busca por termo (searchTerm) precisará ser implementada no backend ou filtrada no frontend.
        // Por simplicidade, filtraremos no frontend por enquanto se o backend não suportar.
        const params = {};
        if (category) {
            params.categoria = category;
        }

        const documentos = await apiClient.get('/api/v1/app/docs', params);
        listContainer.innerHTML = ''; // Limpar antes de adicionar conteúdo ou empty state

        if (!documentos || documentos.length === 0) {
            const emptyState = createEmptyStateElement({
                iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm8 7h-2V4l4 4h-2z"/></svg>`, // Ícone de Documento
                title: "Biblioteca Vazia",
                description: "Ainda não há documentos disponíveis. O síndico pode adicionar atas, regulamentos e outros arquivos importantes aqui.",
                // actionButton: { text: "Sugerir Documento", onClick: () => { /* ... */ } } // Exemplo de CTA
            });
            listContainer.appendChild(emptyState);
            return;
        }

        // Filtro frontend para searchTerm (simples, apenas no título)
        const filteredDocumentos = documentos.filter(doc =>
            doc.tituloDescritivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.nomeArquivoOriginal && doc.nomeArquivoOriginal.toLowerCase().includes(searchTerm.toLowerCase())) || // Adicionado check para nomeArquivoOriginal
            (doc.categoria && doc.categoria.toLowerCase().includes(searchTerm.toLowerCase())) // Adicionado filtro por categoria
        );

        if (filteredDocumentos.length === 0) {
            const emptyState = createEmptyStateElement({
                iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`, // Ícone de Lupa
                title: "Nenhum Documento Encontrado",
                description: "Não encontramos documentos que correspondam à sua busca ou filtro. Tente palavras-chave diferentes ou ajuste a categoria.",
                 actionButton: (searchTerm || category) ? { // Mostrar botão apenas se houver filtro/busca
                    text: "Limpar Busca/Filtro",
                    onClick: () => {
                        const searchInput = document.getElementById('docSearchInput');
                        const categoryFilter = document.getElementById('docCategoryFilter');
                        if (searchInput) searchInput.value = '';
                        if (categoryFilter) categoryFilter.value = '';
                        loadDocumentos(); // Recarregar
                    },
                    classes: ["cv-button--secondary"]
                } : null
            });
            listContainer.appendChild(emptyState);
            return;
        }

        renderDocumentos(filteredDocumentos, listContainer);
    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        listContainer.innerHTML = ''; // Limpa qualquer conteúdo anterior
        const errorState = createErrorStateElement({
            title: "Falha ao Carregar Documentos",
            message: error.message || "Não foi possível buscar os documentos. Verifique sua conexão e tente novamente.",
            retryButton: {
                text: "Tentar Novamente",
                onClick: () => {
                    const currentErrorState = listContainer.querySelector(".cv-error-state");
                    if (currentErrorState) currentErrorState.remove();
                    if (skeleton) showFeedSkeleton(skeleton); // Mostrar skeleton ao tentar novamente
                    loadDocumentos();
                }
            }
        });
        listContainer.appendChild(errorState);
        // showGlobalFeedback é opcional aqui, pois o Error State já é um feedback visual forte.
        // Se o erro for muito genérico ou precisar de atenção extra, pode ser mantido.
        // Por ora, vamos remover para evitar redundância.
        // showGlobalFeedback('Erro ao carregar documentos.', 'error');
    } finally {
        if (skeleton) hideFeedSkeleton(skeleton);
    }
}

function renderDocumentos(documentos, container) { // Adicionado 'container' como parâmetro
    container.innerHTML = ''; // Limpa a lista
    const userRoles = getUserRoles();
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

    documentos.forEach(doc => {
        const docElement = document.createElement('div');
        docElement.className = 'cv-card document-item';
        docElement.dataset.docId = doc.id;
        // Usar doc.url diretamente se for a URL de download, ou construir com base no ID
        // A rota de download é /api/v1/docs/download/{id}
        const downloadUrl = `${apiClient.getBaseUrl()}/docs/download/${doc.id}`;

        docElement.innerHTML = `
            <div class="document-item__info">
                <h4 class="document-item__title">${doc.tituloDescritivo}</h4>
                <p class="document-item__meta">
                    <span>Arquivo: ${doc.nomeArquivoOriginal}</span> |
                    <span>Categoria: ${doc.categoria}</span> |
                    <span>Data Upload: ${new Date(doc.dataUpload).toLocaleDateString()}</span>
                    ${doc.tamanhoArquivoBytes ? ` | <span>Tamanho: ${(doc.tamanhoArquivoBytes / 1024).toFixed(2)} KB</span>` : ''}
                </p>
            </div>
            <div class="document-item__actions">
                <a href="${downloadUrl}" class="cv-button" target="_blank" rel="noopener noreferrer" download="${doc.nomeArquivoOriginal}">Download</a>
                ${isSindico ? `<button class="cv-button danger js-delete-doc" data-doc-id="${doc.id}">Excluir</button>` : ''}
            </div>
        `;
        container.appendChild(docElement);
    });

    if (isSindico) {
        document.querySelectorAll('.js-delete-doc').forEach(button => {
            button.addEventListener('click', async (event) => {
                const docId = event.target.dataset.docId;
                const card = event.target.closest('.document-item');
                if (confirm(`Tem certeza que deseja excluir o documento ID: ${docId}?`)) {
                    await handleDeleteDocumento(docId, card);
                }
            });
        });
    }
}

async function handleUploadDocumento(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    const modalUploadElement = document.getElementById('modalUploadDocumento'); // Obter o elemento do modal

    submitButton.disabled = true;
    submitButton.innerHTML = 'Enviando... <span class="inline-spinner"></span>';
    if (modalUploadElement) clearModalError(modalUploadElement); // Limpar erros anteriores

    const formData = new FormData(form);

    // Validação básica do arquivo (exemplo: verificar se um arquivo foi selecionado)
    const fileInput = form.querySelector('input[type="file"]');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (modalUploadElement) showModalError(modalUploadElement, "Por favor, selecione um arquivo para enviar.");
        else showGlobalFeedback("Por favor, selecione um arquivo para enviar.", "warning"); // Fallback
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
        return;
    }


    uploadProgressBar.style.display = 'block'; // Garante que a barra seja exibida
    showProgress(uploadProgressBar, 0);

    try {
        await xhrPost('/api/v1/syndic/docs', formData, p => showProgress(uploadProgressBar, p), true);
        showProgress(uploadProgressBar, 100); // Completa a barra
        form.reset();
        if (modalUploadElement) modalUploadElement.style.display = 'none';
        loadDocumentos(); // Recarrega a lista de documentos
        showGlobalFeedback('Documento enviado com sucesso!', 'success', 2500);
    } catch (error) {
        console.error('Erro ao enviar documento:', error);
        const errorMessage = error.message || 'Falha no upload do documento. Verifique o arquivo e tente novamente.';
        if (modalUploadElement) showModalError(modalUploadElement, errorMessage);
        else showGlobalFeedback(errorMessage, 'error'); // Fallback
        showProgress(uploadProgressBar, 0); // Resetar barra em caso de erro também
    } finally {
        uploadProgressBar.style.display = 'none'; // Esconde a barra após o processo
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
}

async function handleDeleteDocumento(docId, card) {
    if (card) card.style.display = 'none';
    try {
        await apiClient.delete(`/api/v1/syndic/docs/${docId}`);
        showGlobalFeedback("Documento excluído com sucesso!", "success", 2500);
        if (card) card.remove();
        else loadDocumentos(); // Recarrega a lista se o card não foi passado ou não encontrado
    } catch (error) {
        console.error(`Erro ao excluir documento ${docId}:`, error);
        if (card) card.style.display = ''; // Reexibe o card se a exclusão falhar
        showGlobalFeedback('Falha ao remover documento.', 'error');
    }
}

// Exemplo de como getUserRoles poderia ser (precisa ser adaptado à sua implementação de auth.js)
// Em auth.js, você precisaria armazenar os papéis do usuário após o login
// e fornecer uma função para recuperá-los.
/*
// Em auth.js:
export function getUserRoles() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return userInfo ? userInfo.roles : []; // Ex: ['Sindico', 'Morador']
}
*/
// Por enquanto, para desenvolvimento, podemos mockar:
/*
function getUserRoles() {
    // Mock para desenvolvimento. Substitua pela implementação real.
    // return ['Sindico'];
    return ['Condomino'];
}
*/

// Certifique-se que auth.js exporta getUserRoles ou adapte a chamada.
// Se auth.js já expõe o objeto do usuário ou seus papéis de alguma forma, use isso.
// Por exemplo, se `getCurrentUser()` em `auth.js` retorna um objeto com uma propriedade `roles`:
/*
import { getCurrentUser } from './auth.js';
function getUserRoles() {
    const user = getCurrentUser(); // Supondo que getCurrentUser() retorne {..., roles: ['Sindico']}
    return user && user.roles ? user.roles : [];
}
*/
// Para que o código acima funcione, auth.js precisa ter algo como:
/*
// auth.js
...
export function getCurrentUser() {
    const token = localStorage.getItem('userToken');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Assumindo que os papéis estão na claim 'role' (pode ser string ou array)
        let roles = [];
        if (payload.role) {
            roles = Array.isArray(payload.role) ? payload.role : [payload.role];
        } else if (payload.roles) { // Alternativa comum
             roles = Array.isArray(payload.roles) ? payload.roles : [payload.roles];
        }
        return {
            id: payload.nameid, // ou sub
            email: payload.email,
            name: payload.given_name, // ou name
            roles: roles, // Ex: ["Sindico", "Condomino"]
            condominioId: payload.condominioId
        };
    } catch (e) {
        console.error("Failed to parse token or get user info:", e);
        return null;
    }
}

export function getUserRoles() { // Função wrapper para fácil importação
    const user = getCurrentUser();
    return user ? user.roles : [];
}
...
*/
// A implementação de `getUserRoles` em `auth.js` é crucial.
// O `apiClient.js` também precisará ser ajustado para enviar o token JWT corretamente.
// O `apiClient.post` para FormData também precisa ser verificado/ajustado se necessário.

// No apiClient.js, o método post precisa de um ajuste para lidar com FormData
// Exemplo de ajuste no apiClient.js para o POST com FormData:
/*
async post(endpoint, data, isFormData = false) {
    const headers = { ...this.commonHeaders };
    const token = localStorage.getItem('userToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let body;
    if (isFormData) {
        // Não defina Content-Type, o browser faz isso automaticamente para FormData
        // e inclui o boundary correto.
        body = data;
    } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
    }

    // ... resto da lógica de fetch ...
}
*/
