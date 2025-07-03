# Melhorias de Interface e Experiência do Usuário

Este documento descreve as melhorias implementadas na interface do usuário (UI) e na experiência do usuário (UX) do sistema conViver, com foco em feedbacks visuais, performance de carregamento e padronização de estilos, inspiradas nas diretrizes da Apple.

## 1. Spinners / Loaders

Indicadores visuais de carregamento foram adicionados para fornecer feedback imediato ao usuário durante operações assíncronas.

**Locais de Implementação:**

*   **Página de Login (`login.js`):**
    *   Spinner visual no botão "Entrar" durante a autenticação.
    *   Texto do botão atualizado dinamicamente (ex: "Entrando...", "Sucesso!").
*   **Modais de Criação/Edição (`comunicacao.js`):**
    *   Botões de submissão (Salvar/Criar/Enviar) em modais de Avisos, Enquetes, Chamados (Solicitações) e Ocorrências exibem um spinner e são desabilitados durante o processamento da requisição.
*   **Ações em Itens do Feed (`comunicacao.js`):**
    *   Botões como "Encerrar Enquete" e "Gerar Ata" mostram um spinner durante a execução da ação.
*   **Infinite Scroll (Feed de Comunicação em `comunicacao.js`):**
    *   Um spinner inline é exibido próximo ao final da lista quando mais itens estão sendo carregados.

**Prática Adotada:**
Utilizar a função `showInlineSpinner()` de `main.js` ou manipular diretamente o `innerHTML` de botões para incluir `<span class="inline-spinner"></span>` e desabilitar o botão durante a ação. Restaurar o estado original do botão no bloco `finally` de promises.

## 2. Barras de Progresso

Para operações mais longas, como uploads de arquivos, barras de progresso foram implementadas ou aprimoradas.

**Locais de Implementação:**

*   **Upload de Documentos (Biblioteca - `biblioteca.js`):**
    *   Utiliza `xhrPost` de `progress.js` para monitorar e exibir o progresso do upload em uma barra visual.
    *   Botão de submit também recebe feedback com spinner.
*   **Upload de Anexos em Ocorrências (`comunicacao.js`):**
    *   Utiliza `xhrPost` para exibir o progresso do upload de anexos diretamente no formulário da ocorrência.
    *   Botão de submit também recebe feedback com spinner.

**Estilização (`components.css`):**
As classes `.cv-progress` e `.cv-progress__bar` foram estilizadas para um visual moderno, com cantos arredondados, transições suaves e uso de variáveis de tema.

**Prática Adotada:**
Para uploads de arquivos, integrar a função `xhrPost` (de `progress.js`) que permite um callback de progresso. Dinamicamente criar ou exibir um elemento de barra de progresso (estilizado com `.cv-progress`) e atualizar sua largura (`.cv-progress__bar`) com base no percentual de progresso.

## 3. Lazy Loading de Imagens

O carregamento tardio de imagens (`loading="lazy"`) foi implementado para otimizar o tempo de carregamento inicial da página e economizar banda.

**Locais de Implementação:**

*   **Imagens no Feed Principal (`comunicacao.js` - `renderFeedItem`):**
    *   Atributo `loading="lazy"` adicionado às tags `<img>` de imagens do feed.
*   **Imagens em Modais de Detalhes (`comunicacao.js` - `renderDetalhesGenerico`):**
    *   Aplicado a fotos/anexos exibidos nos detalhes de chamados, ocorrências, etc.
*   **Pré-visualização de Imagem (Modal de Aviso - `comunicacao.html`):**
    *   A tag `<img>` para pré-visualização também utiliza `loading="lazy"`.

**Prática Adotada:**
Adicionar o atributo `loading="lazy"` a todas as tags `<img>` que não são críticas para a primeira visualização da página (above the fold).

## 4. Progressive Image Loading (Blur-up)

Para melhorar a percepção de carregamento de imagens no feed, a técnica de "blur-up" foi implementada.

**Locais de Implementação:**

