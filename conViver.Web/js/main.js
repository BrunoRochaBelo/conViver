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

// /**
//  * Exibe uma mensagem de sucesso global para o usuário.
//  * @param {string} message A mensagem de sucesso.
//  */
// export function showGlobalSuccess(message) {
//     // Poderia ser um modal ou um toast no futuro.
//     console.log(`SUCESSO GLOBAL: ${message}`);
//     alert(message);
// }

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

/**
 * Exibe contêineres de skeleton para um seletor ou elemento.
 * Se o seletor apontar para o próprio contêiner, ele é exibido; caso
 * contrário, procura por um filho com `.feed-skeleton-container`.
 * @param {string|Element|NodeList} target CSS selector ou elemento(s)
 */
export function showSkeleton(target) {
  const elements = typeof target === 'string'
    ? document.querySelectorAll(target)
    : target instanceof Element
      ? [target]
      : target instanceof NodeList || Array.isArray(target)
        ? target
        : [];
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

/**
 * Oculta contêineres de skeleton exibidos com `showSkeleton`.
 * @param {string|Element|NodeList} target CSS selector ou elemento(s)
 */
export function hideSkeleton(target) {
  const elements = typeof target === 'string'
    ? document.querySelectorAll(target)
    : target instanceof Element
      ? [target]
      : target instanceof NodeList || Array.isArray(target)
        ? target
        : [];
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

/**
 * Mostra um pequeno spinner dentro do elemento fornecido e retorna
 * uma função que remove o spinner.
 * @param {HTMLElement} element Elemento onde o spinner será exibido.
 * @returns {Function} Função para remover o spinner criado.
 */
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

/**
 * Abre um modal ajustando o display e bloqueando scroll no body.
 * @param {HTMLElement} modal Elemento do modal a ser aberto.
 */
export function openModal(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.classList.add('cv-modal-open');
}

/**
 * Fecha um modal e libera o scroll do body.
 * @param {HTMLElement} modal Elemento do modal a ser fechado.
 */
export function closeModal(modal) {
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('cv-modal-open');
}

/**
 * Atualiza a variável CSS que representa a altura atual do header.
 */
export function updateHeaderVars() {
  const header = document.querySelector('.cv-header');
  if (header) {
    document.documentElement.style.setProperty(
      '--cv-header-height-current',
      `${header.offsetHeight}px`
    );
  }
}

debugLog('main.js carregado.');

/**
 * Cria e retorna um elemento HTML para o "Empty State".
 * @param {object} config - Configuração para o empty state.
 * @param {string} [config.iconHTML] - HTML para o ícone (ex: SVG string, <img> tag).
 * @param {string} config.title - O título do empty state.
 * @param {string} [config.description] - A descrição ou mensagem.
 * @param {object} [config.actionButton] - Configuração para um botão de ação opcional.
 * @param {string} config.actionButton.text - Texto do botão.
 * @param {function} config.actionButton.onClick - Função a ser chamada no clique do botão.
 * @param {string[]} [config.actionButton.classes] - Classes CSS adicionais para o botão.
 * @returns {HTMLElement} O elemento do empty state.
 */
export function createEmptyStateElement({ iconHTML, title, description, actionButton }) {
  const emptyState = document.createElement('div');
  emptyState.className = 'cv-empty-state';

  let iconMarkup = '';
  if (iconHTML) {
    iconMarkup = `<div class="cv-empty-state__icon">${iconHTML}</div>`;
  }

  let descriptionMarkup = '';
  if (description) {
    descriptionMarkup = `<p class="cv-empty-state__description">${description}</p>`;
  }

  let buttonsMarkup = '<div class="cv-empty-state__actions">';
  if (actionButton && actionButton.text && typeof actionButton.onClick === 'function') {
    const buttonClasses = ['cv-button', 'cv-empty-state__action', 'cv-empty-state__action--primary', ...(actionButton.classes || [])].join(' ');
    buttonsMarkup += `<button class="${buttonClasses}">${actionButton.text}</button>`;
  }

  // Adicionar botão de ação secundário, se existir na configuração
  if (config.secondaryActionButton && config.secondaryActionButton.text && typeof config.secondaryActionButton.onClick === 'function') {
    const secondaryButtonClasses = ['cv-button', 'cv-empty-state__action', 'cv-empty-state__action--secondary', ...(config.secondaryActionButton.classes || [])].join(' ');
    buttonsMarkup += `<button class="${secondaryButtonClasses}">${config.secondaryActionButton.text}</button>`;
  }
  buttonsMarkup += '</div>';

  emptyState.innerHTML = `
    ${iconMarkup}
    <h3 class="cv-empty-state__title">${title}</h3>
    ${descriptionMarkup}
    ${buttonsMarkup}
  `;

  if (actionButton && actionButton.text && typeof actionButton.onClick === 'function') {
    const buttonElement = emptyState.querySelector('.cv-empty-state__action--primary');
    if (buttonElement) {
      buttonElement.addEventListener('click', actionButton.onClick);
    }
  }

  if (config.secondaryActionButton && config.secondaryActionButton.text && typeof config.secondaryActionButton.onClick === 'function') {
    const secondaryButtonElement = emptyState.querySelector('.cv-empty-state__action--secondary');
    if (secondaryButtonElement) {
      secondaryButtonElement.addEventListener('click', config.secondaryActionButton.onClick);
    }
  }

  return emptyState;
}

/**
 * Cria e retorna um elemento HTML para o "Error State".
 * @param {object} config - Configuração para o error state.
 * @param {string} [config.iconHTML] - HTML para o ícone de erro (ex: SVG string, <img> tag).
 * @param {string} [config.title="Oops! Algo deu errado"] - O título do erro.
 * @param {string} config.message - A mensagem de erro específica.
 * @param {object} config.retryButton - Configuração para o botão "Tentar Novamente".
 * @param {string} [config.retryButton.text="Tentar Novamente"] - Texto do botão.
 * @param {function} config.retryButton.onClick - Função a ser chamada no clique do botão.
 * @param {string[]} [config.retryButton.classes] - Classes CSS adicionais para o botão.
 * @returns {HTMLElement} O elemento do error state.
 */
export function createErrorStateElement({ iconHTML, title = "Oops! Algo deu errado", message, retryButton }) {
  const errorState = document.createElement('div');
  errorState.className = 'cv-error-state';

  const defaultErrorIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z"/>
    </svg>
  `;
  const actualIconHTML = iconHTML || defaultErrorIcon;

  let iconMarkup = `<div class="cv-error-state__icon">${actualIconHTML}</div>`;

  let buttonMarkup = '';
  if (retryButton && typeof retryButton.onClick === 'function') {
    const buttonText = retryButton.text || "Tentar Novamente";
    const buttonClasses = ['cv-button', 'cv-error-state__retry-button', ...(retryButton.classes || [])].join(' ');
    buttonMarkup = `<button class="${buttonClasses}">${buttonText}</button>`;
  }

  errorState.innerHTML = `
    ${iconMarkup}
    <h3 class="cv-error-state__title">${title}</h3>
    <p class="cv-error-state__message">${message}</p>
    ${buttonMarkup}
  `;

  if (retryButton && typeof retryButton.onClick === 'function') {
    const buttonElement = errorState.querySelector('.cv-error-state__retry-button');
    if (buttonElement) {
      buttonElement.addEventListener('click', retryButton.onClick);
    }
  }

  return errorState;
}

// Adicionado log opcional de carregamento do script
debugLog('main.js com helpers de state e modal error carregado.');

// --- Funções Auxiliares para Erro em Modal (Movidas de comunicacao.js) ---
/**
 * Exibe uma mensagem de erro dentro de um elemento modal.
 * @param {HTMLElement} modalElement O elemento do modal.
 * @param {string} message A mensagem de erro a ser exibida.
 */
export function showModalError(modalElement, message) {
  if (!modalElement) {
    console.warn("showModalError: modalElement não fornecido.");
    showGlobalFeedback(message, 'error'); // Fallback para global se o modal não for encontrado
    return;
  }
  let errorContainer = modalElement.querySelector('.cv-modal-error-message');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.className = 'cv-modal-error-message';
    errorContainer.style.color = 'var(--current-semantic-error, #e53935)';
    errorContainer.style.backgroundColor = 'var(--current-color-error-bg, #ffebee)';
    errorContainer.style.padding = 'var(--cv-spacing-sm, 8px) var(--cv-spacing-md, 16px)';
    errorContainer.style.marginTop = 'var(--cv-spacing-md, 16px)';
    errorContainer.style.marginBottom = 'var(--cv-spacing-sm, 8px)';
    errorContainer.style.borderRadius = 'var(--cv-border-radius-md, 8px)';
    errorContainer.style.fontSize = '0.9em';
    errorContainer.style.textAlign = 'center';
    errorContainer.style.border = `1px solid var(--current-semantic-error-darker, #c62828)`;

    const modalContent = modalElement.querySelector('.cv-modal-content');
    const modalFooter = modalElement.querySelector('.cv-modal-footer');

    if (modalContent) {
      if (modalFooter) {
        modalContent.insertBefore(errorContainer, modalFooter);
      } else {
        modalContent.appendChild(errorContainer);
      }
    } else {
      modalElement.appendChild(errorContainer);
      console.warn("showModalError: '.cv-modal-content' não encontrado. Mensagem de erro adicionada ao root do modal.", modalElement);
    }
  }
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
}

/**
 * Limpa qualquer mensagem de erro exibida dentro de um elemento modal.
 * @param {HTMLElement} modalElement O elemento do modal.
 */
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

/**
 * Lógica de scroll para o header e tabs.
 */
function handleScrollEffectsV2(sentinelVisible = true) {
  const header = document.querySelector('.cv-header');
  const headerContainer = header ? header.querySelector('.cv-header__container') : null;
  const cvTabs = document.querySelector('.cv-tabs');
  const pageMain = document.getElementById('pageMain');
  const root = document.documentElement;

  if (!header || !headerContainer || !pageMain) return;

  const isDesktop = window.innerWidth >= 992;
  const scrollY = window.scrollY;
  const SCROLL_THRESHOLD_TO_COMPACT = 50; // Pixels para encolher
  const SCROLL_UP_THRESHOLD_TO_EXPAND = 150; // Pixels perto do topo para facilitar expansão

  let newHeaderHeightVar, headerTransformVar;
  let newTabsHeightVar;

  // Determina se o header deve estar compacto
  if (scrollY > SCROLL_THRESHOLD_TO_COMPACT && !isHeaderCompact) {
    isHeaderCompact = true;
  } else if (scrollY === 0 && isHeaderCompact) {
    isHeaderCompact = false; // Expande no topo
  } else if (scrollY < lastScrollY && scrollY < SCROLL_UP_THRESHOLD_TO_EXPAND && isHeaderCompact) {
    // Lógica de "resistência": se rolando para cima e perto do topo, expande.
    // Poderia adicionar detecção de "puxada forte" aqui se necessário.
    isHeaderCompact = false;
  }
  // Atualiza lastScrollY para a próxima chamada
  lastScrollY = scrollY;


  header.classList.toggle('cv-header--scrolled', isHeaderCompact);
  if (cvTabs) {
    cvTabs.classList.toggle('cv-tabs--scrolled', isHeaderCompact);
    cvTabs.classList.toggle('cv-tabs--compact', isHeaderCompact);
  }

  const normalHeaderHeightValue = parseFloat(getComputedStyle(root).getPropertyValue(isDesktop ? '--cv-header-height' : '--cv-header-height')); // Usa a base correta
  const scrolledHeaderHeightValue = parseFloat(getComputedStyle(root).getPropertyValue(isDesktop ? '--cv-header-height-scrolled-desktop' : '--cv-header-height-scrolled-mobile'));

  if (isHeaderCompact) {
    newHeaderHeightVar = scrolledHeaderHeightValue;
    // Calcula o translateY para mover o conteúdo do header para cima
    const translateY = scrolledHeaderHeightValue - normalHeaderHeightValue;
    headerTransformVar = `translateY(${translateY}px)`;

    if (cvTabs) {
      newTabsHeightVar = getComputedStyle(root).getPropertyValue('--cv-tabs-height-scrolled');
    }
  } else {
    newHeaderHeightVar = normalHeaderHeightValue;
    headerTransformVar = 'translateY(0px)';
    if (cvTabs) {
      newTabsHeightVar = getComputedStyle(root).getPropertyValue('--cv-tabs-height');
    }
  }

  root.style.setProperty('--cv-header-height-current', `${newHeaderHeightVar}px`);
  headerContainer.style.transform = headerTransformVar;

  if (cvTabs) {
    root.style.setProperty('--cv-tabs-height-current', newTabsHeightVar);
  }

  // updateHeaderVars(); // Não é mais necessário chamar aqui se definimos diretamente --cv-header-height-current

  let totalOffsetTop = newHeaderHeightVar;
  if (cvTabs && getComputedStyle(cvTabs).position === 'sticky') {
    cvTabs.style.top = `${newHeaderHeightVar}px`; // Tabs abaixo do header (agora possivelmente menor)
    const currentTabsHeight = parseFloat(getComputedStyle(root).getPropertyValue('--cv-tabs-height-current'));
    totalOffsetTop += currentTabsHeight;
  }

  pageMain.style.paddingTop = `${totalOffsetTop}px`;
}

// Variáveis globais para a lógica de scroll com resistência
let lastScrollY = window.scrollY;
let isHeaderCompact = false; // Estado para saber se o header está encolhido


function initScrollListener() {
  // O sentinel é usado para o trigger inicial, mas o scroll listener contínuo
  // é necessário para a lógica de "resistência" e para o caso de o sentinel ser removido.

  // Lógica do IntersectionObserver para o sentinel (pode ser mantida para o trigger inicial)
  const sentinel = document.getElementById('headerSentinel');
  if (sentinel) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // sentinelVisible é true se o sentinel está na tela (não rolou além dele)
        // A lógica de handleScrollEffectsV2 agora usa window.scrollY e estados internos
        // então a informação de isIntersecting do sentinel é menos crítica aqui, mas pode
        // ser usada para um trigger inicial ou para resetar estados se necessário.
        // Por ora, vamos deixar o handleScrollEffectsV2 ser chamado pelo evento de scroll principal.
      },
      { rootMargin: '0px', threshold: 1.0 }
    );
    observer.observe(sentinel);
  } else {
    console.warn("headerSentinel não encontrado. A lógica de scroll dependerá apenas do evento de scroll da window.");
  }

  // Listener de scroll principal
  window.addEventListener('scroll', debounce(() => {
    handleScrollEffectsV2(); // Não passamos mais sentinelVisible diretamente
  }, 15), { passive: true }); // Debounce leve para performance
}


