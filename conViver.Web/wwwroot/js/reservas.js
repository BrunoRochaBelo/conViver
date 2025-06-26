import apiClient from './apiClient.js';
import { requireAuth, getUserInfo, getUserRoles as getRoles } from './auth.js';
import { showGlobalFeedback } from './main.js';

let espacosComunsList = [];
let calendarioReservas = null;
let currentUserId = null;
let currentUserRoles = [];

// Variáveis para List View
let currentPageListView = 1;
let isLoadingListView = false;
let noMoreItemsListView = false;
const listViewItemsContainerId = 'list-view-reservas-items';
const listViewSentinelId = 'list-view-sentinel';

// DOM Elements - Views
let calendarioViewContainer, listViewContainer;
let btnViewCalendario, btnViewLista;
let tabAgendaBtn, tabMinhasBtn;
let contentAgenda, contentMinhas;
let openFilterReservasButton, filtrosModal, aplicarFiltrosModalButton;
let filtroMinhasEspaco, filtroMinhasStatus, filtroMinhasPeriodo, btnAplicarFiltrosMinhas;

// DOM Elements - List View Filters
let filtroEspacoLista, filtroStatusLista, filtroPeriodoLista, btnAplicarFiltrosLista;


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

    // Views e Toggle
    calendarioViewContainer = document.getElementById('calendario-view-container');
    listViewContainer = document.getElementById('list-view-container');
    btnViewCalendario = document.getElementById('btn-view-calendario');
    btnViewLista = document.getElementById('btn-view-lista');
    tabAgendaBtn = document.getElementById('tab-agenda');
    tabMinhasBtn = document.getElementById('tab-minhas-reservas');
    contentAgenda = document.getElementById('content-agenda');
    contentMinhas = document.getElementById('content-minhas-reservas');
    openFilterReservasButton = document.getElementById('open-filter-reservas-button');
    filtrosModal = document.getElementById('modal-filtros-reservas');
    aplicarFiltrosModalButton = document.getElementById('aplicar-filtros-modal-reservas');
    filtroMinhasEspaco = document.getElementById('filtro-minhas-espaco');
    filtroMinhasStatus = document.getElementById('filtro-minhas-status');
    filtroMinhasPeriodo = document.getElementById('filtro-minhas-periodo');
    btnAplicarFiltrosMinhas = document.getElementById('btn-aplicar-filtros-minhas');

    // Filtros da Lista
    filtroEspacoLista = document.getElementById('filtro-espaco-lista');
    filtroStatusLista = document.getElementById('filtro-status-lista');
    filtroPeriodoLista = document.getElementById('filtro-periodo-lista');
    btnAplicarFiltrosLista = document.getElementById('btn-aplicar-filtros-lista');

    if (btnViewCalendario && btnViewLista) {
        btnViewCalendario.addEventListener('click', () => toggleReservasView('calendario'));
        btnViewLista.addEventListener('click', () => toggleReservasView('lista'));
    }
    if(tabAgendaBtn && tabMinhasBtn && contentAgenda && contentMinhas) {
        tabAgendaBtn.addEventListener('click', () => switchTab('agenda'));
        tabMinhasBtn.addEventListener('click', () => switchTab('minhas'));
    }
    if(btnAplicarFiltrosLista) {
        btnAplicarFiltrosLista.addEventListener('click', () => {
            currentPageListView = 1;
            noMoreItemsListView = false;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        });
    }

    if(openFilterReservasButton && filtrosModal) {
        openFilterReservasButton.addEventListener('click', () => { filtrosModal.style.display = 'flex'; });
        filtrosModal.querySelectorAll('.js-modal-filtros-reservas-close').forEach(btn => btn.addEventListener('click', () => { filtrosModal.style.display = 'none'; }));
        window.addEventListener('click', (event) => { if(event.target === filtrosModal) filtrosModal.style.display = 'none'; });
    }
    if(aplicarFiltrosModalButton && filtrosModal) {
        aplicarFiltrosModalButton.addEventListener('click', () => {
            const val = document.getElementById('filtro-espaco-modal-reservas').value;
            if(document.getElementById('select-espaco-comum-calendario')) document.getElementById('select-espaco-comum-calendario').value = val;
            if(document.getElementById('filtro-espaco-lista')) document.getElementById('filtro-espaco-lista').value = val;
            filtrosModal.style.display = 'none';
            if(calendarioViewContainer && calendarioViewContainer.style.display !== 'none' && calendarioReservas) calendarioReservas.refetchEvents();
            if(listViewContainer && listViewContainer.style.display !== 'none') {
                currentPageListView = 1;
                noMoreItemsListView = false;
                const listItemsContainer = document.getElementById(listViewItemsContainerId);
                if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
                carregarReservasListView(currentPageListView, false);
            }
        });
    }

    if(btnAplicarFiltrosMinhas) {
        btnAplicarFiltrosMinhas.addEventListener('click', () => {
            carregarMinhasReservas();
        });
    }


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
                document.getElementById('modal-reserva-unidade-sindico-group').style.display = 'none';
                document.getElementById('btn-submit-nova-reserva').textContent = 'Solicitar Reserva';
                document.getElementById('modal-reserva-termos').disabled = false;
                modalNovaReserva.style.display = 'flex';

                let currentEspacoFilterValue = "";
                if (calendarioViewContainer && calendarioViewContainer.style.display !== 'none' && selectEspacoComumCalendario) {
                    currentEspacoFilterValue = selectEspacoComumCalendario.value;
                } else if (listViewContainer && listViewContainer.style.display !== 'none' && filtroEspacoLista) {
                    currentEspacoFilterValue = filtroEspacoLista.value;
                }

                if (currentEspacoFilterValue && modalSelectEspaco) {
                    modalSelectEspaco.value = currentEspacoFilterValue;
                    exibirInfoEspacoSelecionadoModal(currentEspacoFilterValue);
                } else {
                     document.getElementById('modal-info-espaco-reserva').style.display = 'none';
                     const taxaInfoDiv = document.getElementById('modal-reserva-taxa-info');
                     if(taxaInfoDiv) {
                        taxaInfoDiv.textContent = '';
                        taxaInfoDiv.style.display = 'none';
                     }
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
        formNovaReserva.addEventListener('submit', handleSalvarReservaFormSubmit);
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
     if (btnCancelarReservaModal) {
        btnCancelarReservaModal.addEventListener('click', async () => {
            const reservaId = btnCancelarReservaModal.dataset.reservaId;
            if (reservaId) {
                await handleCancelarReserva(reservaId);
                if(modalDetalheReserva) modalDetalheReserva.style.display = 'none';
            }
        });
    }
    if(btnAprovarReservaModal) btnAprovarReservaModal.addEventListener('click', handleAprovarReserva);
    if(btnRecusarReservaModal) btnRecusarReservaModal.addEventListener('click', handleRecusarReserva);
    if(btnEditarReservaModalTrigger) btnEditarReservaModalTrigger.addEventListener('click', abrirModalEditarReservaPeloSindico);


    if (selectEspacoComumCalendario) {
        selectEspacoComumCalendario.addEventListener('change', () => {
            exibirInfoEspacoSelecionadoCalendario(selectEspacoComumCalendario.value);
            if (calendarioReservas) calendarioReservas.refetchEvents();
        });
    }
     if (filtroEspacoLista) {
        filtroEspacoLista.addEventListener('change', () => {
            // O reload é feito pelo botão "Aplicar Filtros" da lista
        });
    }


    if (modalSelectEspaco) {
        modalSelectEspaco.addEventListener('change', () => {
            exibirInfoEspacoSelecionadoModal(modalSelectEspaco.value);
        });
    }

    const btnAplicarFiltrosSindicoCal = document.getElementById('btn-aplicar-filtros-calendario-sindico');
    if (btnAplicarFiltrosSindicoCal && calendarioReservas) {
        btnAplicarFiltrosSindicoCal.addEventListener('click', () => {
            if(calendarioReservas) calendarioReservas.refetchEvents();
        });
    }
    const filtrosAdminCal = document.getElementById('filtros-reservas-admin-calendario');
    if (filtrosAdminCal && (currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador'))) {
        filtrosAdminCal.style.display = 'flex';
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
    setupListViewObserver();
    await carregarMinhasReservas();

    switchTab('agenda');
    toggleReservasView('calendario');
}


async function carregarEspacosComuns() {
    const selects = [
        document.getElementById('select-espaco-comum-calendario'),
        document.getElementById('modal-reserva-espaco'),
        document.getElementById('filtro-espaco-lista'),
        document.getElementById('filtro-minhas-espaco'),
        document.getElementById('filtro-espaco-modal-reservas')
    ];
    selects.forEach(sel => { if(sel) sel.innerHTML = '<option value="">Carregando...</option>';});
    try {
        const espacos = await apiClient.get('/api/v1/app/reservas/espacos-comuns');
        espacosComunsList = espacos;
        selects.forEach(sel => {
            if (!sel) return;
            const currentValue = sel.value;
            if(sel.id === 'select-espaco-comum-calendario' || sel.id === 'filtro-espaco-lista' || sel.id === 'filtro-minhas-espaco' || sel.id === 'filtro-espaco-modal-reservas'){
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

// --- Toggle View ---
function toggleReservasView(viewToShow) {
    if (viewToShow === 'calendario') {
        if(calendarioViewContainer) calendarioViewContainer.style.display = 'block';
        if(listViewContainer) listViewContainer.style.display = 'none';
        if(btnViewCalendario) btnViewCalendario.classList.add('cv-button--primary');
        if(btnViewLista) btnViewLista.classList.remove('cv-button--primary');
        if (calendarioReservas) calendarioReservas.refetchEvents();
    } else if (viewToShow === 'lista') {
        if(calendarioViewContainer) calendarioViewContainer.style.display = 'none';
        if(listViewContainer) listViewContainer.style.display = 'block';
        if(btnViewLista) btnViewLista.classList.add('cv-button--primary');
        if(btnViewCalendario) btnViewCalendario.classList.remove('cv-button--primary');

        const listItemsContainer = document.getElementById(listViewItemsContainerId);
        if (listItemsContainer && !listItemsContainer.dataset.loadedOnce) {
            currentPageListView = 1;
            noMoreItemsListView = false;
            carregarReservasListView(currentPageListView, false);
            // listItemsContainer.dataset.loadedOnce = true; // Removido para sempre recarregar ao mudar para a aba, a menos que o botão de filtro seja usado
        } else if (listItemsContainer && listItemsContainer.innerHTML.trim() === '') { // Se já foi "loadedOnce" mas está vazio, recarrega
            currentPageListView = 1;
            noMoreItemsListView = false;
            carregarReservasListView(currentPageListView, false);
        }
    }
}

function switchTab(tab) {
    if(!tabAgendaBtn || !tabMinhasBtn || !contentAgenda || !contentMinhas) return;
    if(tab === 'agenda') {
        contentAgenda.style.display = 'block';
        contentMinhas.style.display = 'none';
        tabAgendaBtn.classList.add('active');
        tabMinhasBtn.classList.remove('active');
    } else {
        contentAgenda.style.display = 'none';
        contentMinhas.style.display = 'block';
        tabMinhasBtn.classList.add('active');
        tabAgendaBtn.classList.remove('active');
        carregarMinhasReservas();
    }
}

// --- List View Functions ---
async function carregarReservasListView(page, append = false) {
    if (isLoadingListView || (noMoreItemsListView && append)) return;
    isLoadingListView = true;

    const container = document.getElementById(listViewItemsContainerId);
    const sentinel = document.getElementById(listViewSentinelId);
    if (!container) {
        isLoadingListView = false;
        console.error("Container da lista de reservas não encontrado:", listViewItemsContainerId);
        return;
    }
    let loadingMsg = container.querySelector('.cv-loading-message');

    if (!append) {
        container.innerHTML = '';
        noMoreItemsListView = false;
        // container.dataset.loadedOnce = "true"; // Movido para após o primeiro carregamento bem-sucedido
    }

    if (!loadingMsg && (append || container.innerHTML === '')) {
        loadingMsg = document.createElement('p');
        loadingMsg.className = 'cv-loading-message';
        container.appendChild(loadingMsg);
    }
    if (loadingMsg) {
        loadingMsg.textContent = append ? 'Carregando mais reservas...' : 'Carregando lista de reservas...';
        loadingMsg.style.display = 'block';
    }
    if(sentinel) sentinel.style.display = 'block';


    try {
        const params = {
            pageNumber: page,
            pageSize: 10,
            espacoComumId: filtroEspacoLista.value || null,
            status: filtroStatusLista.value || null,
        };
        if (filtroPeriodoLista.value) {
            const [year, month] = filtroPeriodoLista.value.split('-');
            params.periodoInicio = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1)).toISOString();
            const fimDoMes = new Date(Date.UTC(parseInt(year), parseInt(month), 0));
            params.periodoFim = new Date(Date.UTC(fimDoMes.getFullYear(), fimDoMes.getMonth(), fimDoMes.getDate(), 23, 59, 59, 999)).toISOString();
        }

        // --- Mock Data (substituir pela chamada real) ---
        await new Promise(resolve => setTimeout(resolve, 700));
        const mockItems = [];
        const totalMockPages = 2; // Simula um total de páginas
        if (page <= totalMockPages) {
            for (let i = 0; i < 10; i++) {
                const statusRand = ['Confirmada', 'Pendente', 'CanceladaPeloUsuario'][Math.floor(Math.random() * 3)];
                const randomEspaco = espacosComunsList.length > 0 ? espacosComunsList[Math.floor(Math.random() * espacosComunsList.length)] : { id: `esp-mock-${i}`, nome: `Espaço Mock ${i+1}`};
                let itemDate = new Date();
                if (params.periodoInicio && params.periodoFim) {
                    const startPeriod = new Date(params.periodoInicio);
                    const endPeriod = new Date(params.periodoFim);
                    itemDate = new Date(startPeriod.getTime() + Math.random() * (endPeriod.getTime() - startPeriod.getTime()));
                } else {
                     itemDate.setDate(itemDate.getDate() + (i - 5 + (page-1)*10) );
                }
                mockItems.push({
                    id: `mock-${page}-${i}`,
                    nomeEspacoComum: randomEspaco.nome,
                    inicio: itemDate.toISOString(),
                    fim: new Date(itemDate.getTime() + (2 * 60 * 60 * 1000)).toISOString(),
                    status: params.status ? params.status : statusRand, // Usa filtro se disponível
                    nomeUnidade: `Unid. ${100 + i}`,
                    nomeUsuarioSolicitante: `Morador ${page}-${i}`,
                    observacoes: statusRand === 'Confirmada' ? 'Evento de teste mockado' : null,
                    pertenceAoUsuarioLogado: Math.random() > 0.5,
                    espacoComumId: params.espacoComumId ? params.espacoComumId : randomEspaco.id, // Usa filtro se disponível
                    unidadeId: `unid-mock-${100+i}`, usuarioId: `user-mock-${page}-${i}`, condominioId: `condo-mock-1`,
                    dataSolicitacao: new Date(itemDate.getTime() - (24*60*60*1000)).toISOString(),
                    taxaCobrada: Math.random() > 0.5 ? (Math.random()*50).toFixed(2) : null,
                    tituloParaMural: null, aprovadorId: null, nomeAprovador: null, justificativaAprovacaoRecusa: null,
                    updatedAt: itemDate.toISOString(),
                    permiteVisualizacaoPublicaDetalhes: randomEspaco.permiteVisualizacaoPublicaDetalhes || false,
                    tituloReserva: `Reserva ${randomEspaco.nome} - Unid. ${100+i}`
                });
            }
        }
        const items = mockItems; // No mock, a filtragem já foi feita "antes"
        const totalPages = items.length > 0 ? totalMockPages : 0;
        // --- Fim Mock Data ---

        if (loadingMsg) loadingMsg.style.display = 'none';

        if (items && items.length > 0) {
            if (!append) container.dataset.loadedOnce = "true"; // Marca como carregado após sucesso
            items.forEach(reserva => {
                const cardElement = renderCardReservaListView(reserva);
                container.appendChild(cardElement);
            });
            currentPageListView = page;
            if (page >= totalPages && (items.length < params.pageSize || items.length === 0) ) { // Ajuste para mock
                noMoreItemsListView = true;
                if(sentinel) sentinel.style.display = 'none';
                 const noMoreMsgElement = container.querySelector('.cv-info-message.fim-lista');
                 if (!noMoreMsgElement) {
                    const noMoreMsg = document.createElement('p');
                    noMoreMsg.className = 'cv-info-message fim-lista';
                    noMoreMsg.textContent = 'Fim das reservas.';
                    noMoreMsg.style.textAlign = 'center';
                    container.appendChild(noMoreMsg);
                 }
            }
        } else if (!append) {
            container.innerHTML = '<p class="cv-info-message" style="text-align:center;">Nenhuma reserva encontrada para os filtros aplicados.</p>';
            noMoreItemsListView = true; // Marca que não há mais itens para estes filtros
            if(sentinel) sentinel.style.display = 'none';
        } else {
             noMoreItemsListView = true;
             if(sentinel) sentinel.style.display = 'none';
             const noMoreMsgElement = container.querySelector('.cv-info-message.fim-lista');
             if (!noMoreMsgElement && container.innerHTML.trim() !== '') { // Só adiciona se não houver e se não estiver vazio
                const noMoreMsg = document.createElement('p');
                noMoreMsg.className = 'cv-info-message fim-lista';
                noMoreMsg.textContent = 'Fim das reservas.';
                noMoreMsg.style.textAlign = 'center';
                container.appendChild(noMoreMsg);
             }
        }
    } catch (error) {
        console.error("Erro ao carregar lista de reservas:", error);
        if (loadingMsg) loadingMsg.style.display = 'none';
        if (!append) {
            container.innerHTML = '<p class="cv-error-message" style="text-align:center;">Erro ao carregar reservas. Tente novamente.</p>';
        } else {
            showGlobalFeedback("Erro ao carregar mais reservas.", "error");
        }
    } finally {
        isLoadingListView = false;
    }
}

function renderCardReservaListView(reserva) {
    const card = document.createElement('div');
    card.className = 'cv-card';
    card.dataset.reservaId = reserva.id;

    const inicioFmt = new Date(reserva.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fimFmt = new Date(reserva.fim).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let statusClass = '';
    if (reserva.status === 'Confirmada') statusClass = 'cv-text-success';
    else if (reserva.status === 'Pendente') statusClass = 'cv-text-warning';
    else if (reserva.status.startsWith('Cancelada')) statusClass = 'cv-text-error';


    card.innerHTML = `
        <h3>${reserva.nomeEspacoComum}</h3>
        <p><strong>Data:</strong> ${inicioFmt} - ${fimFmt}</p>
        <p><strong>Status:</strong> <span class="${statusClass}">${reserva.status}</span></p>
        <p><strong>Solicitante:</strong> ${reserva.nomeUsuarioSolicitante || reserva.nomeUnidade || 'N/A'}</p>
        ${reserva.observacoes ? `<p><strong>Obs:</strong> ${reserva.observacoes}</p>` : ''}
        <div class="cv-form-actions">
            <button class="cv-button cv-button--secondary js-detalhe-reserva-lista">Ver Detalhes</button>
            ${ (reserva.pertenceAoUsuarioLogado && (reserva.status === 'Pendente' || reserva.status === 'Confirmada') && new Date(reserva.inicio) > new Date()) ?
                `<button class="cv-button cv-button--danger js-cancelar-reserva-lista">Cancelar</button>` : ''
            }
        </div>
    `;
    card.querySelector('.js-detalhe-reserva-lista')?.addEventListener('click', () => {
        const fakeEvent = {
            id: reserva.id,
            title: reserva.tituloReserva || reserva.nomeEspacoComum,
            startStr: reserva.inicio,
            endStr: reserva.fim,
            extendedProps: { ...reserva }
        };
        if (calendarioReservas && typeof calendarioReservas.options.eventClick === 'function') {
             calendarioReservas.options.eventClick({ event: fakeEvent });
        } else {
            console.warn("Função eventClick do FullCalendar não encontrada para simular clique.");
            abrirModalDetalhesComDados(reserva);
        }
    });
    card.querySelector('.js-cancelar-reserva-lista')?.addEventListener('click', async () => {
        if(confirm('Tem certeza que deseja cancelar esta reserva?')) {
            await handleCancelarReserva(reserva.id);
            currentPageListView = 1;
            noMoreItemsListView = false;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
            if(calendarioReservas) calendarioReservas.refetchEvents();
        }
    });
    return card;
}

function abrirModalDetalhesComDados(reserva) {
    const modal = document.getElementById('modal-detalhe-reserva');
    const conteudoModal = document.getElementById('modal-detalhe-reserva-conteudo');
    const btnCancelar = document.getElementById('btn-cancelar-reserva-modal');
    const btnAprovar = document.getElementById('btn-aprovar-reserva-modal');
    const btnRecusar = document.getElementById('btn-recusar-reserva-modal');
    const btnEditarTrigger = document.getElementById('btn-editar-reserva-modal-trigger');
    const justificativaGroup = document.getElementById('modal-detalhe-reserva-sindico-justificativa-group');
    const justificativaTextarea = document.getElementById('modal-detalhe-reserva-sindico-justificativa');

    if(!modal || !conteudoModal || !btnCancelar || !btnAprovar || !btnRecusar || !btnEditarTrigger || !justificativaGroup || !justificativaTextarea) {
        console.error("Elementos do modal de detalhe não encontrados.");
        return;
    }

    btnAprovar.style.display = 'none'; btnRecusar.style.display = 'none'; btnEditarTrigger.style.display = 'none'; btnCancelar.style.display = 'none';
    justificativaGroup.style.display = 'none'; justificativaTextarea.value = '';

    document.getElementById('modal-detalhe-reserva-title').textContent = `Detalhes: ${reserva.tituloReserva || reserva.nomeEspacoComum}`;
    conteudoModal.innerHTML = `
        <p><strong>Espaço:</strong> ${reserva.nomeEspacoComum || 'N/A'}</p>
        <p><strong>Unidade:</strong> ${reserva.nomeUnidade || 'N/A'}</p>
        <p><strong>Solicitante:</strong> ${reserva.nomeUsuarioSolicitante || 'N/A'}</p>
        <p><strong>Início:</strong> ${new Date(reserva.inicio).toLocaleString('pt-BR')}</p>
        <p><strong>Fim:</strong> ${new Date(reserva.fim).toLocaleString('pt-BR')}</p>
        <p><strong>Status:</strong> ${reserva.status}</p>
        ${reserva.observacoes ? `<p><strong>Observações:</strong> ${reserva.observacoes}</p>` : ''}
        ${reserva.justificativaAprovacaoRecusa ? `<p><strong>Justificativa Síndico:</strong> ${reserva.justificativaAprovacaoRecusa}</p>` : ''}
    `;
    btnCancelar.dataset.reservaId = reserva.id;
    btnAprovar.dataset.reservaId = reserva.id;
    btnRecusar.dataset.reservaId = reserva.id;
    btnEditarTrigger.dataset.reservaOriginal = JSON.stringify(reserva);

    const isSindico = currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador');
    const podeCancelarUsuario = reserva.pertenceAoUsuarioLogado && (reserva.status === 'Pendente' || reserva.status === 'Confirmada') && new Date(reserva.inicio) > new Date();

    if (isSindico) {
        btnCancelar.style.display = 'inline-block';
        btnEditarTrigger.style.display = 'inline-block';
        if (reserva.status === 'Pendente') {
            btnAprovar.style.display = 'inline-block';
            btnRecusar.style.display = 'inline-block';
            justificativaGroup.style.display = 'block';
        }
    } else if (podeCancelarUsuario) {
        const espaco = espacosComunsList.find(e => e.id === reserva.espacoComumId);
        let cancelamentoPermitido = true;
        if(espaco && espaco.antecedenciaMinimaCancelamentoHoras){
            if(new Date().getTime() + espaco.antecedenciaMinimaCancelamentoHoras * 60 * 60 * 1000 > new Date(reserva.inicio).getTime()){
                cancelamentoPermitido = false;
                conteudoModal.innerHTML += `<p class="cv-alert cv-alert--error">Prazo para cancelamento expirado (mínimo ${espaco.antecedenciaMinimaCancelamentoHoras}h de antecedência).</p>`;
            }
        }
        if(cancelamentoPermitido){
            btnCancelar.style.display = 'inline-block';
        }
    }
    modal.style.display = 'flex';
}


function setupListViewObserver() {
    const sentinel = document.getElementById(listViewSentinelId);
    if (!sentinel) {
        console.warn("Sentinel da List View não encontrado.");
        return;
    }
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !isLoadingListView && !noMoreItemsListView) {
            carregarReservasListView(currentPageListView + 1, true);
        }
    }, { threshold: 0.1 });
    observer.observe(sentinel);
}


function exibirInfoEspacoSelecionadoCalendario(espacoId) {
    const infoDiv = document.getElementById('info-espaco-selecionado-calendario');
    if (!infoDiv) return;
    const espaco = espacosComunsList.find(e => e.id === espacoId);
    if (espaco) {
        let html = `<h4>${espaco.nome}</h4>`;
        html += `<p><strong>Descrição:</strong> ${espaco.descricao || 'N/A'}</p>`;
        if(espaco.capacidade) html += `<p><strong>Capacidade:</strong> ${espaco.capacidade} pessoas</p>`;
        if(espaco.taxaReserva && espaco.taxaReserva > 0) html += `<p><strong>Taxa:</strong> R$ ${parseFloat(espaco.taxaReserva).toFixed(2)}</p>`;
        else html += `<p><strong>Taxa:</strong> Isento</p>`;
        if(espaco.horarioFuncionamentoInicio && espaco.horarioFuncionamentoFim) {
            html += `<p><strong>Horário:</strong> ${espaco.horarioFuncionamentoInicio} - ${espaco.horarioFuncionamentoFim}</p>`;
        }
        infoDiv.innerHTML = html;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}
function exibirInfoEspacoSelecionadoModal(espacoId) {
    const infoDivModal = document.getElementById('modal-info-espaco-reserva');
    const taxaInfoDivModal = document.getElementById('modal-reserva-taxa-info');
    if (!infoDivModal || !taxaInfoDivModal) return;

    const espaco = espacosComunsList.find(e => e.id === espacoId);
    if (espaco) {
        let html = `<h5>Regras para ${espaco.nome}:</h5><ul>`;
        if(espaco.horarioFuncionamentoInicio && espaco.horarioFuncionamentoFim) html += `<li>Horário: ${espaco.horarioFuncionamentoInicio} - ${espaco.horarioFuncionamentoFim}</li>`;
        if(espaco.tempoMinimoReservaMinutos) html += `<li>Mínimo: ${espaco.tempoMinimoReservaMinutos} min</li>`;
        if(espaco.tempoMaximoReservaMinutos) html += `<li>Máximo: ${espaco.tempoMaximoReservaMinutos} min</li>`;
        if(espaco.antecedenciaMaximaReservaDias) html += `<li>Antecedência Máx.: ${espaco.antecedenciaMaximaReservaDias} dias</li>`;
        if(espaco.limiteReservasPorUnidadeMes) html += `<li>Limite: ${espaco.limiteReservasPorUnidadeMes} por unidade/mês</li>`;
        html += `<li>Requer Aprovação: ${espaco.requerAprovacaoSindico ? 'Sim' : 'Não'}</li>`;
        html += `</ul>`;
        infoDivModal.innerHTML = html;
        infoDivModal.style.display = 'block';

        if (espaco.taxaReserva && espaco.taxaReserva > 0) {
            taxaInfoDivModal.textContent = `Taxa de Reserva: R$ ${parseFloat(espaco.taxaReserva).toFixed(2)}`;
            taxaInfoDivModal.style.display = 'block';
        } else {
            taxaInfoDivModal.textContent = 'Taxa de Reserva: Isento';
            taxaInfoDivModal.style.display = 'block';
        }
    } else {
        infoDivModal.style.display = 'none';
        taxaInfoDivModal.style.display = 'none';
    }
}

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
        buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista FC' },
        events: async (fetchInfo, successCallback, failureCallback) => {
            try {
                const mesAno = new Date(fetchInfo.startStr).toISOString().slice(0, 7);

                const params = { mesAno: mesAno };
                const espacoIdFiltro = document.getElementById('select-espaco-comum-calendario').value;
                if (espacoIdFiltro) params.espacoComumId = espacoIdFiltro;

                const filtroStatusCal = document.getElementById('filtro-status-reserva-calendario').value;
                const filtroUnidadeCal = document.getElementById('filtro-unidade-reserva-calendario').value;
                if (currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador')) {
                    if (filtroStatusCal) params.status = filtroStatusCal;
                    if (filtroUnidadeCal) params.unidadeId = filtroUnidadeCal;
                }


                let agendaItens = await apiClient.get(`/api/v1/app/reservas/agenda`, params);

                const eventos = agendaItens.map(reserva => {
                    let color = 'var(--fc-event-bg-color, var(--current-primary-blue))';
                    let classNames = ['fc-event-main'];
                    if (reserva.status === 'Confirmada') { color = 'var(--current-semantic-success)'; classNames.push('fc-event-confirmed');}
                    if (reserva.status === 'Pendente') { color = 'var(--current-semantic-warning)'; classNames.push('fc-event-pending');}
                    if (new Date(reserva.inicio) < new Date()) classNames.push('fc-event-past');
                    if (reserva.pertenceAoUsuarioLogado) classNames.push('fc-event-user');

                    let eventTitle = reserva.tituloReserva;
                    if (reserva.nomeUnidade && ((currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador')) || reserva.permiteVisualizacaoPublicaDetalhes)) {
                         // O DTO já deve vir com o título formatado (ex: "Salão - Unid 101")
                    }

                    return {
                        id: reserva.id, title: eventTitle, start: reserva.inicio, end: reserva.fim,
                        backgroundColor: color, borderColor: color, classNames: classNames,
                        extendedProps: { ...reserva }
                    };
                });
                successCallback(eventos);
            } catch (error) {
                console.error("Erro ao buscar eventos do calendário:", error);
                showGlobalFeedback("Falha ao carregar agenda.", "error");
                failureCallback(error);
            }
        },
        dateClick: (info) => {
            const modal = document.getElementById('modal-nova-reserva');
            document.getElementById('modal-nova-reserva-title').textContent = 'Solicitar Nova Reserva';
            document.getElementById('btn-submit-nova-reserva').textContent = 'Solicitar Reserva';
            document.getElementById('form-nova-reserva').reset();
            document.getElementById('modal-reserva-id').value = '';
            document.getElementById('modal-reserva-unidade-sindico-group').style.display = 'none';
            document.getElementById('modal-reserva-termos').disabled = false;
            document.getElementById('modal-reserva-data').value = info.dateStr.split('T')[0];
            if(info.dateStr.includes('T') && info.dateStr.split('T')[1]) {
                 document.getElementById('modal-reserva-inicio').value = info.dateStr.split('T')[1].substring(0,5);
            } else {
                 document.getElementById('modal-reserva-inicio').value = '';
            }
            const espacoFiltrado = document.getElementById('select-espaco-comum-calendario').value;
            const modalSelectEspaco = document.getElementById('modal-reserva-espaco');
            if (espacoFiltrado) {
                modalSelectEspaco.value = espacoFiltrado;
                exibirInfoEspacoSelecionadoModal(espacoFiltrado);
            } else {
                modalSelectEspaco.value = "";
                document.getElementById('modal-info-espaco-reserva').style.display = 'none';
                const taxaInfoDiv = document.getElementById('modal-reserva-taxa-info');
                if(taxaInfoDiv) {
                    taxaInfoDiv.textContent = '';
                    taxaInfoDiv.style.display = 'none';
                }
            }
            modal.style.display = 'flex';
        },
        eventClick: (clickInfo) => {
            const modal = document.getElementById('modal-detalhe-reserva');
            if (!modal) return;
            abrirModalDetalhesComDados(clickInfo.event.extendedProps);
        }
    });
    calendarioReservas.render();
}

async function handleSalvarReservaFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const reservaId = form.reservaId.value;
    const espacoComumId = form.espacoComumId.value;
    const data = form.data.value;
    const inicioHora = form.inicio.value;
    const fimHora = form.fim.value;
    const observacoes = form.observacoes.value;
    const termosCheckbox = document.getElementById('modal-reserva-termos');
    const termos = termosCheckbox.checked;
    const unidadeIdInput = document.getElementById('modal-reserva-unidade-sindico');
    let unidadeIdPayload = null;

    if (!termos && !reservaId && !termosCheckbox.disabled) {
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
    if (espaco) {
        if (espaco.horarioFuncionamentoInicio && espaco.horarioFuncionamentoFim) {
            const inicioFunc = espaco.horarioFuncionamentoInicio;
            const fimFunc = espaco.horarioFuncionamentoFim;
            if (inicioHora < inicioFunc || fimHora > fimFunc || inicioHora >= fimFunc ) {
                 showGlobalFeedback(`Reserva fora do horário de funcionamento do espaço (${inicioFunc} - ${fimFunc}).`, 'error');
                 return;
            }
        }
        const duracaoMinutos = (fimDateTime.getTime() - inicioDateTime.getTime()) / (1000 * 60);
        if (espaco.tempoMinimoReservaMinutos && duracaoMinutos < espaco.tempoMinimoReservaMinutos) {
            showGlobalFeedback(`A duração mínima da reserva é de ${espaco.tempoMinimoReservaMinutos} minutos.`, 'error');
            return;
        }
        if (espaco.tempoMaximoReservaMinutos && duracaoMinutos > espaco.tempoMaximoReservaMinutos) {
            showGlobalFeedback(`A duração máxima da reserva é de ${espaco.tempoMaximoReservaMinutos} minutos.`, 'error');
            return;
        }
        if (!reservaId && espaco.antecedenciaMaximaReservaDias) {
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            const dataReserva = new Date(inicioDateTime);
            dataReserva.setHours(0,0,0,0);
            const diffDias = (dataReserva.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDias > espaco.antecedenciaMaximaReservaDias) {
                showGlobalFeedback(`Só é possível reservar com até ${espaco.antecedenciaMaximaReservaDias} dias de antecedência.`, 'error');
                return;
            }
        }
     }

    if (unidadeIdInput && unidadeIdInput.value && (currentUserRoles.includes('Sindico') || currentUserRoles.includes('Administrador'))) {
        unidadeIdPayload = unidadeIdInput.value;
    }

    const payload = {
        espacoComumId: espacoComumId,
        inicio: inicioDateTime.toISOString(),
        fim: fimDateTime.toISOString(),
        observacoes: observacoes,
        unidadeId: unidadeIdPayload,
        tituloParaMural: form.elements['tituloParaMural'] ? form.elements['tituloParaMural'].value : null
    };

    try {
        const modalNovaReserva = document.getElementById('modal-nova-reserva');
        if (reservaId) {
            showGlobalFeedback('Atualizando reserva...', 'info');
            await apiClient.put(`/api/v1/syndic/reservas/${reservaId}/editar`, payload);
            showGlobalFeedback('Reserva atualizada com sucesso!', 'success');
        } else {
            showGlobalFeedback('Solicitando reserva...', 'info');
            const reservaCriada = await apiClient.post('/api/v1/app/reservas', payload);
            showGlobalFeedback(`Reserva para ${reservaCriada.nomeEspacoComum || 'o espaço'} solicitada com sucesso! Status: ${reservaCriada.status}`, 'success');
        }
        form.reset();
        if (modalNovaReserva) modalNovaReserva.style.display = 'none';
        await carregarMinhasReservas();
        if (calendarioReservas) calendarioReservas.refetchEvents();
        if (listViewContainer && listViewContainer.style.display !== 'none') {
            currentPageListView = 1;
            noMoreItemsListView = false;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        }
    } catch (error) {
        console.error("Erro ao salvar reserva:", error);
        const errorMsg = error.data?.message || error.message || "Falha ao salvar reserva.";
        showGlobalFeedback(errorMsg, 'error');
    }
}

async function carregarMinhasReservas() {
    const listElement = document.getElementById('minhas-reservas-list');
    if (!listElement) return;
    listElement.innerHTML = '<p class="cv-loading-message">Carregando suas reservas...</p>';
    try {
        const params = {};
        if(filtroMinhasEspaco && filtroMinhasEspaco.value) params.espacoComumId = filtroMinhasEspaco.value;
        if(filtroMinhasStatus && filtroMinhasStatus.value) params.status = filtroMinhasStatus.value;
        if(filtroMinhasPeriodo && filtroMinhasPeriodo.value) {
            const [y,m] = filtroMinhasPeriodo.value.split('-');
            params.periodoInicio = new Date(Date.UTC(parseInt(y), parseInt(m)-1,1)).toISOString();
            const fim = new Date(Date.UTC(parseInt(y), parseInt(m),0));
            params.periodoFim = new Date(Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate(),23,59,59,999)).toISOString();
        }
        const minhasReservas = await apiClient.get('/api/v1/app/reservas/minhas', params);
        if (minhasReservas && minhasReservas.length > 0) {
            listElement.innerHTML = '';
            minhasReservas.forEach(reserva => {
                const card = renderCardReservaListView(reserva);
                listElement.appendChild(card);
            });
        } else {
            listElement.innerHTML = '<p class="cv-info-message" style="text-align:center;">Você ainda não possui reservas.</p>';
        }
    } catch (error) {
        console.error("Erro ao carregar minhas reservas:", error);
        listElement.innerHTML = '<p class="cv-error-message" style="text-align:center;">Erro ao carregar suas reservas.</p>';
        showGlobalFeedback("Falha ao carregar suas reservas.", "error");
    }
 }
async function handleCancelarReserva(reservaId) {
    if(!confirm("Tem certeza que deseja cancelar esta reserva?")) return;
    try {
        showGlobalFeedback("Cancelando reserva...", "info");
        await apiClient.delete(`/api/v1/app/reservas/${reservaId}`);
        showGlobalFeedback("Reserva cancelada com sucesso!", "success");
        await carregarMinhasReservas();
        if (calendarioReservas) calendarioReservas.refetchEvents();
        if (listViewContainer && listViewContainer.style.display !== 'none') {
            currentPageListView = 1;
            noMoreItemsListView = false;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        }
    } catch (error) {
        console.error("Erro ao cancelar reserva:", error);
        const errorMsg = error.data?.message || "Falha ao cancelar reserva.";
        showGlobalFeedback(errorMsg, "error");
    }
 }

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
         if (listViewContainer && listViewContainer.style.display !== 'none') {
            currentPageListView = 1;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        }
    } catch (error) {
        showGlobalFeedback(error.data?.message || "Erro ao aprovar reserva.", "error");
    }
}

