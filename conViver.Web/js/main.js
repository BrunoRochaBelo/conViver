// conViver.Web/js/main.js

/**
 * Funções Utilitárias Globais e Inicializações Comuns
 */

export function debugLog(...args) {
  if (window.APP_CONFIG?.ENABLE_DEBUG_LOGS) {
    console.log(...args);
  }
}

/**
 * Formata um objeto Date para o formato dd/mm/yyyy.
 * @param {Date} date O objeto Date a ser formatado.
 * @returns {string} A data formatada.
 */
export function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return 'Data inválida';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses são 0-indexados
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata um valor numérico como moeda brasileira (R$).
 * @param {number} value O valor a ser formatado.
 * @returns {string} O valor formatado como moeda.
 */
export function formatCurrency(value) {
  if (typeof value !== 'number') {
    return 'Valor inválido';
  }
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Delega um evento a elementos filhos que correspondem a um seletor.
 * @param {HTMLElement} parentElement O elemento pai no qual o listener será anexado.
 * @param {string} eventType O tipo de evento (ex: 'click').
 * @param {string} selector O seletor para os elementos filhos.
 * @param {Function} callback A função a ser chamada quando o evento ocorrer.
 */
export function delegateEvent(parentElement, eventType, selector, callback) {
  if (!parentElement) return;
  parentElement.addEventListener(eventType, (event) => {
    if (event.target && event.target.matches(selector)) {
      callback(event);
    }
  });
}

/**
 * Retorna uma versão "debounced" da função fornecida.
 * A função original será executada somente após o período de
 * inatividade definido.
 * @param {Function} fn Função a ser executada.
 * @param {number} delay Atraso em milissegundos.
 * @returns {Function} Função debounced.
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Exibe uma mensagem de erro global para o usuário.
 * (Implementação inicial simples, pode ser expandida)
 * @param {string} message A mensagem de erro a ser exibida.
 */
export function showGlobalError(message) {
  console.error(`ERRO GLOBAL: ${message}`);
  showGlobalFeedback(message, 'error');
}

/**
 * Container for global feedback messages.
 * Ensures messages are stacked and easily managed.
 */
let feedbackContainer = null;

function ensureFeedbackContainer() {
    if (!feedbackContainer) {
        feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'global-feedback-container';
        document.body.appendChild(feedbackContainer);
    }
}

/**
 * Displays a global feedback message.
 * @param {string} message The message to display.
 * @param {'success' | 'error' | 'info' | 'warning'} type The type of message.
 * @param {number} [duration] Optional duration in ms. If not provided, message stays until manually closed.
 */
export function showGlobalFeedback(message, type = 'info', duration) {
    ensureFeedbackContainer();

    const feedbackElement = document.createElement('div');
    feedbackElement.className = `global-feedback-toast global-feedback-toast--${type}`;
    feedbackElement.setAttribute('role', 'alert');

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    feedbackElement.appendChild(messageSpan);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;'; // Using HTML entity for '×'
    closeButton.className = 'global-feedback-toast__close-btn';
    closeButton.setAttribute('aria-label', 'Fechar');
    closeButton.onclick = () => {
        feedbackElement.classList.add('global-feedback-toast--hiding');
        setTimeout(() => feedbackElement.remove(), 300);
    };
    feedbackElement.appendChild(closeButton);

    feedbackContainer.appendChild(feedbackElement);

    setTimeout(() => {
        feedbackElement.classList.add('global-feedback-toast--visible');
    }, 10);

    const defaultDurations = { success: 4000, info: 3000, warning: 5000, error: 8000 };
    const hideAfter = typeof duration === 'number' ? duration : defaultDurations[type] || 5000;

    if (hideAfter && hideAfter > 0) {
        setTimeout(() => {
            if (feedbackElement.parentElement) {
                feedbackElement.classList.add('global-feedback-toast--hiding');
                setTimeout(() => feedbackElement.remove(), 300);
            }
        }, hideAfter);
    }
}

export function showSkeleton(target) {
    const elements = typeof target === 'string'
        ? document.querySelectorAll(target)
        : target instanceof Element ? [target] : (target instanceof NodeList || Array.isArray(target) ? target : []);
    elements.forEach(el => {
        if (!el) return;
        if (el.classList && el.classList.contains('feed-skeleton-container')) {
            el.style.display = 'block';
        } else {
            const container = el.querySelector('.feed-skeleton-container');
            if (container) container.style.display = 'block';
        }
    });
}

export function hideSkeleton(target) {
    const elements = typeof target === 'string'
        ? document.querySelectorAll(target)
        : target instanceof Element ? [target] : (target instanceof NodeList || Array.isArray(target) ? target : []);
    elements.forEach(el => {
        if (!el) return;
        if (el.classList && el.classList.contains('feed-skeleton-container')) {
            el.style.display = 'none';
        } else {
            const container = el.querySelector('.feed-skeleton-container');
            if (container) container.style.display = 'none';
        }
    });
}

export function showInlineSpinner(element) {
    if (!element) return () => {};
    const spinner = document.createElement('span');
    spinner.className = 'inline-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    element.appendChild(spinner);
    return () => {
        if (spinner.parentElement) spinner.remove();
    };
}

export function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.classList.add('cv-modal-open');
}

