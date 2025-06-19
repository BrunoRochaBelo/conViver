import apiClient from './apiClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitButton = document.getElementById('submitButton');
    const feedbackDiv = document.getElementById('feedback');
    const loginLinkContainer = document.getElementById('loginLinkContainer');

    let token = '';

    const showFeedback = (message, type = 'error') => {
        feedbackDiv.textContent = message;
        feedbackDiv.className = `cv-alert ${type === 'error' ? 'cv-alert--error' : 'cv-alert--success'}`;
        feedbackDiv.style.display = 'block';
    };

    const hideFeedback = () => {
        feedbackDiv.style.display = 'none';
        feedbackDiv.textContent = '';
    };

    // Extract token from URL
    const queryParams = new URLSearchParams(window.location.search);
    token = queryParams.get('token');

    if (!token) {
        showFeedback('Token de redefinição inválido ou ausente. Por favor, solicite um novo link.');
        submitButton.disabled = true;
    }

    resetPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideFeedback();

        if (!token) {
            showFeedback('Token de redefinição inválido ou ausente.');
            return;
        }

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!newPassword || !confirmPassword) {
            showFeedback('Por favor, preencha ambos os campos de senha.');
            return;
        }

        if (newPassword !== confirmPassword) {
            showFeedback('As senhas não coincidem.');
            return;
        }

        // Basic password strength (optional, consider a library for more complex rules)
        if (newPassword.length < 6) {
            showFeedback('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Redefinindo...';

        try {
            await apiClient.post('/auth/reset-password', {
                ResetToken: token,
                NovaSenha: newPassword
            });
            showFeedback('Senha redefinida com sucesso! Você pode fazer login agora.', 'success');
            resetPasswordForm.style.display = 'none'; // Hide form on success
            loginLinkContainer.style.display = 'block'; // Show login link
        } catch (error) {
            console.error('Reset password error:', error);
            let errorMessage = 'Falha ao redefinir senha. O token pode ser inválido, expirado ou a senha não atende aos requisitos. Tente novamente.';
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            showFeedback(errorMessage);
            submitButton.disabled = false;
            submitButton.textContent = 'Redefinir Senha';
        }
        // No finally block to re-enable button if successful, as form is hidden
    });
});
