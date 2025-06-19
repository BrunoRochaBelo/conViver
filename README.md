
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
| **Financeiro** | Geração de boletos/Pix, conciliação bancária, acordos de inadimplência |
| **Comunicação** | Mural digital, avisos, votações online |
| **Portaria & Segurança** | Visitantes, encomendas, QR Code, histórico |
| **Reservas & Agenda** | Áreas comuns, manutenções programadas |
| **Prestadores & OS** | Cadastro, ordens de serviço, avaliações |
| **Gamificação** | Pontos, níveis, metas (opcional) |

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
├─ src/
│ ├─ Core/ ⟵ Entidades DDD, ValueObjects, Interfaces
│ ├─ Application/ ⟵ Services, Validators, CQRS futuro
│ ├─ Infrastructure/ ⟵ EF Core, Auth, Cache, Logging
│ ├─ WebApi/ ⟵ ASP.NET Core REST (/api/v1)
│ ├─ WebFrontend/ ⟵ HTML + CSS + JS (assets, pages)
│ └─ MobileApp.Maui/ ⟵ .NET MAUI cross-platform
├─ tests/ ⟵ xUnit unit/integration suites
├─ docker-compose.yml ⟵ PostgreSQL + Redis + API
└─ docs/ ⟵ Arquitetura, Regras de Negócio, Swagger

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
> Para algo ainda mais simples, a API também funciona em **SQLite** por padrão em desenvolvimento.
> Apenas execute `dotnet run` na pasta da API e um arquivo `conviver.db` será criado com um usuário de teste (`teste@conviver.local` / `123456`).

### 1. Clone & restaure pacotes
```bash
git clone https://github.com/seu-usuario/conViver.git
cd conViver
dotnet restore

2. Banco de dados (opcional para PostgreSQL)
docker run -d --name pgconviver -e POSTGRES_PASSWORD=devpass -p 5432:5432 postgres:16
dotnet ef database update --project src/Infrastructure

3. Rodar API
cd conViver.API
ASPNETCORE_ENVIRONMENT=Development dotnet run  # localhost:5000  (Swagger em /api/v1/swagger somente em Development)
# /auth/signup é um POST – veja API_REFERENCE.md

4. Front Web
# Abrir um simple static server (ex. live-server)
npx serve conViver.Web --single
# Acesse http://localhost:3000/login.html para autenticar e usar o dashboard

5. Mobile MAUI
cd src/MobileApp.Maui
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
> Usuário de teste: `teste@conviver.local` / `123456`.


Scripts & Automação
Script	O que faz
./scripts/create-migration.ps1 "AddBoleto"	Cria migration EF Core
./scripts/dev-up.ps1	Start Docker Compose (PG + Redis)
./scripts/test-all.ps1	Roda todos os testes unitários/integrados


Testes

Unit: tests/Core.Tests, tests/Application.Tests  
Integration: tests/Infrastructure.Tests (usa Testcontainers p/ PG/Redis)  
dotnet test mostra cobertura (coverlet) → badge no README via CI.  

CI/CD

GitHub Actions ci.yml – build + testes + sonar  
cd.yml – docker build, push registry, deploy Azure    
Infra: Azure App Service (API), Azure Storage (front), Azure ADB2C (auth)  

Roadmap

WebSocket 👁️ painel tempo-real (SignalR) 
Integração Pix instantânea (webhook Dia-bolinha) 
Chatbot IA (OpenAI Assist) para dúvidas de síndico 
White-label multi-condomínio para administradoras grandes 

Contribuindo

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

### Feedback Visual (Mobile)
O cliente móvel (`conViver.Mobile`) utiliza um serviço centralizado para feedback:
- `Services/FeedbackService.cs` é responsável por exibir feedback.
- Um indicador de carregamento global está definido em `AppShell.xaml` e é controlado pelo `FeedbackService`.
- Mensagens de sucesso e informativas são exibidas usando `Snackbar` (do MAUI Community Toolkit). Erros críticos usam alertas modais.

## Licença
MIT

## Contato
Bruno (maintainer) • ✉️ dev@conviver.app • 🐙 @bruno-dev • Recife-PE 🌞
“Bora dominar o condomínio e deixar a gestão redondinha!” 🤝

