import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js';
import { initFabMenu, setFabMenuActions } from './fabMenu.js';

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


async function carregarVisitantesAtuais(unidadeFilter = '') {
    const tbody = document.querySelector('.js-visitantes-atuais-lista');
    const loadingMsg = document.getElementById('visitantesAtuaisLoadingMsg');
    const noDataMsg = document.getElementById('visitantesAtuaisNoDataMsg');

    if (!tbody || !loadingMsg || !noDataMsg) {
        console.error('Elementos da tabela de visitantes atuais não encontrados.');
        showGlobalFeedback('Erro interno: UI de visitantes atuais incompleta.', 'error');
        return;
    }

    tbody.innerHTML = '';
    loadingMsg.style.display = 'block';
    noDataMsg.style.display = 'none';
    // Do not show global feedback for loading here, it's too noisy for tab switches / auto-refresh
    // showGlobalFeedback('Carregando visitantes atuais...', 'info');

    try {
        let url = '/api/visitantes/atuais';
        // Filtering by unidadeFilter (string for unit name) is deferred as API expects Guid.
        // if (unidadeFilter) {
        //     url += `?unidadeNome=${encodeURIComponent(unidadeFilter)}`; // Example if API supported name filter
        // }

        const visitas = await apiClient.get(url);

        loadingMsg.style.display = 'none';
        if (visitas && visitas.length > 0) {
            visitas.forEach(v => {
                const tr = document.createElement('tr');
                tr.dataset.id = v.id;
                tr.innerHTML = `
                    <td>${v.nome}</td>
                    <td>${v.unidadeId ? v.unidadeId.slice(0, 8) + '...' : 'N/A'}</td>
                    <td>${v.documento || ''}</td>
                    <td>${v.motivoVisita || ''}</td>
                    <td>${new Date(v.dataChegada).toLocaleString()}</td>
                    <td>${v.horarioSaidaPrevisto ? new Date(v.horarioSaidaPrevisto).toLocaleString() : ''}</td>
                    <td>
                        <button class="cv-button cv-button--small btn-registrar-saida" data-id="${v.id}">Registrar Saída</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
        // showGlobalFeedback('Visitantes atuais carregados!', 'success', 2000);
    } catch (err) {
        console.error('Erro ao listar visitantes atuais:', err);
        loadingMsg.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="7" class="error-message">Falha ao carregar visitantes atuais.</td></tr>';
        showGlobalFeedback('Erro ao carregar visitantes atuais: ' + (err.message || 'Erro desconhecido'), 'error');
    }
}

function adicionarListenersSaida() {
    const tbody = document.querySelector('.js-visitantes-atuais-lista');
    if (!tbody) return;

    tbody.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-registrar-saida')) {
            const visitanteId = event.target.dataset.id;
            if (confirm(`Deseja realmente registrar a saída do visitante?`)) {
                try {
                    showGlobalFeedback('Registrando saída...', 'info');
                    await apiClient.post(`/api/visitantes/${visitanteId}/registrar-saida`, {});
                    showGlobalFeedback('Saída registrada com sucesso!', 'success', 3000);
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
        showGlobalFeedback('Registrando entrada...', 'info');

        try {
            const response = await apiClient.post('/api/visitantes/registrar-entrada', data);
            registrarVisitanteMsg.className = 'feedback-message success';
            registrarVisitanteMsg.textContent = 'Entrada registrada com sucesso! ID: ' + response.id;
            showGlobalFeedback('Entrada registrada com sucesso!', 'success', 3000);
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
            showGlobalFeedback('Por favor, insira um QR Code.', 'warning', 4000);
            return;
        }

        registrarVisitanteMsg.style.display = 'block';
        registrarVisitanteMsg.className = 'feedback-message info';
        registrarVisitanteMsg.textContent = 'Validando QR Code...';
        showGlobalFeedback('Validando QR Code...', 'info');

        try {
            const response = await apiClient.post('/api/visitantes/validar-qr-code', { qrCodeValue });
            registrarVisitanteMsg.className = 'feedback-message success';
            registrarVisitanteMsg.textContent = `Entrada por QR Code validada para: ${response.nome}. Status: ${response.status}`;
            showGlobalFeedback('Entrada por QR Code validada!', 'success', 3000);
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
const historicoTbody = document.querySelector('.js-historico-visitantes-lista');
const historicoLoadingMsg = document.getElementById('historicoLoadingMsg');
const historicoNoDataMsg = document.getElementById('historicoNoDataMsg');
const btnFiltrarHistorico = document.getElementById('btnFiltrarHistorico');
const btnLimparFiltroHistorico = document.getElementById('btnLimparFiltroHistorico');

async function carregarHistoricoVisitantes(filters = {}) {
    if (!historicoTbody || !historicoLoadingMsg || !historicoNoDataMsg) {
        console.error('Elementos da tabela de histórico de visitantes não encontrados.');
        return;
    }

    historicoTbody.innerHTML = '';
    historicoLoadingMsg.style.display = 'block';
    historicoNoDataMsg.style.display = 'none';
    showGlobalFeedback('Carregando histórico de visitantes...', 'info');

    try {
        const params = new URLSearchParams();
        if (filters.unidadeId) params.append('unidadeId', filters.unidadeId);
        if (filters.inicio) params.append('inicio', filters.inicio);
        if (filters.fim) params.append('fim', filters.fim);
        if (filters.nomeVisitante) params.append('nomeVisitante', filters.nomeVisitante);

        const url = `/api/visitantes/historico?${params.toString()}`;
        const visitas = await apiClient.get(url);

        historicoLoadingMsg.style.display = 'none';
        if (visitas && visitas.length > 0) {
            visitas.forEach(v => {
                const tr = document.createElement('tr');
                tr.dataset.id = v.id;
                tr.innerHTML = `
                    <td>${v.nome}</td>
                    <td>${v.unidadeId ? v.unidadeId.slice(0, 8) + '...' : 'N/A'}</td>
                    <td>${v.documento || ''}</td>
                    <td>${v.motivoVisita || ''}</td>
                    <td>${new Date(v.dataChegada).toLocaleString()}</td>
                    <td>${v.dataSaida ? new Date(v.dataSaida).toLocaleString() : 'Presente'}</td>
                    <td>${v.status}</td>
                    <td>${v.observacoes || ''}</td>
                `;
                historicoTbody.appendChild(tr);
            });
        } else {
            historicoNoDataMsg.style.display = 'block';
        }
        showGlobalFeedback('Histórico de visitantes carregado.', 'success', 3000);
    } catch (err) {
        console.error('Erro ao listar histórico de visitantes:', err);
        historicoLoadingMsg.style.display = 'none';
        historicoTbody.innerHTML = '<tr><td colspan="8" class="error-message">Falha ao carregar histórico.</td></tr>';
        showGlobalFeedback('Erro ao carregar histórico: ' + (err.message || 'Erro desconhecido'), 'error');
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

function openRegistrarVisitante() {
    const btn = document.querySelector('#content-controle-visitantes .cv-tab-button[data-subtab="registrar-visitante"]');
    btn?.click();
}

function openRegistrarEncomenda() {
    const btn = document.querySelector('#content-controle-visitantes .cv-tab-button[data-subtab="gestao-encomendas"]');
    btn?.click();
    document.getElementById('formNovaEncomenda')?.scrollIntoView({ behavior: 'smooth' });
}

function updateFabActions() {
    const actions = [
        { label: 'Visitante', onClick: openRegistrarVisitante },
        { label: 'Encomenda', onClick: openRegistrarEncomenda }
    ];
    setFabMenuActions(actions);
}

// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();
    setupTabs();
    await carregarVisitantesAtuais();
    adicionarListenersSaida();
    await carregarEncomendas();
    setupEncomendas();
    initFabMenu();
    updateFabActions();

    // Note: Filter listeners for "Visitantes Atuais" are still placeholders
    const btnFilterAtuais = document.getElementById('btnFiltrarVisitantesAtuais');
    if (btnFilterAtuais) {
        btnFilterAtuais.addEventListener('click', () => {
            showGlobalFeedback('Funcionalidade de filtro por unidade (atuais) a ser implementada/conectada com API.', 'info');
        });
    }
    const btnClearFilterAtuais = document.getElementById('btnLimparFiltroVisitantesAtuais');
    if (btnClearFilterAtuais) {
        btnClearFilterAtuais.addEventListener('click', () => {
            showGlobalFeedback('Funcionalidade de filtro por unidade (atuais) a ser implementada/conectada com API.', 'info');
        });
    }
});


// Original carregarEncomendas (can be moved to an 'encomendas.js' or kept if tabs eventually integrate it)
async function carregarEncomendas() {
    const tbody = document.querySelector('.js-encomendas');
    const loadingMsg = document.getElementById('encomendasLoadingMsg');
    const noDataMsg = document.getElementById('encomendasNoDataMsg');
    if (!tbody || !loadingMsg || !noDataMsg) {
        console.error('Elementos de encomendas não encontrados.');
        return;
    }
    tbody.innerHTML = '';
    loadingMsg.style.display = 'block';
    noDataMsg.style.display = 'none';

    try {
        const encomendas = await apiClient.get('/syndic/encomendas?status=recebida');

        loadingMsg.style.display = 'none';
        tbody.innerHTML = '';
        if (encomendas && encomendas.length > 0) {
            encomendas.forEach(e => {
                const tr = document.createElement('tr');
                const status = e.status || (e.retiradoEm ? 'Retirada' : 'Aguardando');
                const btn = e.retiradoEm ? '' : `<button class="cv-button cv-button--small btn-retirar" data-id="${e.id}">Confirmar Retirada</button>`;
                tr.innerHTML = `<td>${e.descricao || ''}</td><td>${e.unidadeId.slice(0,8)}...</td><td>${status}</td><td>${btn}</td>`;
                tbody.appendChild(tr);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
    } catch(err) {
        console.error('Erro ao listar encomendas', err);
        tbody.innerHTML = '<tr><td colspan="4" class="error-message">Falha ao carregar encomendas.</td></tr>';
    }
}

function setupEncomendas() {
    const form = document.getElementById('formNovaEncomenda');
    const msg = document.getElementById('novaEncomendaMsg');
    const tbody = document.querySelector('.js-encomendas');
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

    if (tbody) {
        tbody.addEventListener('click', async (ev) => {
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
