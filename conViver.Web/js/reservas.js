import apiClient from './apiClient.js';
import { requireAuth, logout, getUserInfo, isUserInRole } from './auth.js';
// Assuming showGlobalFeedback is in main.js, adjust path if necessary
// import { showGlobalFeedback } from './main.js';
// For now, let's define a placeholder if main.js is not part of this scope
const showGlobalFeedback = (message, type = 'info', duration = 3000) => {
    console.log(`[${type.toUpperCase()}] Feedback: ${message} (duration: ${duration}ms)`);
    // In a real app, this would update a visible UI element.
    const feedbackArea = document.getElementById('global-feedback-area'); // Assuming such an element exists
    if (feedbackArea) {
        feedbackArea.textContent = message;
        feedbackArea.className = `feedback-message feedback-${type}`;
        setTimeout(() => {
            if (feedbackArea.textContent === message) {
                feedbackArea.textContent = '';
                feedbackArea.className = 'feedback-message';
            }
        }, duration);
    }
};


let currentUser = null;
let commonSpaces = []; // Cache for common spaces

// --- DOM Elements (cache them for performance) ---
const domElements = {};

function cacheDOMElements() {
    // Navigation
    domElements.usernameDisplay = document.getElementById('username-display');
    domElements.logoutButton = document.getElementById('logout-button');
    domElements.adminNavEspacos = document.getElementById('admin-nav-espacos');

    // Agenda View
    domElements.btnMonthView = document.getElementById('btn-month-view');
    domElements.btnListView = document.getElementById('btn-list-view');
    domElements.filtroEspacoAgenda = document.getElementById('filtro-espaco-agenda');
    domElements.calendarContainer = document.getElementById('calendar-container');
    domElements.reservaListView = document.getElementById('reserva-list-view');

    // Minhas Reservas
    domElements.filtroEspacoMinhas = document.getElementById('filtro-espaco-minhas');
    domElements.filtroStatusMinhas = document.getElementById('filtro-status-minhas');
    domElements.minhasReservasList = document.getElementById('minhas-reservas-list');

    // Admin Section
    domElements.adminReservasSection = document.getElementById('admin-reservas-section');
    domElements.filtroEspacoAdmin = document.getElementById('filtro-espaco-admin');
    domElements.filtroUnidadeAdminText = document.getElementById('filtro-unidade-admin-text');
    domElements.btnFiltroUnidadeAdminApply = document.getElementById('btn-filtro-unidade-admin-apply');
    domElements.filtroStatusAdmin = document.getElementById('filtro-status-admin');
    domElements.todasReservasList = document.getElementById('todas-reservas-list');

    // FAB and Modals
    domElements.fabNovaReserva = document.getElementById('fab-nova-reserva');
    domElements.reservaModal = document.getElementById('reserva-modal');
    domElements.closeReservaModal = document.getElementById('close-reserva-modal');
    domElements.reservaModalTitle = document.getElementById('reserva-modal-title');
    domElements.formNovaReserva = document.getElementById('form-nova-reserva');
    domElements.reservaIdEdit = document.getElementById('reserva-id-edit');
    domElements.reservaEspacoSelect = document.getElementById('reserva-espaco');
    domElements.espacoInfoDiv = document.getElementById('espaco-info');
    domElements.reservaInicioInput = document.getElementById('reserva-inicio');
    domElements.reservaFimInput = document.getElementById('reserva-fim');
    domElements.reservaObservacoesInput = document.getElementById('reserva-observacoes');
    domElements.termoDeUsoContainer = document.getElementById('termo-de-uso-container');
    domElements.termoDeUsoTexto = document.getElementById('termo-de-uso-texto');
    domElements.reservaTermoAceitoCheckbox = document.getElementById('reserva-termo-aceito');
    domElements.reservaTaxaInfoDiv = document.getElementById('reserva-taxa-info');
    domElements.reservaModalFeedback = document.getElementById('reserva-modal-feedback');

    domElements.adminActionModal = document.getElementById('admin-action-modal');
    domElements.closeAdminActionModal = document.getElementById('close-admin-action-modal');
    domElements.adminActionModalTitle = document.getElementById('admin-action-modal-title');
    domElements.formAdminAction = document.getElementById('form-admin-action');
    domElements.adminActionReservaId = document.getElementById('admin-action-reserva-id');
    domElements.adminActionType = document.getElementById('admin-action-type');
    domElements.adminActionPrompt = document.getElementById('admin-action-prompt');
    domElements.adminActionJustificativa = document.getElementById('admin-action-justificativa');
    domElements.adminActionModalFeedback = document.getElementById('admin-action-modal-feedback');
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    requireAuth(); // Redirect to login if not authenticated
    cacheDOMElements();
    initReservasPage();
});

