import apiClient from './apiClient.js';
import { requireAuth } from './auth.js';
import { showGlobalFeedback } from './main.js';

// --- Global state & constants ---
// Notices
let currentNoticePage = 1; isLoadingNotices = false; noMoreNotices = false;
const noticesContainerSelector = '.js-avisos'; const noticeScrollSentinelId = 'notice-scroll-sentinel';
let fetchedNotices = [];

// Modals (Avisos)
let criarAvisoModal; let formCriarAviso; let avisoIdField;

// Modals (Enquetes)
let criarEnqueteModal; let formCriarEnquete; let enqueteIdField;
let modalEnqueteTitle; let formEnqueteSubmitButton;

// Chamados
let chamadosData = [];
let criarChamadoModal; let formCriarChamado; let chamadoIdFieldModal;
let modalChamadoTitle; let formChamadoSubmitButtonModal; // Renamed to avoid conflict
let chamadosListContainer; let chamadoDetailSection; let chamadoDetailContent;
let chamadoDetailTitle; let chamadosFiltersSection; let chamadosListSection;
let backToChamadosListButton; let submitChamadoCommentButton; let chamadoCommentText;
let chamadoInteractionsContainer; let chamadoStatusModalFormGroup; let chamadoCategoriaModalFormGroup;


document.addEventListener('DOMContentLoaded', async () => {
    requireAuth();

    criarAvisoModal = document.getElementById('modal-criar-aviso');
    formCriarAviso = document.getElementById('form-criar-aviso');
    avisoIdField = document.getElementById('aviso-id');

    criarEnqueteModal = document.getElementById('modal-criar-enquete');
    formCriarEnquete = document.getElementById('form-criar-enquete');
    enqueteIdField = document.getElementById('enquete-id');
    modalEnqueteTitle = document.getElementById('modal-enquete-title');
    formEnqueteSubmitButton = document.getElementById('form-enquete-submit-button');

    criarChamadoModal = document.getElementById('modal-criar-chamado');
    formCriarChamado = document.getElementById('form-criar-chamado');
    chamadoIdFieldModal = document.getElementById('chamado-id');
    modalChamadoTitle = document.getElementById('modal-chamado-title');
    formChamadoSubmitButtonModal = document.getElementById('form-chamado-submit-button');
    chamadosListContainer = document.querySelector('.js-chamados-list');
    chamadoDetailSection = document.getElementById('chamado-detail-section');
    chamadoDetailContent = document.querySelector('.js-chamado-detail-content');
    chamadoDetailTitle = document.querySelector('.js-chamado-detail-title');
    chamadosFiltersSection = document.getElementById('chamados-filters-section');
    chamadosListSection = document.getElementById('chamados-list-section');
    backToChamadosListButton = document.querySelector('.js-back-to-chamados-list');
    submitChamadoCommentButton = document.getElementById('submit-chamado-comment');
    chamadoCommentText = document.getElementById('chamado-comment-text');
    chamadoInteractionsContainer = document.querySelector('.js-chamado-interactions');
    chamadoStatusModalFormGroup = document.querySelector('#modal-criar-chamado .js-chamado-status-form-group');
    chamadoCategoriaModalFormGroup = document.querySelector('#modal-criar-chamado .js-chamado-categoria-form-group');

    setupTabs();

    await loadStickyNotices(); await loadInitialNotices(); setupNoticeObserver();
    updateUserSpecificUI(); setupFilterButtonListener(); setupModalEventListeners();
});

// --- Tab System ---
function setupTabs() {
    const tabButtons = document.querySelectorAll('.cv-tab-button');
    const tabContents = document.querySelectorAll('.cv-tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabContents.forEach(content => content.style.display = 'none');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const targetContentId = 'content-' + button.id.split('-')[1];
            const targetContent = document.getElementById(targetContentId);
            if (targetContent) targetContent.style.display = 'block';

            if (button.id === 'tab-enquetes' && !button.dataset.initialized) { setupEnquetesTab(); button.dataset.initialized = 'true'; }
            if (button.id === 'tab-chamados' && !button.dataset.initialized) { setupChamadosTab(); button.dataset.initialized = 'true'; }
        });
    });
    const activeTab = document.querySelector('.cv-tab-button.active');
    if (activeTab) {
        const activeContentId = 'content-' + activeTab.id.split('-')[1];
        const activeContent = document.getElementById(activeContentId);
        if (activeContent) activeContent.style.display = 'block';
        if (activeTab.id === 'tab-chamados' && !activeTab.dataset.initialized) { setupChamadosTab(); activeTab.dataset.initialized = 'true'; }
        if (activeTab.id === 'tab-enquetes' && !activeTab.dataset.initialized) { setupEnquetesTab(); activeTab.dataset.initialized = 'true'; }
    }
}

