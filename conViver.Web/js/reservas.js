import apiClient from './apiClient.js';
import { requireAuth, logout, getUserInfo, isUserInRole } from './auth.js';
// Assuming showGlobalFeedback is in main.js, adjust path if necessary
// import { showGlobalFeedback } from './main.js';
// For now, let's define a placeholder if main.js is not part of this scope
// const domElements = { globalFeedbackArea: document.getElementById('global-feedback-area') };
// It's better if globalFeedbackArea is part of the main domElements cache.

let feedbackTimeout = null; // To manage the timeout

const showGlobalFeedback = (message, type = 'info', duration = 3000) => {
    // Attempt to get the element if not already cached or if cacheDOMElements hasn't run
    const feedbackArea = domElements.globalFeedbackArea || document.getElementById('global-feedback-area');

    if (feedbackArea) {
        // Clear any existing timeout to prevent premature clearing if called rapidly
        if (feedbackTimeout) {
            clearTimeout(feedbackTimeout);
        }

        feedbackArea.textContent = message;
        // Reset classes first, then add the specific type and a general 'visible' class (or rely on type for display:block)
        feedbackArea.className = 'feedback-message'; // Reset
        feedbackArea.classList.add(\`feedback-\${type}\`);
        // feedbackArea.style.display = 'block'; // Or manage display via CSS classes as done above

        if (duration > 0) { // Allow indefinite display if duration is 0 or less
            feedbackTimeout = setTimeout(() => {
                // Check if the message is still the one we set, to avoid clearing a newer message
                if (feedbackArea.textContent === message) {
                    feedbackArea.textContent = '';
                    feedbackArea.className = 'feedback-message'; // Hide it again
                    // feedbackArea.style.display = 'none';
                }
            }, duration);
        }
    } else {
        // Fallback to console if UI element not found
        console.log(\`[GLOBAL FEEDBACK - \${type.toUpperCase()}]: \${message}\`);
    }
};


let currentUser = null;
let commonSpaces = []; // Cache for common spaces
let calendarInstance = null; // Declare calendar instance globally

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
    domElements.globalFeedbackArea = document.getElementById('global-feedback-area');
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

async function loadAgendaView(mesAnoParam = null) { // Accept optional parameter
    showGlobalFeedback("Carregando agenda...", "info");
    const espacoId = domElements.filtroEspacoAgenda?.value || null;

    // Use mesAnoParam if provided, otherwise default to current month
    // Also, store the current mesAno being viewed, perhaps on a data attribute of a relevant element
    let mesAnoToLoad;
    if (mesAnoParam) {
        mesAnoToLoad = mesAnoParam;
        if(domElements.calendarContainer) domElements.calendarContainer.dataset.currentMesAnoForView = mesAnoToLoad; // Store it
    } else {
        mesAnoToLoad = domElements.calendarContainer?.dataset.currentMesAnoForView || new Date().toISOString().slice(0, 7);
    }

    try {
        let url = \`/app/reservas/agenda?mesAno=\${mesAnoToLoad}\`;
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

function renderCalendar(agendaEvents) { // agendaEvents are from API (AgendaReservaDto)
    if (!domElements.calendarContainer) {
        console.error("Calendar container not found for FullCalendar rendering.");
        return;
    }
    domElements.calendarContainer.innerHTML = ''; // Clear any placeholder text

    // Transform agendaEvents to FullCalendar event format
    const fcEvents = agendaEvents.map(event => ({
        id: event.id, // Reserva ID
        title: event.tituloReserva, // e.g., "Salão de Festas - Apto 101"
        start: event.inicio, // ISO string from backend
        end: event.fim,     // ISO string from backend
        extendedProps: {
            espacoComumId: event.espacoComumId,
            nomeAreaComum: event.nomeAreaComum,
            nomeUnidade: event.nomeUnidade,
            status: event.status
            // Add any other original event data you might need on click
        }
        // Potentially add color based on space or status here
    }));

    if (calendarInstance) {
        calendarInstance.destroy(); // Destroy previous instance if exists (e.g., on filter change)
    }

    calendarInstance = new FullCalendar.Calendar(domElements.calendarContainer, {
        locale: 'pt-br',
        initialView: 'dayGridMonth', // Standard month view
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' // Add more views if needed
        },
        events: fcEvents,
        eventClick: function(info) {
            // Handle event click - e.g., open modal with reservation details
            console.log('Event clicked:', info.event);
            showGlobalFeedback(\`Reserva clicada: \${info.event.title}\`, 'info');
            // Example: Open the reservation modal in read-only or edit mode
            // First, find the original full reservation DTO if needed, or use extendedProps.
            // This might require fetching full ReservaDto if extendedProps are not enough.
            // For now, just log it. If we want to edit, we need the full ReservaInputDto structure.
            // Let's try to open the modal for viewing/editing (if admin).
            // We need to fetch the full ReservaDto for editing.
            // For now, we don't have a "read-only" modal view distinct from edit.
            // So, if admin, open for edit. If user, maybe just show basic info.

            // This is a simplified example. In a real app, you'd fetch full details
            // or have enough in extendedProps to show a summary.
            // If the user is an admin, they might be able to edit it.
            // Let's assume for now clicking an event on the calendar could open it for editing if admin.
            // We would need to fetch the full ReservaDto for this.
            // For this subtask, let's make it simple: just log and show feedback.
            // A more complex action would be to fetch the full ReservaDto using info.event.id
            // and then call openReservaModal(fullReservaDtoForEdit);

            // Example: If you want to open the modal for editing (assuming admin)
            // This requires fetching the full details first.
            // For now, just an alert or console log.
            // alert(\`Evento: \${info.event.title}\nInício: \${info.event.start.toLocaleString()}\nFim: \${info.event.end?.toLocaleString()}\`);

            // Let's try to open the admin action modal to view details, or main modal if editable by current user
            const reservaId = info.event.id;
            if (isUserInRole("Sindico") || isUserInRole("Administrador")) {
                // Admins might want to edit. Fetch full details then open.
                // For now, we'll just show a generic prompt.
                // Or, find the original event from agendaEvents to pass more data.
                const originalEvent = agendaEvents.find(e => e.id === reservaId);
                if (originalEvent) {
                     // Simplification: open the main reserva modal if it's an admin or their own.
                     // This needs the full ReservaInputDto structure if we are to edit.
                     // The AgendaReservaDto is not enough.
                     // So, for now, this click will be informational.
                     // A "Detalhes" button on the event popover would be better.
                    console.log("Original event data:", originalEvent);
                    // If we had a function like showReservaDetailsModal(originalEvent), we'd call it.
                    // For now, let's assume clicking an event should allow an admin to potentially edit it
                    // by fetching the full data and then calling openReservaModal.
                    // This is a placeholder for that more complex interaction.
                    showGlobalFeedback(\`Detalhes: \${info.event.title} (\${info.event.startStr} - \${info.event.endStr})\`, 'info', 5000);
                }
            } else {
                // Non-admin user clicked an event.
                 showGlobalFeedback(\`Reserva: \${info.event.title} (\${info.event.startStr} - \${info.event.endStr})\`, 'info', 5000);
            }
        },
        datesSet: function(dateInfo) {
            const newMesAno = dateInfo.view.currentStart.toISOString().slice(0, 7);
            // Check if the month actually changed to avoid redundant loads if only view type changed
            const displayedMesAno = domElements.calendarContainer?.dataset.currentMesAnoForView;
            if (newMesAno !== displayedMesAno) {
                console.log(\`Calendar view changed to month: \${newMesAno}\`);
                loadAgendaView(newMesAno); // Call with the new month
            }
        }
        // Add other FullCalendar options as needed:
        // navLinks: true, // can click day/week names to navigate views
        // editable: true, // if you want drag-and-drop (requires backend updates)
        // dayMaxEvents: true, // allow "more" link when too many events
    });
    calendarInstance.render();
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
    if (!domElements.minhasReservasList) {
        console.error("Elemento #minhas-reservas-list não encontrado.");
        return;
    }
    domElements.minhasReservasList.innerHTML = '<p>Carregando suas reservas...</p>';
    showGlobalFeedback("Carregando suas reservas...", "info", 2000);

    try {
        const filtroPayload = {
            espacoComumId: domElements.filtroEspacoMinhas?.value || null,
            status: domElements.filtroStatusMinhas?.value || null,
            // Add PeriodoInicio, PeriodoFim if filters are added to HTML
        };
        // Clean null/empty values from payload if backend expects them to be absent
        Object.keys(filtroPayload).forEach(key => {
            if (filtroPayload[key] === null || filtroPayload[key] === '') {
                delete filtroPayload[key];
            }
        });
        const queryString = new URLSearchParams(filtroPayload).toString();

        const minhasReservas = await apiClient.get(\`/app/reservas/minhas?\${queryString}\`);

        if (!minhasReservas || minhasReservas.length === 0) {
            domElements.minhasReservasList.innerHTML = '<p>Você não possui nenhuma reserva no momento ou com os filtros selecionados.</p>';
            showGlobalFeedback("Nenhuma reserva sua encontrada.", "info");
            return;
        }

        renderMinhasReservasList(minhasReservas);
        showGlobalFeedback("Suas reservas foram carregadas.", "success");

    } catch (error) {
        console.error("Erro ao carregar minhas reservas:", error);
        const errorMessage = error.data?.message || error.message || "Falha ao carregar suas reservas.";
        domElements.minhasReservasList.innerHTML = \`<p class="error-message">\${errorMessage}</p>\`;
        showGlobalFeedback(errorMessage, "error");
    }
}

function renderMinhasReservasList(reservas) {
    if (!domElements.minhasReservasList) return;
    domElements.minhasReservasList.innerHTML = ''; // Clear loading/previous

    const ul = document.createElement('ul');
    ul.className = 'cv-list cards-list'; // Added cards-list for potential styling

    reservas.forEach(reserva => {
        const li = document.createElement('li');
        li.className = 'cv-list-item cv-card'; // Added cv-card
        li.dataset.reservaId = reserva.id;

        let actionsHtml = '';
        const canCancel = (reserva.status === 'Pendente' || reserva.status === 'Aprovada') && new Date(reserva.inicio) > new Date();

        if (canCancel) {
            actionsHtml += \`<button class="cv-button-outline btn-cancelar-minha-reserva" data-id="\${reserva.id}">Cancelar</button>\`;
        }
        // Button to view details/edit (if applicable for user)
        // actionsHtml += \`<button class="cv-button-outline btn-detalhes-minha-reserva" data-id="\${reserva.id}">Detalhes</button>\`;


        li.innerHTML = \`
            <div class="card-header">
                <h4>\${reserva.nomeAreaComum}</h4>
                <span class="status status-\${reserva.status?.toLowerCase()}">\${reserva.status}</span>
            </div>
            <div class="card-body">
                <p><strong>Data:</strong> \${new Date(reserva.inicio).toLocaleDateString()}</p>
                <p><strong>Horário:</strong> \${new Date(reserva.inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - \${new Date(reserva.fim).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                <p><strong>Solicitante:</strong> \${reserva.nomeUsuarioSolicitante}</p>
                \${reserva.observacoes ? \`<p><strong>Obs:</strong> \${reserva.observacoes}</p>\` : ''}
            </div>
            <div class="card-actions">
                \${actionsHtml}
            </div>
        \`;
        ul.appendChild(li);
    });
    domElements.minhasReservasList.appendChild(ul);

    // Add event listeners for the newly created buttons
    ul.querySelectorAll('.btn-cancelar-minha-reserva').forEach(button => {
        button.addEventListener('click', (e) => {
            const reservaId = e.target.dataset.id;
            openAdminActionModal(reservaId, 'user_self_cancel', 'Confirmar cancelamento da sua reserva?');
        });
    });
}

// --- Admin: "Todas Reservas" ---
async function loadTodasReservasAdmin() {
    if (!domElements.todasReservasList) {
        console.error("Elemento #todas-reservas-list não encontrado.");
        return;
    }
    if (!isUserInRole("Sindico") && !isUserInRole("Administrador")) {
        // This function should only be called if user is admin, but as a safeguard:
        domElements.todasReservasList.innerHTML = ''; // Clear if somehow visible to non-admin
        return;
    }

    domElements.todasReservasList.innerHTML = '<p>Carregando todas as reservas (admin)...</p>';
    showGlobalFeedback("Carregando todas as reservas...", "info", 2000);

    try {
        const filtroPayload = {
            espacoComumId: domElements.filtroEspacoAdmin?.value || null,
            unidadeId: domElements.filtroUnidadeAdminText?.value || null, // Assuming text input gives Guid or parsable ID
            status: domElements.filtroStatusAdmin?.value || null,
            // Add PeriodoInicio, PeriodoFim if date filters are added to admin HTML
        };
        // Clean null/empty/whitespace values from payload
        Object.keys(filtroPayload).forEach(key => {
            if (filtroPayload[key] === null || String(filtroPayload[key]).trim() === '') {
                delete filtroPayload[key];
            }
        });
        const queryString = new URLSearchParams(filtroPayload).toString();

        const todasReservas = await apiClient.get(\`/syndic/reservas/todas?\${queryString}\`);

        if (!todasReservas || todasReservas.length === 0) {
            domElements.todasReservasList.innerHTML = '<p>Nenhuma reserva encontrada com os filtros selecionados.</p>';
            showGlobalFeedback("Nenhuma reserva encontrada (admin).", "info");
            return;
        }

        renderTodasReservasListAdmin(todasReservas);
        showGlobalFeedback("Todas as reservas foram carregadas (admin).", "success");

    } catch (error) {
        console.error("Erro ao carregar todas as reservas (admin):", error);
        const errorMessage = error.data?.message || error.message || "Falha ao carregar todas as reservas (admin).";
        domElements.todasReservasList.innerHTML = \`<p class="error-message">\${errorMessage}</p>\`;
        showGlobalFeedback(errorMessage, "error");
    }
}

function renderTodasReservasListAdmin(reservas) {
    if (!domElements.todasReservasList) return;
    domElements.todasReservasList.innerHTML = ''; // Clear loading/previous

    const ul = document.createElement('ul');
    ul.className = 'cv-list cards-list admin-reservas-list';

    reservas.forEach(reserva => {
        const li = document.createElement('li');
        li.className = 'cv-list-item cv-card';
        li.dataset.reservaId = reserva.id;

        let adminActionsHtml = '';
        if (reserva.status === 'Pendente') {
            adminActionsHtml += \`<button class="cv-button-small btn-approve-reserva" data-id="\${reserva.id}">Aprovar</button> \`;
            adminActionsHtml += \`<button class="cv-button-small cv-button-dangeroutline btn-reject-reserva" data-id="\${reserva.id}">Rejeitar</button> \`;
        }
        if (reserva.status === 'Pendente' || reserva.status === 'Aprovada') {
             // Allow editing for Pendente or Aprovada (before start)
            if (new Date(reserva.inicio) > new Date()) {
                adminActionsHtml += \`<button class="cv-button-small cv-button-outline btn-edit-reserva" data-id="\${reserva.id}">Editar</button> \`;
            }
        }
        if (reserva.status !== 'Cancelada' && reserva.status !== 'Recusada' && reserva.status !== 'Bloqueada') {
             // Allow cancelling for non-finalized states (Bloqueada might be unblocked, not cancelled by admin this way)
            adminActionsHtml += \`<button class="cv-button-small cv-button-dangeroutline btn-admin-cancel-reserva" data-id="\${reserva.id}">Cancelar (Admin)</button>\`;
        }

        // For Bloqueada, an "Unblock" button might be more appropriate, handled by EspacosComunsController.
        // Or if we want to manage blocks here too:
        // if (reserva.status === 'Bloqueada') {
        //    adminActionsHtml += \`<button class="cv-button-small btn-unblock-reserva" data-id="\${reserva.id}">Desbloquear</button> \`;
        // }


        li.innerHTML = \`
            <div class="card-header">
                <h4>\${reserva.nomeAreaComum} (Unid: \${reserva.nomeUnidade || reserva.unidadeId})</h4>
                <span class="status status-\${reserva.status?.toLowerCase()}">\${reserva.status}</span>
            </div>
            <div class="card-body">
                <p><strong>Solicitante:</strong> \${reserva.nomeUsuarioSolicitante}</p>
                <p><strong>Data:</strong> \${new Date(reserva.inicio).toLocaleDateString()}</p>
                <p><strong>Horário:</strong> \${new Date(reserva.inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - \${new Date(reserva.fim).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                \${reserva.observacoes ? \`<p><strong>Obs:</strong> \${reserva.observacoes}</p>\` : ''}
                \${reserva.justificativaStatus ? \`<p><strong>Just./Status:</strong> \${reserva.justificativaStatus}</p>\` : ''}
                \${reserva.nomeAprovador ? \`<p><strong>Aprov./Edit. por:</strong> \${reserva.nomeAprovador}</p>\` : ''}
            </div>
            <div class="card-actions">
                \${adminActionsHtml || 'Nenhuma ação disponível'}
            </div>
        \`;
        ul.appendChild(li);
    });
    domElements.todasReservasList.appendChild(ul);

    // Add event listeners for the newly created admin buttons
    ul.querySelectorAll('.btn-approve-reserva').forEach(button => {
        button.addEventListener('click', (e) => {
            const reservaId = e.target.dataset.id;
            openAdminActionModal(reservaId, 'approve', 'Aprovar esta reserva?');
        });
    });
    ul.querySelectorAll('.btn-reject-reserva').forEach(button => {
        button.addEventListener('click', (e) => {
            const reservaId = e.target.dataset.id;
            openAdminActionModal(reservaId, 'reject', 'Rejeitar esta reserva? (Justificativa será obrigatória)');
        });
    });
    ul.querySelectorAll('.btn-edit-reserva').forEach(button => {
        button.addEventListener('click', (e) => {
            const reservaId = e.target.dataset.id;
            const reservaParaEditar = reservas.find(r => r.id === reservaId);
            if (reservaParaEditar) {
                openReservaModal(reservaParaEditar); // Open main modal for editing
            } else {
                showGlobalFeedback("Erro: Reserva não encontrada para edição.", "error");
            }
        });
    });
    ul.querySelectorAll('.btn-admin-cancel-reserva').forEach(button => {
        button.addEventListener('click', (e) => {
            const reservaId = e.target.dataset.id;
            openAdminActionModal(reservaId, 'admin_cancel', 'Cancelar esta reserva como Administrador? (Justificativa será obrigatória)');
        });
    });
}

// --- Reserva Modal & Form Submission ---
function openReservaModal(reserva = null) { // Pass reserva object for editing
    if(!domElements.reservaModal || !domElements.formNovaReserva) return;

    domElements.formNovaReserva.reset(); // Clear form
    if(domElements.reservaModalFeedback) {
       domElements.reservaModalFeedback.textContent = '';
       domElements.reservaModalFeedback.className = 'feedback-message';
    }
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

    if (payload.inicio && payload.fim && new Date(payload.fim) <= new Date(payload.inicio)) {
        if(domElements.reservaModalFeedback) {
            domElements.reservaModalFeedback.textContent = "A data/hora de término deve ser posterior à data/hora de início.";
            domElements.reservaModalFeedback.className = "feedback-message feedback-error";
        }
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
    if(domElements.adminActionModalFeedback) {
       domElements.adminActionModalFeedback.textContent = '';
       domElements.adminActionModalFeedback.className = 'feedback-message';
    }
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
        } else if (actionType === 'admin_cancel' || actionType === 'user_self_cancel') { // Modified condition
            const cancelPayload = { justificativa: justificativa };
            if (actionType === 'user_self_cancel' && !justificativa) {
                // For self-cancel, justification might be truly optional. API must handle null.
                // If API expects the DTO even if justificativa is null, then send { justificativa: null } or {}.
                // For now, send as is, assuming API handles optional justificativa in DTO.
            }
            // Assumes apiClient.deleteApi can send a JSON body with a DELETE request.
            // Standard fetch 'DELETE' may not support this directly without custom handling in apiClient.
            await apiClient.deleteApi(\`/app/reservas/\${reservaId}\`, cancelPayload); // Assumes deleteApi handles body
            showGlobalFeedback("Reserva cancelada com sucesso!", "success");
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
