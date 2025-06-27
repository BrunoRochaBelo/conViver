import apiClient from './apiClient.js';
import { requireAuth, getRoles } from './auth.js';
import { showGlobalFeedback } from './main.js';
import { initFabMenu } from './fabMenu.js';
import { showFeedSkeleton, hideFeedSkeleton } from './skeleton.js';

// --- Configuração das Abas Principais ---
function setupMainTabs() {
    const mainTabButtons = document.querySelectorAll('main > .cv-tabs .cv-tab-button');
    const mainTabContents = document.querySelectorAll('main > .cv-tab-content');

    mainTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            mainTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            mainTabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            const targetContentId = 'content-' + button.id.split('-').slice(1).join('-');
            const targetContent = document.getElementById(targetContentId);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';

                // Carregar dados específicos da aba principal se necessário
                if (button.id === 'tab-controle-visitantes') {
                    // A inicialização das sub-abas e o carregamento de dados
                    // de visitantes serão feitos por setupVisitantesSubTabs
                    if (!button.dataset.initialized) {
                        setupVisitantesSubTabs();
                        // A primeira sub-aba ativa (Visitantes Atuais) já carrega os dados.
                        button.dataset.initialized = 'true';
                    }
                } else if (button.id === 'tab-gestao-encomendas') {
                    if (!button.dataset.initialized) {
                        carregarEncomendas();
                        setupFormNovaEncomenda(); // Renomeado de setupEncomendas para clareza
                        setupListaEncomendasListener(); // Listener para botões de retirar
                        button.dataset.initialized = 'true';
                    }
                }
            }
        });
    });

    // Ativar a primeira aba principal por padrão e carregar seu conteúdo.
    if (mainTabButtons.length > 0) {
        mainTabButtons[0].click();
    }
}

// Wrapper to initialize tabs depending on page structure
function setupTabs() {
    const hasMainTabs = document.querySelectorAll('main > .cv-tabs .cv-tab-button').length > 0;
    if (hasMainTabs) {
        setupMainTabs();
    } else {
        setupVisitantesSubTabs();
    }
}

// --- Configuração das Sub-Abas de Controle de Visitantes ---
function setupVisitantesSubTabs() {
    const subTabButtons = document.querySelectorAll('#content-controle-visitantes .cv-tabs .cv-tab-button');
    const subTabContents = document.querySelectorAll('#content-controle-visitantes .cv-subtab-content');

    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            subTabContents.forEach(content => {
                content.classList.remove('active');
                // content.style.display = 'none'; // A visibilidade é controlada pela classe active no CSS se necessário
            });

            const targetSubTabId = button.dataset.subtab; // Usando data-subtab como ID
            const targetSubTabContent = document.getElementById(targetSubTabId);
            if (targetSubTabContent) {
                targetSubTabContent.classList.add('active');
                // targetSubTabContent.style.display = 'block';
            }

            // Carregar dados da sub-aba
            if (targetSubTabId === 'visitantes-atuais') {
                carregarVisitantesAtuais();
            } else if (targetSubTabId === 'historico-visitantes') {
                const historicoTbody = document.querySelector('.js-historico-visitantes-lista');
                if (historicoTbody && (!historicoTbody.hasChildNodes() || button.dataset.refresh === 'true')) {
                    carregarHistoricoVisitantes();
                    button.dataset.refresh = 'false'; // Reset refresh flag
                }
            } else if (targetSubTabId === 'registrar-visitante') {
                const formRegistrarVisitante = document.getElementById('formRegistrarVisitante');
                const registrarVisitanteMsg = document.getElementById('registrarVisitanteMsg');
                formRegistrarVisitante?.reset();
                if (registrarVisitanteMsg) registrarVisitanteMsg.style.display = 'none';
            }
        });
    });

    // Ativar a primeira sub-aba de visitantes por padrão
    if (subTabButtons.length > 0) {
        subTabButtons[0].click();
    }
}

function openSubTab(id) {
    const btn = document.querySelector(`#content-controle-visitantes .cv-tab-button[data-subtab="${id}"]`);
    btn?.click();
}