*   **Imagens no Feed Principal (`comunicacao.js` - `renderFeedItem` e `fetchAndDisplayFeedItems`):**
    *   Imagens são inicialmente carregadas com um `src` placeholder (1x1 pixel transparente) e um `filter: blur(10px)` via CSS.
    *   A URL da imagem de alta resolução é armazenada no atributo `data-src`.
    *   Após o item do feed ser adicionado ao DOM, JavaScript carrega a imagem de alta resolução em segundo plano.
    *   Quando carregada, o `src` da imagem é atualizado e uma classe `.loaded` é adicionada para remover o blur via transição CSS.

**CSS (`styles.css`):**
Classes `.feed-item__image-container`, `.feed-item__image`, e `.feed-item__image.loaded` foram adicionadas para controlar o container da imagem (com `aspect-ratio` para evitar layout shift), o efeito de blur inicial e a transição para a imagem nítida.

**Prática Adotada:**
Para imagens importantes (como as do feed), usar um placeholder no `src`, `data-src` para a imagem final, e CSS para o efeito de blur. JavaScript gerencia o carregamento da imagem de alta resolução e atualiza a UI.

## 5. Skeleton Screens

Os Skeleton Screens foram refinados para fornecer uma pré-visualização mais fiel e esteticamente agradável do conteúdo que será carregado.

**CSS (`components.css`):**

*   Classes como `.skeleton-block`, `.skeleton-title`, `.skeleton-line` (com variações `--short`, `--medium`, `--long`), `.skeleton-image`, e `.skeleton-avatar` foram padronizadas.
*   Utilizam variáveis de tema para cores de fundo, shimmer, `border-radius` e espaçamentos.
*   A animação de shimmer é consistente.

**HTML (ex: `comunicacao.html`, `biblioteca.html`):**
As estruturas de skeleton foram atualizadas para usar as novas classes CSS, simulando melhor o layout do conteúdo final (ex: cards de feed com espaço para imagem, título e linhas de texto; cards de documento com título, metadados e espaço para botão).

**Prática Adotada:**
Utilizar os componentes de skeleton padronizados ao carregar seções de conteúdo ou listas. Mostrar o skeleton antes de buscar os dados e escondê-lo após a renderização do conteúdo real.

## 6. Optimistic UI

Para interações com alta probabilidade de sucesso, a UI é atualizada imediatamente para fornecer feedback rápido, e depois sincronizada com o servidor.

**Locais de Implementação:**

*   **Votar em Enquete (`comunicacao.js` - `submitVoto`):**
    *   Ao votar, o botão é desabilitado e seu texto muda para "Voto Registrado!". A área de opções é substituída por uma mensagem de confirmação.
    *   A chamada à API é feita em segundo plano.
    *   Em caso de sucesso, uma notificação global confirma.
    *   Em caso de falha, a UI é revertida para o estado anterior e uma mensagem de erro é exibida.
*   **Exclusão de Itens:** A prática de remover/ocultar o item da UI primeiro e depois fazer a chamada de exclusão (já parcialmente existente) é um exemplo de UI otimista.

**Prática Adotada:**
Para ações rápidas e prováveis de sucesso, atualizar a UI localmente de forma instantânea. Realizar a chamada à API e, em caso de falha, reverter a alteração na UI e notificar o usuário.

## 7. Padronização de Estilos

Todas as novas implementações e refinamentos seguiram as diretrizes de estilo existentes, inspiradas na Apple, e utilizaram o design system do projeto (variáveis CSS para cores, tipografia, espaçamentos, bordas).

**Foco:**
Consistência visual, transições suaves, uso adequado de cores semânticas, e adaptação aos temas claro e escuro.

## 8. Aprimoramentos de Responsividade e Experiência Mobile (UI/UX)

Uma revisão completa foi realizada para garantir que a aplicação web seja totalmente responsiva, com ótima usabilidade e coerência visual em dispositivos móveis (smartphones e tablets) e desktops, seguindo a inspiração da Apple e do iOS. As seguintes melhorias foram implementadas:

*   **CSS Global Refatorado para Mobile-First:**
    *   Os arquivos CSS globais (`styles.css`, `components.css`) foram revisados e ajustados para seguir a abordagem mobile-first, onde os estilos base são para dispositivos móveis e media queries (`min-width`) são usadas para aplicar progressive enhancement para telas maiores.
    *   `box-sizing: border-box;` foi aplicado globalmente.
    *   Ajustes pontuais em unidades (ex: `font-size` do `.cv-modal-close` para `rem`) e paddings de componentes como `.cv-tab-button` foram feitos para melhor adaptação.

