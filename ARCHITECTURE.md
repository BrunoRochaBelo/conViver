
# Arquitetura da Solução – conViver

> **Data:** 16/06/2025  **Timezone:** America/Recife  
> **Clean Architecture** com **DDD** em monólito modular, garantindo clareza de responsabilidades, testabilidade e escalabilidade.

---

## 1. Visão Geral

A solução **conViver** adota uma arquitetura em camadas isoladas, inspirada em Robert C. Martin, viabilizada pelo **Domain-Driven Design** (DDD) e organizada em módulos num único repositório (monorepo). Cada camada depende apenas da camada imediatamente inferior via **interfaces** (Dependency Inversion).


┌──────────────────────────────────────────────────────────┐
│ Presentation │
│ ┌───────────────────┐ ┌──────────────────┐ ┌───────────────────┐│
│ │  conViver.API   │ │  conViver.Web  │ │ conViver.Mobile ││
│ └─────────┬─────────┘ └────────┬─────────┘ └─────────┬─────────┘│
│           │                    │                     │          │
│ ┌─────────▼──────────────────────────────────────────► │          │
│ │                       Application                    │          │
│ └─────────┬──────────────────────────────────────────┘          │
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

### 3.2 Application (`conViver.Application`)
- **Responsabilidade**: orquestra casos de uso e transações.
- **Conteúdo**:  
  - **Services** (`UsuarioService`, `CondominioService`, `FinanceiroService`, `VotacaoService`, etc.)
  - **DTOs** e **Validators** (FluentValidation)
  - **Interfaces** de Application (`IUsuarioService`, etc.)
  - Configuração de **DependencyInjection**

### 3.3 Infrastructure (`conViver.Infrastructure`)
- **Responsabilidade**: implementação concreta de persistência, mensageria, cache, logs e integrações externas.
- **Conteúdo**:  
  - **EF Core** `ConViverDbContext`, Migrations, Repositórios (`UsuarioRepository`, `CondominioRepository`, etc.)
  - **Autenticação** (JWT), **Cache** (Redis - `RedisCacheService`), **Logging** (Serilog)
  - **Adapters** para APIs bancárias (simulado/genérico), armazenamento de arquivos (local/blob storage)
  - **Notificações Push** (Planejado/Futuro - `NotificationService` pode ser um placeholder)

### 3.4 Presentation
- **`conViver.API`**: Controllers RESTful, Middlewares (erro, logging, autenticação).
- **`conViver.Web`**: Páginas HTML semânticas, CSS responsivo, módulos ES6 e consumo via Fetch API.
- **`conViver.Mobile`**: .NET MAUI com MVVM (Community Toolkit), navegação e serviços HTTP.

---

## 4. Fluxo de Requisição (Exemplo)

1. **`conViver.API`** recebe `HTTP /api/v1/...` → Middleware valida JWT e scopes.
2. Controller injeta interface do serviço da camada de aplicação (ex: `IVotacaoService`) e chama o caso de uso.
3. Serviço na **`conViver.Application`** inicia transação (se necessário), utiliza entidades e VOs do Core, e pode chamar outros serviços de aplicação ou domínio.
4. Chamada a interfaces de repositório (ex: `IVotacaoRepository`) definidas no Core e implementadas na Infrastructure.
5. **`conViver.Infrastructure`** implementa o repositório usando `EF Core` para persistir dados; fecha transação.
6. Response (geralmente um DTO) sobe pela `conViver.API` retornando JSON apropriado.

---

## 5. Modelo de Domínio (DDD)

- **Exemplos de Agregados e Raízes de Agregado**:
    - `Condominio` (Raiz): Agrega `Unidade`, `Aviso`, `Documento`. Endereço é um ValueObject de `Condominio`.
    - `Usuario` (Raiz): Representa um usuário da plataforma, vinculado a uma `Unidade` principal.
    - `Unidade` (Raiz): Pode agregar informações sobre seus `Moradores` (que são `Usuario` com vínculo específico).
    - `Boleto` (Raiz): Representa uma cobrança.
    - `Reserva` (Raiz): Para áreas comuns.
    - `OrdemServico` (Raiz): Pode agregar histórico de atualizações.
    - `PrestadorServico` (Raiz): Agrega `AvaliacaoPrestador`.
    - `Votacao` (Raiz): Agrega `OpcaoVotacao`, que por sua vez agrega `VotoRegistrado`.
    - `Chamado` (Raiz): Representa um chamado de helpdesk.
