import apiClient from './apiClient.js';
import { requireAuth, getRoles } from './auth.js';
import {
    showGlobalFeedback,
    createErrorStateElement,
    createEmptyStateElement,
    showSkeleton, // Assumindo que apiClient.get usa isso ou temos elementos skeleton
    hideSkeleton  // Assumindo que apiClient.get usa isso ou temos elementos skeleton
} from './main.js';
import { initFabMenu } from './fabMenu.js';
// createProgressBar, showProgress, xhrPost não são usados diretamente aqui se os formulários já têm seus próprios.
// Mas xhrPost é usado, então manter.
import { createProgressBar, showProgress, xhrPost } from './progress.js';


// --- Função de Badge de Status ---
function getStatusBadgeHtml(status) {
    const s = status ? status.toLowerCase() : "";
    let type = "success";
    if (s.includes("pendente") || s.includes("aguardando")) type = "warning";
    else if (s.includes("cancel") || s.includes("recus") || s.includes("vencid") || s.includes("extraviad") || s.includes("devolvid")) type = "danger";
    return `<span class="status-badge status-badge--${type}"><span class="status-icon icon-${type}"></span>${status}</span>`;
}

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

                if (button.id === 'tab-controle-visitantes' && !button.dataset.initialized) {
                    setupVisitantesSubTabs();
                    button.dataset.initialized = 'true';
                }
                else if (button.id === 'tab-gestao-encomendas' && !button.dataset.initialized) {
                    carregarEncomendas();
                    setupEncomendas();
                    button.dataset.initialized = 'true';
                }
            }
        });
    });

    if (mainTabButtons.length > 0) {
        mainTabButtons[0].click();
    }
}

function setupTabs() {
    const hasMainTabs = document.querySelectorAll('main > .cv-tabs .cv-tab-button').length > 0;
    if (hasMainTabs) setupMainTabs();
    else setupVisitantesSubTabs();
}

// --- Sub-Abas de Controle de Visitantes ---
function setupVisitantesSubTabs() {
    const subTabButtons = document.querySelectorAll('#content-controle-visitantes .cv-tabs .cv-tab-button');
    const subTabContents = document.querySelectorAll('#content-controle-visitantes .cv-subtab-content');

    subTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            subTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            subTabContents.forEach(content => content.classList.remove('active'));

            const targetSubTabId = button.dataset.subtab;
            const targetSubTab = document.getElementById(targetSubTabId);
            if (targetSubTab) targetSubTab.classList.add('active');

            if (targetSubTabId === 'visitantes-atuais') {
                carregarVisitantesAtuais();
            } else if (targetSubTabId === 'historico-visitantes') {
                const historicoTbody = document.querySelector('.js-historico-visitantes-lista');
                if (historicoTbody && (!historicoTbody.hasChildNodes() || button.dataset.refresh === 'true')) {
                    carregarHistoricoVisitantes();
                    button.dataset.refresh = 'false';
                }
            } else if (targetSubTabId === 'registrar-visitante') {
                const form = document.getElementById('formRegistrarVisitante');
                const msg = document.getElementById('registrarVisitanteMsg');
                form?.reset();
                if (msg) msg.style.display = 'none';
            }
        });
    });

    if (subTabButtons.length > 0) {
        subTabButtons[0].click();
    }
}

function openSubTab(id) {
    document.querySelector(`#content-controle-visitantes .cv-tab-button[data-subtab="${id}"]`)
        ?.click();
}

