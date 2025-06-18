
# Arquitetura da Solução – conViver

> **Data:** 16/06/2025  **Timezone:** America/Recife  
> **Clean Architecture** com **DDD** em monólito modular, garantindo clareza de responsabilidades, testabilidade e escalabilidade.

---

## 1. Visão Geral

A solução **conViver** adota uma arquitetura em camadas isoladas, inspirada em Robert C. Martin, viabilizada pelo **Domain-Driven Design** (DDD) e organizada em módulos num único repositório (monorepo). Cada camada depende apenas da camada imediatamente inferior via **interfaces** (Dependency Inversion).


┌──────────────────────────────────────────────────────────┐
│ Presentation │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐│
│ │ WebAPI │ │ Front Web JS │ │ Mobile MAUI ││
│ └───────┬───────┘ └───────┬───────┘ └───────┬───────┘│
│ │ │ │ │
│ ┌───────▼────────────────────────────────────────►│ │
│ │ Application │ │
│ └───────┬──────────────────────────────────────────┘ │
│ │ │
│ ┌───────▼───────────────────────────────────────────────────┐│
│ │ Domain / Core ││
│ └───────┬───────────────────────────────────────────────────┘│
│ │ │
│ ┌───────▼───────────────────────────────────────────────────┐│
│ │ Infrastructure ││
│ └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘

---

## 2. Princípios Arquiteturais

- **Separação de Responsabilidades**: Cada camada tem papel único (UI, aplicação, domínio, infra).
- **Inversão de Dependência**: Camadas externas dependem de abstrações da camada de domínio.
- **Modelagem por DDD**: Entidades, Value Objects, Agregados, Repositórios e Serviços de Domínio.
- **Monólito Modular**: Múltiplos projetos (Core, Application, Infrastructure, WebApi, FrontWeb, Mobile) em um único repositório, facilitando CI/CD.
- **Testabilidade**: Camada de domínio pura, sem referências a frameworks, permitindo testes unitários e de integração.

---

## 3. Camadas

### 3.1 Core / Domain
- **Responsabilidade**: regras de negócio puras.
- **Conteúdo**:  
  - **Entities** (Boleto, Unidade, Reserva, etc)  
  - **ValueObjects** (Endereço, LinhaDigitavel)  
  - **Enums** & **Exceptions**  
  - **Interfaces** (repositórios, serviços de domínio)

### 3.2 Application
- **Responsabilidade**: orquestra casos de uso e transações.
- **Conteúdo**:  
  - **Services** (BoletoService, CobrancaService, etc)  
  - **DTOs** e **Validators**  
  - **Interfaces** de Application  
  - Configuração de **DependencyInjection**

### 3.3 Infrastructure
- **Responsabilidade**: implementação concreta de persistência, mensageria, cache, logs e integrações externas.
- **Conteúdo**:  
  - **EF Core** `DbContext`, Migrations, Repositórios  
  - **JWT/Auth**, **RedisCache**, **Serilog**, **Push Notification**  
  - **Adapters** para APIs bancárias, armazenamento de arquivos

### 3.4 Presentation
- **WebApi**: controllers RESTful, middlewares (erro, logging, autenticação).  
- **Front Web JS**: páginas HTML semânticas, CSS responsivo, módulos ES6 e consumo via Fetch.  
- **Mobile MAUI**: MVVM com Community Toolkit, navegação e serviços HTTP.

---

## 4. Fluxo de Requisição

1. **WebApi** recebe `HTTP /api/v1/...` → Middleware valida JWT e scopes.  
2. Controller injeta **IApplicationService** e chama caso de uso.  
3. **ApplicationService** inicia transação, chama métodos de domínio (entidades, VO).  
4. Chamada a **IRepository** abstraído via interface.  
5. **Infrastructure** implementa `EF Core` e persiste dados; fecha transação.  
6. Response sobe pela WebApi retornando JSON apropriado.

---

## 5. Modelo de Domínio (DDD)

- **Agregado**: Boleto agrega Pagamentos e Regras de Cobrança.  
- **Raiz de Agregado**: Unidade, Boleto, Reserva, OrdemServico.  
- **Repositório**: `IBoletoRepository`, `IUnitRepository` – expõe métodos de consulta e persistência.  
- **Serviço de Domínio**: regras complexas (cálculo de juros, geração de lote, régua de cobrança) vivem em `Domain/Services` ou `Application/Services`.

---

## 6. Dependências entre Projetos

| Projeto          | Depende de             |
|------------------|------------------------|
| **Core**         | —                      |
| **Application**  | Core                   |
| **Infrastructure** | Core, Application     |
| **WebApi**       | Core, Application, Infrastructure |
| **FrontWeb**     | WebApi (via HTTP)      |
| **MobileApp.Maui** | WebApi (via HTTP)    |

---

## 7. Diagrama de Componentes (resumido)

/docs/diagrams/architecture.png (sugestão: exportar de draw.io)

```text
[FrontWeb]    [MobileMAUI]
     \             /
      \           /
       --> [WebApi] --> [Application] --> [Domain]
                                 \
                                  --> [Infrastructure]


8. Tecnologias & Justificativas
Camada	Tecnologia	Por quê?
Core	C# (.NET 8)	Performance, tipagem forte
Application	C# (.NET 8)	TDD, DI, orquestração
Persistence	EF Core + PostgreSQL	Produtividade + escalável
Cache	Redis	Baixa latência, distribuição
Auth / API	ASP.NET Core, JWT, Swagger	Segurança, documentação
Front Web	HTML5, CSS3, JS ES6 puro	Leve, sem dependências, fácil integração
Mobile	.NET MAUI + MVVM Toolkit	Reuso de código C#, cross-platform
DevOps	GitHub Actions, Azure	Integração contínua, deploy automatizado


9. Evolução & Escalabilidade

Sharding / Particionamento de tabelas boletos e pagamentos por condomínio/mês.  
Event Sourcing para histórico completo (via Kafka ou Azure Service Bus).  
Micro-services: extrair módulos pesados (e.g., gateway bancário) no futuro.  
Cache de Segundo Nível: implementar Redis para consultas frequentes (dashboard, relatórios).  

10. Links Úteis

📄 Regras de Negócio (BUSINESS_RULES.md)  
📑 Modelo de Dados (DATABASE_SCHEMA.md)  
🧪 Guia de Testes (TEST_GUIDE.md)  
⚙️ Guia de Deploy (DEPLOY_GUIDE.md)  


Fim – Este documento serve como referência central para toda a equipe de desenvolvimento.
Qualquer dúvida ou sugestão, abra issue ou PR no repositório! 😉
