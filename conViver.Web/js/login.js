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
 */
function showFeedback(message, type = 'error') {
    loginFeedback.textContent = message;
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
        loginButton.disabled = true;
        emailInput.disabled = true;
        passwordInput.disabled = true;

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const response = await apiClient.post('/auth/login', { email, password });
            setToken(response.accessToken);

            showFeedback('Login bem-sucedido! Redirecionando...', 'success');
            // Button remains disabled while redirecting

            // Redirect to the main page (index.html or dashboard)
            // Assuming index.html is the entry point after login for now
            window.location.href = 'index.html';

        } catch (error) {
            let errorMessage = 'Falha no login. Verifique suas credenciais ou tente novamente mais tarde.';
            if (error instanceof ApiError) {
                // Use message from ApiError if available and specific
                if (error.message && error.message !== 'API request failed') {
                    errorMessage = error.message;
                } else if (error.status === 401) {
                    errorMessage = 'E-mail ou senha inválidos.';
                } else if (error.status === 400) {
                    errorMessage = 'Requisição inválida. Verifique os dados fornecidos.';
                }
            }
            showFeedback(errorMessage, 'error');
            loginButton.disabled = false; // Re-enable button on error
            emailInput.disabled = false;
            passwordInput.disabled = false;
            console.error('Login error:', error);
        }
    });
} else {
    console.error("Elemento #loginForm não encontrado no DOM.");
}