async function handleRecusarReserva() {
    const reservaId = document.getElementById('btn-recusar-reserva-modal').dataset.reservaId;
    const justificativaInput = document.getElementById('modal-detalhe-reserva-sindico-justificativa');
    if (!justificativaInput) { console.error("Campo de justificativa não encontrado"); return; }
    const justificativa = justificativaInput.value;

    if (!reservaId) return;
    if (!justificativa) {
        showGlobalFeedback("Por favor, forneça uma justificativa para recusar a reserva.", "warning");
        justificativaInput.focus();
        return;
    }
    try {
        showGlobalFeedback("Recusando reserva...", "info");
        await apiClient.put(`/api/v1/syndic/reservas/${reservaId}/status`, { status: "Recusada", justificativa: justificativa });
        showGlobalFeedback("Reserva recusada.", "success");
        if(document.getElementById('modal-detalhe-reserva')) document.getElementById('modal-detalhe-reserva').style.display = 'none';
        if(calendarioReservas) calendarioReservas.refetchEvents();
        await carregarMinhasReservas();
        if (listViewContainer && listViewContainer.style.display !== 'none') {
            currentPageListView = 1;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        }
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
    if (!modal || !form) return;

    document.getElementById('modal-nova-reserva-title').textContent = 'Editar Reserva (Síndico)';
    form.reset();
    document.getElementById('modal-reserva-id').value = reserva.id;

    document.getElementById('modal-reserva-espaco').value = reserva.espacoComumId;
    exibirInfoEspacoSelecionadoModal(reserva.espacoComumId);
    document.getElementById('modal-reserva-data').value = reserva.inicio.split('T')[0];
    document.getElementById('modal-reserva-inicio').value = new Date(reserva.inicio).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-reserva-fim').value = new Date(reserva.fim).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('modal-reserva-observacoes').value = reserva.observacoes || '';
    const termosCheckbox = document.getElementById('modal-reserva-termos');
    termosCheckbox.checked = true;
    termosCheckbox.disabled = true;

    const unidadeInputGroup = document.getElementById('modal-reserva-unidade-sindico-group');
    const unidadeInput = document.getElementById('modal-reserva-unidade-sindico');
    if (unidadeInputGroup) unidadeInputGroup.style.display = 'block';
    if (unidadeInput) unidadeInput.value = reserva.unidadeId;

    document.getElementById('btn-submit-nova-reserva').textContent = 'Salvar Alterações';

    if(document.getElementById('modal-detalhe-reserva')) document.getElementById('modal-detalhe-reserva').style.display = 'none';
    modal.style.display = 'flex';
}


// --- Funções de Administração de Espaços Comuns (Síndico) ---
async function carregarListaAdminEspacosComuns() {
    const tbody = document.getElementById('admin-espacos-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="cv-loading-message">Carregando espaços...</td></tr>';
    try {
        // Reutiliza a lista já carregada, se disponível, ou busca novamente
        if (!espacosComunsList || espacosComunsList.length === 0) {
            espacosComunsList = await apiClient.get('/api/v1/syndic/reservas/espacos-comuns'); // Endpoint de síndico para obter todos os detalhes
        }

        if (espacosComunsList && espacosComunsList.length > 0) {
            tbody.innerHTML = '';
            espacosComunsList.forEach(espaco => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${espaco.nome}</td>
                    <td>${espaco.capacidade || 'N/A'}</td>
                    <td>${espaco.taxaReserva ? `R$ ${parseFloat(espaco.taxaReserva).toFixed(2)}` : 'Isento'}</td>
                    <td>${espaco.horarioFuncionamentoInicio || '--:--'} - ${espaco.horarioFuncionamentoFim || '--:--'}</td>
                    <td class="actions">
                        <a href="#" class="js-edit-espaco" data-id="${espaco.id}" title="Editar"><img src="../assets/icons/edit.svg" alt="Editar"></a>
                        <a href="#" class="js-delete-espaco" data-id="${espaco.id}" data-nome="${espaco.nome}" title="Excluir"><img src="../assets/icons/delete.svg" alt="Excluir"></a>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            document.querySelectorAll('.js-edit-espaco').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    abrirModalEditarEspaco(e.currentTarget.dataset.id);
                });
            });
            document.querySelectorAll('.js-delete-espaco').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleExcluirEspacoComum(e.currentTarget.dataset.id, e.currentTarget.dataset.nome);
                });
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="cv-info-message" style="text-align:center;">Nenhum espaço comum cadastrado.</td></tr>';
        }
    } catch (error) {
        console.error("Erro ao carregar lista de espaços comuns:", error);
        tbody.innerHTML = '<tr><td colspan="5" class="cv-error-message" style="text-align:center;">Erro ao carregar espaços.</td></tr>';
        showGlobalFeedback("Falha ao carregar espaços comuns.", "error");
    }
}

