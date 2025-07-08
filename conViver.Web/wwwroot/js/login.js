import apiClient, { setToken, ApiError } from './apiClient.js'; // Import ApiError
import messages from './messages.js';

import { showInlineSpinner } from './main.js'; // Importar showInlineSpinner

// Get references to form elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginFeedback = document.getElementById('loginFeedback');

/**
 * Displays a feedback message in the login form.
 * @param {string} message The message to display.
 * @param {'error' | 'success' | 'loading'} type The type of message.
 * @param {string} [details] Optional details to append to the message.
 */
function showFeedback(message, type = 'error', details = '') {
    let fullMessage = message;
    if (details) {
        fullMessage += `: ${details}`;
    }
    loginFeedback.textContent = fullMessage;
    loginFeedback.className = 'login-form__feedback cv-alert cv-alert--hidden'; // Reset classes, start hidden
    loginFeedback.classList.add(`cv-alert--${type}`);
    loginFeedback.classList.remove('cv-alert--hidden'); // Make visible
    if (type === 'loading') {
        loginFeedback.classList.remove(`cv-alert--loading`); // loading is not a cv-alert type
        loginFeedback.classList.add(`cv-alert--info`); // Use info for loading message background
    }
}

/**
 * Clears the feedback message.
 */
function clearFeedback() {
    loginFeedback.textContent = '';
    loginFeedback.className = 'login-form__feedback cv-alert cv-alert--hidden';
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFeedback(); // Clear previous messages

        // Show loading state
        // showFeedback('Autenticando...', 'loading'); // Replaced by spinner
        // document.body.classList.add('loading-active'); // Not strictly needed if button has spinner

        loginButton.disabled = true;
        emailInput.disabled = true;
        passwordInput.disabled = true;
        const originalButtonText = loginButton.innerHTML;
        loginButton.innerHTML = 'Entrando... <span class="inline-spinner"></span>';


        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const response = await apiClient.post('/auth/login', { Email: email, Senha: password });
            setToken(response.accessToken);
            if (response.usuario) {
                localStorage.setItem('cv_userEmail', response.usuario.email || '');
                localStorage.setItem('cv_userName', response.usuario.nome || '');
                if (response.usuario.fotoUrl) {
                    localStorage.setItem('cv_userPhoto', response.usuario.fotoUrl);
                }
            }

            // showFeedback('Login bem-sucedido! Redirecionando...', 'success'); // Feedback might not be visible due to redirect
            // document.body.classList.remove('loading-active');
            // Button remains disabled while redirecting
            loginButton.innerHTML = 'Sucesso! Redirecionando...'; // Update button text

            // Redirect to the main page
            window.location.href = 'layout.html?page=comunicacao';

        } catch (error) {
            // document.body.classList.remove('loading-active');
            loginButton.innerHTML = originalButtonText; // Restore button text
            let errorMessage = 'Falha no login.';
            // Default detail message, can be overridden by API's message
            let errorDetails = 'Verifique suas credenciais ou tente novamente mais tarde.';

            if (error instanceof ApiError) {
                // If ApiError.message seems to be a specific message from the backend, use it.
                // Otherwise, errorDetails will keep its default value.
                if (error.message &&
                    !error.message.toLowerCase().includes("network request failed") &&
                    !error.message.toLowerCase().includes("failed to fetch") &&
                    error.message !== error.statusText) {
                    errorDetails = error.message;
                }

                // Customizações por status
                if (error.status === 401) {
                    errorMessage = 'E-mail ou senha inválidos.';
                    if (errorDetails === 'Invalid credentials' || errorDetails === error.message || (error.message && error.message.includes('status code 401'))) {
                        errorDetails = 'Por favor, verifique os dados inseridos.';
                    }
                } else if (error.status === 400) {
                    errorMessage = messages.erroValidacao;
                    if (errorDetails === error.message || (error.message && error.message.includes('status code 400'))) {
                        errorDetails = messages.erroValidacao;
                    }
                } else if (error.status >= 500) {
                    errorMessage = messages.erroServidor;
                    errorDetails = messages.erroServidor;
                } else if (!error.status) { // Rede
                    errorMessage = messages.erroConexao;
                    errorDetails = messages.erroConexao;
                }
            }

            showFeedback(errorMessage, 'error', errorDetails);
            loginButton.disabled = false; // Re-enable on error
            emailInput.disabled = false;
            passwordInput.disabled = false;
            console.error('Login error:', error);
        }
    });
} else {
    console.error("Elemento #loginForm não encontrado no DOM.");
}
