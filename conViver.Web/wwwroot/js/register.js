import apiClient from './apiClient.js';
import { showInlineSpinner } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitButton = document.getElementById('submitButton');
    const feedbackDiv = document.getElementById('feedback');
    const loginLinkContainer = document.getElementById('loginLinkContainer'); // To potentially hide form and show this

    const showFeedback = (message, type = 'error') => {
        feedbackDiv.textContent = message;
        feedbackDiv.className = `cv-alert ${type === 'error' ? 'cv-alert--error' : 'cv-alert--success'}`;
        feedbackDiv.style.display = 'block';
    };

    const hideFeedback = () => {
        feedbackDiv.style.display = 'none';
        feedbackDiv.textContent = '';
    };

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFeedback();

        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!name || !email || !password || !confirmPassword) {
            showFeedback('Por favor, preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            showFeedback('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            showFeedback('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        submitButton.disabled = true;
        const originalButtonHTML = submitButton.innerHTML;
        submitButton.textContent = 'Registrando...';
        const removeSpinner = showInlineSpinner(submitButton);

        try {
            await apiClient.post('/auth/signup', {
                Nome: name,
                Email: email,
                Senha: password
                // API will hash the password, DTO expects 'Senha' as plain text
            });
            showFeedback('Registro bem-sucedido! Você pode fazer login agora.', 'success');
            registerForm.reset(); // Clear the form
            // registerForm.style.display = 'none'; // Optionally hide form
            // loginLinkContainer.innerHTML = '<a href="login.html" class="login-form__link">Login realizado com sucesso! Clique aqui para fazer login.</a>'; // Update link
            // loginLinkContainer.style.display = 'block';

        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'Falha no registro. Verifique os dados ou tente um e-mail diferente.';
            if (error.response) {
                if (error.response.status === 409) { // Conflict - Email exists
                    errorMessage = 'Este e-mail já está cadastrado. Tente fazer login ou use um e-mail diferente.';
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data && error.response.data.errors) {
                    // Handle ASP.NET Core validation errors
                    const errors = error.response.data.errors;
                    const errorMessages = Object.values(errors).flat();
                    errorMessage = errorMessages.join(' ');
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            showFeedback(errorMessage);
        } finally {
            // Re-enable button unless success leads to a different state where button is not needed
            // For now, always re-enable for simplicity, allowing user to correct and resubmit.
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
            removeSpinner();
        }
    });
});