async function abrirModalEditarEspaco(espacoId) {
    const espaco = espacosComunsList.find(e => e.id === espacoId);
    if (!espaco) {
        showGlobalFeedback("Espaço comum não encontrado para edição.", "error");
        return;
    }
    const modal = document.getElementById('modal-gerenciar-espaco-comum');
    const form = document.getElementById('form-gerenciar-espaco-comum');
    if (!modal || !form) return;

    document.getElementById('modal-gerenciar-espaco-title').textContent = 'Editar Espaço Comum';
    form.reset();
    document.getElementById('espaco-comum-id').value = espaco.id;
    document.getElementById('espaco-nome').value = espaco.nome;
    document.getElementById('espaco-descricao').value = espaco.descricao || '';
    document.getElementById('espaco-capacidade').value = espaco.capacidade || '';
    document.getElementById('espaco-taxa').value = espaco.taxaReserva || '';
    document.getElementById('espaco-horario-inicio').value = espaco.horarioFuncionamentoInicio || '';
    document.getElementById('espaco-horario-fim').value = espaco.horarioFuncionamentoFim || '';
    document.getElementById('espaco-tempo-min').value = espaco.tempoMinimoReservaMinutos || '';
    document.getElementById('espaco-tempo-max').value = espaco.tempoMaximoReservaMinutos || '';
    document.getElementById('espaco-antecedencia-max-dias').value = espaco.antecedenciaMaximaReservaDias || '';
    document.getElementById('espaco-antecedencia-min-cancel-horas').value = espaco.antecedenciaMinimaCancelamentoHoras || '';
    document.getElementById('espaco-limite-mes').value = espaco.limiteReservasPorUnidadeMes || '';
    document.getElementById('espaco-dias-indisponiveis').value = espaco.diasIndisponiveis || '';
    document.getElementById('espaco-requer-aprovacao').checked = espaco.requerAprovacaoSindico;
    document.getElementById('espaco-exibir-mural').checked = espaco.exibirNoMural;
    document.getElementById('espaco-permite-visualizacao-publica').checked = espaco.permiteVisualizacaoPublicaDetalhes;

    modal.style.display = 'flex';
}

