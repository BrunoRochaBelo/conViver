import apiClient, { ApiError } from './apiClient.js';
import { requireAuth } from './auth.js';
import { formatCurrency, formatDate, showGlobalFeedback } from './main.js'; // Updated import

document.addEventListener('DOMContentLoaded', () => {
    requireAuth();

    // DOM Elements
    const tbodyCobrancas = document.querySelector('.js-lista-cobrancas');
    const filtroStatusEl = document.querySelector('.js-filtro-status-cobranca');

    const summaryInadimplenciaEl = document.querySelector('.js-summary-inadimplencia');
    const summaryPixEl = document.querySelector('.js-summary-pix');
    const summaryPendentesEl = document.querySelector('.js-summary-pendentes');

    // Modal elements
    const modalCobranca = document.getElementById('modalCobranca');
    const modalCobrancaTitle = document.getElementById('modalCobrancaTitle');
    const modalCobrancaBody = document.getElementById('modalCobrancaBody');
    const closeModalButton = document.querySelector('.js-modal-close-cobranca');
    const btnNovaCobranca = document.querySelector('.js-btn-nova-cobranca');
    const btnGerarLote = document.querySelector('.js-btn-gerar-lote');

    // --- Modal Logic ---
    function openModal(title, contentHtml) {
        if (modalCobrancaTitle) modalCobrancaTitle.textContent = title;
        if (modalCobrancaBody) modalCobrancaBody.innerHTML = contentHtml;
        if (modalCobranca) modalCobranca.style.display = 'block';

        // Add event listener for the cancel button inside the modal, if it exists
        const modalCancelButton = modalCobrancaBody.querySelector('.js-modal-cancel-cobranca');
        if (modalCancelButton) {
            modalCancelButton.addEventListener('click', closeModal);
        }

        // Add event listener for form submission if a form is present
        const form = modalCobrancaBody.querySelector('form');
        if (form && form.id === 'formNovaCobranca') {
            form.addEventListener('submit', handleNovaCobrancaSubmit);
        }
    }

    function closeModal() {
        if (modalCobranca) {
            modalCobranca.style.display = 'none';
            if (modalCobrancaBody) modalCobrancaBody.innerHTML = ''; // Clear content on close
        }
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (event) => {
        if (event.target === modalCobranca) {
            closeModal();
        }
    });

    // --- HTML for Nova Cobrança Form ---
    const novaCobrancaFormHtml = `
        <form id="formNovaCobranca" class="cv-form">
            <div class="cv-form__group">
                <label for="ncUnidadeId" class="cv-form__label">Unidade ID:</label>
                <input type="text" id="ncUnidadeId" name="unidadeId" class="cv-input" required placeholder="Ex: 001, 101A, etc.">
            </div>
            <div class="cv-form__group">
                <label for="ncValor" class="cv-form__label">Valor (R$):</label>
                <input type="number" id="ncValor" name="valor" class="cv-input" required step="0.01" min="0.01" placeholder="Ex: 150.50">
            </div>
            <div class="cv-form__group">
                <label for="ncDataVencimento" class="cv-form__label">Data de Vencimento:</label>
                <input type="date" id="ncDataVencimento" name="dataVencimento" class="cv-input" required>
            </div>
            <div class="cv-form__group">
                <label for="ncDescricao" class="cv-form__label">Descrição (Opcional):</label>
                <input type="text" id="ncDescricao" name="descricao" class="cv-input" placeholder="Ex: Taxa condominial, Multa, etc.">
            </div>
            <div class="cv-form__actions">
                <button type="submit" class="cv-button cv-button--primary" id="btnSalvarCobranca">Salvar Cobrança</button>
                <button type="button" class="cv-button js-modal-cancel-cobranca">Cancelar</button>
            </div>
        </form>
    `;

    // --- Event Handlers ---
    async function handleNovaCobrancaSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        showGlobalFeedback('Processando...', 'info', 2000);
        submitButton.disabled = true;

        const unidadeId = form.unidadeId.value.trim();
        const valor = parseFloat(form.valor.value);
        const dataVencimento = form.dataVencimento.value;
        const descricao = form.descricao.value.trim();

        if (!unidadeId || !valor || !dataVencimento) {
            showGlobalFeedback('Por favor, preencha todos os campos obrigatórios.', 'error');
            submitButton.disabled = false;
            return;
        }
        if (isNaN(valor) || valor <= 0) {
            showGlobalFeedback('O valor da cobrança deve ser um número positivo.', 'error');
            submitButton.disabled = false;
            return;
        }
        const hoje = new Date().toISOString().split('T')[0];
        if (dataVencimento < hoje) {
            showGlobalFeedback('A data de vencimento não pode ser no passado.', 'error');
            submitButton.disabled = false;
            return;
        }

        const novaCobrancaDto = { UnidadeId: unidadeId, Valor: valor, DataVencimento: dataVencimento, Descricao: descricao };

        try {
            await apiClient.post('/financeiro/cobrancas', novaCobrancaDto);
            showGlobalFeedback('Cobrança emitida com sucesso!', 'success', 5000);
            closeModal();
            fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
            fetchAndRenderDashboard();
        } catch (error) {
            console.error('Erro ao criar cobrança:', error);
            const defaultMessage = 'Ocorreu um erro inesperado ao emitir a cobrança.';
            if (error instanceof ApiError) {
                showGlobalFeedback(`Erro ao emitir cobrança: ${error.message || defaultMessage}`, 'error');
            } else {
                showGlobalFeedback(defaultMessage, 'error');
            }
        } finally {
            submitButton.disabled = false;
        }
    }


    if (btnNovaCobranca) {
        btnNovaCobranca.addEventListener('click', () => {
            openModal('Emitir Nova Cobrança', novaCobrancaFormHtml);
        });
    }

    if (btnGerarLote) {
        btnGerarLote.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja gerar as cobranças em lote para o mês atual? Esta ação pode levar alguns instantes.')) {
                return;
            }
            showGlobalFeedback('Processando...', 'info', 2000);
            btnGerarLote.disabled = true;

            const hoje = new Date();
            const requestBody = {
                Mes: hoje.getMonth() + 1,
                Ano: hoje.getFullYear()
            };

            try {
                const resultado = await apiClient.post('/financeiro/cobrancas/gerar-lote', requestBody);
                if (resultado.sucesso) {
                    showGlobalFeedback(resultado.mensagem || 'Lote gerado com sucesso!', 'success', 5000);
                    fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                    fetchAndRenderDashboard();
                } else {
                    showGlobalFeedback(resultado.mensagem || 'Falha ao gerar lote.', 'error');
                }
            } catch (error) {
                console.error('Erro ao gerar lote:', error);
                const defaultMessage = 'Ocorreu um erro inesperado ao gerar o lote de cobranças.';
                if (error instanceof ApiError) {
                    showGlobalFeedback(`Erro da API ao gerar lote: ${error.message || defaultMessage}`, 'error');
                } else {
                    showGlobalFeedback(defaultMessage, 'error');
                }
            } finally {
                btnGerarLote.disabled = false;
            }
        });
    }

    if (tbodyCobrancas) {
        tbodyCobrancas.addEventListener('click', async (event) => {
            const target = event.target.closest('button'); // Ensure we get the button if icon inside is clicked
            if (!target) return;

            const cobrancaId = target.dataset.id;
            if (!cobrancaId) return;

            if (target.classList.contains('js-btn-detalhes-cobranca')) {
                openModal(`Detalhes da Cobrança ${cobrancaId.substring(0,8)}...`, `<p>Detalhes completos da cobrança ${cobrancaId} serão exibidos aqui... (Funcionalidade a ser implementada)</p>`);
            } else if (target.classList.contains('js-btn-segunda-via')) {
                showGlobalFeedback('Processando...', 'info', 2000);
                target.disabled = true;
                try {
                    const response = await apiClient.get(`/financeiro/cobrancas/${cobrancaId}/segunda-via`);
                    if (response && response.url) {
                        window.open(response.url, '_blank');
                        showGlobalFeedback('Link da 2ª via aberto em nova aba.', 'success', 5000);
                    } else {
                        showGlobalFeedback('Não foi possível obter o link da 2ª via ou o link não foi fornecido.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao obter 2ª via:', error);
                    showGlobalFeedback(`Erro ao obter 2ª via: ${error.message || 'Tente novamente.'}`, 'error');
                } finally {
                    target.disabled = false;
                }
            } else if (target.classList.contains('js-btn-cancelar-cobranca')) {
                if (!confirm('Tem certeza que deseja cancelar esta cobrança?')) return;
                showGlobalFeedback('Processando...', 'info', 2000);
                target.disabled = true;
                try {
                    // Assuming PUT request for cancel, adjust if it's POST or DELETE
                    const resultado = await apiClient.put(`/financeiro/cobrancas/${cobrancaId}/cancelar`, {});
                    if (resultado && resultado.sucesso) {
                        showGlobalFeedback(resultado.mensagem || 'Cobrança cancelada com sucesso!', 'success', 5000);
                        fetchAndRenderCobrancas(filtroStatusEl ? filtroStatusEl.value : '');
                        fetchAndRenderDashboard();
                    } else {
                        showGlobalFeedback(resultado.mensagem || 'Falha ao cancelar cobrança.', 'error');
                    }
                } catch (error) {
                    console.error('Erro ao cancelar cobrança:', error);
                    const defaultMessage = 'Ocorreu um erro inesperado ao cancelar a cobrança.';
                    if (error instanceof ApiError) {
                        showGlobalFeedback(`Erro ao cancelar cobrança: ${error.message || defaultMessage}`, 'error');
                    } else {
                        showGlobalFeedback(defaultMessage, 'error');
                    }
                } finally {
                    target.disabled = false;
                }
            }
        });
    }

    // --- Funções de Renderização ---
    function renderCobrancas(cobrancas) {
        if (!tbodyCobrancas) {
            console.error('Elemento tbody .js-lista-cobrancas não encontrado.');
            return;
        }
        tbodyCobrancas.innerHTML = '';

        if (!cobrancas || cobrancas.length === 0) {
            tbodyCobrancas.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma cobrança encontrada.</td></tr>';
            return;
        }

        cobrancas.forEach(cobranca => {
            const tr = tbodyCobrancas.insertRow();
            tr.insertCell().textContent = cobranca.unidadeId ? cobranca.unidadeId.substring(0, 8) + '...' : 'N/A';
            tr.insertCell().textContent = cobranca.nomeSacado || 'N/A';
            tr.insertCell().textContent = formatCurrency(cobranca.valor);
            tr.insertCell().textContent = formatDate(new Date(cobranca.dataVencimento));

            const statusCell = tr.insertCell();
            statusCell.textContent = cobranca.statusCobranca;
            statusCell.className = `status-${cobranca.statusCobranca.toLowerCase().replace(/\s+/g, '-')}`;


            const acoesCell = tr.insertCell();
            acoesCell.innerHTML = `
                <button class="cv-button cv-button--small cv-button--info js-btn-detalhes-cobranca" data-id="${cobranca.id}" title="Detalhes">Detalhes</button>
                <button class="cv-button cv-button--small js-btn-segunda-via" data-id="${cobranca.id}" title="2ª Via">2ª Via</button>
            `;

            const cancellableStatuses = ["Pendente", "Gerado", "Registrado", "Enviado", "Atrasado"];
            if (cancellableStatuses.includes(cobranca.statusCobranca)) {
                 const cancelButton = document.createElement('button');
                 cancelButton.className = "cv-button cv-button--small cv-button--danger js-btn-cancelar-cobranca";
                 cancelButton.dataset.id = cobranca.id;
                 cancelButton.title = "Cancelar";
                 cancelButton.textContent = "Cancelar";
                 acoesCell.appendChild(document.createTextNode(' '));
                 acoesCell.appendChild(cancelButton);
            }
        });
    }

    function renderDashboardFinanceiro(dashboardData) {
        if (!dashboardData) {
            if (summaryInadimplenciaEl) summaryInadimplenciaEl.textContent = '--%';
            if (summaryPixEl) summaryPixEl.textContent = 'R$ --';
            if (summaryPendentesEl) summaryPendentesEl.textContent = '--';
            return;
        }

        if (summaryInadimplenciaEl) {
            summaryInadimplenciaEl.textContent = `${dashboardData.inadimplenciaPercentual.toFixed(1)}%`;
        }
        if (summaryPixEl) {
            summaryPixEl.textContent = formatCurrency(dashboardData.totalPixMes);
        }
        if (summaryPendentesEl) {
            summaryPendentesEl.textContent = dashboardData.totalBoletosPendentes;
        }
    }

    // --- Funções de Fetch ---
    async function fetchAndRenderCobrancas(status = '') {
        if (!tbodyCobrancas) return;
        tbodyCobrancas.innerHTML = '<tr><td colspan="6" class="text-center">Carregando cobranças...</td></tr>';

        let apiUrl = '/financeiro/cobrancas';
        if (status) {
            apiUrl += `?status=${encodeURIComponent(status)}`;
        }

        try {
            const cobrancas = await apiClient.get(apiUrl);
            renderCobrancas(cobrancas);
        } catch (error) {
            console.error('Erro ao buscar cobranças:', error);
            tbodyCobrancas.innerHTML = '<tr><td colspan="6" class="text-center error-message">Erro ao carregar cobranças. Tente novamente.</td></tr>';
            const defaultMessage = 'Ocorreu um erro inesperado ao buscar cobranças.';
            if (error instanceof ApiError) {
                showGlobalFeedback(`Erro ao buscar cobranças: ${error.message || defaultMessage}`, 'error');
            } else {
                showGlobalFeedback(defaultMessage, 'error');
            }
        }
    }

    async function fetchAndRenderDashboard() {
        if (summaryInadimplenciaEl) summaryInadimplenciaEl.textContent = 'Carregando...';
        if (summaryPixEl) summaryPixEl.textContent = 'Carregando...';
        if (summaryPendentesEl) summaryPendentesEl.textContent = 'Carregando...';

        try {
            const dashboardData = await apiClient.get('/financeiro/cobrancas/dashboard');
            renderDashboardFinanceiro(dashboardData);
        } catch (error) {
            console.error('Erro ao buscar dados do dashboard financeiro:', error);
            renderDashboardFinanceiro(null);
            const defaultMessage = 'Ocorreu um erro inesperado ao buscar dados do dashboard.';
            if (error instanceof ApiError) {
                showGlobalFeedback(`Erro ao buscar dados do dashboard: ${error.message || defaultMessage}`, 'error');
            } else {
                showGlobalFeedback(defaultMessage, 'error');
            }
        }
    }

    // --- Inicialização ---
    if (tbodyCobrancas && filtroStatusEl) { // Ensure elements exist before proceeding
        fetchAndRenderCobrancas();
        fetchAndRenderDashboard();

        filtroStatusEl.addEventListener('change', (event) => {
            fetchAndRenderCobrancas(event.target.value);
        });
    } else {
        console.error("Elementos essenciais do DOM não encontrados para a página de finanças.");
    }
});