// --- Mural Digital: Avisos (Condensed) ---
function openCriarAvisoModal() { /* ... */ } function openEditAvisoModal(noticeId) { /* ... */ } function closeCriarAvisoModal() { /* ... */ } function setupModalEventListeners() { /* ... */ } function setupNoticeActionButtons() { /* ... */ } async function handleDeleteAviso(noticeId) { /* ... */ } async function loadStickyNotices() { /* ... */ } function updateUserSpecificUI() { /* ... */ } function setupFilterButtonListener() { /* ... */ } async function loadInitialNotices() { /* ... */ } function setupNoticeObserver() { /* ... */ } async function fetchAndDisplayNotices(page, append = false) { /* ... */ }
function openCriarAvisoModal() { if (criarAvisoModal && formCriarAviso && avisoIdField) { formCriarAviso.reset(); avisoIdField.value = ''; criarAvisoModal.querySelector('h2').textContent = 'Criar Novo Aviso'; formCriarAviso.querySelector('button[type="submit"]').textContent = 'Salvar Aviso'; criarAvisoModal.style.display = 'flex'; } } function openEditAvisoModal(noticeId) { if (criarAvisoModal && formCriarAviso && avisoIdField) { const noticeData = fetchedNotices.find(n => n.id === noticeId); if (!noticeData) { showGlobalFeedback('Erro: Dados do aviso não encontrados.', 'error'); return; } formCriarAviso.reset(); avisoIdField.value = noticeData.id; document.getElementById('aviso-titulo').value = noticeData.titulo || ''; document.getElementById('aviso-corpo').value = noticeData.corpo || ''; const categoriasSelect = document.getElementById('aviso-categorias'); if (noticeData.categorias && categoriasSelect) { Array.from(categoriasSelect.options).forEach(option => option.selected = false); noticeData.categorias.forEach(catValue => { const option = Array.from(categoriasSelect.options).find(opt => opt.value === catValue); if (option) option.selected = true; }); } criarAvisoModal.querySelector('h2').textContent = 'Editar Aviso'; formCriarAviso.querySelector('button[type="submit"]').textContent = 'Salvar Alterações'; criarAvisoModal.style.display = 'flex'; } } function closeCriarAvisoModal() { if (criarAvisoModal) criarAvisoModal.style.display = 'none'; } function setupModalEventListeners() { document.querySelectorAll('.js-modal-criar-aviso-close').forEach(btn => btn.addEventListener('click', closeCriarAvisoModal)); if (criarAvisoModal) window.addEventListener('click', (event) => { if (event.target === criarAvisoModal) closeCriarAvisoModal(); }); if (formCriarAviso && avisoIdField) { formCriarAviso.addEventListener('submit', async (event) => { event.preventDefault(); const currentAvisoId = avisoIdField.value; if (currentAvisoId) { showGlobalFeedback('Salvando alterações... (simulado)', 'info'); await new Promise(resolve => setTimeout(resolve, 1000)); showGlobalFeedback('Aviso atualizado! (simulado)', 'success'); } else { showGlobalFeedback('Criando aviso... (simulado)', 'info'); await new Promise(resolve => setTimeout(resolve, 1000)); showGlobalFeedback('Aviso criado! (simulado)', 'success'); } closeCriarAvisoModal(); await loadInitialNotices(); }); } } function setupNoticeActionButtons() { document.querySelectorAll('.js-edit-aviso').forEach(button => { const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button); newButton.addEventListener('click', (event) => openEditAvisoModal(parseInt(event.target.dataset.id, 10))); }); document.querySelectorAll('.js-delete-aviso').forEach(button => { const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button); newButton.addEventListener('click', async (event) => { if (confirm('Tem certeza?')) await handleDeleteAviso(parseInt(event.target.dataset.id, 10)); }); }); } async function handleDeleteAviso(noticeId) { showGlobalFeedback('Excluindo aviso... (simulado)', 'info'); await new Promise(resolve => setTimeout(resolve, 1000)); fetchedNotices = fetchedNotices.filter(n => n.id !== noticeId); const cardToRemove = document.querySelector(`.js-avisos .cv-card [data-id="${noticeId}"]`)?.closest('.cv-card'); if (cardToRemove) cardToRemove.remove(); else await loadInitialNotices(); showGlobalFeedback('Aviso excluído! (simulado)', 'success'); } async function loadStickyNotices() { const stickyContainer = document.querySelector('.js-sticky-notices'); if (!stickyContainer) return; stickyContainer.innerHTML = `<article class="cv-card communication__post"><h3 class="communication__post-title">Aviso Urgente Fixo Exemplo</h3><p>Este é um exemplo de aviso fixo.</p></article>`; } function updateUserSpecificUI() { const fabMural = document.querySelector('.js-fab-mural'); if (fabMural) { fabMural.style.display = 'block'; fabMural.addEventListener('click', openCriarAvisoModal); } } function setupFilterButtonListener() { const btn = document.getElementById('apply-filters-button'); if (btn) btn.addEventListener('click', () => { showGlobalFeedback("Filtros aplicados (simulado).", 'info'); loadInitialNotices(); }); } async function loadInitialNotices() { currentNoticePage = 1; noMoreNotices = false; isLoadingNotices = false; fetchedNotices = []; const container = document.querySelector(noticesContainerSelector); if (!container) return; let sentinel = document.getElementById(noticeScrollSentinelId); if (!sentinel) { sentinel = document.createElement('div'); sentinel.id = noticeScrollSentinelId; sentinel.style.height = '10px'; container.appendChild(sentinel); } sentinel.style.display = 'block'; await fetchAndDisplayNotices(currentNoticePage, false); } function setupNoticeObserver() { const sentinel = document.getElementById(noticeScrollSentinelId); if (!sentinel) return;  const observer = new IntersectionObserver(async entries => { if (entries[0].isIntersecting && !isLoadingNotices && !noMoreNotices) { currentNoticePage++; await fetchAndDisplayNotices(currentNoticePage, true); } }, { root: null, threshold: 0.1 }); observer.observe(sentinel); } async function fetchAndDisplayNotices(page, append = false) { if (isLoadingNotices) return; isLoadingNotices = true; const container = document.querySelector(noticesContainerSelector); if (!container) { isLoadingNotices = false; return; } const sentinelElement = document.getElementById(noticeScrollSentinelId); if (!append) { fetchedNotices = []; container.innerHTML = '<p class="cv-loading-message">Carregando...</p>'; if (sentinelElement) container.appendChild(sentinelElement); } const simResp = { items: [] }; if (page === 1 && !append) { simResp.items.push({ id: 1, titulo: "Manutenção Elevador", corpo: "Terça-feira.", categorias: ["manutencao"] }); simResp.items.push({ id: 2, titulo: "Festa Junina", corpo: "No salão!", categorias: ["comunicados"] }); } else if (page === 2 && append) { simResp.items.push({ id: 3, titulo: "Coleta Seletiva", corpo: "Separar lixo.", categorias: ["comunicados"] }); } const avisos = simResp.items; if (append) fetchedNotices.push(...avisos); else fetchedNotices = avisos; if (!append) { container.innerHTML = ''; if (sentinelElement) container.appendChild(sentinelElement); } if (avisos && avisos.length > 0) { avisos.forEach(a => { const art = document.createElement('article'); art.className = 'cv-card communication__post'; art.dataset.noticeId = a.id; art.innerHTML = `<h3 class="communication__post-title">${a.titulo}</h3><p>${a.corpo}</p><div class="communication__post-meta">Cat: ${a.categorias.join(', ')}</div><div class="communication__post-actions"><button class="cv-button-link js-edit-aviso" data-id="${a.id}">Editar</button><button class="cv-button-link danger js-delete-aviso" data-id="${a.id}">Excluir</button></div>`; if (sentinelElement) container.insertBefore(art, sentinelElement); else container.appendChild(art); }); } else { if (page > 1) noMoreNotices = true; if (sentinelElement) sentinelElement.style.display = 'none'; if (!append && fetchedNotices.length === 0) container.innerHTML = '<p>Nenhum aviso.</p>'; } setupNoticeActionButtons(); isLoadingNotices = false; }

