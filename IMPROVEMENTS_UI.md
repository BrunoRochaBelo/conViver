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

## 8. Navegação e Layout Responsivo

Diversos ajustes foram realizados para melhorar a experiência em dispositivos móveis.

* **Nova tag viewport:** todas as páginas passaram a incluir a meta `viewport` unificada (`width=device-width, initial-scale=1`) garantindo escala correta em smartphones.
* **Menu off-canvas:** o botão hambúrguer abre um painel lateral (`cv-nav--drawer`) que utiliza classes dedicadas em `components.css` para animação e bloqueio do scroll da página.
* **Bottom navigation:** quando `APP_CONFIG.ENABLE_MOBILE_BOTTOM_NAV` está `true` e a tela possui largura inferior a 768&nbsp;px, `buildNavigation()` cria a barra inferior com ícones e labels. O `<body>` recebe a classe `has-bottom-nav` para adicionar padding e a barra é recriada dinamicamente no `resize` da janela. O menu principal (`#mainNav`) é oculto automaticamente e o `env(safe-area-inset-bottom)` garante espaçamento adequado em aparelhos com notch.
* **Abas roláveis:** o container `.cv-tabs-buttons` agora permite rolagem horizontal em telas estreitas, evitando quebra de layout das abas.
* **Controles de visualização alinhados:** `.reservas-view-toggle` recebeu estilo próprio para manter os rótulos e o switch em linha única alinhados à direita.
* **FAB adaptado para a bottom bar:** quando a navegação inferior está ativa, o menu flutuante sobe alguns pixels para não sobrepor a barra.
* **Cabeçalho mais compacto em mobile:** reduziu-se o padding e o tamanho do título para aproveitar melhor o espaço em telas pequenas.
* **Ajustes em formulários e tabelas:** campos de entrada adotaram a classe `.cv-input`, estados de erro/sucesso e placeholders consistentes. Tabelas podem ser envolvidas por `.cv-table-responsive-wrapper` para permitir rolagem horizontal em telas estreitas.
* **Aprimoramentos de header e modais:** o cabeçalho ganhou estilo translúcido e comportamento `sticky`. A abertura e fechamento de modais agora adiciona ou remove a classe `cv-modal-open` no `<body>` para impedir rolagem do conteúdo de fundo.
* **Imagens responsivas:** elementos `<img>` agora possuem `max-width:100%` para evitar estouro do layout em telas menores.

## 9. Header/MainNav/Tab Scroll Reactivity

O cabeçalho voltou a reagir à rolagem para otimizar o espaço em telas menores. Ao deslizar para baixo, o cabeçalho torna-se visível e as abas recebem a classe `cv-tabs--fixed`, permanecendo no topo. Ao rolar para cima (com a página já deslocada), aplica-se `cv-header--hidden`, ocultando o cabeçalho enquanto as abas seguem fixas. Quando o usuário retorna ao início da página, ambas as classes são removidas, restabelecendo o layout padrão. As transições utilizam `transform`/`opacity` com duração em torno de 300&nbsp;ms para suavidade.

## Conclusão

Essas melhorias visam tornar a aplicação conViver mais responsiva, performática e agradável de usar, fornecendo feedback claro ao usuário em todas as etapas de interação e carregamento de dados.
