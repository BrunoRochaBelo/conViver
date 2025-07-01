
# conViver 🏢✨  
_Solução SaaS tudo-em-um para gestão condominial: financeiro, portaria, reservas e muito mais._

[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple)](https://dotnet.microsoft.com/)
[![MAUI](https://img.shields.io/badge/.NET_MAUI-mobile-blue)](https://learn.microsoft.com/dotnet/maui/)
[![CI-CD](https://github.com/seu-usuario/conViver/actions/workflows/ci.yml/badge.svg)](https://github.com/seu-usuario/conViver/actions)

---

## 🗺️ Índice
1. [Visão Geral](#visão-geral)
2. [Tecnologias & Stack](#tecnologias--stack)
3. [Arquitetura & Estrutura](#arquitetura--estrutura)
4. [Pré-requisitos](#pré-requisitos)
5. [Guia Rápido de Uso Local](#guia-rápido-de-uso-local)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Scripts & Automação](#scripts--automação)
8. [Testes](#testes)
9. [CI/CD](#cicd)
10. [Documentação Complementar](#documentação-complementar)
11. [Roadmap](#roadmap)
12. [Contribuindo](#contribuindo)
13. [Licença](#licença)
14. [Contato](#contato)

---

## Visão Geral
conViver é uma aplicação **monolítica modular** construída em **C# (.NET 8)** no back-end, **HTML/CSS/JavaScript puro** no front-end web e **.NET MAUI** para mobile (iOS/Android).

Principais módulos:

| Módulo | Highlights |
|--------|------------|
| **Financeiro** | Geração de boletos, conciliação via webhook (genérico), gestão de despesas, balancetes. Acordos de inadimplência implementados. (*PIX específico e relatórios avançados como DIRF são futuros*) |
| **Comunicação** | Mural digital (Avisos), Votações Online |
| **Portaria & Segurança** | Registro de Visitantes (com pré-autorização e QR code), Encomendas (registro e retirada) |
| **Calendário** | Reservas de áreas comuns com aprovação |
| **Prestadores & OS** | Cadastro de Prestadores, Ordens de Serviço, Avaliações de Prestadores |
| **Documentos** | Biblioteca de documentos com upload e download |
| **Gamificação** | Pontos, níveis, metas (Planejado/Futuro) |

*Serviços auxiliares como o `DashboardService` e o `NotificationService` usam dados
mockados ou apenas registram logs, servindo de base para futuras integrações.*

---

## Tecnologias & Stack

| Camada | Techs |
|--------|-------|
| **Back-end** | ASP.NET Core 8, EF Core + PostgreSQL, Redis, Serilog, JWT |
| **Front Web** | HTML5, CSS3 (Flexbox/Grid), JavaScript ES6, Fetch API |
| **Mobile** | .NET MAUI, MVVM Community Toolkit, MonkeyCache |
| **DevOps** | GitHub Actions, Azure App Service, Docker Compose (dev) |

---

## Arquitetura & Estrutura


conViver/
├─ conViver.Core/ ⟵ Entidades DDD, ValueObjects, Interfaces
├─ conViver.Application/ ⟵ Services, Validators, CQRS futuro
├─ conViver.Infrastructure/ ⟵ EF Core, Auth, Cache, Logging
├─ conViver.API/ ⟵ ASP.NET Core REST (/api/v1)
├─ conViver.Web/ ⟵ HTML + CSS + JS (assets, pages)
├─ conViver.Mobile/ ⟵ .NET MAUI cross-platform
├─ conViver.Tests/ ⟵ xUnit unit/integration suites
├─ scripts/ ⟵ utilidades de desenvolvimento
├─ docker-compose.yml ⟵ PostgreSQL + Redis + API
└─ API_REFERENCE.md, DATABASE_SCHEMA.md, etc. ⟵ Documentação na raiz

---

## Pré-requisitos
| Item | Versão mínima |
|------|---------------|
| [.NET SDK](https://dotnet.microsoft.com/) | **8.0.100** |
| Node.js (apenas live-server opcional) | 18 |
| PostgreSQL | 16 |
| Redis | 7 |
| PowerShell 7 ou Bash | — |
| Android SDK / Xcode | p/ build mobile |

---

## Guia Rápido de Uso Local

> Com Docker (`docker compose up -d`) você já sobe **PostgreSQL, Redis e API** num tapa.
> Para desenvolvimento rápido, a API suporta **SQLite** (arquivo `conviver.db`).
> Rode `dotnet ef database update --project conViver.Infrastructure` antes de `dotnet run` para criar o banco. O `DataSeeder` roda na primeira execução e insere um condomínio, unidade e usuários de exemplo:
> `admin@conviver.local` / `admin123` (Administrador),
> `sindico@conviver.local` / `sindico123` (Síndico),
> `teste@conviver.local` / `123456` (Morador) e
> `porteiro@conviver.local` / `porteiro123` (Porteiro).

### 1. Clone & restaure pacotes
```bash
git clone https://github.com/seu-usuario/conViver.git
cd conViver
dotnet restore

2. Banco de dados
# Se desejar usar PostgreSQL:
docker run -d --name pgconviver -e POSTGRES_PASSWORD=devpass -p 5432:5432 postgres:16
# Aplique as migrations (SQLite ou PostgreSQL)
dotnet ef database update --project conViver.Infrastructure
# (reexecute sempre que fizer pull para aplicar novas migrations)

3. Rodar API
cd conViver.API
# Linux/macOS
ASPNETCORE_ENVIRONMENT=Development dotnet run  # localhost:5000  (Swagger em /swagger somente em Development)
# Windows PowerShell
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run
# Windows CMD
set ASPNETCORE_ENVIRONMENT=Development
dotnet run

# Certifique-se de que o Redis esteja rodando
# (ex.: `docker compose up` ou `redis-server`).
# A conexão padrão em `appsettings.Development.json` usa
# `localhost:6379,abortConnect=false` para evitar falhas caso o
# serviço ainda não esteja disponível.
# Você pode definir `USE_REDIS=false` para usar um cache em memória
# e dispensar o serviço do Redis durante o desenvolvimento.

# /auth/signup é um POST – veja API_REFERENCE.md atualizado para DTOs corretos.

4. Front Web
# Abrir um simple static server (ex. live-server)
npx serve conViver.Web --single
# Acesse http://localhost:3000/login.html para autenticar e usar o dashboard
* Antes de abrir arquivos de `conViver.Web/wwwroot`, execute `./scripts/sync_wwwroot.sh` (ou `dotnet build`). Os HTML, CSS e JS originais ficam em `conViver.Web/`; o script gera `wwwroot` com `layout.html` e demais arquivos para login e navegação.

5. Mobile MAUI
cd conViver.Mobile
dotnet build -t:Run -f net8.0-android

## Variáveis de Ambiente

| Nome                          | Descrição                                                                                                                               | Exemplo                                                   |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| `DB_CONNECTION`               | String de conexão para PostgreSQL ou SQLite.                                                                                            | `Host=localhost;Database=conviver;Username=user;Password=pass` ou `Data Source=conviver.db` |
| `JWT_SECRET`                  | Chave secreta para assinatura de tokens JWT (HMAC-SHA256). Mínimo 32 caracteres.                                                        | `uma-chave-secreta-muito-longa-e-segura-aqui`             |
| `REDIS_CONNECTION`            | String de conexão para o Redis.                                                                                                         | `localhost:6379,abortConnect=false`                       |
| `USE_REDIS`                   | Quando `true`, a API usa Redis para cache HTTP. Defina `false` para cache em memória. | `true` |
| `BASE_URL`                    | URL base pública da API, usada em contextos como geração de links em emails.                                                            | `https://sua-api.com/api/v1`                              |
| `API_CORS_ALLOWED_ORIGINS`    | Define as origens permitidas para CORS na API. Valor em `conViver.API/appsettings.json` (ex: `CorsSettings:AllowedOrigins`).            | `http://localhost:3000;https://yourdomain.com`            |
| `WEB_API_BASE_URL`            | Define a URL base da API para o cliente web. Valor em `conViver.Web/js/config.js` (ex: `window.APP_CONFIG.API_BASE_URL`).                | `http://localhost:5000/api/v1`                            |

`conViver.API/appsettings.Development.json` possui defaults seguros para desenvolvimento.
> Usuários de exemplo: `admin@conviver.local` / `admin123` (Administrador), `sindico@conviver.local` / `sindico123` (Síndico), `teste@conviver.local` / `123456` (Morador) e `porteiro@conviver.local` / `porteiro123` (Porteiro). Verifique se ainda estão válidos após migrações e seeders.

## Scripts & Automação
Scripts úteis localmente e em pipelines.

| Script | O que faz |
|-------|-----------|
| `./scripts/check-html-routes.ps1` | Verifica que todas as páginas HTML respondem com status 200 |

## Testes

Unit: `conViver.Tests/Application/Services` e outros.
Integration: `conViver.Tests/API` (exemplos).
*Nota: A estrutura de testes em `conViver.Tests` pode conter mais tipos de testes. A referência a Testcontainers é aspiracional se não implementada.*
`dotnet test` mostra cobertura (coverlet) → badge no README via CI (se configurado).

## CI/CD

GitHub Actions `ci.yml` – build + testes + sonar (se configurado).
`cd.yml` – docker build, push registry, deploy Azure (se configurado).
Infra (Exemplo): Azure App Service (API), Azure Storage (front), Azure AD B2C (auth).

## Documentação Complementar
- **API_REFERENCE.md** – referência de todos os endpoints.
- **DATABASE_SCHEMA.md** – visão detalhada das tabelas e relacionamentos.
- **ARCHITECTURE.md** – explicação da arquitetura em camadas.
- **DEPLOY_GUIDE.md** – passo a passo para publicar no Azure.
- **TEST_GUIDE.md** – convenções e dicas de testes.

## Roadmap

### Implementado Recentemente / Confirmado
*   **Gestão Financeira Base**: Cadastro de Despesas, Balancete. Geração de Cobranças (Boletos) e Geração em Lote. Webhook de Pagamento genérico. Acordos de Inadimplência.
*   **Comunicação**: Mural de Avisos, Votações Online completas.
*   **Portaria & Segurança**: Registro de Visitantes (com pré-autorização e QR code), Encomendas (registro e retirada).
*   **Calendário e Reservas**: Funcionalidade completa com aprovação.
*   **Prestadores & Ordens de Serviço**: Cadastro de Prestadores, OS, Avaliações de Prestadores.
*   **Documentos**: Biblioteca de documentos com upload e download.
*   **Autenticação**: Login, Signup, Refresh Token, Forgot/Reset Password (simulado), Gestão de Usuários (Admin), Gestão de Membros de Unidades (Síndico).

### Próximos Passos & Melhorias (Sugestões)
*   **Financeiro Avançado**: Integração específica PIX, relatórios financeiros detalhados (DIRF, etc.), regras de cobrança configuráveis.
*   **Notificações & Tempo-Real**: Implementar notificações Push (FCM/APNS) e WebSockets (SignalR) para atualizações em tempo-real. (Endpoint `/app/notify/subscribe` e Hubs não implementados).
*   **Configurações Detalhadas**: Módulos de configuração para síndico (taxas, regras de reserva, etc.) e admin (gateway de pagamento). (Maioria dos endpoints de `/settings` não implementados).
*   **Autenticação Avançada**: Finalizar implementação de 2FA.
*   **Gestão de Unidades**: Implementar CRUD completo para Unidades (blocos/apartamentos) pelo Síndico (API Ref. Sec 3.1 não implementada).
*   **Módulo Condômino para Encomendas**: `GET /app/encomendas` para o condômino ver suas encomendas.
*   **Testes**: Expandir cobertura de testes unitários e de integração.
*   **Gamificação**: Desenvolver módulo de gamificação (pontos, níveis, metas).

### Futuro Distante / Ideias
*   Chatbot IA (OpenAI Assist) para dúvidas de síndico.
*   White-label multi-condomínio para administradoras grandes.

## Contribuindo

Fork + branch feat/alguma-coisa  
Rode dotnet format antes de commitar  
Abra Pull Request 🚀 – siga o template e descreva 🍻  
Feedbacks welcome (português ou inglês) 

Dica nordestina: não se avexe não – toda PR é revisada com carinho!

## Notas de Desenvolvimento Frontend

### Feedback Visual (Web)
O cliente web (`conViver.Web`) utiliza um sistema de feedback visual global para operações de API:
- Um overlay de carregamento (`<div id="global-loading-overlay">`) é exibido durante as requisições.
- Mensagens de sucesso ou erro são exibidas em um banner (`<div id="global-message-banner">`).
- Esta funcionalidade é gerenciada automaticamente por `js/apiClient.js`.
- Para mostrar ou ocultar placeholders de carregamento (skeletons), utilize `showSkeleton()` e `hideSkeleton()` de `js/main.js` nos módulos.
- Operações de exclusão utilizam **comportamento otimista**: o item é escondido assim que o usuário confirma e a requisição `apiClient.delete` é enviada. Se a remoção falhar (HTTP >= 400), o elemento volta a aparecer e um feedback de erro é exibido.

### Estrutura de Páginas & Navegação
As páginas HTML da aplicação web ficam em `conViver.Web/pages`. Crie novos arquivos nesse diretório para adicionar funcionalidades.

O arquivo `layout.html` centraliza cabeçalho, menu e scripts comuns. Ele serve de contêiner para as páginas carregadas dinamicamente e **deve** estar presente em `wwwroot`.

O menu é montado dinamicamente pelo script `js/nav.js`. Para incluir uma nova página no menu:
1. Edite `conViver.Web/js/nav.js` e adicione um item no array `items` com a chave, rótulo e caminho da página.
2. Certifique-se de que a página importe o script `../js/nav.js` (ou `js/nav.js` quando estiver na raiz).

Mantenha os links relativos usando a pasta `pages/` como base. Assim o componente consegue calcular corretamente o prefixo e evita links quebrados.
Se criar rotas novas, lembre-se de atualizar `scripts/check-html-routes.ps1` para que o script de verificação reconheça o caminho.

Para refletir suas alterações em `wwwroot`, execute `./scripts/sync_wwwroot.sh` (ou `dotnet build`). O processo copia `layout.html` e demais arquivos HTML, CSS e JS para `wwwroot`. Rode o script antes de servir o front-end em desenvolvimento; durante o build ele é executado automaticamente.
O projeto não armazena mais arquivos de fonte locais. A folha de estilos importa as fontes "Open Sans" direto do Google Fonts.

### Feedback Visual (Mobile)
O cliente móvel (`conViver.Mobile`) utiliza um serviço centralizado para feedback:
- `Services/FeedbackService.cs` é responsável por exibir feedback.
- Um indicador de carregamento global está definido em `AppShell.xaml` e é controlado pelo `FeedbackService`.
- Mensagens de sucesso e informativas são exibidas usando `Snackbar` (do MAUI Community Toolkit). Erros críticos usam alertas modais.

## Solução de Problemas Comuns

### SQLite: "table Usuarios has no column named CondominioId"
Esse erro indica que o arquivo `conviver.db` está desatualizado em relação às migrations. Execute:

```bash
dotnet ef database update --project conViver.Infrastructure
```

Se o problema continuar, remova `conviver.db` e rode o comando novamente para recriar o banco.

## Licença
MIT

## Contato
Bruno (maintainer) • ✉️ dev@conviver.app • 🐙 @bruno-dev • Recife-PE 🌞
“Bora dominar o condomínio e deixar a gestão redondinha!” 🤝