// --- Enquetes e Votações Tab (Condensed) ---
let sampleActivePolls = [ { id: 'poll1', question: 'Cor do hall?', options: [ { id: 'opt1_1', text: 'Azul' },{ id: 'opt1_2', text: 'Verde' } ], deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), type: 'informal', hasVotes: false }, { id: 'poll2', question: 'Bicicletário G2?', options: [ { id: 'opt2_1', text: 'Sim' }, { id: 'opt2_2', text: 'Não' } ], deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), type: 'formal_assembleia', hasVotes: true }];
let userVotes = { 'poll2': 'opt2_1' };
let samplePastPolls = [ { id: 'pastPoll1', question: 'Reforma fachada', options: [ { id: 'popt1_1', text: 'Alfa', votes: 15 }, { id: 'popt1_2', text: 'Beta', votes: 35 } ], closedDate: new Date('2023-10-15T17:00:00Z').toISOString(), type: 'formal_assembleia', totalVotes: 70 }];
function setupEnquetesTab(){/*...*/} function openCreateEnqueteModal(){/*...*/} async function handleCreateEnquete(data){/*...*/} async function loadActiveEnquetes(){/*...*/} function attachEnqueteAdminActionListeners(){/*...*/} function openEditEnqueteModal(pollId){/*...*/} async function handleUpdateEnquete(id,data){/*...*/} async function handleEndEnquete(pollId){/*...*/} async function handleDeleteEnquete(pollId){/*...*/} function attachVoteButtonListeners(){/*...*/} function attachViewResultsButtonListeners(){/*...*/} function getWinningOptionText(poll){/*...*/} async function loadHistoricoEnquetes(filters={}){} function viewPollResults(pollId,isFromHistory=false){/*...*/} function setupEnqueteModalAndFAB(){/*...*/} function setupEnquetesFilters(){/*...*/}
function setupEnquetesTab() { loadActiveEnquetes(); loadHistoricoEnquetes(); setupEnqueteModalAndFAB(); setupEnquetesFilters(); const backButton = document.querySelector('#content-enquetes .js-back-to-active-enquetes'); if (backButton) { backButton.addEventListener('click', () => { document.getElementById('enquetes-resultados-section').style.display = 'none'; document.getElementById('enquetes-ativas-section').style.display = 'block'; if(document.getElementById('enquetes-historico-section')) document.getElementById('enquetes-historico-section').style.display = 'block';}); } }
function openCreateEnqueteModal() { if (criarEnqueteModal) { formCriarEnquete.reset(); enqueteIdField.value = ''; modalEnqueteTitle.textContent = 'Nova Enquete'; formEnqueteSubmitButton.textContent = 'Salvar Enquete'; criarEnqueteModal.style.display = 'flex'; } }
async function handleCreateEnquete(data) { const newPollId = 'poll' + Date.now(); const newPoll = { id: newPollId, question: data.pergunta, options: data.opcoes.map((opt, i) => ({ id: `opt${newPollId}_${i}`, text: opt })), deadline: new Date(data.prazo).toISOString(), type: data.tipo, hasVotes: false }; sampleActivePolls.push(newPoll); showGlobalFeedback('Enquete criada! (simulado)', 'success'); loadActiveEnquetes(); }
async function loadActiveEnquetes() { const container = document.querySelector('.js-enquetes-ativas-list'); if (!container) return; container.innerHTML = '<p>Carregando...</p>'; await new Promise(r => setTimeout(r, 300)); const polls = JSON.parse(JSON.stringify(sampleActivePolls)); container.innerHTML = ''; if (!polls || polls.length === 0) { container.innerHTML = '<p>Nenhuma enquete ativa.</p>'; return; } polls.forEach(p => { const card = document.createElement('div'); card.className = 'cv-card communication__poll-card'; card.dataset.pollId = p.id; const voted = userVotes[p.id]; let optsHtml = '<div class="poll-options">'; if (!voted) p.options.forEach(opt => optsHtml += `<button class="cv-button vote-option" data-poll-id="${p.id}" data-option-id="${opt.id}">${opt.text}</button>`); else optsHtml += `<p>Sua escolha: <strong>${p.options.find(o=>o.id===voted)?.text||'N/A'}</strong></p>`; optsHtml+='</div>'; const adminActs = `<div class="admin-actions"><button class="cv-button-link edit-enquete" data-poll-id="${p.id}">Editar</button><button class="cv-button-link end-enquete" data-poll-id="${p.id}">Encerrar</button><button class="cv-button-link danger delete-enquete" data-poll-id="${p.id}">Excluir</button></div>`; card.innerHTML = `<h4>${p.question}</h4><p>Prazo: ${new Date(p.deadline).toLocaleString()}</p><p class="poll-status ${voted?'voted':'not-voted'}">${voted?'Você já votou':'Votação aberta'}</p>${optsHtml}<button class="cv-button-link view-results" data-poll-id="${p.id}">Ver Resultados</button>${adminActs}`; container.appendChild(card); }); attachVoteButtonListeners(); attachViewResultsButtonListeners(); attachEnqueteAdminActionListeners(); }
function attachEnqueteAdminActionListeners() { document.querySelectorAll('.edit-enquete').forEach(b => { const newB = b.cloneNode(true); b.parentNode.replaceChild(newB, b); newB.addEventListener('click', e => openEditEnqueteModal(e.target.dataset.pollId)); }); document.querySelectorAll('.end-enquete').forEach(b => { const newB = b.cloneNode(true); b.parentNode.replaceChild(newB, b); newB.addEventListener('click', e => { if (confirm('Encerrar?')) handleEndEnquete(e.target.dataset.pollId); }); }); document.querySelectorAll('.delete-enquete').forEach(b => { const newB = b.cloneNode(true); b.parentNode.replaceChild(newB, b); newB.addEventListener('click', e => { if (confirm('Excluir?')) handleDeleteEnquete(e.target.dataset.pollId); }); }); }
function openEditEnqueteModal(pollId) { const poll = sampleActivePolls.find(p => p.id === pollId); if (!poll) { showGlobalFeedback('Enquete não encontrada.', 'error'); return; } if (poll.hasVotes) { showGlobalFeedback('Enquete com votos não pode ser editada.', 'warning'); return; } if (criarEnqueteModal) { formCriarEnquete.reset(); enqueteIdField.value = poll.id; modalEnqueteTitle.textContent = 'Editar Enquete'; document.getElementById('enquete-pergunta').value = poll.question; document.getElementById('enquete-opcoes').value = poll.options.map(opt => opt.text).join('\n'); document.getElementById('enquete-prazo').value = poll.deadline.substring(0, 16); document.getElementById('enquete-tipo').value = poll.type; formEnqueteSubmitButton.textContent = 'Salvar Alterações'; criarEnqueteModal.style.display = 'flex'; } }
async function handleUpdateEnquete(id, data) { const idx = sampleActivePolls.findIndex(p => p.id === id); if (idx > -1) { sampleActivePolls[idx] = { ...sampleActivePolls[idx], question: data.pergunta, options: data.opcoes.map((txt, i) => ({ id: `opt${id}_${i}`, text: txt })), deadline: new Date(data.prazo).toISOString(), type: data.tipo }; showGlobalFeedback('Enquete atualizada! (simulado)', 'success'); loadActiveEnquetes(); } else { showGlobalFeedback('Erro ao atualizar.', 'error'); } }
async function handleEndEnquete(pollId) { const idx = sampleActivePolls.findIndex(p => p.id === pollId); if (idx > -1) { const poll = sampleActivePolls.splice(idx, 1)[0]; poll.closedDate = new Date().toISOString(); poll.totalVotes = Math.floor(Math.random()*50+10); poll.options.forEach(o => o.votes = Math.floor(Math.random()*(poll.totalVotes/poll.options.length+15))); let sumVotes=poll.options.reduce((s,o)=>s+o.votes,0); if(sumVotes>0){const factor=poll.totalVotes/sumVotes; poll.options.forEach(o=>o.votes=Math.round(o.votes*factor)); poll.totalVotes=poll.options.reduce((s,o)=>s+o.votes,0);} samplePastPolls.unshift(poll); showGlobalFeedback('Enquete encerrada! (simulado)', 'success'); loadActiveEnquetes(); loadHistoricoEnquetes(); } else { showGlobalFeedback('Erro ao encerrar.', 'error'); } }
async function handleDeleteEnquete(pollId) { const poll = sampleActivePolls.find(p => p.id === pollId); if (poll && poll.hasVotes) { showGlobalFeedback('Enquetes com votos não podem ser excluídas.', 'warning'); return; } sampleActivePolls = sampleActivePolls.filter(p => p.id !== pollId); showGlobalFeedback('Enquete excluída! (simulado)', 'success'); loadActiveEnquetes(); }
function attachVoteButtonListeners() { document.querySelectorAll('.js-enquetes-ativas-list .vote-option').forEach(b => { const newB = b.cloneNode(true); b.parentNode.replaceChild(newB, b); newB.addEventListener('click', async e => { userVotes[e.target.dataset.pollId] = e.target.dataset.optionId; showGlobalFeedback('Voto registrado!', 'success'); await loadActiveEnquetes(); }); }); }
function attachViewResultsButtonListeners() { document.querySelectorAll('.js-enquetes-ativas-list .view-results, .js-enquetes-historico-list .view-full-results').forEach(b => { const newB = b.cloneNode(true); b.parentNode.replaceChild(newB, b); newB.addEventListener('click', e => { viewPollResults(e.target.dataset.pollId, newB.classList.contains('view-full-results')); }); }); }
function getWinningOptionText(poll) { if (!poll.options || poll.options.length === 0) return 'N/A'; let winning = poll.options.reduce((p, c) => (p.votes > c.votes) ? p : c); return `${winning.text} (${winning.votes} votos)`; }
async function loadHistoricoEnquetes(filters = {}) { const container = document.querySelector('.js-enquetes-historico-list'); if (!container) return; container.innerHTML = '<p>Carregando...</p>'; await new Promise(r => setTimeout(r, 300)); let polls = JSON.parse(JSON.stringify(samplePastPolls)); if (filters.period) polls = polls.filter(p => p.closedDate.startsWith(filters.period)); if (filters.type) polls = polls.filter(p => p.type === filters.type); container.innerHTML = ''; if (!polls || polls.length === 0) { container.innerHTML = '<p>Nenhum histórico.</p>'; return; } polls.forEach(p => { const card = document.createElement('div'); card.className = 'cv-card communication__poll-card past-poll-card'; card.innerHTML = `<h4>${p.question}</h4><p>Encerrada: ${new Date(p.closedDate).toLocaleDateString()}</p><p>Tipo: ${p.type}</p><p><strong>Resultado:</strong> ${getWinningOptionText(p)} (${p.totalVotes} votos)</p><button class="cv-button-link view-full-results" data-poll-id="${p.id}">Ver Detalhes</button>`; container.appendChild(card); }); attachViewResultsButtonListeners(); }
function viewPollResults(pollId, isFromHistory = false) { document.getElementById('enquetes-ativas-section').style.display = 'none'; const histSect = document.getElementById('enquetes-historico-section'); if(isFromHistory && histSect) histSect.style.display = 'none'; const resultsSect = document.getElementById('enquetes-resultados-section'); const detailsCont = resultsSect.querySelector('.js-enquete-resultados-details'); const src = isFromHistory ? samplePastPolls : sampleActivePolls; const poll = src.find(p => p.id === pollId); if (!poll) { detailsCont.innerHTML = '<p>Erro: Enquete não encontrada.</p>'; resultsSect.style.display = 'block'; return; } detailsCont.innerHTML = `<p>Carregando para "${poll.question}"...</p>`; setTimeout(() => { let html = `<h4>${isFromHistory ? 'Resultado Final' : 'Resultados Parciais'}: ${poll.question}</h4>`; poll.options.forEach(opt => { let perc=0, votes=0; if(isFromHistory){votes=opt.votes; perc=poll.totalVotes>0?((votes/poll.totalVotes)*100).toFixed(1):0;}else{votes=Math.floor(Math.random()*30);perc=Math.floor(Math.random()*100);} html+=`<div class="poll-result-item"><span class="poll-result-option-text">${opt.text} (${votes} votos):</span><div class="poll-result-bar-container"><div class="poll-result-bar" style="width:${perc}%; background-color:var(${isFromHistory?'--current-semantic-success':'--current-primary-blue'});">${perc}%</div></div></div>`; }); if(isFromHistory) html+=`<p>Total de votos: ${poll.totalVotes}</p>`; else html+=`<p>Total parcial (simulado): ${Math.floor(Math.random()*50+10)}</p>`; detailsCont.innerHTML = html; }, 300); resultsSect.style.display = 'block'; }
function setupEnqueteModalAndFAB() { const fab = document.querySelector('.js-fab-enquetes'); if (fab) { fab.style.display = 'block'; fab.addEventListener('click', openCreateEnqueteModal); } if (criarEnqueteModal) { document.querySelectorAll('.js-modal-criar-enquete-close').forEach(b => b.addEventListener('click', () => criarEnqueteModal.style.display = 'none')); window.addEventListener('click', e => { if (e.target === criarEnqueteModal) criarEnqueteModal.style.display = 'none'; }); } if (formCriarEnquete) { formCriarEnquete.addEventListener('submit', async e => { e.preventDefault(); const id = enqueteIdField.value; const data = { pergunta: document.getElementById('enquete-pergunta').value, opcoes: document.getElementById('enquete-opcoes').value.split('\n').filter(opt => opt.trim() !== ''), prazo: document.getElementById('enquete-prazo').value, tipo: document.getElementById('enquete-tipo').value }; if (id) await handleUpdateEnquete(id, data); else await handleCreateEnquete(data); if(criarEnqueteModal) criarEnqueteModal.style.display = 'none'; }); } }
function setupEnquetesFilters() { const btn = document.getElementById('apply-enquete-filters-button'); if (btn) { btn.addEventListener('click', () => { const period = document.getElementById('enquete-period-filter').value; const type = document.getElementById('enquete-tipo-filter').value; showGlobalFeedback(`Filtrando: P=${period||'Todos'}, T=${type||'Todos'}.`, 'info'); loadHistoricoEnquetes({ period, type }); }); } }