- **Repositórios**: `ICondominioRepository`, `IUsuarioRepository`, `IVotacaoRepository` etc. – expõem métodos de consulta e persistência para raízes de agregado. Definidos em `conViver.Core` e implementados em `conViver.Infrastructure`.
- **Serviços de Domínio/Aplicação**: Regras complexas que não se encaixam em uma única entidade (ex: geração de lote de boletos, apuração de votação, processamento de inadimplência) residem em `conViver.Application/Services`. O conceito de "Régua de Cobrança" (mencionado anteriormente) dependeria de uma entidade `RegrasCobranca` que não está implementada atualmente.

---

## 6. Dependências entre Projetos

| Projeto                   | Depende de                                  |
|---------------------------|---------------------------------------------|
| **conViver.Core**         | —                                           |
| **conViver.Application**  | `conViver.Core`                             |
| **conViver.Infrastructure** | `conViver.Core`, `conViver.Application`     |
| **conViver.API**          | `conViver.Core`, `conViver.Application`, `conViver.Infrastructure` |
| **conViver.Web**          | `conViver.API` (via HTTP)                   |
| **conViver.Mobile**       | `conViver.API` (via HTTP)                   |
| **conViver.Tests**        | `conViver.Core`, `conViver.Application`, `conViver.API`, `conViver.Infrastructure` (para testes de diferentes camadas) |


---

## 7. Diagrama de Componentes (resumido)

*(A imagem /docs/diagrams/architecture.png não existe no repositório. Um diagrama textual simplificado abaixo)*

```text
[conViver.Web]  [conViver.Mobile]
      \             /
       \           /
        -> [conViver.API] -> [conViver.Application] -> [conViver.Core]
                                          \         (Domain)
                                           -> [conViver.Infrastructure]
```

## 8. Tecnologias & Justificativas
Camada          | Projeto Relacionado     | Tecnologia Principal   | Por quê?
----------------|-------------------------|------------------------|----------------------------------------------------
Domínio         | `conViver.Core`         | C# (.NET 8)            | Lógica de negócio pura, performance, tipagem forte
Aplicação       | `conViver.Application`  | C# (.NET 8)            | Orquestração de casos de uso, TDD, DI
Persistência    | `conViver.Infrastructure` | EF Core + PostgreSQL   | Produtividade, ORM robusto, escalável
Cache           | `conViver.Infrastructure` | Redis                  | Baixa latência, cache distribuído
Autenticação    | `conViver.Infrastructure` | ASP.NET Core Identity (implícito), JWT | Padrões de segurança
API             | `conViver.API`          | ASP.NET Core           | Framework web moderno, Swagger para documentação
Frontend Web    | `conViver.Web`          | HTML5, CSS3, JS ES6 puro | Leve, sem dependências complexas, fácil integração
Mobile          | `conViver.Mobile`       | .NET MAUI + MVVM Toolkit | Reuso de código C#, UI nativa cross-platform
DevOps          | (Configuração Externa)  | GitHub Actions, Azure  | Integração contínua, deploy automatizado


## 9. Evolução & Escalabilidade

- **Sharding / Particionamento**: Considerar para tabelas de alto volume como `boletos`, `lancamentos`, `visitantes` por `condominio_id` e/ou período.
- **Event Sourcing**: Para um histórico completo e auditabilidade de certas entidades críticas, poderia ser introduzido (ex: usando Kafka ou Azure Service Bus).
- **Micro-serviços**: Módulos mais complexos ou com requisitos de escalabilidade distintos (ex: processamento de pagamentos, notificações) poderiam ser extraídos para micro-serviços no futuro.
- **Cache de Segundo Nível / Cache Otimizado**: Expandir o uso de Redis para cache de consultas frequentes e dados de dashboard.

## 10. Links Úteis

- 📑 **Modelo de Dados:** [`DATABASE_SCHEMA.MD`](DATABASE_SCHEMA.md)
- 📖 **Referência da API:** [`API_REFERENCE.MD`](API_REFERENCE.md)
- 🧪 **Guia de Testes:** [`TEST_GUIDE.MD`](TEST_GUIDE.md)
- ⚙️ **Guia de Deploy:** [`DEPLOY_GUIDE.MD`](DEPLOY_GUIDE.md)
- 🚀 **Roadmap & Funcionalidades:** [`README.MD`](README.md) (Seção Roadmap)

*Nota: `BUSINESS_RULES.MD` não foi encontrado no repositório.*

Fim – Este documento serve como referência central para toda a equipe de desenvolvimento.
Qualquer dúvida ou sugestão, abra issue ou PR no repositório! 😉