export function closeModal(modal) {
    if (modal) modal.style.display = 'none';
    document.body.classList.remove('cv-modal-open');
}

debugLog('main.js carregado.');

export function createEmptyStateElement({ iconHTML, title, description, actionButton, secondaryActionButton }) {
    const emptyState = document.createElement('div');
    emptyState.className = 'cv-empty-state';
    let iconMarkup = iconHTML ? `<div class="cv-empty-state__icon">${iconHTML}</div>` : '';
    let descriptionMarkup = description ? `<p class="cv-empty-state__description">${description}</p>` : '';
    let buttonsMarkup = '<div class="cv-empty-state__actions">';
    if (actionButton && actionButton.text && typeof actionButton.onClick === 'function') {
        const buttonClasses = ['cv-button', 'cv-empty-state__action', 'cv-empty-state__action--primary', ...(actionButton.classes || [])].join(' ');
        buttonsMarkup += `<button class="${buttonClasses}">${actionButton.text}</button>`;
    }
    if (secondaryActionButton && secondaryActionButton.text && typeof secondaryActionButton.onClick === 'function') {
        const secondaryButtonClasses = ['cv-button', 'cv-empty-state__action', 'cv-empty-state__action--secondary', ...(secondaryActionButton.classes || [])].join(' ');
        buttonsMarkup += `<button class="${secondaryButtonClasses}">${secondaryActionButton.text}</button>`;
    }
    buttonsMarkup += '</div>';
    emptyState.innerHTML = `${iconMarkup}<h3 class="cv-empty-state__title">${title}</h3>${descriptionMarkup}${buttonsMarkup}`;
    if (actionButton && actionButton.text && typeof actionButton.onClick === 'function') {
        emptyState.querySelector('.cv-empty-state__action--primary')?.addEventListener('click', actionButton.onClick);
    }
    if (secondaryActionButton && secondaryActionButton.text && typeof secondaryActionButton.onClick === 'function') {
        emptyState.querySelector('.cv-empty-state__action--secondary')?.addEventListener('click', secondaryActionButton.onClick);
    }
    return emptyState;
}

export function createErrorStateElement({ iconHTML, title = "Oops! Algo deu errado", message, retryButton }) {
    const errorState = document.createElement('div');
    errorState.className = 'cv-error-state';
    const defaultErrorIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"/></svg>`;
    const actualIconHTML = iconHTML || defaultErrorIcon;
    let iconMarkup = `<div class="cv-error-state__icon">${actualIconHTML}</div>`;
    let buttonMarkup = '';
    if (retryButton && typeof retryButton.onClick === 'function') {
        const buttonText = retryButton.text || "Tentar Novamente";
        const buttonClasses = ['cv-button', 'cv-error-state__retry-button', ...(retryButton.classes || [])].join(' ');
        buttonMarkup = `<button class="${buttonClasses}">${buttonText}</button>`;
    }
    errorState.innerHTML = `${iconMarkup}<h3 class="cv-error-state__title">${title}</h3><p class="cv-error-state__message">${message}</p>${buttonMarkup}`;
    if (retryButton && typeof retryButton.onClick === 'function') {
        errorState.querySelector('.cv-error-state__retry-button')?.addEventListener('click', retryButton.onClick);
    }
    return errorState;
}

debugLog('main.js com helpers de state e modal error carregado.');

export function showModalError(modalElement, message) {
    if (!modalElement) {
        console.warn("showModalError: modalElement não fornecido.");
        showGlobalFeedback(message, 'error');
        return;
    }
    let errorContainer = modalElement.querySelector('.cv-modal-error-message');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'cv-modal-error-message';
        errorContainer.style.cssText = `color: var(--current-semantic-error, #e53935); background-color: var(--current-color-error-bg, #ffebee); padding: var(--cv-spacing-sm, 8px) var(--cv-spacing-md, 16px); margin-top: var(--cv-spacing-md, 16px); margin-bottom: var(--cv-spacing-sm, 8px); border-radius: var(--cv-border-radius-md, 8px); font-size: 0.9em; text-align: center; border: 1px solid var(--current-semantic-error-darker, #c62828);`;
        const modalContent = modalElement.querySelector('.cv-modal-content');
        const modalFooter = modalElement.querySelector('.cv-modal-footer');
        if (modalContent) {
            modalFooter ? modalContent.insertBefore(errorContainer, modalFooter) : modalContent.appendChild(errorContainer);
        } else {
            modalElement.appendChild(errorContainer);
            console.warn("showModalError: '.cv-modal-content' não encontrado.");
        }
    }
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