// --- Chamados e Solicitações Tab ---
const sampleChamados = [
    { id: 'chamado1', titulo: 'Lâmpada queimada corredor Bloco B, 2º andar', status: 'aberto', dataAbertura: new Date('2024-03-10T10:00:00Z').toISOString(), ultimaAtualizacao: new Date('2024-03-10T10:00:00Z').toISOString(), categoria: 'manutencao_geral', userOwns: true, interactions: [{ user: 'Morador Unidade 101', date: new Date('2024-03-10T10:05:00Z').toISOString(), text: 'A lâmpada da escada também está piscando.', type: 'comment' },{ user: 'Síndico Admin', date: new Date('2024-03-10T11:00:00Z').toISOString(), text: 'Recebido. Equipe de manutenção notificada.', type: 'comment' }], attachments: [{fileName: 'foto_corredor.jpg', url: '#'}] },
    { id: 'chamado2', titulo: 'Vazamento na torneira da churrasqueira', status: 'em_andamento', dataAbertura: new Date('2024-03-08T15:30:00Z').toISOString(), ultimaAtualizacao: new Date('2024-03-09T09:15:00Z').toISOString(), categoria: 'manutencao_geral', userOwns: false, interactions: [], attachments: [] },
    { id: 'chamado3', titulo: 'Portão da garagem não fecha completamente', status: 'concluido', dataAbertura: new Date('2024-02-20T08:00:00Z').toISOString(), ultimaAtualizacao: new Date('2024-02-25T17:00:00Z').toISOString(), categoria: 'seguranca', userOwns: true, interactions: [{user: 'Síndico Admin', date: new Date('2024-02-25T17:00:00Z').toISOString(), text: 'Serviço concluído pela empresa X.', type: 'status_change', newStatus: 'concluido'}], attachments: [] },
    { id: 'chamado4', titulo: 'Limpeza da área comum pós-evento', status: 'aberto', dataAbertura: new Date('2024-03-11T09:00:00Z').toISOString(), ultimaAtualizacao: new Date('2024-03-11T09:00:00Z').toISOString(), categoria: 'limpeza', userOwns: false, interactions: [], attachments: [{fileName: 'fotos_area_suja.zip', url: '#'}]}
];

