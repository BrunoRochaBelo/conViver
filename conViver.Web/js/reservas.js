import apiClient from './apiClient.js';
import { requireAuth, getUserInfo, getUserRoles as getRoles } from './auth.js';
import { showGlobalFeedback } from './main.js';

let espacosComunsList = [];
let calendarioReservas = null;
let currentUserId = null;
let currentUserRoles = [];

document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    const userInfo = getUserInfo();
    if (userInfo && userInfo.id) {
        currentUserId = userInfo.id;
    } else {
        console.error("Não foi possível obter o ID do usuário.");
        showGlobalFeedback("Erro ao identificar usuário. Por favor, recarregue a página.", "error");
        return;
    }
    currentUserRoles = getRoles();
    await initReservasPage();
});

async function initReservasPage() {
    // DOM Elements
    const fabNovaReserva = document.getElementById('fab-nova-reserva');
    const modalNovaReserva = document.getElementById('modal-nova-reserva');
    const closeModalNovaReservaButton = modalNovaReserva.querySelector('.js-modal-nova-reserva-close');
    const formNovaReserva = document.getElementById('form-nova-reserva');
    const selectEspacoComumCalendario = document.getElementById('select-espaco-comum-calendario');
    const modalSelectEspaco = document.getElementById('modal-reserva-espaco');
    const linkTermosUso = document.getElementById('link-termos-uso-reserva');
    const modalTermosUso = document.getElementById('modal-termos-uso-reserva');
    const closeModalTermosUso = modalTermosUso.querySelector('.js-modal-termos-uso-close');
    const modalDetalheReserva = document.getElementById('modal-detalhe-reserva');
    const closeModalDetalheReserva = modalDetalheReserva.querySelector('.js-modal-detalhe-reserva-close');
    const btnCancelarReservaModal = document.getElementById('btn-cancelar-reserva-modal');
    const btnAprovarReservaModal = document.getElementById('btn-aprovar-reserva-modal');
    const btnRecusarReservaModal = document.getElementById('btn-recusar-reserva-modal');
    const btnEditarReservaModalTrigger = document.getElementById('btn-editar-reserva-modal-trigger');


    // Admin Espaços Comuns Elements
    const adminEspacosSection = document.getElementById('admin-espacos-section');
    const btnAdicionarEspaco = document.getElementById('btn-adicionar-espaco');
    const modalGerenciarEspaco = document.getElementById('modal-gerenciar-espaco-comum');
    const closeModalGerenciarEspaco = modalGerenciarEspaco.querySelector('.js-modal-gerenciar-espaco-close');
    const formGerenciarEspaco = document.getElementById('form-gerenciar-espaco-comum');


    if (fabNovaReserva) {
        fabNovaReserva.style.display = 'block';
        fabNovaReserva.addEventListener('click', () => {
            if (modalNovaReserva) {
                document.getElementById('modal-nova-reserva-title').textContent = 'Solicitar Nova Reserva';
                formNovaReserva.reset();
                document.getElementById('modal-reserva-id').value = '';
                document.getElementById('modal-reserva-unidade-sindico-group').style.display = 'none'; // Esconder campo de unidade do síndico
                document.getElementById('btn-submit-nova-reserva').textContent = 'Solicitar Reserva';
                modalNovaReserva.style.display = 'flex';
                if (selectEspacoComumCalendario.value) {
                    modalSelectEspaco.value = selectEspacoComumCalendario.value;
                    exibirInfoEspacoSelecionadoModal(selectEspacoComumCalendario.value);
                } else {
                     document.getElementById('modal-info-espaco-reserva').style.display = 'none';
                     document.getElementById('modal-reserva-taxa-info').textContent = '';
                }
            }
        });
    }

    if (closeModalNovaReservaButton && modalNovaReserva) {
        closeModalNovaReservaButton.addEventListener('click', () => modalNovaReserva.style.display = 'none');
    }
    if(modalNovaReserva) {
        window.addEventListener('click', (event) => { if (event.target === modalNovaReserva) modalNovaReserva.style.display = 'none'; });
    }
    if (formNovaReserva) {
        formNovaReserva.addEventListener('submit', handleSalvarReservaFormSubmit); // Renomeado para clareza
    }

    if (linkTermosUso && modalTermosUso) {
        linkTermosUso.addEventListener('click', (e) => { e.preventDefault(); modalTermosUso.style.display = 'flex'; });
    }
    if (closeModalTermosUso && modalTermosUso) {
        closeModalTermosUso.addEventListener('click', () => modalTermosUso.style.display = 'none');
        window.addEventListener('click', (event) => { if (event.target === modalTermosUso) modalTermosUso.style.display = 'none'; });
    }

    if (closeModalDetalheReserva && modalDetalheReserva) {
        closeModalDetalheReserva.addEventListener('click', () => modalDetalheReserva.style.display = 'none');
         window.addEventListener('click', (event) => { if (event.target === modalDetalheReserva) modalDetalheReserva.style.display = 'none'; });
    }
     if (btnCancelarReservaModal) { // Cancelamento geral (usuário ou síndico)
        btnCancelarReservaModal.addEventListener('click', async () => {
            const reservaId = btnCancelarReservaModal.dataset.reservaId;
            if (reservaId) {
                await handleCancelarReserva(reservaId);
                if(modalDetalheReserva) modalDetalheReserva.style.display = 'none';
            }
        });
    }
    // Listeners para botões de ação do Síndico no modal de detalhe
    if(btnAprovarReservaModal) btnAprovarReservaModal.addEventListener('click', handleAprovarReserva);
    if(btnRecusarReservaModal) btnRecusarReservaModal.addEventListener('click', handleRecusarReserva);
    if(btnEditarReservaModalTrigger) btnEditarReservaModalTrigger.addEventListener('click', abrirModalEditarReservaPeloSindico);


    if (selectEspacoComumCalendario) {
        selectEspacoComumCalendario.addEventListener('change', () => {
            exibirInfoEspacoSelecionadoCalendario(selectEspacoComumCalendario.value);
            if (calendarioReservas) calendarioReservas.refetchEvents();
        });
    }

    if (modalSelectEspaco) {
        modalSelectEspaco.addEventListener('change', () => {
            exibirInfoEspacoSelecionadoModal(modalSelectEspaco.value);
        });
    }

    if (currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador')) {
        if(adminEspacosSection) adminEspacosSection.style.display = 'block';
        if(btnAdicionarEspaco && modalGerenciarEspaco) {
            btnAdicionarEspaco.addEventListener('click', () => {
                document.getElementById('modal-gerenciar-espaco-title').textContent = 'Adicionar Novo Espaço Comum';
                formGerenciarEspaco.reset();
                document.getElementById('espaco-comum-id').value = '';
                modalGerenciarEspaco.style.display = 'flex';
            });
        }
        if(closeModalGerenciarEspaco && modalGerenciarEspaco){
            closeModalGerenciarEspaco.addEventListener('click', () => modalGerenciarEspaco.style.display = 'none');
            window.addEventListener('click', (event) => { if (event.target === modalGerenciarEspaco) modalGerenciarEspaco.style.display = 'none'; });
        }
        if(formGerenciarEspaco){
            formGerenciarEspaco.addEventListener('submit', handleSalvarEspacoComumForm);
        }
        await carregarListaAdminEspacosComuns();
    }

    await carregarEspacosComuns();
    initializeFullCalendar();
    await carregarMinhasReservas();
}