// --- Visitantes Atuais ---
async function carregarVisitantesAtuais() {
    const container = document.querySelector('.js-visitantes-atuais-lista');
    const loadingMsg = document.getElementById('visitantesAtuaisLoadingMsg');
    const noDataMsg = document.getElementById('visitantesAtuaisNoDataMsg');
    const skeleton = document.getElementById('visitantes-skeleton');

    if (!container || !loadingMsg || !noDataMsg) {
        console.error('UI de visitantes atuais incompleta.');
        showGlobalFeedback('Erro interno: UI de visitantes atuais incompleta.', 'error');
        return;
    }

    container.innerHTML = ''; // Limpa para skeleton, empty state ou error state
    if (loadingMsg) loadingMsg.style.display = 'none'; // Esconde mensagem de texto antiga
    if (noDataMsg) noDataMsg.style.display = 'none';   // Esconde mensagem de texto antiga

    // apiClient.get lida com o skeleton se `skeleton` for um elemento válido.
    // Se não, precisamos mostrar um skeleton aqui manualmente se desejado.
    // Por ora, vamos assumir que `showSkeleton: skeleton` no apiClient é suficiente ou que não há skeleton visual para esta lista.
    // Idealmente: if (skeleton) showSkeleton(skeleton);

    try {
        const visitas = await apiClient.get('/api/v1/visitantes/atuais', { showSkeleton: skeleton });
        // if (loadingMsg) loadingMsg.style.display = 'none'; // Já tratado pelo fluxo normal

        if (visitas && visitas.length > 0) {
            visitas.forEach(v => {
                const card = document.createElement('div');
                card.className = 'visitante-card cv-card';
                card.dataset.id = v.id;
                card.innerHTML = `
                    <h4>${v.nome}</h4>
                    <p>Unidade: ${v.unidadeId ? v.unidadeId : 'N/A'} - Motivo: ${v.motivoVisita || 'N/A'}</p>
                    <p>Documento: ${v.documento || 'N/A'}</p>
                    <p>Chegada: ${new Date(v.dataChegada).toLocaleString('pt-BR')}</p>
                    <p>Saída Prevista: ${v.horarioSaidaPrevisto ? new Date(v.horarioSaidaPrevisto).toLocaleString('pt-BR') : 'N/A'}</p>
                    <div class="visitante-card__acoes">
                        <button class="cv-button cv-button--small btn-registrar-saida" data-id="${v.id}">
                            Registrar Saída
                        </button>
                    </div>
                `;
                container.appendChild(card);
            });
        } else {
            const emptyState = createEmptyStateElement({
                iconHTML: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="48px" height="48px"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`, // Ícone de pessoa
                title: "Nenhum Visitante Presente",
                description: "Não há visitantes registrados como presentes no condomínio neste momento."
            });
            container.appendChild(emptyState);
        }
    } catch (err) {
        console.error('Erro ao listar visitantes atuais:', err);
        // if (loadingMsg) loadingMsg.style.display = 'none'; // Esconde se ainda estiver visível
        container.innerHTML = ''; // Limpa qualquer conteúdo ou skeleton
        const errorState = createErrorStateElement({
            title: "Erro ao Carregar Visitantes",
            message: err.message || "Não foi possível buscar os visitantes atuais. Verifique sua conexão e tente novamente.",
            retryButton: {
                text: "Tentar Novamente",
                onClick: carregarVisitantesAtuais
            }
        });
        container.appendChild(errorState);
        // showGlobalFeedback removido, ErrorState é o principal.
    } finally {
        // A opção showSkeleton no apiClient deve lidar com o hideSkeleton.
        // Se controlássemos o skeleton manualmente: if (skeleton) hideSkeleton(skeleton);
    }
}

function adicionarListenersSaida() {
    const container = document.querySelector('.js-visitantes-atuais-lista');
    if (!container) return;

    container.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-registrar-saida')) {
            const visitanteId = event.target.dataset.id;
            if (confirm('Deseja realmente registrar a saída do visitante?')) {
                try {
                    await apiClient.post(`/api/v1/visitantes/${visitanteId}/registrar-saida`, {});
                    carregarVisitantesAtuais();
                } catch (err) {
                    console.error('Erro ao registrar saída:', err);
                    const msg = err.response?.data?.message || err.message || '';
                    showGlobalFeedback('Erro ao registrar saída: ' + msg, 'error');
                }
            }
        }
    });
}

// --- Registrar Novo Visitante ---
const formRegistrarVisitante = document.getElementById('formRegistrarVisitante');
const registrarVisitanteMsg = document.getElementById('registrarVisitanteMsg');
const btnValidarQRCode = document.getElementById('btnValidarQRCode');
const registrarProgressBar = createProgressBar();

if (formRegistrarVisitante && registrarVisitanteMsg) {
    formRegistrarVisitante.appendChild(registrarProgressBar);
    formRegistrarVisitante.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(formRegistrarVisitante);
        const data = Object.fromEntries(formData.entries());

        data.documento = data.documento || null;
        data.motivoVisita = data.motivoVisita || null;
        data.horarioSaidaPrevisto = data.horarioSaidaPrevisto
            ? new Date(data.horarioSaidaPrevisto).toISOString()
            : null;
        data.observacoes = data.observacoes || null;
        delete data.qrCodeEntrada;

        registrarVisitanteMsg.style.display = 'block';
        registrarVisitanteMsg.className = 'feedback-message info';
        registrarVisitanteMsg.textContent = 'Enviando...';
        showProgress(registrarProgressBar, 0);

        try {
            const response = await xhrPost('/api/v1/visitantes/registrar-entrada', data, p => showProgress(registrarProgressBar, p));
            showProgress(registrarProgressBar, 100);
            registrarVisitanteMsg.className = 'feedback-message success';
            registrarVisitanteMsg.textContent = 'Entrada registrada com sucesso! ID: ' + response.id;
            formRegistrarVisitante.reset();

            if (document.getElementById('visitantes-atuais').classList.contains('active')) {
                carregarVisitantesAtuais();
            }
        } catch (err) {
            console.error('Erro ao registrar entrada:', err);
            const msg = err.response?.data?.message || err.message || 'Erro desconhecido';
            registrarVisitanteMsg.className = 'feedback-message error';
            registrarVisitanteMsg.textContent = 'Falha ao registrar entrada: ' + msg;
            registrarProgressBar.style.display = 'none';
            showGlobalFeedback('Falha ao registrar entrada: ' + msg, 'error');
        }
    });
}

if (btnValidarQRCode && registrarVisitanteMsg && formRegistrarVisitante) {
    btnValidarQRCode.addEventListener('click', async () => {
        const qrCodeValue = document.getElementById('visQRCodeEntrada').value;
        if (!qrCodeValue) return;

        registrarVisitanteMsg.style.display = 'block';
        registrarVisitanteMsg.className = 'feedback-message info';
        registrarVisitanteMsg.textContent = 'Validando QR Code...';

        try {
            const response = await apiClient.post('/api/v1/visitantes/validar-qr-code', { qrCodeValue });
            registrarVisitanteMsg.className = 'feedback-message success';
            registrarVisitanteMsg.textContent = `Entrada por QR Code validada para: ${response.nome}.`;
            formRegistrarVisitante.reset();

            document.querySelector('.cv-tab-button[data-subtab="visitantes-atuais"]')?.click();
        } catch (err) {
            console.error('Erro ao validar QR Code:', err);
            const msg = err.response?.data?.message || err.message || 'QR Code inválido ou expirado.';
            registrarVisitanteMsg.className = 'feedback-message error';
            registrarVisitanteMsg.textContent = 'Falha ao validar QR Code: ' + msg;
            showGlobalFeedback('Falha ao validar QR Code: ' + msg, 'error');
        }
    });
}

// --- Histórico de Visitantes ---
const historicoContainer = document.querySelector('.js-historico-visitantes-lista');
const historicoLoadingMsg = document.getElementById('historicoLoadingMsg');
const historicoNoDataMsg = document.getElementById('historicoNoDataMsg');

async function carregarHistoricoVisitantes(filters = {}) {
    if (!historicoContainer || !historicoLoadingMsg || !historicoNoDataMsg) {
        console.error('UI de histórico de visitantes incompleta.');
        return;
    }
    const skeleton = document.getElementById('historico-skeleton');

    historicoContainer.innerHTML = '';
    historicoLoadingMsg.style.display = 'block';
    historicoNoDataMsg.style.display = 'none';

    try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k,v]) => v && params.append(k, v));
        const visitas = await apiClient.get(`/api/v1/visitantes/historico?${params.toString()}`, { showSkeleton: skeleton });

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
                    <p>${getStatusBadgeHtml(v.status)}</p>
                    <p>${v.observacoes || ''}</p>
                `;
                historicoContainer.appendChild(card);
            });
        } else {
            // Use createEmptyStateElement if no data and no active filters, otherwise show a "no results for filter" message
            const hasFilters = Object.values(filters).some(val => val);
            if (hasFilters) {
                 historicoContainer.innerHTML = '<p class="cv-info-message" style="text-align:center;">Nenhum visitante encontrado com os filtros aplicados.</p>';
            } else {
                const emptyState = createEmptyStateElement({
                    title: "Histórico Vazio",
                    description: "Ainda não há registros de entrada ou saída de visitantes."
                });
                historicoContainer.appendChild(emptyState);
            }
            historicoNoDataMsg.style.display = 'none'; // Hide the old noDataMsg
        }
    } catch (err) {
        console.error('Erro ao listar histórico de visitantes:', err);
        historicoLoadingMsg.style.display = 'none';
        historicoContainer.innerHTML = ''; // Limpa o container
        const errorState = createErrorStateElement({
            message: err.message || "Não foi possível carregar o histórico de visitantes. Verifique sua conexão e tente novamente.",
            retryButton: {
                text: "Tentar Novamente",
                onClick: () => carregarHistoricoVisitantes(filters) // Passa os filtros atuais para a nova tentativa
            }
        });
        historicoContainer.appendChild(errorState);
        // showGlobalFeedback('Erro ao carregar histórico: ' + (err.message || ''), 'error'); // Removed, inline message is sufficient
    } finally {
        // skeleton handled by apiClient
    }
}