function formatChamadoStatus(status) {
    const map = { 'aberto': 'Aberto', 'em_andamento': 'Em Andamento', 'concluido': 'Concluído' };
    return map[status] || status;
}
function formatChamadoCategoria(categoria) {
    const map = { 'limpeza': 'Limpeza', 'seguranca': 'Segurança', 'manutencao_geral': 'Manutenção Geral', 'barulho': 'Barulho', 'outros': 'Outros' };
    return map[categoria] || categoria;
}

function setupChamadosTab() {
    console.log("Chamados tab selected/loaded");
    if (chamadosData.length === 0) {
        chamadosData = JSON.parse(JSON.stringify(sampleChamados));
    }
    loadChamadosList();
    setupChamadoModalAndFAB();
    setupChamadoFilters();
    setupChamadoDetailViewBackButton();
}

async function loadChamadosList(filters = {}) {
    if (!chamadosListContainer) return;
    chamadosListContainer.innerHTML = '<p class="cv-loading-message">Carregando chamados...</p>';
    await new Promise(resolve => setTimeout(resolve, 300));

    let filteredChamados = JSON.parse(JSON.stringify(chamadosData));

    if (filters.status) {
        filteredChamados = filteredChamados.filter(c => c.status === filters.status);
    }
    if (filters.date) {
        filteredChamados = filteredChamados.filter(c => c.dataAbertura.startsWith(filters.date));
    }
    if (filters.category) {
        filteredChamados = filteredChamados.filter(c => c.categoria === filters.category);
    }

    chamadosListContainer.innerHTML = '';
    if (!filteredChamados || filteredChamados.length === 0) {
        chamadosListContainer.innerHTML = '<p>Nenhum chamado encontrado para os filtros aplicados.</p>';
        return;
    }

    filteredChamados.forEach(chamado => {
        const card = document.createElement('div');
        card.className = `cv-card chamado-card chamado-status-${chamado.status}`;
        card.dataset.chamadoId = chamado.id;
        // Placeholder for admin check for manage button
        const isAdmin = true; // Simulate admin for now
        const manageButtonHtml = isAdmin ? `<button class="cv-button-link manage-chamado" data-chamado-id="${chamado.id}">Gerenciar</button>` : '';

        card.innerHTML = `
            <h4>${chamado.titulo}</h4>
            <p class="chamado-meta">Status: <span class="status-text">${formatChamadoStatus(chamado.status)}</span></p>
            <p class="chamado-meta">Aberto em: ${new Date(chamado.dataAbertura).toLocaleDateString()}</p>
            <p class="chamado-meta">Última Atualização: ${new Date(chamado.ultimaAtualizacao).toLocaleDateString()}</p>
            <p class="chamado-meta">Categoria: ${formatChamadoCategoria(chamado.categoria)}</p>
            <button class="cv-button-link view-chamado-detail" data-chamado-id="${chamado.id}">Ver Detalhes</button>
            ${manageButtonHtml}
        `;
        chamadosListContainer.appendChild(card);
    });
    attachViewChamadoDetailButtonListeners();
    attachManageChamadoButtonListeners(); // Attach listeners for the new manage buttons
}