async function carregarEspacosComuns() {
    const selects = [
        document.getElementById('select-espaco-comum-calendario'),
        document.getElementById('modal-reserva-espaco')
    ];
    selects.forEach(sel => { if(sel) sel.innerHTML = '<option value="">Carregando...</option>';});
    try {
        const espacos = await apiClient.get('/api/v1/app/reservas/espacos-comuns');
        espacosComunsList = espacos;
        selects.forEach(sel => {
            if (!sel) return;
            const currentValue = sel.value;
            if(sel.id === 'select-espaco-comum-calendario'){
                 sel.innerHTML = '<option value="">Todos os Espaços</option>';
            } else {
                 sel.innerHTML = '<option value="">Selecione um espaço</option>';
            }
            if (espacos && espacos.length > 0) {
                espacos.forEach(espaco => {
                    const option = document.createElement('option');
                    option.value = espaco.id;
                    option.textContent = espaco.nome;
                    sel.appendChild(option);
                });
                 if (currentValue && espacos.some(e => e.id === currentValue)) {
                    sel.value = currentValue;
                }
            } else {
                 sel.innerHTML = `<option value="">Nenhum espaço disponível</option>`;
            }
        });
    } catch (error) {
        console.error("Erro ao carregar espaços comuns:", error);
        showGlobalFeedback('Falha ao carregar espaços comuns.', 'error');
        selects.forEach(sel => {if(sel) sel.innerHTML = '<option value="">Erro ao carregar</option>';});
    }
}