const btnFiltrarHistorico = document.getElementById('btnFiltrarHistorico');
const btnLimparFiltroHistorico = document.getElementById('btnLimparFiltroHistorico');

btnFiltrarHistorico?.addEventListener('click', () => {
    const filters = {
        unidadeId: document.getElementById('filterHistUnidadeId').value,
        inicio: document.getElementById('filterHistDataInicio').value,
        fim: document.getElementById('filterHistDataFim').value,
        nomeVisitante: document.getElementById('filterHistNome').value
    };
    Object.keys(filters).forEach(k => !filters[k] && delete filters[k]);
    carregarHistoricoVisitantes(filters);
});

btnLimparFiltroHistorico?.addEventListener('click', () => {
    ['filterHistUnidadeId','filterHistDataInicio','filterHistDataFim','filterHistNome']
        .forEach(id => document.getElementById(id).value = '');
    carregarHistoricoVisitantes();
});

// --- Inicialização ---
export async function initialize() {
    requireAuth();
    setupTabs();
    await carregarVisitantesAtuais();
    adicionarListenersSaida();
    await carregarEncomendas();
    setupEncomendas();

    const roles = getRoles();
    const isSindico = roles.includes('Sindico') || roles.includes('Administrador');
    const actions = [{ label: 'Registrar Visitante', onClick: () => openSubTab('registrar-visitante') }];
    if (isSindico) actions.push({ label: 'Registrar Encomenda', onClick: () => openSubTab('gestao-encomendas') });
    initFabMenu(actions);
}