function attachViewChamadoDetailButtonListeners() {
    document.querySelectorAll('.chamados-list .view-chamado-detail').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (event) => {
            viewChamadoDetail(event.target.dataset.chamadoId);
        });
    });
}

function viewChamadoDetail(chamadoId) {
    const chamado = chamadosData.find(c => c.id === chamadoId);
    if (!chamado) { showGlobalFeedback('Erro: Chamado não encontrado.', 'error'); return; }

    if (chamadosListSection) chamadosListSection.style.display = 'none';
    if (chamadosFiltersSection) chamadosFiltersSection.style.display = 'none';
    if (chamadoDetailSection) chamadoDetailSection.style.display = 'block';

    if (chamadoDetailTitle) chamadoDetailTitle.textContent = chamado.titulo;

    let detailHtml = `
        <p><strong>Status:</strong> <span class="status-text chamado-status-${chamado.status}">${formatChamadoStatus(chamado.status)}</span></p>
        <p><strong>Categoria:</strong> ${formatChamadoCategoria(chamado.categoria)}</p>
        <p><strong>Aberto em:</strong> ${new Date(chamado.dataAbertura).toLocaleString()}</p>
        <p><strong>Última Atualização:</strong> ${new Date(chamado.ultimaAtualizacao).toLocaleString()}</p>
        <p><strong>Descrição:</strong></p>
        <p>${chamado.descricao || 'Nenhuma descrição fornecida.'}</p>`;

    if (chamado.attachments && chamado.attachments.length > 0) {
        detailHtml += `<h4>Anexos:</h4><ul>`;
        chamado.attachments.forEach(att => { detailHtml += `<li><a href="${att.url}" target="_blank">${att.fileName}</a></li>`; });
        detailHtml += `</ul>`;
    }
    if (chamadoDetailContent) chamadoDetailContent.innerHTML = detailHtml;
    renderChamadoInteractions(chamado);
    if (chamadoDetailSection) chamadoDetailSection.dataset.currentChamadoId = chamadoId;
    setupChamadoCommentSubmission(chamadoId);
}

