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
            const response = await apiClient.post('/api/v1/auth/login', { email, password });
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
            let errorDetails = 'Verifique suas credenciais ou tente novamente mais tarde.';

            if (error instanceof ApiError) {
                // Try to get detailed message from API response
                if (error.data && error.data.message) {
                    errorDetails = error.data.message;
                } else if (error.data && error.data.detail) {
                    errorDetails = error.data.detail;
                } else if (error.message && error.message !== 'API request failed') {
                    // Fallback to ApiError message if specific details are not available
                    errorDetails = error.message;
                }

                // Set a general message based on status if details are too generic
                if (error.status === 401) {
                    errorMessage = 'E-mail ou senha inválidos.';
                    // Keep specific details if available, otherwise use a default
                    if (errorDetails === 'Invalid credentials' || errorDetails === error.message) {
                        errorDetails = 'Por favor, verifique os dados inseridos.';
                    }
                } else if (error.status === 400) {
                    errorMessage = 'Requisição inválida.';
                     if (errorDetails === error.message) { // Avoid redundant message
                        errorDetails = 'Verifique os dados fornecidos.';
                    }
                } else if (error.status >= 500) {
                    errorMessage = 'Erro no servidor.';
                    errorDetails = 'Por favor, tente novamente mais tarde.';
                }
            }

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