function exibirInfoEspacoSelecionadoCalendario(espacoId) { /* ... (sem alterações) ... */ }
function exibirInfoEspacoSelecionadoModal(espacoId) { /* ... (sem alterações) ... */ }

function initializeFullCalendar() {
    const calendarEl = document.getElementById('calendario-reservas');
    if (!calendarEl) {
        console.error("Elemento do calendário #calendario-reservas não encontrado.");
        return;
    }
    calendarioReservas = new FullCalendar.Calendar(calendarEl, {
        locale: 'pt-br',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' },
        events: async (fetchInfo, successCallback, failureCallback) => {
            try {
                const mesAno = new Date(fetchInfo.startStr).toISOString().slice(0, 7);
                const espacoIdFiltro = document.getElementById('select-espaco-comum-calendario').value;
                // Endpoint GetAgenda já recebe usuarioLogadoId implicitamente via token e retorna pertenceAoUsuarioLogado
                let agendaItens = await apiClient.get(`/api/v1/app/reservas/agenda`, { mesAno: mesAno });
                if (espacoIdFiltro) {
                    agendaItens = agendaItens.filter(item => item.espacoComumId === espacoIdFiltro);
                }
                const eventos = agendaItens.map(reserva => {
                    let color = 'var(--fc-event-bg-color, var(--current-primary-blue))'; // Default
                    let classNames = ['fc-event-main'];
                    if (reserva.status === 'Confirmada') { color = 'var(--current-semantic-success)'; classNames.push('fc-event-confirmed');}
                    if (reserva.status === 'Pendente') { color = 'var(--current-semantic-warning)'; classNames.push('fc-event-pending');}
                    if (new Date(reserva.inicio) < new Date()) classNames.push('fc-event-past');
                    if (reserva.pertenceAoUsuarioLogado) classNames.push('fc-event-user');
                    return {
                        id: reserva.id, title: reserva.tituloReserva, start: reserva.inicio, end: reserva.fim,
                        backgroundColor: color, borderColor: color, classNames: classNames,
                        extendedProps: { ...reserva }
                    };
                });
                successCallback(eventos);
            } catch (error) { /* ... (tratamento de erro) ... */ failureCallback(error); }
        },
        dateClick: (info) => {
            const modal = document.getElementById('modal-nova-reserva');
            document.getElementById('modal-nova-reserva-title').textContent = 'Solicitar Nova Reserva';
            document.getElementById('btn-submit-nova-reserva').textContent = 'Solicitar Reserva';
            document.getElementById('form-nova-reserva').reset();
            document.getElementById('modal-reserva-id').value = '';
            document.getElementById('modal-reserva-unidade-sindico-group').style.display = 'none';
            document.getElementById('modal-reserva-data').value = info.dateStr.split('T')[0];
            if(info.dateStr.includes('T')) {
                 document.getElementById('modal-reserva-inicio').value = info.dateStr.split('T')[1].substring(0,5);
            }
            const espacoFiltrado = document.getElementById('select-espaco-comum-calendario').value;
            const modalSelectEspaco = document.getElementById('modal-reserva-espaco');
            if (espacoFiltrado) {
                modalSelectEspaco.value = espacoFiltrado;
                exibirInfoEspacoSelecionadoModal(espacoFiltrado);
            } else {
                modalSelectEspaco.value = "";
                document.getElementById('modal-info-espaco-reserva').style.display = 'none';
                document.getElementById('modal-reserva-taxa-info').textContent = '';
            }
            modal.style.display = 'flex';
        },
        eventClick: (info) => {
            const modal = document.getElementById('modal-detalhe-reserva');
            const conteudoModal = document.getElementById('modal-detalhe-reserva-conteudo');
            const btnCancelar = document.getElementById('btn-cancelar-reserva-modal');
            const btnAprovar = document.getElementById('btn-aprovar-reserva-modal');
            const btnRecusar = document.getElementById('btn-recusar-reserva-modal');
            const btnEditarTrigger = document.getElementById('btn-editar-reserva-modal-trigger');
            const justificativaGroup = document.getElementById('modal-detalhe-reserva-sindico-justificativa-group');
            const justificativaTextarea = document.getElementById('modal-detalhe-reserva-sindico-justificativa');

            btnAprovar.style.display = 'none'; btnRecusar.style.display = 'none'; btnEditarTrigger.style.display = 'none'; btnCancelar.style.display = 'none';
            justificativaGroup.style.display = 'none'; justificativaTextarea.value = '';

            document.getElementById('modal-detalhe-reserva-title').textContent = `Detalhes: ${info.event.title}`;
            const props = info.event.extendedProps;
            conteudoModal.innerHTML = `
                <p><strong>Espaço:</strong> ${props.nomeEspacoComum || 'N/A'}</p>
                <p><strong>Unidade:</strong> ${props.nomeUnidade || 'N/A'}</p>
                <p><strong>Solicitante:</strong> ${props.nomeUsuarioSolicitante || 'N/A'}</p>
                <p><strong>Início:</strong> ${new Date(info.event.startStr).toLocaleString('pt-BR')}</p>
                <p><strong>Fim:</strong> ${new Date(info.event.endStr).toLocaleString('pt-BR')}</p>
                <p><strong>Status:</strong> ${props.status}</p>
                ${props.observacoes ? `<p><strong>Observações:</strong> ${props.observacoes}</p>` : ''}
                ${props.justificativaAprovacaoRecusa ? `<p><strong>Justificativa Síndico:</strong> ${props.justificativaAprovacaoRecusa}</p>` : ''}
            `;

            btnCancelar.dataset.reservaId = info.event.id;
            btnAprovar.dataset.reservaId = info.event.id;
            btnRecusar.dataset.reservaId = info.event.id;
            btnEditarTrigger.dataset.reservaOriginal = JSON.stringify(props); // Armazena todos os dados da reserva

            const isSindico = currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador');
            const podeCancelarUsuario = props.pertenceAoUsuarioLogado && (props.status === 'Pendente' || props.status === 'Confirmada') && new Date(info.event.startStr) > new Date();

            if (isSindico) {
                btnCancelar.style.display = 'inline-block'; // Síndico sempre pode tentar cancelar
                btnEditarTrigger.style.display = 'inline-block';
                if (props.status === 'Pendente') {
                    btnAprovar.style.display = 'inline-block';
                    btnRecusar.style.display = 'inline-block';
                    justificativaGroup.style.display = 'block'; // Para justificativa de recusa
                }
            } else if (podeCancelarUsuario) {
                const espaco = espacosComunsList.find(e => e.id === props.espacoComumId);
                let cancelamentoPermitido = true;
                if(espaco && espaco.antecedenciaMinimaCancelamentoHoras){
                    if(new Date().getTime() + espaco.antecedenciaMinimaCancelamentoHoras * 60 * 60 * 1000 > new Date(info.event.startStr).getTime()){
                        cancelamentoPermitido = false;
                        conteudoModal.innerHTML += `<p style="color:var(--current-semantic-error);">Prazo para cancelamento expirado (mínimo ${espaco.antecedenciaMinimaCancelamentoHoras}h de antecedência).</p>`;
                    }
                }
                if(cancelamentoPermitido){
                    btnCancelar.style.display = 'inline-block';
                }
            }
            modal.style.display = 'flex';
        }
    });
    calendarioReservas.render();
}

