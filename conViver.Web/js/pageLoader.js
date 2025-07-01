export async function loadPage() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const container = document.getElementById('pageMain');

    if (!container) {
        console.error("Container 'pageMain' não encontrado.");
        return;
    }

    if (!page) {
        // Se nenhuma página for especificada, talvez carregar um dashboard padrão
        // ou exibir uma mensagem de boas-vindas.
        // Por enquanto, vamos deixar como está ou exibir um estado vazio.
        // container.innerHTML = '<p>Selecione uma página para começar.</p>';
        return;
    }

    showLoadingState(container, 'Carregando página...'); // Mostrar estado de carregamento

    try {
        const resp = await fetch(`pages/${page}.html`);
        if (!resp.ok) {
            throw new Error(`Falha ao carregar a página ${page}: ${resp.status} ${resp.statusText}`);
        }
        const html = await resp.text();
        container.innerHTML = html; // Inserir o conteúdo da página

        // Tentar carregar e inicializar o módulo JS da página
        try {
            const module = await import(`./${page}.js`);
            if (typeof module.initialize === 'function') {
                await module.initialize(); // Permitir que initialize seja assíncrono
            }
        } catch (err) {
            console.error(`Erro ao carregar ou inicializar o script da página ${page}.js:`, err);
            // Opcional: mostrar um erro específico no container se o JS falhar
            // showErrorState(container, 'Erro ao carregar funcionalidade da página.');
        }
    } catch (err) {
        console.error('Erro ao carregar conteúdo da página:', err);
        showErrorState(container, `Falha ao carregar a página '${page}'. Verifique o console para mais detalhes.`);
    }
}

document.addEventListener('DOMContentLoaded', loadPage);

// Funções utilitárias para exibir estados
// Estas podem ser movidas para um arquivo utilitário global (e.g., utils.js ou uiUtils.js) se usadas em mais lugares.

/**
 * Exibe um estado de erro em um container.
 * @param {HTMLElement} container O elemento onde o estado de erro será exibido.
 * @param {string} message A mensagem de erro.
 * @param {string} [iconSvg] SVG do ícone a ser exibido.
 */
export function showErrorState(container, message, iconSvg = getDefaultErrorIcon()) {
    clearContainer(container);
    const errorStateDiv = document.createElement('div');
    errorStateDiv.className = 'cv-error-state'; // Classe CSS para estilização
    errorStateDiv.innerHTML = `
        <div class="cv-error-state__icon">${iconSvg}</div>
        <h3 class="cv-error-state__title">Ocorreu um Erro</h3>
        <p class="cv-error-state__message">${message}</p>
        <div class="cv-empty-state__actions">
             <button class="cv-button cv-button--primary error-state__retry-button">Tentar Novamente</button>
        </div>
    `;
    // Adicionar listener para o botão de tentar novamente, se necessário.
    // Exemplo: errorStateDiv.querySelector('.error-state__retry-button').addEventListener('click', () => loadPage());
    container.appendChild(errorStateDiv);
}

/**
 * Exibe um estado de vazio em um container.
 * @param {HTMLElement} container O elemento onde o estado de vazio será exibido.
 * @param {string} title Título para o estado vazio.
 * @param {string} message A mensagem para o estado vazio.
 * @param {string} [iconSvg] SVG do ícone a ser exibido.
 * @param {Array<{text: string, class: string, action: function}>} [actions] Botões de ação.
 */