async function initReservasPage() {
    currentUser = getUserInfo();
    if (!currentUser) {
        showGlobalFeedback("Erro ao obter informações do usuário. Por favor, faça login novamente.", "error");
        logout();
        return;
    }

    if(domElements.usernameDisplay) domElements.usernameDisplay.textContent = currentUser.username || "Usuário";
    if(domElements.logoutButton) domElements.logoutButton.addEventListener('click', logout);

    setupEventListeners();
    await loadCommonSpaces(); // Load and populate common space dropdowns

    // Initial data loads
    await loadAgendaView();
    await loadMinhasReservas();

    if (isUserInRole("Sindico") || isUserInRole("Administrador")) {
        if(domElements.adminReservasSection) domElements.adminReservasSection.style.display = 'block';
        if(domElements.adminNavEspacos) domElements.adminNavEspacos.style.display = 'inline'; // or 'block'
        await loadTodasReservasAdmin();
    }
}

function setupEventListeners() {
    // View toggles
    if(domElements.btnMonthView) domElements.btnMonthView.addEventListener('click', () => switchAgendaView('month'));
    if(domElements.btnListView) domElements.btnListView.addEventListener('click', () => switchAgendaView('list'));

    // FAB and Modals
    if(domElements.fabNovaReserva) domElements.fabNovaReserva.addEventListener('click', () => openReservaModal());
    if(domElements.closeReservaModal) domElements.closeReservaModal.addEventListener('click', () => closeReservaModal());
    if(domElements.closeAdminActionModal) domElements.closeAdminActionModal.addEventListener('click', () => closeAdminActionModal());

    // Forms
    if(domElements.formNovaReserva) domElements.formNovaReserva.addEventListener('submit', handleReservaFormSubmit);
    if(domElements.formAdminAction) domElements.formAdminAction.addEventListener('submit', handleAdminActionFormSubmit);

    // Filters
    if(domElements.filtroEspacoAgenda) domElements.filtroEspacoAgenda.addEventListener('change', loadAgendaView);
    if(domElements.filtroEspacoMinhas) domElements.filtroEspacoMinhas.addEventListener('change', loadMinhasReservas);
    if(domElements.filtroStatusMinhas) domElements.filtroStatusMinhas.addEventListener('change', loadMinhasReservas);

    if(domElements.filtroEspacoAdmin) domElements.filtroEspacoAdmin.addEventListener('change', loadTodasReservasAdmin);
    if(domElements.filtroStatusAdmin) domElements.filtroStatusAdmin.addEventListener('change', loadTodasReservasAdmin);
    if(domElements.btnFiltroUnidadeAdminApply) domElements.btnFiltroUnidadeAdminApply.addEventListener('click', loadTodasReservasAdmin);

    // When common space is selected in modal, fetch its details
    if(domElements.reservaEspacoSelect) domElements.reservaEspacoSelect.addEventListener('change', handleEspacoSelectChangeInModal);
}

// --- Common Spaces ---
async function loadCommonSpaces() {
    try {
        commonSpaces = await apiClient.get('/app/espacos-comuns');
        populateCommonSpaceSelects(commonSpaces);
    } catch (error) {
        console.error("Erro ao carregar espaços comuns:", error);
        showGlobalFeedback("Falha ao carregar lista de espaços comuns.", "error");
        commonSpaces = []; // Ensure it's an empty array on error
    }
}

function populateCommonSpaceSelects(spaces) {
    const selects = [
        domElements.filtroEspacoAgenda,
        domElements.filtroEspacoMinhas,
        domElements.filtroEspacoAdmin,
        domElements.reservaEspacoSelect
    ];
    selects.forEach(select => {
        if (!select) return;
        // Clear existing options except the first one (placeholder)
        while (select.options.length > 1) {
            select.remove(1);
        }
        spaces.forEach(space => {
            const option = new Option(space.nome, space.id);
            select.add(option);
        });
    });
}

