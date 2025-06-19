import apiClient, { setToken, ApiError } from './apiClient.js'; // Import ApiError

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
    loginFeedback.className = 'login-form__feedback'; // Reset classes
    loginFeedback.classList.add(`login-form__feedback--${type}`);
}

/**
 * Clears the feedback message.
 */
function clearFeedback() {
    loginFeedback.textContent = '';
    loginFeedback.className = 'login-form__feedback';
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFeedback(); // Clear previous messages

        // Show loading state
        showFeedback('Autenticando...', 'loading');
        document.body.classList.add('loading-active'); // Add loading class to body
        loginButton.disabled = true;
        emailInput.disabled = true;
        passwordInput.disabled = true;

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const response = await apiClient.post('/api/v1/auth/login', { Email: email, Senha: password });
            setToken(response.accessToken);

            showFeedback('Login bem-sucedido! Redirecionando...', 'success');
            document.body.classList.remove('loading-active'); // Remove loading class from body
            // Button remains disabled while redirecting

            // Redirect to the main page (index.html or dashboard)
            // Assuming index.html is the entry point after login for now
            window.location.href = 'index.html';

        } catch (error) {
            document.body.classList.remove('loading-active'); // Remove loading class from body
            let errorMessage = 'Falha no login.';
            // Default detail message, can be overridden by API's message
            let errorDetails = 'Verifique suas credenciais ou tente novamente mais tarde.';

            if (error instanceof ApiError) {
                // If ApiError.message seems to be a specific message from the backend, use it.
                // Otherwise, errorDetails will keep its default value.
                if (error.message &&
                    !error.message.toLowerCase().includes("network request failed") &&
                    !error.message.toLowerCase().includes("failed to fetch") &&
                    error.message !== error.statusText) { // Avoid using plain status text if we have a default
                    errorDetails = error.message;
                }

                // Set a general message based on status if details are too generic
                if (error.status === 401) {
                    errorMessage = 'E-mail ou senha inválidos.';
                    // If errorDetails from API is too generic for 401, or is the same as error.message (which might be generic)
                    // override it with a more user-friendly message for 401.
                    if (errorDetails === 'Invalid credentials' || errorDetails === error.message || (error.message && error.message.includes('status code 401'))) {
                        errorDetails = 'Por favor, verifique os dados inseridos.';
                    }
                } else if (error.status === 400) {
                    errorMessage = 'Requisição inválida.';
                     // If errorDetails from API is too generic for 400, override it
                     if (errorDetails === error.message || (error.message && error.message.includes('status code 400'))) {
                        errorDetails = 'Verifique os dados fornecidos e tente novamente.';
                    }
                } else if (error.status >= 500) {
                    errorMessage = 'Erro no servidor.';
                    errorDetails = 'Por favor, tente novamente mais tarde.'; // For server errors, usually best to not show technical details.
                } else if (!error.status) { // Likely a network error where status is null or 0
                    errorMessage = 'Erro de conexão.';
                    errorDetails = 'Não foi possível conectar ao servidor. Verifique sua internet.';
                }
            } // If not ApiError, the generic messages "Falha no login." and "Verifique suas credenciais..." will be used by default.

            showFeedback(errorMessage, 'error', errorDetails);
            loginButton.disabled = false; // Re-enable button on error
            emailInput.disabled = false;
            passwordInput.disabled = false;
            console.error('Login error:', error);
        }
    });
} else {
    console.error("Elemento #loginForm não encontrado no DOM.");
}