async function handleSalvarEspacoComumForm(event) {
    event.preventDefault();
    const form = event.target;
    const espacoId = form.id.value;
    const espacoData = {
        id: espacoId || null, // Envia null se for criação, para o backend gerar
        nome: form.nome.value,
        descricao: form.descricao.value,
        capacidade: form.capacidade.value ? parseInt(form.capacidade.value) : null,
        taxaReserva: form.taxaReserva.value ? parseFloat(form.taxaReserva.value) : null,
        horarioFuncionamentoInicio: form.horarioFuncionamentoInicio.value || null,
        horarioFuncionamentoFim: form.horarioFuncionamentoFim.value || null,
        tempoMinimoReservaMinutos: form.tempoMinimoReservaMinutos.value ? parseInt(form.tempoMinimoReservaMinutos.value) : null,
        tempoMaximoReservaMinutos: form.tempoMaximoReservaMinutos.value ? parseInt(form.tempoMaximoReservaMinutos.value) : null,
        antecedenciaMaximaReservaDias: form.antecedenciaMaximaReservaDias.value ? parseInt(form.antecedenciaMaximaReservaDias.value) : null,
        antecedenciaMinimaCancelamentoHoras: form.antecedenciaMinimaCancelamentoHoras.value ? parseInt(form.antecedenciaMinimaCancelamentoHoras.value) : null,
        limiteReservasPorUnidadeMes: form.limiteReservasPorUnidadeMes.value ? parseInt(form.limiteReservasPorUnidadeMes.value) : null,
        diasIndisponiveis: form.diasIndisponiveis.value || null,
        requerAprovacaoSindico: form.requerAprovacaoSindico.checked,
        exibirNoMural: form.exibirNoMural.checked,
        permiteVisualizacaoPublicaDetalhes: form.permiteVisualizacaoPublicaDetalhes.checked
    };

    // Pequena validação para horários
    if (espacoData.horarioFuncionamentoInicio && !espacoData.horarioFuncionamentoFim) {
        showGlobalFeedback("Se o horário de início é fornecido, o de fim também deve ser.", "warning"); return;
    }
    if (!espacoData.horarioFuncionamentoInicio && espacoData.horarioFuncionamentoFim) {
        showGlobalFeedback("Se o horário de fim é fornecido, o de início também deve ser.", "warning"); return;
    }
    if (espacoData.horarioFuncionamentoInicio && espacoData.horarioFuncionamentoFim && espacoData.horarioFuncionamentoInicio >= espacoData.horarioFuncionamentoFim) {
         showGlobalFeedback("O horário de funcionamento de início deve ser anterior ao de fim.", "warning"); return;
    }


    try {
        showGlobalFeedback(espacoId ? 'Atualizando espaço...' : 'Criando espaço...', 'info');
        let espacoSalvo;
        if (espacoId) {
            espacoSalvo = await apiClient.put(`/api/v1/syndic/reservas/espacos-comuns/${espacoId}`, espacoData);
        } else {
            espacoSalvo = await apiClient.post('/api/v1/syndic/reservas/espacos-comuns', espacoData);
        }
        showGlobalFeedback(`Espaço comum "${espacoSalvo.nome}" salvo com sucesso!`, 'success');
        document.getElementById('modal-gerenciar-espaco-comum').style.display = 'none';
        form.reset();
        // Forçar recarregamento da lista de espaços comuns e dos selects
        espacosComunsList = []; // Limpa cache local para forçar recarga
        await carregarEspacosComuns();
        await carregarListaAdminEspacosComuns();
        if(calendarioReservas) calendarioReservas.refetchEvents(); // Atualiza calendário pois regras podem ter mudado
        if (listViewContainer && listViewContainer.style.display !== 'none') { // Atualiza lista de reservas
            currentPageListView = 1;
            noMoreItemsListView = false;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        }

    } catch (error) {
        console.error("Erro ao salvar espaço comum:", error);
        const errorMsg = error.data?.message || "Falha ao salvar espaço comum.";
        showGlobalFeedback(errorMsg, 'error');
    }
}