async function carregarVisitantesAtuais(unidadeFilter = '') {
    const container = document.querySelector('.js-visitantes-atuais-lista');
    const loadingMsg = document.getElementById('visitantesAtuaisLoadingMsg');
    const noDataMsg = document.getElementById('visitantesAtuaisNoDataMsg');
    const skeleton = document.getElementById('visitantes-skeleton');

    if (!container || !loadingMsg || !noDataMsg) {
        console.error('Elementos da tabela de visitantes atuais não encontrados.');
        showGlobalFeedback('Erro interno: UI de visitantes atuais incompleta.', 'error');
        return;
    }

    container.innerHTML = '';
    loadingMsg.style.display = 'block';
    if (skeleton) showFeedSkeleton(skeleton);
    noDataMsg.style.display = 'none';
    // Do not show global feedback for loading here, it's too noisy for tab switches / auto-refresh
    // showGlobalFeedback('Carregando visitantes atuais...', 'info');

    try {
        let url = '/api/v1/visitantes/atuais';
        // Filtering by unidadeFilter (string for unit name) is deferred as API expects Guid.
        // if (unidadeFilter) {
        //     url += `?unidadeNome=${encodeURIComponent(unidadeFilter)}`; // Example if API supported name filter
        // }

        const visitas = await apiClient.get(url);

        loadingMsg.style.display = 'none';
        if (visitas && visitas.length > 0) {
            visitas.forEach(v => {
                const card = document.createElement('div');
                card.className = 'visitante-card cv-card';
                card.dataset.id = v.id;
                card.innerHTML = `
                    <h4>${v.nome}</h4>
                    <p>${v.documento || ''}</p>
                    <p>${v.unidadeId ? v.unidadeId.slice(0, 8) + '...' : 'N/A'} - ${v.motivoVisita || ''}</p>
                    <p>Chegada: ${new Date(v.dataChegada).toLocaleString()}</p>
                    <p>Saída Prevista: ${v.horarioSaidaPrevisto ? new Date(v.horarioSaidaPrevisto).toLocaleString() : ''}</p>
                    <div class="visitante-card__acoes">
                        <button class="cv-button cv-button--small btn-registrar-saida" data-id="${v.id}">Registrar Saída</button>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
        // showGlobalFeedback('Visitantes atuais carregados!', 'success', 2000);
    } catch (err) {
        console.error('Erro ao listar visitantes atuais:', err);
        loadingMsg.style.display = 'none';
        container.innerHTML = '<div class="error-message">Falha ao carregar visitantes atuais.</div>';
        showGlobalFeedback('Erro ao carregar visitantes atuais: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
        if (skeleton) hideFeedSkeleton(skeleton);
    }
}

function adicionarListenersSaida() {
    const container = document.querySelector('.js-visitantes-atuais-lista');
    if (!container) return;

    container.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-registrar-saida')) {
            const visitanteId = event.target.dataset.id;
            if (confirm(`Deseja realmente registrar a saída do visitante?`)) {
                try {
                    await apiClient.post(`/api/v1/visitantes/${visitanteId}/registrar-saida`, {});
                    carregarVisitantesAtuais(); // Refresh the list
                } catch (err) {
                    console.error('Erro ao registrar saída:', err);
                    const errorMsg = err.response?.data?.message || err.responseJSON?.message || err.message || 'Verifique o console.';
                    showGlobalFeedback('Erro ao registrar saída: ' + errorMsg, 'error');
                }
            }
        }
    });
}

// --- Registrar Novo Visitante ---
const formRegistrarVisitante = document.getElementById('formRegistrarVisitante');
const registrarVisitanteMsg = document.getElementById('registrarVisitanteMsg');
const btnValidarQRCode = document.getElementById('btnValidarQRCode');

if (formRegistrarVisitante && registrarVisitanteMsg) {
    formRegistrarVisitante.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(formRegistrarVisitante);
        const data = Object.fromEntries(formData.entries());

        data.documento = data.documento || null;
        data.motivoVisita = data.motivoVisita || null;
        data.horarioSaidaPrevisto = data.horarioSaidaPrevisto ? new Date(data.horarioSaidaPrevisto).toISOString() : null;
        data.observacoes = data.observacoes || null;

        delete data.qrCodeEntrada; // Not part of manual registration DTO

        registrarVisitanteMsg.style.display = 'block';
        registrarVisitanteMsg.className = 'feedback-message info';
        registrarVisitanteMsg.textContent = 'Registrando entrada...';

        try {
            const response = await apiClient.post('/api/v1/visitantes/registrar-entrada', data);
            registrarVisitanteMsg.className = 'feedback-message success';
            registrarVisitanteMsg.textContent = 'Entrada registrada com sucesso! ID: ' + response.id;
            formRegistrarVisitante.reset();

            if (document.getElementById('visitantes-atuais').classList.contains('active')) {
                carregarVisitantesAtuais();
            }
        } catch (err) {
            console.error('Erro ao registrar entrada:', err);
            const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Erro desconhecido';
            registrarVisitanteMsg.className = 'feedback-message error';
            registrarVisitanteMsg.textContent = 'Falha ao registrar entrada: ' + errorMsg;
            showGlobalFeedback('Falha ao registrar entrada: ' + errorMsg, 'error');
        }
    });
}

if (btnValidarQRCode && registrarVisitanteMsg && formRegistrarVisitante) {
    btnValidarQRCode.addEventListener('click', async () => {
        const qrCodeValue = document.getElementById('visQRCodeEntrada').value;
        if (!qrCodeValue) {
            // Campo obrigatório
            return;
        }

        registrarVisitanteMsg.style.display = 'block';
        registrarVisitanteMsg.className = 'feedback-message info';
        registrarVisitanteMsg.textContent = 'Validando QR Code...';


        try {
            const response = await apiClient.post('/api/v1/visitantes/validar-qr-code', { qrCodeValue });
            registrarVisitanteMsg.className = 'feedback-message success';
            registrarVisitanteMsg.textContent = `Entrada por QR Code validada para: ${response.nome}. Status: ${response.status}`;

            formRegistrarVisitante.reset();

            // Switch to "Visitantes Atuais" tab and refresh
            const visitantesAtuaisTabButton = document.querySelector('.cv-tab-button[data-tab="visitantes-atuais"]');
            visitantesAtuaisTabButton?.click();
            // carregarVisitantesAtuais will be called by the tab click handler if not already active or by specific logic there

        } catch (err) {
            console.error('Erro ao validar QR Code:', err);
            const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'QR Code inválido ou expirado.';
            registrarVisitanteMsg.className = 'feedback-message error';
            registrarVisitanteMsg.textContent = 'Falha ao validar QR Code: ' + errorMsg;
            showGlobalFeedback('Falha ao validar QR Code: ' + errorMsg, 'error');
        }
    });
}

// --- Histórico de Visitantes ---
const historicoContainer = document.querySelector('.js-historico-visitantes-lista');
const historicoLoadingMsg = document.getElementById('historicoLoadingMsg');
const historicoNoDataMsg = document.getElementById('historicoNoDataMsg');
const btnFiltrarHistorico = document.getElementById('btnFiltrarHistorico');
const btnLimparFiltroHistorico = document.getElementById('btnLimparFiltroHistorico');

async function carregarHistoricoVisitantes(filters = {}) {
    if (!historicoContainer || !historicoLoadingMsg || !historicoNoDataMsg) {
        console.error('Elementos da tabela de histórico de visitantes não encontrados.');
        return;
    }

    const skeleton = document.getElementById('historico-skeleton');

    historicoContainer.innerHTML = '';
    historicoLoadingMsg.style.display = 'block';
    if (skeleton) showFeedSkeleton(skeleton);
    historicoNoDataMsg.style.display = 'none';


    try {
        const params = new URLSearchParams();
        if (filters.unidadeId) params.append('unidadeId', filters.unidadeId);
        if (filters.inicio) params.append('inicio', filters.inicio);
        if (filters.fim) params.append('fim', filters.fim);
        if (filters.nomeVisitante) params.append('nomeVisitante', filters.nomeVisitante);

        const url = `/api/v1/visitantes/historico?${params.toString()}`;
        const visitas = await apiClient.get(url);

        historicoLoadingMsg.style.display = 'none';
        if (visitas && visitas.length > 0) {
            visitas.forEach(v => {
                const card = document.createElement('div');
                card.className = 'visitante-card cv-card';
                card.dataset.id = v.id;
                card.innerHTML = `
                    <h4>${v.nome}</h4>
                    <p>${v.unidadeId ? v.unidadeId.slice(0, 8) + '...' : 'N/A'} - ${v.motivoVisita || ''}</p>
                    <p>${v.documento || ''}</p>
                    <p>Chegada: ${new Date(v.dataChegada).toLocaleString()}</p>
                    <p>Saída: ${v.dataSaida ? new Date(v.dataSaida).toLocaleString() : 'Presente'}</p>
                    <p>Status: ${v.status}</p>
                    <p>${v.observacoes || ''}</p>
                `;
                historicoContainer.appendChild(card);
            });
        } else {
            historicoNoDataMsg.style.display = 'block';
        }

    } catch (err) {
        console.error('Erro ao listar histórico de visitantes:', err);
        historicoLoadingMsg.style.display = 'none';
        historicoContainer.innerHTML = '<div class="error-message">Falha ao carregar histórico.</div>';
        showGlobalFeedback('Erro ao carregar histórico: ' + (err.message || 'Erro desconhecido'), 'error');
    } finally {
        if (skeleton) hideFeedSkeleton(skeleton);
    }
}

if (btnFiltrarHistorico) {
    btnFiltrarHistorico.addEventListener('click', () => {
        const filters = {
            unidadeId: document.getElementById('filterHistUnidadeId').value,
            inicio: document.getElementById('filterHistDataInicio').value,
            fim: document.getElementById('filterHistDataFim').value,
            nomeVisitante: document.getElementById('filterHistNome').value
        };
        Object.keys(filters).forEach(key => {
            if (!filters[key]) delete filters[key];
        });
        carregarHistoricoVisitantes(filters);
    });
}

if(btnLimparFiltroHistorico) {
    btnLimparFiltroHistorico.addEventListener('click', () => {
        document.getElementById('filterHistUnidadeId').value = '';
        document.getElementById('filterHistDataInicio').value = '';
        document.getElementById('filterHistDataFim').value = '';
        document.getElementById('filterHistNome').value = '';
        carregarHistoricoVisitantes();
    });
}

// --- DOMContentLoaded ---
export async function initialize() {
    requireAuth();
    setupTabs();
    await carregarVisitantesAtuais();
    adicionarListenersSaida();
    await carregarEncomendas();
    setupEncomendas();

    // Note: Filter listeners for "Visitantes Atuais" are still placeholders
    const btnFilterAtuais = document.getElementById('btnFiltrarVisitantesAtuais');
    if (btnFilterAtuais) {
        btnFilterAtuais.addEventListener('click', () => {

        });
    }
    const btnClearFilterAtuais = document.getElementById('btnLimparFiltroVisitantesAtuais');
    if (btnClearFilterAtuais) {
        btnClearFilterAtuais.addEventListener('click', () => {

        });
    }

    const roles = getRoles();
    const isSindico = roles.includes('Sindico') || roles.includes('Administrador');
    const actions = [
        { label: 'Registrar Visitante', onClick: () => openSubTab('registrar-visitante') }
    ];
    if (isSindico) {
        actions.push({ label: 'Registrar Encomenda', onClick: () => openSubTab('gestao-encomendas') });
    }
    initFabMenu(actions);
}

if (document.readyState !== 'loading') {
    initialize();
} else {
    document.addEventListener('DOMContentLoaded', initialize);
}


// Original carregarEncomendas (can be moved to an 'encomendas.js' or kept if tabs eventually integrate it)
async function carregarEncomendas() {
    const container = document.querySelector('.js-encomendas');
    const loadingMsg = document.getElementById('encomendasLoadingMsg');
    const noDataMsg = document.getElementById('encomendasNoDataMsg');
    const skeleton = document.getElementById('encomendas-skeleton');
    if (!container || !loadingMsg || !noDataMsg) {
        console.error('Elementos de encomendas não encontrados.');
        return;
    }
    container.innerHTML = '';
    loadingMsg.style.display = 'block';
    noDataMsg.style.display = 'none';
    if (skeleton) showFeedSkeleton(skeleton);

    try {
        const encomendas = await apiClient.get('/syndic/encomendas?status=recebida');

        loadingMsg.style.display = 'none';
        container.innerHTML = '';
        if (encomendas && encomendas.length > 0) {
            encomendas.forEach(e => {
                const card = document.createElement('div');
                card.className = 'encomenda-card cv-card';
                card.dataset.id = e.id;
                const status = e.status || (e.retiradoEm ? 'Retirada' : 'Aguardando');
                const btn = e.retiradoEm ? '' : `<button class="cv-button cv-button--small btn-retirar" data-id="${e.id}">Confirmar Retirada</button>`;
                card.innerHTML = `
                    <h4>${e.descricao || ''}</h4>
                    <p>Unidade: ${e.unidadeId.slice(0,8)}...</p>
                    <p>Status: ${status}</p>
                    <div class="encomenda-card__acoes">${btn}</div>
                `;
                container.appendChild(card);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
    } catch(err) {
        console.error('Erro ao listar encomendas', err);
        container.innerHTML = '<div class="error-message">Falha ao carregar encomendas.</div>';
    } finally {
        if (skeleton) hideFeedSkeleton(skeleton);
    }
}

function setupEncomendas() {
    const form = document.getElementById('formNovaEncomenda');
    const msg = document.getElementById('novaEncomendaMsg');
    const container = document.querySelector('.js-encomendas');
    if (form && msg) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                unidadeId: form.unidadeId.value,
                descricao: form.descricao.value
            };
            msg.style.display = 'block';
            msg.className = 'feedback-message info';
            msg.textContent = 'Registrando...';
            try {
                await apiClient.post('/syndic/encomendas', data);
                msg.className = 'feedback-message success';
                msg.textContent = 'Encomenda registrada!';
                form.reset();
                await carregarEncomendas();
            } catch(err) {
                msg.className = 'feedback-message error';
                msg.textContent = 'Erro ao registrar.';
            }
        });
    }

    if (container) {
        container.addEventListener('click', async (ev) => {
            if (ev.target.classList.contains('btn-retirar')) {
                const id = ev.target.dataset.id;
                if (confirm('Confirmar retirada da encomenda?')) {
                    try {
                        await apiClient.post(`/syndic/encomendas/${id}/retirar`, {});
                        await carregarEncomendas();
                    } catch(err) {
                        showGlobalFeedback('Erro ao registrar retirada', 'error');
                    }
                }
            }
        });
    }
}
