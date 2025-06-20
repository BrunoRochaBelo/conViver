
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
10. [Roadmap](#roadmap)
11. [Contribuindo](#contribuindo)
12. [Licença](#licença)
13. [Contato](#contato)

---

## Visão Geral
conViver é uma aplicação **monolítica modular** construída em **C# (.NET 8)** no back-end, **HTML/CSS/JavaScript puro** no front-end web e **.NET MAUI** para mobile (iOS/Android).

Principais módulos:

| Módulo | Highlights |
|--------|------------|
| **Financeiro** | Geração de boletos, conciliação via webhook (genérico), gestão de despesas, balancetes. Acordos de inadimplência implementados. (*PIX específico e relatórios avançados como DIRF são futuros*) |
| **Comunicação** | Mural digital (Avisos), Votações Online |
| **Portaria & Segurança** | Registro de Visitantes (com pré-autorização e QR code), Encomendas (registro e retirada) |
| **Reservas & Agenda** | Reservas de áreas comuns com aprovação |
| **Prestadores & OS** | Cadastro de Prestadores, Ordens de Serviço, Avaliações de Prestadores |
| **Documentos** | Biblioteca de documentos com upload e download |
| **Gamificação** | Pontos, níveis, metas (Planejado/Futuro) |

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
> Rode `dotnet ef database update --project conViver.Infrastructure` antes de `dotnet run` para criar o banco e popular usuários de exemplo (`admin@conviver.local` / `admin123` e `teste@conviver.local` / `123456`).

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

# /auth/signup é um POST – veja API_REFERENCE.md atualizado para DTOs corretos.

4. Front Web
# Abrir um simple static server (ex. live-server)
npx serve conViver.Web --single
# Acesse http://localhost:3000/login.html para autenticar e usar o dashboard

5. Mobile MAUI
cd conViver.Mobile
dotnet build -t:Run -f net8.0-android

## Variáveis de Ambiente

| Nome                          | Descrição                                                                                                                               | Exemplo                                                   |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| `DB_CONNECTION`               | String de conexão para PostgreSQL ou SQLite.                                                                                            | `Host=localhost;Database=conviver;Username=user;Password=pass` ou `Data Source=conviver.db` |
| `JWT_SECRET`                  | Chave secreta para assinatura de tokens JWT (HMAC-SHA256). Mínimo 32 caracteres.                                                        | `uma-chave-secreta-muito-longa-e-segura-aqui`             |
| `REDIS_CONNECTION`            | String de conexão para o Redis.                                                                                                         | `localhost:6379,abortConnect=false`                       |
| `BASE_URL`                    | URL base pública da API, usada em contextos como geração de links em emails.                                                            | `https://sua-api.com/api/v1`                              |
| `API_CORS_ALLOWED_ORIGINS`    | Define as origens permitidas para CORS na API. Valor em `conViver.API/appsettings.json` (ex: `CorsSettings:AllowedOrigins`).            | `http://localhost:3000;https://yourdomain.com`            |
| `WEB_API_BASE_URL`            | Define a URL base da API para o cliente web. Valor em `conViver.Web/js/config.js` (ex: `window.APP_CONFIG.API_BASE_URL`).                | `http://localhost:5000/api/v1`                            |

`conViver.API/appsettings.Development.json` possui defaults seguros para desenvolvimento.
> Usuários de exemplo: `admin@conviver.local` / `admin123` (administrador) e `teste@conviver.local` / `123456` (morador). Verifique se ainda estão válidos após migrações e seeders.

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

## Roadmap

### Implementado Recentemente / Confirmado
*   **Gestão Financeira Base**: Cadastro de Despesas, Balancete. Geração de Cobranças (Boletos) e Geração em Lote. Webhook de Pagamento genérico. Acordos de Inadimplência.
*   **Comunicação**: Mural de Avisos, Votações Online completas.
*   **Portaria & Segurança**: Registro de Visitantes (com pré-autorização e QR code), Encomendas (registro e retirada).
*   **Reservas de Áreas Comuns**: Funcionalidade completa com aprovação.
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

### Estrutura de Páginas & Navegação
As páginas HTML da aplicação web ficam em `conViver.Web/pages`. Crie novos arquivos nesse diretório para adicionar funcionalidades.

O menu é montado dinamicamente pelo script `js/nav.js`. Para incluir uma nova página no menu:
1. Edite `conViver.Web/js/nav.js` e adicione um item no array `items` com a chave, rótulo e caminho da página.
2. Certifique-se de que a página importe o script `../js/nav.js` (ou `js/nav.js` quando estiver na raiz).

Mantenha os links relativos usando a pasta `pages/` como base. Assim o componente consegue calcular corretamente o prefixo e evita links quebrados.
Se criar rotas novas, lembre-se de atualizar `scripts/check-html-routes.ps1` para que o script de verificação reconheça o caminho.

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

