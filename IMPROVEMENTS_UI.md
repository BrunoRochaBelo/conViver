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

## 8. Responsividade e Experiência Mobile (Revisão Atual)

Uma revisão completa foi realizada para garantir que a aplicação Web seja totalmente responsiva e ofereça uma excelente usabilidade em diversos tamanhos de tela, desde desktops até dispositivos móveis. O objetivo foi criar uma experiência coesa e, em mobile, buscar uma sensação similar à de um aplicativo nativo, com inspiração na Apple e no iOS.

**Estratégias Adotadas:**

*   **Mobile-First e Progressive Enhancement:** Os estilos base foram pensados para mobile, com ajustes e adições para telas maiores através de media queries.
*   **Variáveis CSS:** Uso extensivo de variáveis CSS para tipografia, espaçamentos, cores, facilitando a manutenção e a consistência, inclusive para temas claro/escuro.
*   **Unidades Relativas:** Priorização de `rem` e `em` para fontes e alguns espaçamentos, permitindo melhor escalabilidade e acessibilidade. `vh`, `vw`, e `%` foram usados para layouts responsivos.
*   **Layouts Flexíveis:** Uso de Flexbox e CSS Grid para criar layouts que se adaptam naturalmente a diferentes larguras de tela.
    *   **`styles.css`:** Contém as definições de variáveis, estilos globais para `body`, `html`, `main`, e estilos específicos para páginas de autenticação (Login, Register, etc.), Dashboard, Financeiro, entre outras. Foram introduzidas media queries para ajustar `font-size-base`, tamanhos de cabeçalho (h1-h6), e espaçamentos em breakpoints para tablet (768px) e desktop (1024px).
    *   **`components.css`:** Contém estilos para componentes reutilizáveis como botões (`.cv-button`), cards (`.cv-card`), inputs (`.cv-input`), modais (`.cv-modal`), header (`.cv-header`), navegação (`.cv-nav`), tabelas (`.cv-table`), etc. Estes foram revisados para garantir que sejam responsivos e tenham boa aparência em todas as telas.
*   **Tipografia Responsiva:**
    *   `--cv-font-size-base` ajustado em breakpoints (14px mobile, 15px tablet, 16px desktop).
    *   Tamanhos de texto (`--cv-font-size-text-md`, `--cv-font-size-text-lg`) e de cabeçalho (`--cv-font-size-h1` a `h6`) são definidos em `rem` e ajustados nos breakpoints.
*   **Navegação Mobile:**
    *   O `layout.html` foi atualizado para incluir estruturas para um menu mobile off-canvas (`#mobileNavMenu`, `#mobileNavOverlay`) e um botão de toggle (`#mobileMenuToggle`) visível apenas em mobile.
    *   O `nav.js` foi refatorado para popular tanto a navegação desktop (`#mainNav`) quanto a mobile (`#mobileNavMenu`), e para gerenciar a abertura/fechamento do menu mobile.
    *   **Barra de Navegação Inferior (Bottom Navigation Bar):** Uma classe `.cv-bottom-nav` foi adicionada em `components.css` para uma barra de navegação fixa na parte inferior da tela em dispositivos móveis. JavaScript (em `nav.js` ou `main.js`) pode adicionar uma classe `has-bottom-nav` ao `body` para ativar essa navegação e ajustar o `padding-bottom` do `main` content.
*   **Header Responsivo:**
    *   O `.cv-header` foi ajustado para ter alturas diferentes para mobile e desktop (controladas por variáveis CSS `--cv-header-height-mobile` e `--cv-header-height-desktop`).
    *   O título do header é centralizado em mobile e alinhado à esquerda em desktop.
*   **Modais:**
    *   Modais (`.cv-modal`) foram ajustados para um comportamento de "bottom sheet" em telas menores (aparecendo da parte inferior) e como um modal centralizado tradicional em telas maiores.
*   **Tabelas:**
    *   Tabelas complexas (ex: `.fin-cobrancas__table`) são envolvidas por um `.cv-table-responsive-wrapper` que permite scroll horizontal em telas pequenas. Os tamanhos de fonte e padding dentro das tabelas também são responsivos.
*   **Formulários de Autenticação:**
    *   Páginas como `login.html`, `register.html`, `forgot-password.html`, e `reset-password.html` foram revisadas para garantir que os formulários sejam fáceis de usar, com inputs e botões de tamanho adequado para toque, e labels visualmente ocultas (`.visually-hidden`) quando o placeholder é suficiente, mantendo a acessibilidade.
*   **Consistência Visual iOS:**
    *   Revisão de `border-radius`, sombras, tipos de botões (primário, secundário, tinted, borderless), e animações para maior alinhamento com a estética iOS.
    *   Componentes como `switch` e `progress bar` foram refinados.

**Desafios e Soluções:**

*   **Manutenção de Múltiplos Estilos de Navegação:** Gerenciar a navegação desktop, off-canvas mobile e a nova bottom navigation exigiu condicionais em JavaScript e CSS (utility classes como `.hide-on-mobile`, `.hide-on-desktop`, e a classe `body.has-bottom-nav`).
*   **Conteúdo Denso (Tabelas):** A principal solução foi o scroll horizontal para tabelas, mas para algumas informações, considerar a exibição em formato de card em mobile pode ser uma melhoria futura.

## Conclusão

Com as melhorias detalhadas, incluindo a recente revisão de responsividade, a aplicação conViver agora oferece uma experiência de usuário mais robusta, adaptável e visualmente coesa em uma ampla gama de dispositivos. O foco na usabilidade mobile e a inspiração na simplicidade e clareza do design iOS contribuem para uma interface mais intuitiva e agradável.