function renderChamadoInteractions(chamado) {
    if (!chamadoInteractionsContainer) return;
    chamadoInteractionsContainer.innerHTML = '<h4>Histórico de Interações:</h4>';
    if (chamado.interactions && chamado.interactions.length > 0) {
        chamado.interactions.forEach(interaction => {
            const item = document.createElement('div'); item.className = 'interaction-item';
            let text = interaction.text;
            if (interaction.type === 'status_change') text = `Status alterado para: ${formatChamadoStatus(interaction.newStatus || '')}. ${interaction.text || ''}`;
            item.innerHTML = `<p class="meta"><strong>${interaction.user}</strong> em ${new Date(interaction.date).toLocaleString()}</p><p>${text}</p>`;
            chamadoInteractionsContainer.appendChild(item);
        });
    } else {
        chamadoInteractionsContainer.innerHTML += '<p>Nenhuma interação ainda.</p>';
    }
}

function setupChamadoCommentSubmission(chamadoId) {
    if (!submitChamadoCommentButton || !chamadoCommentText) return;
    const newSubmitButton = submitChamadoCommentButton.cloneNode(true);
    submitChamadoCommentButton.parentNode.replaceChild(newSubmitButton, submitChamadoCommentButton);
    submitChamadoCommentButton = newSubmitButton;
    submitChamadoCommentButton.onclick = () => {
        const commentTextValue = chamadoCommentText.value.trim();
        if (!commentTextValue) { showGlobalFeedback('Comentário não pode estar vazio.', 'warning'); return; }
        const currentChamadoId = chamadoDetailSection.dataset.currentChamadoId;
        if(currentChamadoId !== chamadoId) { console.error("ID de chamado inconsistente."); return; }
        const chamado = chamadosData.find(c => c.id === currentChamadoId);
        if (!chamado) { showGlobalFeedback('Erro: Chamado não encontrado.', 'error'); return; }
        const currentUser = "Usuário Logado (Simulado)";
        const newInteraction = { user: currentUser, date: new Date().toISOString(), text: commentTextValue, type: 'comment' };
        if (!chamado.interactions) chamado.interactions = [];
        chamado.interactions.push(newInteraction);
        chamado.ultimaAtualizacao = new Date().toISOString();
        showGlobalFeedback('Comentário adicionado!', 'success');
        chamadoCommentText.value = '';
        renderChamadoInteractions(chamado);
    };
}

function openCreateChamadoModal() {
    if (criarChamadoModal && formCriarChamado && chamadoIdFieldModal && modalChamadoTitle && formChamadoSubmitButtonModal && chamadoStatusModalFormGroup && chamadoCategoriaModalFormGroup) {
        formCriarChamado.reset();
        chamadoIdFieldModal.value = '';
        modalChamadoTitle.textContent = 'Novo Chamado';
        formChamadoSubmitButtonModal.textContent = 'Abrir Chamado';
        chamadoStatusModalFormGroup.style.display = 'none';
        chamadoCategoriaModalFormGroup.style.display = 'block';
        criarChamadoModal.style.display = 'flex';
    }
}

async function handleCreateChamado(data) {
    console.log("Creating chamado:", data);
    const newChamadoId = 'chamado' + Date.now();
    const now = new Date().toISOString();
    const newChamado = {
        id: newChamadoId,
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        status: 'aberto', // Initial status
        dataAbertura: now,
        ultimaAtualizacao: now,
        userOwns: true, // Assuming creator owns the chamado
        interactions: [{user: "Usuário Logado (Simulado)", date: now, text: "Chamado criado.", type: "creation"}],
        attachments: [] // Handle attachments if data.anexos exists
    };
    chamadosData.unshift(newChamado); // Add to the beginning of the array
    showGlobalFeedback('Chamado aberto com sucesso (simulado)!', 'success');
    loadChamadosList();
}

function attachManageChamadoButtonListeners() {
    document.querySelectorAll('.manage-chamado').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (event) => {
            // Simulate admin role for now
            openEditChamadoModal(event.target.dataset.chamadoId, true);
        });
    });
}

