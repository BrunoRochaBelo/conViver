import apiClient from './apiClient.js';
import { requireAuth, getUserRoles } from './auth.js'; // Supondo que getUserRoles exista ou será criado
import { showGlobalFeedback } from './main.js';
import { showFeedSkeleton, hideFeedSkeleton } from './skeleton.js';
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
    if (searchInput) searchInput.addEventListener('input', () => loadDocumentos());
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

        if (!documentos || documentos.length === 0) {
            listContainer.innerHTML = '<p>Nenhum documento encontrado.</p>';
            return;
        }

        // Filtro frontend para searchTerm (simples, apenas no título)
        const filteredDocumentos = documentos.filter(doc =>
            doc.tituloDescritivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.nomeArquivoOriginal.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredDocumentos.length === 0) {
            listContainer.innerHTML = '<p>Nenhum documento encontrado para os filtros aplicados.</p>';
            return;
        }

        renderDocumentos(filteredDocumentos, listContainer);
    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        listContainer.innerHTML = '<p class="cv-error-message">Erro ao carregar documentos. Tente novamente mais tarde.</p>';
        showGlobalFeedback('Erro ao carregar documentos.', 'error');
    } finally {
        if (skeleton) hideFeedSkeleton(skeleton);
    }
}
    container.innerHTML = ''; // Limpa a lista
    const userRoles = getUserRoles();
    const isSindico = userRoles.includes('Sindico') || userRoles.includes('Administrador');

    documentos.forEach(doc => {
        const docElement = document.createElement('div');
        docElement.className = 'cv-card document-item';
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
                if (confirm(`Tem certeza que deseja excluir o documento ID: ${docId}?`)) {
                    await handleDeleteDocumento(docId);
                }
            });
        });
    }
}

async function handleUploadDocumento(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    showProgress(uploadProgressBar, 0);
    showGlobalFeedback('Enviando...', 'info', 2000);

    try {
        await xhrPost('/api/v1/syndic/docs', formData, p => showProgress(uploadProgressBar, p), true);
        showProgress(uploadProgressBar, 100);
        form.reset();
        document.getElementById('modalUploadDocumento').style.display = 'none';
        loadDocumentos();
        showGlobalFeedback('Documento enviado!', 'success');
    } catch (error) {
        uploadProgressBar.style.display = 'none';
        console.error('Erro ao enviar documento:', error);
        showGlobalFeedback(error.message || 'Falha no upload do documento.', 'error');
    }
}

async function handleDeleteDocumento(docId) {
    try {
        // O endpoint é /api/v1/syndic/docs/{id}
        await apiClient.delete(`/api/v1/syndic/docs/${docId}`);
        loadDocumentos(); // Recarrega a lista
    } catch (error) {
        console.error(`Erro ao excluir documento ${docId}:`, error);
         if (!error.handledByApiClient) {
            showGlobalFeedback(error.message || 'Falha ao excluir documento.', 'error');
        }
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