export function clearModalError(modalElement) {
    if (!modalElement) {
        console.warn("clearModalError: modalElement não fornecido.");
        return;
    }
    const errorContainer = modalElement.querySelector('.cv-modal-error-message');
    if (errorContainer) {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
    }
}

// --- Início da Lógica de Scroll Reatividade V2 (mainNav no topo, tabs abaixo) ---
function handleScrollEffectsV2() {
    const header = document.querySelector('.cv-header');
    const mainNav = document.getElementById('mainNav');
    const cvTabs = document.querySelector('.cv-tabs');
    const pageMain = document.getElementById('pageMain');
    const scrollThreshold = 50;

    if (!header || !pageMain) return; // pageMain é crucial para padding

    const isScrolled = window.scrollY > scrollThreshold;
    const isDesktop = window.innerWidth >= 992; // Breakpoint para comportamento desktop

    // Comportamento do Header (encolher, sumir título)
    header.classList.toggle('cv-header--scrolled', isScrolled);

    if (isDesktop) {
        let mainNavHeight = 0;
        if (mainNav) {
            mainNav.classList.toggle('mainNav--fixed-top-desktop', isScrolled);
            if (isScrolled) {
                mainNavHeight = mainNav.offsetHeight;
            }
        }

        let cvTabsHeight = 0;
        if (cvTabs) {
            cvTabs.classList.toggle('cv-tabs--fixed-below-mainNav-desktop', isScrolled);
            if (isScrolled) {
                cvTabs.style.top = `${mainNavHeight}px`;
                cvTabsHeight = cvTabs.offsetHeight;
            } else {
                cvTabs.style.top = ''; // Limpa o top quando não está scrollado/fixo
            }
        }

        // Ajusta padding do pageMain
        if (isScrolled) {
            pageMain.style.paddingTop = `${mainNavHeight + cvTabsHeight}px`;
        } else {
            pageMain.style.paddingTop = '';
        }

        // Limpeza de classes mobile se estiver em desktop
        if (cvTabs) cvTabs.classList.remove('cv-tabs--fixed-mobile');
        pageMain.classList.remove('content--scrolled-mobile');

    } else { // Comportamento Mobile/Tablet (tabs fixam abaixo do header reduzido)
        let headerHeightScrolled = 0;
        if (isScrolled) {
            // Forçar o cálculo da altura do header já com a classe de scroll aplicada
            // Adicionando e removendo rapidamente pode não ser ideal, mas garante a altura correta.
            // Uma alternativa seria ter a altura scrollada em uma var CSS e ler via getComputedStyle.
            // Por ora, vamos confiar que o offsetHeight após toggle é o correto.
            headerHeightScrolled = header.offsetHeight;
        }

        if (cvTabs) {
            cvTabs.classList.toggle('cv-tabs--fixed-mobile', isScrolled);
            if (isScrolled) {
                cvTabs.style.top = `${headerHeightScrolled}px`;
                pageMain.style.paddingTop = `${headerHeightScrolled + cvTabs.offsetHeight}px`;
            } else {
                cvTabs.style.top = '';
                pageMain.style.paddingTop = '';
            }
        } else if (isScrolled) { // Sem tabs, mas header scrollado
            pageMain.style.paddingTop = `${headerHeightScrolled}px`;
        } else {
            pageMain.style.paddingTop = '';
        }

        // Limpeza de classes desktop se estiver em mobile/tablet
        if (mainNav) mainNav.classList.remove('mainNav--fixed-top-desktop');
        if (cvTabs) cvTabs.classList.remove('cv-tabs--fixed-below-mainNav-desktop');
        // pageMain.classList.remove('content--scrolled-desktop-v2'); // Se essa classe for usada
    }
}

const debouncedScrollHandlerV2 = debounce(handleScrollEffectsV2, 10);

window.addEventListener('scroll', debouncedScrollHandlerV2);
window.addEventListener('resize', debouncedScrollHandlerV2);
document.addEventListener('DOMContentLoaded', () => {
    handleScrollEffectsV2(); // Estado inicial
    // Garante que as alturas sejam calculadas corretamente após o nav.js montar o mainNav
    setTimeout(handleScrollEffectsV2, 200);
});
// --- Fim da Lógica de Scroll Reatividade V2 ---