// Atualiza as variáveis e o layout no resize
window.addEventListener('resize', debounce(() => {
  // Recalcula as alturas base e scrolladas, pois podem depender de vw/vh
  const root = document.documentElement;
  const isDesktop = window.innerWidth >= 992;

  const normalHeaderHeightValue = parseFloat(getComputedStyle(root).getPropertyValue(isDesktop ? '--cv-header-height' : '--cv-header-height'));
  const scrolledHeaderHeightValue = parseFloat(getComputedStyle(root).getPropertyValue(isDesktop ? '--cv-header-height-scrolled-desktop' : '--cv-header-height-scrolled-mobile'));

  // Se o header não estiver compacto, atualiza sua altura para a normal (após resize)
  if (!isHeaderCompact) {
    root.style.setProperty('--cv-header-height-current', `${normalHeaderHeightValue}px`);
    const headerContainer = document.querySelector('.cv-header__container');
    if (headerContainer) headerContainer.style.transform = 'translateY(0px)';
  } else {
    // Se estiver compacto, recalcula o transform baseado nas novas alturas
    root.style.setProperty('--cv-header-height-current', `${scrolledHeaderHeightValue}px`);
    const translateY = scrolledHeaderHeightValue - normalHeaderHeightValue;
    const headerContainer = document.querySelector('.cv-header__container');
    if (headerContainer) headerContainer.style.transform = `translateY(${translateY}px)`;
  }

  if (document.querySelector('.cv-tabs')) {
    const tabsScrolledHeight = getComputedStyle(root).getPropertyValue('--cv-tabs-height-scrolled');
    const tabsNormalHeight = getComputedStyle(root).getPropertyValue('--cv-tabs-height');
    root.style.setProperty('--cv-tabs-height-current', isHeaderCompact ? tabsScrolledHeight : tabsNormalHeight);
  }

  handleScrollEffectsV2(); // Reavalia todo o layout
}, 150));


// Inicialização no carregamento da página
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const isDesktop = window.innerWidth >= 992;
  // Define alturas iniciais
  root.style.setProperty('--cv-header-height-current', getComputedStyle(root).getPropertyValue(isDesktop ? '--cv-header-height' : '--cv-header-height'));
  if (document.querySelector('.cv-tabs')) {
    root.style.setProperty('--cv-tabs-height-current', getComputedStyle(root).getPropertyValue('--cv-tabs-height'));
  }

  lastScrollY = window.scrollY; // Inicializa lastScrollY
  isHeaderCompact = window.scrollY > SCROLL_THRESHOLD_TO_COMPACT; // Define estado inicial de isHeaderCompact

  initScrollListener(); // Configura os listeners de scroll (incluindo o observer do sentinel se existir)

  handleScrollEffectsV2(); // Chamada inicial para configurar o estado

  setTimeout(() => { // Chamada com delay para garantir que tudo foi renderizado
    handleScrollEffectsV2();
  }, 150);
});