async function handleExcluirEspacoComum(espacoId, nomeEspaco) {
    if (!confirm(`Tem certeza que deseja excluir o espaço comum "${nomeEspaco}"? Esta ação não pode ser desfeita.`)) {
        return;
    }
    try {
        showGlobalFeedback(`Excluindo "${nomeEspaco}"...`, 'info');
        await apiClient.delete(`/api/v1/syndic/reservas/espacos-comuns/${espacoId}`);
        showGlobalFeedback(`Espaço "${nomeEspaco}" excluído com sucesso.`, 'success');
        espacosComunsList = [];
        await carregarEspacosComuns();
        await carregarListaAdminEspacosComuns();
        if(calendarioReservas) calendarioReservas.refetchEvents();
         if (listViewContainer && listViewContainer.style.display !== 'none') {
            currentPageListView = 1;
            noMoreItemsListView = false;
            const listItemsContainer = document.getElementById(listViewItemsContainerId);
            if(listItemsContainer) listItemsContainer.dataset.loadedOnce = "false";
            carregarReservasListView(currentPageListView, false);
        }
    } catch (error) {
        console.error("Erro ao excluir espaço comum:", error);
        const errorMsg = error.data?.message || `Falha ao excluir o espaço "${nomeEspaco}".`;
        showGlobalFeedback(errorMsg, 'error');
    }
}

function setupEnquetesTab() { console.warn("setupEnquetesTab chamada de reservas.js"); }
function setupSolicitacoesTab() { console.warn("setupSolicitacoesTab chamada de reservas.js"); }

// Helper para popular selects, mantido para referência se necessário, mas carregarEspacosComuns já faz isso.
// function popularSelect(selectElement, optionsArray, valueField, textField, defaultOptionText) { ... }