function openEditChamadoModal(chamadoId, isAdmin = false) {
    const chamado = chamadosData.find(c => c.id === chamadoId);
    if (!chamado) { showGlobalFeedback('Chamado não encontrado.', 'error'); return; }

    if (criarChamadoModal && formCriarChamado && chamadoIdFieldModal && modalChamadoTitle && formChamadoSubmitButtonModal && chamadoStatusModalFormGroup && chamadoCategoriaModalFormGroup) {
        formCriarChamado.reset();
        chamadoIdFieldModal.value = chamado.id;
        modalChamadoTitle.textContent = 'Gerenciar Chamado';
        document.getElementById('chamado-titulo-modal').value = chamado.titulo;
        document.getElementById('chamado-descricao-modal').value = chamado.descricao;
        document.getElementById('chamado-categoria-modal').value = chamado.categoria;
        // Anexos: show existing, allow removal, allow new. For now:
        document.getElementById('chamado-anexos-modal').value = ''; // Clear file input

        if (isAdmin) {
            chamadoStatusModalFormGroup.style.display = 'block';
            document.getElementById('chamado-status-modal').value = chamado.status;
            chamadoCategoriaModalFormGroup.style.display = 'none'; // Admin does not change category here
             formChamadoSubmitButtonModal.textContent = 'Salvar Alterações (Admin)';
        } else { // Logic for user editing their own (if allowed - not primary for this step)
            chamadoStatusModalFormGroup.style.display = 'none';
            chamadoCategoriaModalFormGroup.style.display = 'block';
            // Potentially disable fields if not editable by user
            document.getElementById('chamado-descricao-modal').disabled = (chamado.status !== 'aberto');
             formChamadoSubmitButtonModal.textContent = 'Salvar Alterações';
        }
        criarChamadoModal.style.display = 'flex';
    }
}

async function handleUpdateChamado(id, data) {
    console.log("Updating chamado:", id, data);
    const chamadoIndex = chamadosData.findIndex(c => c.id === id);
    if (chamadoIndex > -1) {
        const oldStatus = chamadosData[chamadoIndex].status;
        chamadosData[chamadoIndex] = {
            ...chamadosData[chamadoIndex],
            titulo: data.titulo,
            descricao: data.descricao,
            // Categoria usually not changed by admin in this flow, but if user edits, it might be.
            // categoria: data.categoria,
            ultimaAtualizacao: new Date().toISOString(),
        };
        // If status is part of data (admin edit)
        if (data.status && data.status !== oldStatus) {
            chamadosData[chamadoIndex].status = data.status;
            if (!chamadosData[chamadoIndex].interactions) chamadosData[chamadoIndex].interactions = [];
            chamadosData[chamadoIndex].interactions.push({
                user: "Admin (Simulado)",
                date: new Date().toISOString(),
                text: `Status alterado de ${formatChamadoStatus(oldStatus)} para ${formatChamadoStatus(data.status)}.`,
                type: 'status_change',
                newStatus: data.status
            });
        }
        showGlobalFeedback('Chamado atualizado com sucesso (simulado)!', 'success');
        loadChamadosList();
        // If detail view was open for this ID, refresh it
        if (chamadoDetailSection && chamadoDetailSection.style.display === 'block' && chamadoDetailSection.dataset.currentChamadoId === id) {
            viewChamadoDetail(id);
        }
    } else {
        showGlobalFeedback('Erro ao atualizar chamado: não encontrado.', 'error');
    }
}


function setupChamadoModalAndFAB() {
    const fab = document.querySelector('.js-fab-chamados');
    if (fab) {
        fab.style.display = 'block';
        fab.addEventListener('click', openCreateChamadoModal);
    }
    if(criarChamadoModal) {
        document.querySelectorAll('.js-modal-criar-chamado-close').forEach(btn => {
            btn.addEventListener('click', () => criarChamadoModal.style.display = 'none');
        });
        window.addEventListener('click', (event) => {
            if (event.target === criarChamadoModal) criarChamadoModal.style.display = 'none';
        });
    }
    if(formCriarChamado && chamadoIdFieldModal && formChamadoSubmitButtonModal) {
        formCriarChamado.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentChamadoId = chamadoIdFieldModal.value;
            const data = {
                titulo: document.getElementById('chamado-titulo-modal').value,
                descricao: document.getElementById('chamado-descricao-modal').value,
                categoria: document.getElementById('chamado-categoria-modal').value,
                // anexos: document.getElementById('chamado-anexos-modal').files, // Handle files later
            };

            if (currentChamadoId) { // Admin Edit Mode
                data.status = document.getElementById('chamado-status-modal').value; // Get status if admin
                await handleUpdateChamado(currentChamadoId, data);
            } else { // Create Mode
                await handleCreateChamado(data);
            }
            if(criarChamadoModal) criarChamadoModal.style.display = 'none';
        });
    }
}

function setupChamadoFilters() {
    const applyButton = document.getElementById('apply-chamado-filters-button');
    if (applyButton) {
        applyButton.addEventListener('click', () => {
            const status = document.getElementById('chamado-status-filter').value;
            const date = document.getElementById('chamado-date-filter').value;
            const category = document.getElementById('chamado-category-filter').value;
            showGlobalFeedback(`Filtrando chamados: Status=${status||'Todos'}, Data=${date||'Todas'}, Cat=${category||'Todas'}.`, 'info');
            loadChamadosList({ status, date, category });
        });
    }
}

function setupChamadoDetailViewBackButton() {
    if (backToChamadosListButton) {
        backToChamadosListButton.addEventListener('click', () => {
            if (chamadoDetailSection) chamadoDetailSection.style.display = 'none';
            if (chamadosListSection) chamadosListSection.style.display = 'block';
            if (chamadosFiltersSection) chamadosFiltersSection.style.display = 'flex';
        });
    }
}