*   **Layout Responsivo Geral Consolidado:**
    *   A estrutura base (`layout.html`, `main`, `.cv-container`) foi verificada e confirmada como adequada para fluidez em diferentes telas.
    *   O header (`.cv-header`) e a navegação principal de desktop (`.cv-nav`) foram ajustados para que a navegação de desktop seja ocultada em telas mobile, dando lugar às soluções de navegação mobile.

*   **Navegação Mobile Aprimorada:**
    *   **Menu Off-Canvas (Drawer):**
        *   Implementada a criação dinâmica do botão hambúrguer no header e do painel lateral (drawer) via JavaScript (`nav.js`).
        *   O drawer contém os links de navegação principais, um cabeçalho com título e botão de fechar, e é acionado pelo botão hambúrguer.
        *   Estilos CSS dedicados (`.cv-nav-hamburger`, `.cv-nav--drawer`, `.cv-nav--drawer__panel`, etc.) foram adicionados para aparência, animação e usabilidade, incluindo `overflow-y: auto` para rolagem interna e bloqueio de scroll da página principal quando aberto.
    *   **Bottom Navigation Bar:**
        *   A lógica existente em `nav.js` para exibir a barra de navegação inferior em telas mobile (`<768px` e `APP_CONFIG.ENABLE_MOBILE_BOTTOM_NAV === true`) foi mantida e aprimorada.
        *   Labels textuais foram adicionadas abaixo dos ícones para maior clareza.
        *   Uma classe `has-bottom-nav` é adicionada ao `<body>` quando a bottom navigation está ativa, e o CSS correspondente aplica um `padding-bottom` para evitar que a barra sobreponha o conteúdo da página.
        *   A barra é reconstruída dinamicamente no `resize` da janela para garantir a correta exibição/ocultação e aplicação do padding.

*   **Responsividade de Componentes Chave:**
    *   **Cards e Grids:** Layouts baseados em CSS Grid (`.card-grid`, `.feed-grid`) já ofereciam boa responsividade e foram mantidos.
    *   **Formulários e Inputs:** Componentes como `.cv-input` e estruturas de formulário (`.cv-form-actions`) já possuíam boa base responsiva (inputs 100% em mobile, empilhamento de botões de ação). Verificações visuais confirmaram sua adequação.
    *   **Modals:** A estrutura CSS dos modais (`.cv-modal`, `.cv-modal-content`) com `max-width`, `max-height` e `overflow-y: auto` foi confirmada como eficaz para diferentes tamanhos de tela, permitindo rolagem interna do conteúdo.
    *   **Gráficos (Chart.js):** As opções de inicialização dos gráficos em `financeiro.js` foram ajustadas para `{ responsive: true, maintainAspectRatio: false }` para melhor adaptação à largura do container sem distorções.
    *   **Abas (`.cv-tabs` em `comunicacao.html`):** Para evitar quebra de layout em telas mobile, o container dos botões de aba (`.cv-tabs-buttons`) agora possui `overflow-x: auto`, permitindo rolagem horizontal das abas se necessário.

*   **Floating Action Button (FAB):**
    *   Ajustado o posicionamento CSS do container `.fab-menu` para que ele suba quando a bottom navigation bar estiver ativa (através da classe `body.has-bottom-nav`), evitando sobreposição.

*   **Páginas Específicas:**
    *   **Calendário (`calendario.html`):** A configuração do FullCalendar em `calendario.js` foi ajustada para usar uma `aspectRatio` dinâmica (mais quadrada em mobile) para melhorar a visualização da grade mensal em telas menores. O CSS personalizado já continha boas regras responsivas para a toolbar e elementos do calendário.

Essas melhorias visam tornar a aplicação conViver mais robusta e agradável de usar em qualquer dispositivo, com foco em uma experiência mobile similar à de um app nativo.

## Conclusão

Com estas e as melhorias anteriores, a aplicação conViver está mais responsiva, performática e agradável de usar, fornecendo feedback claro ao usuário em todas as etapas de interação e carregamento de dados, e adaptando-se de forma inteligente a diferentes tamanhos de tela.
