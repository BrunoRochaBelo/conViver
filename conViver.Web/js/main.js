// conViver.Web/js/main.js

/**
 * Funções Utilitárias Globais e Inicializações Comuns
 */

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
 * Exibe uma mensagem de erro global para o usuário.
 * (Implementação inicial simples, pode ser expandida)
 * @param {string} message A mensagem de erro a ser exibida.
 */
export function showGlobalError(message) {
  // Poderia ser um modal ou um toast no futuro.
  // Por enquanto, um simples console.error e alert.
  console.error(`ERRO GLOBAL: ${message}`);
  alert(`Erro: ${message}`);
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
        // Remove after animation
        setTimeout(() => feedbackElement.remove(), 300);
    };
    feedbackElement.appendChild(closeButton);

    feedbackContainer.appendChild(feedbackElement);

    // Trigger animation
    setTimeout(() => {
        feedbackElement.classList.add('global-feedback-toast--visible');
    }, 10); // Small delay to allow CSS transition to take effect

    if (duration && duration > 0) {
        setTimeout(() => {
            // Check if element still exists (wasn't closed manually)
            if (feedbackElement.parentElement) {
                feedbackElement.classList.add('global-feedback-toast--hiding');
                setTimeout(() => feedbackElement.remove(), 300);
            }
        }, duration);
    }
}


// Exemplo de como poderia ser usado para inicializações (se necessário no futuro):
// document.addEventListener('DOMContentLoaded', () => {
//   console.log('DOM completamente carregado e analisado. main.js pronto.');
//   // Inicializações globais aqui
// });

console.log('main.js carregado.');
