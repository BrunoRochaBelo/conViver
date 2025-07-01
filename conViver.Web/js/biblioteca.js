import apiClient from './apiClient.js';
import { requireAuth, getUserRoles } from './auth.js';
import { showGlobalFeedback, debounce } from './main.js'; // createErrorStateElement, createEmptyStateElement removidos
// showFeedSkeleton, hideFeedSkeleton são de main.js, não de um skeleton.js separado neste projeto
// Se skeleton.js existir e reexportar, ok. Caso contrário, importar de main.js.
// Para consistência, vamos assumir que são de main.js por enquanto, como os outros.
import { showSkeleton, hideSkeleton } from './main.js';
import {
    showErrorState,
    showEmptyState,
    showLoadingState
} from "./pageLoader.js"; // Assumindo que estão em pageLoader.js
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

    // Usar showLoadingState diretamente no listContainer
    showLoadingState(listContainer, "Carregando documentos...");

    const searchTerm = document.getElementById('docSearchInput')?.value || '';
    const category = document.getElementById('docCategoryFilter')?.value || '';

    try {
        const params = {};
        if (category) {
            params.categoria = category;
        }

        const documentos = await apiClient.get('/api/v1/app/docs', params);
        // listContainer.innerHTML = ''; // showLoadingState já limpa

        if (!documentos || documentos.length === 0) {
            const userRoles = getUserRoles();
            const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');
            let actions = [];
            if (isSindico) {
                actions.push({
                    text: "Adicionar Documento",
                    action: () => {
                        const uploadDocButton = document.getElementById('uploadDocButton');
                        if (uploadDocButton) uploadDocButton.click();
                    },
                    class: "cv-button--primary"
                });
            }
            showEmptyState(listContainer,
                "Biblioteca Vazia",
                isSindico
                    ? "Ainda não há documentos disponíveis. Adicione atas, regulamentos e outros arquivos importantes aqui."
                    : "Ainda não há documentos disponíveis na biblioteca.",
                getDefaultDocumentIcon(), // Ícone de Documento
                actions
            );
            return;
        }

        const filteredDocumentos = documentos.filter(doc =>
            doc.tituloDescritivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.nomeArquivoOriginal && doc.nomeArquivoOriginal.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (doc.categoria && doc.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (filteredDocumentos.length === 0) {
            let actions = [];
            if (searchTerm || category) {
                actions.push({
                    text: "Limpar Busca/Filtro",
                    action: () => {
                        const searchInput = document.getElementById('docSearchInput');
                        const categoryFilter = document.getElementById('docCategoryFilter');
                        if (searchInput) searchInput.value = '';
                        if (categoryFilter) categoryFilter.value = '';
                        loadDocumentos();
                    },
                    class: "cv-button--secondary"
                });
            }
            showEmptyState(listContainer,
                "Nenhum Documento Encontrado",
                "Não encontramos documentos que correspondam à sua busca ou filtro. Tente palavras-chave diferentes ou ajuste a categoria.",
                getDefaultSearchIcon(), // Ícone de Lupa/Busca
                actions
            );
            return;
        }
        // Limpar o container antes de renderizar os documentos (showLoadingState já fez isso)
        renderDocumentos(filteredDocumentos, listContainer);
    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        showErrorState(listContainer,
            error.message || "Não foi possível buscar os documentos. Verifique sua conexão e tente novamente."
            // Ícone de erro padrão será usado
        );
        // Adicionar listener para o botão de tentar novamente, se ele foi adicionado por showErrorState
        const retryButton = listContainer.querySelector('.error-state__retry-button');
        if (retryButton) {
            retryButton.onclick = () => loadDocumentos();
        }
    } finally {
        // Não é mais necessário hideSkeleton aqui, pois o showLoadingState/EmptyState/ErrorState
        // manipulam o conteúdo do listContainer diretamente.
        // Se o skeleton fosse um elemento overlay separado, seria escondido aqui.
    }
}

function renderDocumentos(documentos, container) {
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

// Importar ícones de pageLoader.js
import {
    getDefaultDocumentIcon,
    getDefaultSearchIcon
    // Outros ícones como getDefaultErrorIcon, getDefaultEmptyIcon, getDefaultLoadingIcon
    // são usados indiretamente através das funções showXState de pageLoader.js
} from "./pageLoader.js";