async function handleSalvarReservaFormSubmit(event) { // Renomeado e adaptado para criar/editar
    event.preventDefault();
    const form = event.target;
    const reservaId = form.reservaId.value; // modal-reserva-id
    const espacoComumId = form.espacoComumId.value;
    const data = form.data.value;
    const inicioHora = form.inicio.value;
    const fimHora = form.fim.value;
    const observacoes = form.observacoes.value;
    const termos = form.termos.checked;
    const unidadeIdInput = document.getElementById('modal-reserva-unidade-sindico'); // Campo para síndico
    let unidadeIdPayload = null;

    if (!termos && !reservaId) { // Termos só são obrigatórios para nova solicitação
        showGlobalFeedback('Você deve aceitar os termos de uso para solicitar a reserva.', 'warning');
        return;
    }
    if (!espacoComumId || !data || !inicioHora || !fimHora) {
        showGlobalFeedback('Por favor, preencha todos os campos obrigatórios.', 'warning');
        return;
    }

    const inicioDateTime = new Date(`${data}T${inicioHora}`);
    const fimDateTime = new Date(`${data}T${fimHora}`);

    if (fimDateTime <= inicioDateTime) {
        showGlobalFeedback('O horário de término deve ser após o horário de início.', 'warning');
        return;
    }

    const espaco = espacosComunsList.find(e => e.id === espacoComumId);
    if (espaco) { /* ... (validações de regras do espaço, como antes) ... */ }

    if (unidadeIdInput && unidadeIdInput.value && (currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador'))) {
        unidadeIdPayload = unidadeIdInput.value;
    }

    const payload = {
        espacoComumId: espacoComumId,
        inicio: inicioDateTime.toISOString(),
        fim: fimDateTime.toISOString(),
        observacoes: observacoes,
        unidadeId: unidadeIdPayload // Será null se não preenchido ou se usuário não for síndico
    };

    try {
        if (reservaId) { // Edição pelo Síndico
            showGlobalFeedback('Atualizando reserva...', 'info');
            await apiClient.put(`/api/v1/syndic/reservas/${reservaId}/editar`, payload);
            showGlobalFeedback('Reserva atualizada com sucesso!', 'success');
        } else { // Nova Solicitação
            showGlobalFeedback('Solicitando reserva...', 'info');
            const reservaCriada = await apiClient.post('/api/v1/app/reservas', payload);
            showGlobalFeedback(`Reserva para ${reservaCriada.nomeEspacoComum || 'o espaço'} solicitada com sucesso! Status: ${reservaCriada.status}`, 'success');
        }
        form.reset();
        if (modalNovaReserva) modalNovaReserva.style.display = 'none';
        await carregarMinhasReservas();
        if (calendarioReservas) calendarioReservas.refetchEvents();
    } catch (error) {
        console.error("Erro ao salvar reserva:", error);
        const errorMsg = error.data?.message || error.message || "Falha ao salvar reserva.";
        showGlobalFeedback(errorMsg, 'error');
    }
}

async function carregarMinhasReservas() { /* ... (sem alterações significativas, mas precisa do endpoint /minhas) ... */ }
async function handleCancelarReserva(reservaId) { /* ... (sem alterações) ... */ }

// --- Ações do Síndico no Modal de Detalhe da Reserva ---
async function handleAprovarReserva() {
    const reservaId = document.getElementById('btn-aprovar-reserva-modal').dataset.reservaId;
    if (!reservaId) return;
    try {
        showGlobalFeedback("Aprovando reserva...", "info");
        await apiClient.put(`/api/v1/syndic/reservas/${reservaId}/status`, { status: "Confirmada" });
        showGlobalFeedback("Reserva aprovada com sucesso!", "success");
        if(document.getElementById('modal-detalhe-reserva')) document.getElementById('modal-detalhe-reserva').style.display = 'none';
        if(calendarioReservas) calendarioReservas.refetchEvents();
        await carregarMinhasReservas();
    } catch (error) {
        showGlobalFeedback(error.data?.message || "Erro ao aprovar reserva.", "error");
    }
}

async function handleRecusarReserva() {
    const reservaId = document.getElementById('btn-recusar-reserva-modal').dataset.reservaId;
    const justificativa = document.getElementById('modal-detalhe-reserva-sindico-justificativa').value;
    if (!reservaId) return;
    if (!justificativa) {
        showGlobalFeedback("Por favor, forneça uma justificativa para recusar a reserva.", "warning");
        return;
    }
    try {
        showGlobalFeedback("Recusando reserva...", "info");
        await apiClient.put(`/api/v1/syndic/reservas/${reservaId}/status`, { status: "Recusada", justificativa: justificativa });
        showGlobalFeedback("Reserva recusada.", "success");
        if(document.getElementById('modal-detalhe-reserva')) document.getElementById('modal-detalhe-reserva').style.display = 'none';
        if(calendarioReservas) calendarioReservas.refetchEvents();
        await carregarMinhasReservas();
    } catch (error) {
        showGlobalFeedback(error.data?.message || "Erro ao recusar reserva.", "error");
    }
}

function abrirModalEditarReservaPeloSindico() {
    const reservaOriginalJson = document.getElementById('btn-editar-reserva-modal-trigger').dataset.reservaOriginal;
    if (!reservaOriginalJson) return;
    const reserva = JSON.parse(reservaOriginalJson);

    const modal = document.getElementById('modal-nova-reserva');
    const form = document.getElementById('form-nova-reserva');

    document.getElementById('modal-nova-reserva-title').textContent = 'Editar Reserva (Síndico)';
    form.reset();
    document.getElementById('modal-reserva-id').value = reserva.id; // ID da reserva para edição

    document.getElementById('modal-reserva-espaco').value = reserva.espacoComumId;
    exibirInfoEspacoSelecionadoModal(reserva.espacoComumId);
    document.getElementById('modal-reserva-data').value = reserva.inicio.split('T')[0];
    document.getElementById('modal-reserva-inicio').value = new Date(reserva.inicio).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-reserva-fim').value = new Date(reserva.fim).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-reserva-observacoes').value = reserva.observacoes || '';
    document.getElementById('modal-reserva-termos').checked = true; // Assume termos já aceitos ou não aplicável para edição de síndico
    document.getElementById('modal-reserva-termos').disabled = true; // Desabilita termos na edição

    const unidadeInputGroup = document.getElementById('modal-reserva-unidade-sindico-group');
    const unidadeInput = document.getElementById('modal-reserva-unidade-sindico');
    unidadeInputGroup.style.display = 'block'; // Mostrar campo de unidade para síndico
    unidadeInput.value = reserva.unidadeId; // Pré-preencher unidade

    document.getElementById('btn-submit-nova-reserva').textContent = 'Salvar Alterações';

    if(document.getElementById('modal-detalhe-reserva')) document.getElementById('modal-detalhe-reserva').style.display = 'none'; // Fecha modal de detalhes
    modal.style.display = 'flex';
}


// --- Funções de Administração de Espaços Comuns (Síndico) ---
async function carregarListaAdminEspacosComuns() { /* ... (sem alterações) ... */ }
async function abrirModalEditarEspaco(espacoId) { /* ... (sem alterações) ... */ }
async function handleSalvarEspacoComumForm(event) { /* ... (sem alterações) ... */ }
async function handleExcluirEspacoComum(espacoId, nomeEspaco) { /* ... (sem alterações) ... */ }

function setupEnquetesTab() { console.warn("setupEnquetesTab chamada de reservas.js"); }
function setupSolicitacoesTab() { console.warn("setupSolicitacoesTab chamada de reservas.js"); }

// Helper para popular selects, mantido para referência se necessário, mas carregarEspacosComuns já faz isso.
// function popularSelect(selectElement, optionsArray, valueField, textField, defaultOptionText) { ... }