export function showEmptyState(container, title, message, iconSvg = getDefaultEmptyIcon(), actions = []) {
    clearContainer(container);
    const emptyStateDiv = document.createElement('div');
    emptyStateDiv.className = 'cv-empty-state'; // Classe CSS base

    // Adicionar classes modificadoras se necessário, e.g., 'cv-empty-state--no-data'
    if (title.toLowerCase().includes("nenhum item") || message.toLowerCase().includes("nenhum item")) {
        emptyStateDiv.classList.add('cv-empty-state--no-data');
    } else if (title.toLowerCase().includes("busca") || message.toLowerCase().includes("busca")) {
        emptyStateDiv.classList.add('cv-empty-state--no-results');
    }

    let actionsHtml = '';
    if (actions.length > 0) {
        actionsHtml = '<div class="cv-empty-state__actions">';
        actions.forEach((action, index) => {
            actionsHtml += `<button class="cv-button ${action.class || 'cv-button--secondary'} empty-action-${index}">${action.text}</button>`;
        });
        actionsHtml += '</div>';
    }

    emptyStateDiv.innerHTML = `
        <div class="cv-empty-state__icon">${iconSvg}</div>
        <h3 class="cv-empty-state__title">${title}</h3>
        <p class="cv-empty-state__message">${message}</p>
        ${actionsHtml}
    `;
    container.appendChild(emptyStateDiv);

    if (actions.length > 0) {
        actions.forEach((action, index) => {
            const button = emptyStateDiv.querySelector(`.empty-action-${index}`);
            if (button && typeof action.action === 'function') {
                button.addEventListener('click', action.action);
            }
        });
    }
}

/**
 * Exibe um estado de carregamento em um container.
 * @param {HTMLElement} container O elemento onde o estado de carregamento será exibido.
 * @param {string} message A mensagem de carregamento.
 * @param {string} [iconSvg] SVG do ícone de carregamento.
 */
export function showLoadingState(container, message, iconSvg = getDefaultLoadingIcon()) {
    clearContainer(container);
    const loadingStateDiv = document.createElement('div');
    loadingStateDiv.className = 'cv-loading-state'; // Classe CSS para estilização
    loadingStateDiv.innerHTML = `
        <div class="cv-loading-state__icon">${iconSvg}</div>
        <h3 class="cv-loading-state__title">Carregando</h3>
        <p class="cv-loading-state__message">${message}</p>
    `;
    container.appendChild(loadingStateDiv);
}

/**
 * Limpa o conteúdo de um container.
 * @param {HTMLElement} container O elemento a ser limpo.
 */
function clearContainer(container) {
    if (container) {
        container.innerHTML = '';
    }
}

// Funções para obter ícones padrão (SVG como strings)
// Estes podem ser mais elaborados ou vir de um arquivo de ícones.
function getDefaultErrorIcon() {
    return `<!-- Heroicon name: outline/exclamation-circle -->
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6H3.75a3.75 3.75 0 017.5 0v1.5H12m0-1.5H8.25m.75 11.25l.386.192a1.125 1.125 0 010 1.92l-.386.192A11.953 11.953 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.75m0-3.75a3.75 3.75 0 00-7.5 0V15m7.5 0v3.75m0-3.75H3.75m0-3.75h7.5M12 15V9.75M12 15a3 3 0 01-3 3H6a3 3 0 01-3-3V9.75a3 3 0 013-3h3a3 3 0 013 3v5.25zm-6.75 0H9.75m-3.75 0H3.75M9.75 0A9.75 9.75 0 0119.5 9.75c0 2.36-.825 4.536-2.205 6.25A9.715 9.715 0 0112 21.75a9.716 9.716 0 01-7.295-3.045A9.75 9.75 0 012.25 9.75 9.75 9.75 0 019.75 0zm0 3.75A6 6 0 003.75 9.75a6 6 0 006 6 6 6 0 006-6 6 6 0 00-6-6z" />
    </svg>`;
}

function getDefaultEmptyIcon() {
    return `<!-- Heroicon name: outline/document-magnifying-glass -->
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 10.875a1.125 1.125 0 11-2.25 0 1.125 1.125 0 012.25 0z" />
    </svg>`;
}

function getDefaultLoadingIcon() {
    // Usando um ícone de spinner simples. Pode ser substituído por um SVG mais elaborado.
    return `<!-- Heroicon name: arrow-path -->
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>`;
}

// Ícones específicos para tipos de conteúdo (movidos de comunicacao.js e biblioteca.js)
export function getDefaultPollIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-bar-chart-2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
}
export function getDefaultRequestIcon() {
     return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
}
export function getDefaultOccurrenceIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-alert-triangle"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
}
export function getDefaultSearchIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48px" height="48px"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;
}
export function getDefaultDocumentIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48px" height="48px"><path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm8 7h-2V4l4 4h-2z"/></svg>`;
}
