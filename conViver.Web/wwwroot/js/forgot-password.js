import apiClient from './apiClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const submitButton = document.getElementById('submitButton');
    const feedbackDiv = document.getElementById('feedback');

    const showFeedback = (message, type = 'error') => {
        feedbackDiv.textContent = message;
        feedbackDiv.className = `cv-alert ${type === 'error' ? 'cv-alert--error' : 'cv-alert--success'}`; // Adjusted to use success for success messages
        feedbackDiv.style.display = 'block';
    };

    const hideFeedback = () => {
        feedbackDiv.style.display = 'none';
        feedbackDiv.textContent = '';
    };

    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFeedback();

        if (!emailInput.value) {
            showFeedback('Por favor, informe seu e-mail.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            await apiClient.post('/auth/forgot-password', { Email: emailInput.value });
            showFeedback('Se um e-mail com este endereço existir em nosso sistema, um link de recuperação foi enviado.', 'success');
            emailInput.value = ''; // Clear input on success
            // Optionally, disable the button permanently or redirect after a delay
            // For now, we just re-enable it, but a real scenario might differ.
        } catch (error) {
            console.error('Forgot password error:', error);
            let errorMessage = 'Ocorreu um erro ao tentar enviar o link de recuperação. Tente novamente.';
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            }
            showFeedback(errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Link';
        }
    });
});