async function handleEspacoSelectChangeInModal(event) {
    const espacoId = event.target.value;
    if (!espacoId) {
        if(domElements.espacoInfoDiv) domElements.espacoInfoDiv.innerHTML = "";
        if(domElements.termoDeUsoTexto) domElements.termoDeUsoTexto.textContent = "Selecione um espaço para ver o termo de uso.";
        if(domElements.reservaTaxaInfoDiv) domElements.reservaTaxaInfoDiv.innerHTML = "";
        return;
    }
    const selectedSpace = commonSpaces.find(s => s.id === espacoId);
    if (selectedSpace) {
        if(domElements.espacoInfoDiv) {
            domElements.espacoInfoDiv.innerHTML = \`
                <p><strong>Regras:</strong> ${selectedSpace.descricao || 'Não especificadas'}</p>
                <p><strong>Capacidade:</strong> ${selectedSpace.capacidade || 'N/A'}</p>
                <p><strong>Horas de Antecedência Mínima:</strong> ${selectedSpace.antecedenciaMinimaReservaHoras}h</p>
            \`;
        }
        if(domElements.termoDeUsoTexto) domElements.termoDeUsoTexto.textContent = selectedSpace.termoDeUso || "Nenhum termo de uso específico para este espaço.";
        if(domElements.reservaTaxaInfoDiv) {
            domElements.reservaTaxaInfoDiv.textContent = selectedSpace.taxaReserva ? \`Taxa de Reserva: R\$ ${selectedSpace.taxaReserva.toFixed(2)}\` : "Sem taxa de reserva.";
        }
    }
}


// --- Agenda View (Calendar/List) ---
let currentAgendaView = 'month'; // 'month' or 'list'
// TODO: Implement FullCalendar or similar for month view
async function loadAgendaView() {
    showGlobalFeedback("Carregando agenda...", "info");
    const espacoId = domElements.filtroEspacoAgenda?.value || null;
    const mesAno = new Date().toISOString().slice(0, 7); // Current month

    try {
        let url = \`/app/reservas/agenda?mesAno=\${mesAno}\`;
        if (espacoId) {
            url += \`&espacoComumId=\${espacoId}\`;
        }
        const agendaItens = await apiClient.get(url);

        if (currentAgendaView === 'month') {
            if(domElements.calendarContainer) {
                domElements.calendarContainer.innerHTML = '<p>(Placeholder: Visão Mensal do Calendário aqui)</p>'; // Placeholder
                // TODO: Render FullCalendar with agendaItens
                renderCalendar(agendaItens); // Example call
            }
            if(domElements.reservaListView) domElements.reservaListView.style.display = 'none';
            if(domElements.calendarContainer) domElements.calendarContainer.style.display = 'block';
        } else { // 'list'
            if(domElements.reservaListView) {
                 renderAgendaList(agendaItens);
                 domElements.reservaListView.style.display = 'block';
            }
            if(domElements.calendarContainer) domElements.calendarContainer.style.display = 'none';
        }
        showGlobalFeedback("Agenda carregada.", "success");
    } catch (error) {
        console.error("Erro ao carregar agenda:", error);
        showGlobalFeedback("Falha ao carregar agenda.", "error");
        if(domElements.calendarContainer) domElements.calendarContainer.innerHTML = '<p class="error-message">Erro ao carregar agenda.</p>';
        if(domElements.reservaListView) domElements.reservaListView.innerHTML = '<p class="error-message">Erro ao carregar lista de agenda.</p>';
    }
}

function switchAgendaView(viewType) {
    currentAgendaView = viewType;
    loadAgendaView(); // Reload data for the new view
}

function renderCalendar(events) { // Placeholder for FullCalendar rendering
    if(!domElements.calendarContainer) return;
    domElements.calendarContainer.innerHTML = ''; // Clear placeholder
    if (!events || events.length === 0) {
        domElements.calendarContainer.innerHTML = '<p>Nenhuma reserva encontrada para este período na visão de calendário.</p>';
        return;
    }
    // This is where FullCalendar initialization and event rendering would go.
    // For now, just a simple list:
    const ul = document.createElement('ul');
    events.forEach(event => {
        const li = document.createElement('li');
        li.textContent = \`\${new Date(event.inicio).toLocaleDateString()} \${new Date(event.inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - \${new Date(event.fim).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}: \${event.tituloReserva}\`;
        ul.appendChild(li);
    });
    domElements.calendarContainer.appendChild(ul);
    console.log("TODO: Implement FullCalendar rendering with events:", events);
}

function renderAgendaList(items) {
    if(!domElements.reservaListView) return;
    domElements.reservaListView.innerHTML = ''; // Clear
    if (!items || items.length === 0) {
        domElements.reservaListView.innerHTML = '<p>Nenhuma reserva encontrada para este período.</p>';
        return;
    }
    const ul = document.createElement('ul');
    ul.className = 'cv-list';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'cv-list-item';
        li.innerHTML = \`
            <strong>\${item.tituloReserva}</strong><br>
            Início: \${new Date(item.inicio).toLocaleString()}<br>
            Fim: \${new Date(item.fim).toLocaleString()}<br>
            Status: \${item.status}
        \`;
        ul.appendChild(li);
    });
    domElements.reservaListView.appendChild(ul);
}

// --- "Minhas Reservas" ---
async function loadMinhasReservas() {
    // Stub: Implement fetching and rendering logic
    if(!domElements.minhasReservasList) return;
    domElements.minhasReservasList.innerHTML = '<p>TODO: Carregar e exibir "Minhas Reservas".</p>';
    showGlobalFeedback("TODO: Carregar Minhas Reservas", "info");
}

// --- Admin: "Todas Reservas" ---
async function loadTodasReservasAdmin() {
    // Stub: Implement fetching and rendering logic for admin
    if(!domElements.todasReservasList) return;
    domElements.todasReservasList.innerHTML = '<p>TODO: Carregar e exibir "Todas Reservas" para Admin.</p>';
    showGlobalFeedback("TODO: Carregar Todas Reservas (Admin)", "info");
}

// --- Reserva Modal & Form Submission ---
function openReservaModal(reserva = null) { // Pass reserva object for editing
    if(!domElements.reservaModal || !domElements.formNovaReserva) return;

    domElements.formNovaReserva.reset(); // Clear form
    if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.textContent = '';
    if(domElements.reservaIdEdit) domElements.reservaIdEdit.value = '';

    if (reserva) { // Editing existing reserva
        if(domElements.reservaModalTitle) domElements.reservaModalTitle.textContent = "Editar Reserva";
        if(domElements.reservaIdEdit) domElements.reservaIdEdit.value = reserva.id;
        if(domElements.reservaEspacoSelect) domElements.reservaEspacoSelect.value = reserva.espacoComumId;
        // Trigger change to load space details
        if(domElements.reservaEspacoSelect) domElements.reservaEspacoSelect.dispatchEvent(new Event('change'));

        if(domElements.reservaInicioInput) domElements.reservaInicioInput.value = formatDatetimeLocal(reserva.inicio);
        if(domElements.reservaFimInput) domElements.reservaFimInput.value = formatDatetimeLocal(reserva.fim);
        if(domElements.reservaObservacoesInput) domElements.reservaObservacoesInput.value = reserva.observacoes || '';
        if(domElements.reservaTermoAceitoCheckbox) domElements.reservaTermoAceitoCheckbox.checked = reserva.termoDeUsoAceito;
    } else { // New reserva
        if(domElements.reservaModalTitle) domElements.reservaModalTitle.textContent = "Solicitar Nova Reserva";
        if(domElements.reservaEspacoSelect && domElements.reservaEspacoSelect.options.length > 1) {
             domElements.reservaEspacoSelect.selectedIndex = 0; // Reset to placeholder
             domElements.reservaEspacoSelect.dispatchEvent(new Event('change')); // Trigger to clear details
        }
    }
    domElements.reservaModal.style.display = 'block';
}

function closeReservaModal() {
    if(domElements.reservaModal) domElements.reservaModal.style.display = 'none';
}

async function handleReservaFormSubmit(event) {
    event.preventDefault();
    if(!domElements.formNovaReserva) return;
    const formData = new FormData(domElements.formNovaReserva);
    const reservaId = domElements.reservaIdEdit?.value;

    const payload = {
        espacoComumId: formData.get('espacoComumId'),
        inicio: formData.get('inicio'),
        fim: formData.get('fim'),
        observacoes: formData.get('observacoes'),
        termoDeUsoAceito: domElements.reservaTermoAceitoCheckbox?.checked || false
    };

    // Validate required fields (basic)
    if (!payload.espacoComumId || !payload.inicio || !payload.fim) {
        if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.textContent = "Espaço, início e fim são obrigatórios.";
        if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.className = "feedback-message feedback-error";
        return;
    }
    if (!payload.termoDeUsoAceito) {
        if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.textContent = "Você deve aceitar o termo de uso.";
        if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.className = "feedback-message feedback-error";
        return;
    }

    try {
        showGlobalFeedback(reservaId ? "Atualizando reserva..." : "Criando reserva...", "info");
        if (reservaId) { // Editing
            await apiClient.put(\`/syndic/reservas/\${reservaId}\`, payload); // Admin edit endpoint
            showGlobalFeedback("Reserva atualizada com sucesso!", "success");
        } else { // Creating
            await apiClient.post('/app/reservas', payload);
            showGlobalFeedback("Reserva solicitada com sucesso!", "success");
        }
        closeReservaModal();
        await loadAgendaView();
        await loadMinhasReservas();
        if (isUserInRole("Sindico") || isUserInRole("Administrador")) {
            await loadTodasReservasAdmin();
        }
    } catch (error) {
        console.error("Erro ao salvar reserva:", error);
        const errorMessage = error.data?.message || error.message || (reservaId ? "Falha ao atualizar reserva." : "Falha ao criar reserva.");
        if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.textContent = errorMessage;
        if(domElements.reservaModalFeedback) domElements.reservaModalFeedback.className = "feedback-message feedback-error";
        showGlobalFeedback(errorMessage, "error");
    }
}

// --- Admin Action Modal ---
function openAdminActionModal(reservaId, actionType, promptMessage) {
    if(!domElements.adminActionModal || !domElements.formAdminAction) return;

    domElements.formAdminAction.reset();
    if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.textContent = '';
    if(domElements.adminActionReservaId) domElements.adminActionReservaId.value = reservaId;
    if(domElements.adminActionType) domElements.adminActionType.value = actionType;
    if(domElements.adminActionPrompt) domElements.adminActionPrompt.textContent = promptMessage || "Confirmar ação?";

    let title = "Ação Administrativa";
    if (actionType === 'approve') title = "Aprovar Reserva";
    else if (actionType === 'reject') title = "Rejeitar Reserva";
    else if (actionType === 'admin_cancel') title = "Cancelar Reserva (Admin)";
    if(domElements.adminActionModalTitle) domElements.adminActionModalTitle.textContent = title;

    domElements.adminActionModal.style.display = 'block';
}

function closeAdminActionModal() {
    if(domElements.adminActionModal) domElements.adminActionModal.style.display = 'none';
}

async function handleAdminActionFormSubmit(event) {
    event.preventDefault();
    if(!domElements.formAdminAction) return;

    const reservaId = domElements.adminActionReservaId?.value;
    const actionType = domElements.adminActionType?.value;
    const justificativa = domElements.adminActionJustificativa?.value;

    if (!reservaId || !actionType) {
        if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.textContent = "ID da reserva ou tipo de ação ausente.";
        if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.className = "feedback-message feedback-error";
        return;
    }
    if ((actionType === 'reject' || actionType === 'admin_cancel') && !justificativa) {
         if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.textContent = "Justificativa é obrigatória para rejeitar ou cancelar.";
         if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.className = "feedback-message feedback-error";
        return;
    }

    try {
        showGlobalFeedback("Processando ação administrativa...", "info");
        if (actionType === 'approve' || actionType === 'reject') {
            const statusPayload = {
                status: actionType === 'approve' ? 'Aprovada' : 'Recusada',
                justificativaStatus: justificativa
            };
            await apiClient.put(\`/syndic/reservas/\${reservaId}/status\`, statusPayload);
            showGlobalFeedback(\`Reserva \${actionType === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso!\`, "success");
        } else if (actionType === 'admin_cancel') {
            const cancelPayload = { justificativa: justificativa };
            await apiClient.deleteApi(\`/app/reservas/\${reservaId}\`, cancelPayload); // apiClient needs deleteApi method that accepts body
            showGlobalFeedback("Reserva cancelada pelo administrador com sucesso!", "success");
        }
        closeAdminActionModal();
        await loadTodasReservasAdmin(); // Refresh admin list
        await loadAgendaView(); // Refresh agenda
        await loadMinhasReservas(); // Also refresh user's view if it's their reserva
    } catch (error) {
        console.error("Erro ao processar ação administrativa:", error);
        const errorMessage = error.data?.message || error.message || "Falha ao processar ação.";
        if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.textContent = errorMessage;
        if(domElements.adminActionModalFeedback) domElements.adminActionModalFeedback.className = "feedback-message feedback-error";
        showGlobalFeedback(errorMessage, "error");
    }
}

// --- Helper Functions ---
function formatDatetimeLocal(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Adjust for timezone offset to display correctly in datetime-local
    const timezoneOffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
}

// Placeholder for apiClient.deleteApi if it doesn't exist or doesn't support body
// apiClient.deleteApi = async (url, body) => {
//     return apiClient.request({ method: 'DELETE', url, data: body });
// };


console.log("reservas.js loaded and initialized structure.");