if (document.readyState !== 'loading') initialize();
else document.addEventListener('DOMContentLoaded', initialize);

// --- Encomendas ---
async function carregarEncomendas() {
    const container = document.querySelector('.js-encomendas');
    const loadingMsg = document.getElementById('encomendasLoadingMsg');
    const noDataMsg = document.getElementById('encomendasNoDataMsg');
    const skeleton = document.getElementById('encomendas-skeleton');
    if (!container || !loadingMsg || !noDataMsg) {
        console.error('UI de encomendas incompleta.');
        return;
    }

    container.innerHTML = '';
    loadingMsg.style.display = 'block';
    noDataMsg.style.display = 'none';

    try {
        const encomendas = await apiClient.get('/syndic/encomendas?status=recebida', { showSkeleton: skeleton });
        loadingMsg.style.display = 'none';

        if (encomendas && encomendas.length > 0) {
            encomendas.forEach(e => {
                const card = document.createElement('div');
                card.className = 'encomenda-card cv-card';
                card.dataset.id = e.id;
                const status = e.status || (e.retiradoEm ? 'Retirada' : 'Aguardando');
                const btn = e.retiradoEm
                    ? ''
                    : `<button class="cv-button cv-button--small btn-retirar" data-id="${e.id}">Confirmar Retirada</button>`;

                card.innerHTML = `
                    <h4>${e.descricao || ''}</h4>
                    <p>Unidade: ${e.unidadeId.slice(0,8)}...</p>
                    ${getStatusBadgeHtml(status)}
                    <div class="encomenda-card__acoes">${btn}</div>
                `;
                container.appendChild(card);
            });
        } else {
            noDataMsg.style.display = 'block';
        }
    } catch (err) {
        console.error('Erro ao listar encomendas:', err);
        container.innerHTML = ''; // Limpa o container
        const errorState = createErrorStateElement({
            message: err.message || "Não foi possível carregar as encomendas. Verifique sua conexão e tente novamente.",
            retryButton: {
                text: "Tentar Novamente",
                onClick: carregarEncomendas
            }
        });
        container.appendChild(errorState);
    } finally {
        // skeleton handled by apiClient
    }
}

function setupEncomendas() {
    const form = document.getElementById('formNovaEncomenda');
    const msg = document.getElementById('novaEncomendaMsg');
    const container = document.querySelector('.js-encomendas');

    form?.addEventListener('submit', async (e) => {
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
        } catch (err) {
            msg.className = 'feedback-message error';
            msg.textContent = 'Erro ao registrar.';
            showGlobalFeedback('Erro ao registrar encomenda.', 'error');
        }
    });

    container?.addEventListener('click', async (ev) => {
        if (ev.target.classList.contains('btn-retirar')) {
            const id = ev.target.dataset.id;
            if (confirm('Confirmar retirada da encomenda?')) {
                try {
                    await apiClient.post(`/syndic/encomendas/${id}/retirar`, {});
                    await carregarEncomendas();
                } catch (err) {
                    console.error('Erro ao registrar retirada:', err);
                    showGlobalFeedback('Erro ao registrar retirada', 'error');
                }
            }
        }
    });
}
