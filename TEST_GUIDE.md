
# Test Guide – conViver

**Data:** 16/06/2025  **Timezone:** America/Recife  
Este documento descreve como estruturar, escrever e executar testes em todos os níveis da aplicação conViver: unitários, de integração e (opcional) end-to-end.

---

## 1. Visão Geral

A solução utiliza um projeto de teste principal: `conViver.Tests`. Dentro deste projeto, os testes são organizados por namespaces e pastas que refletem as camadas da arquitetura (e.g., `conViver.Tests.Application.Services`, `conViver.Tests.API`).

| Tipo de Teste       | Localização (dentro de `conViver.Tests`) | Ferramenta(s)                                   |
|---------------------|-------------------------------------------|-------------------------------------------------|
| **Unitários**       | Pastas como `Application/Services/`, `Core/` (se existir) | xUnit, Moq                                      |
| **Integração**      | Pastas como `Infrastructure/`, `API/`      | xUnit, Testcontainers (para PostgreSQL & Redis), EF Core In-Memory (opcional) |
| **End-to-End (E2E)**| (Opcional) Pode ser um projeto separado ou pasta `E2E/` | Playwright / Cypress / Selenium                 |

---

## 2. Preparando o Ambiente

1. **.NET SDK 8.0** instalado e no `PATH`.  
2. Variáveis de ambiente (pode usar `dotnet user-secrets` ou `.env`):  
   ```bash
   export DB_CONNECTION="Host=localhost;Port=5432;Username=postgres;Password=devpass;Database=conviver_test;"
   export REDIS_CONNECTION="localhost:6379"
   export JWT_SECRET="test-secret-32chars"


Docker rodando para testes de integração com Testcontainers (se utilizados).

## 3. Executando Testes Localmente

Navegue até a raiz do repositório ou a pasta do projeto `conViver.Tests`.

### 3.1. Executar Todos os Testes
```bash
# A partir da raiz da solução
dotnet test src/conViver.Tests/conViver.Tests.csproj --configuration Release --no-build

# Ou, a partir da pasta conViver.Tests
# cd src/conViver.Tests
# dotnet test --configuration Release --no-build
```
*Remova `--no-build` se as alterações não foram compiladas.*

### 3.2. Filtrar Testes (Opcional)
Você pode filtrar testes por namespace, nome da classe, ou atributos (Traits) usando a opção `--filter`.
```bash
# Exemplo: Rodar apenas testes de Application.Services
dotnet test src/conViver.Tests/conViver.Tests.csproj --filter "FullyQualifiedName~Application.Services"
```

### 3.3. Cobertura de Código (Coverlet)
Para gerar relatório de cobertura para o projeto `conViver.Tests`:
```bash
dotnet test src/conViver.Tests/conViver.Tests.csproj \
  --collect:"XPlat Code Coverage" \
  --results-directory ./coverage_results
  # O arquivo de cobertura XML será gerado dentro de ./coverage_results/{guid}/coverage.cobertura.xml
```

Depois, para gerar um relatório HTML a partir do XML coletado:
```bash
# Instale a ferramenta globalmente se ainda não o fez: dotnet tool install --global dotnet-reportgenerator-globaltool
reportgenerator \
  -reports:./coverage_results/**/coverage.cobertura.xml \
  -targetdir:./coverage_report \
  -reporttypes:Html
```
Abra `coverage_report/index.html` no navegador.

### 3.4. Testes End-to-End (Opcional)
Se implementado (ex: em `conViver.Tests/E2E` ou projeto separado):
```bash
# Exemplo com Playwright, ajuste conforme a ferramenta
# cd src/conViver.Tests/E2E
# npx playwright test
```

## 4. Ferramentas & Frameworks

xUnit: runner principal para .NET.  
Moq: para mocks e stubs em testes unitários.  
Testcontainers for .NET: para criar containers isolados de PostgreSQL e Redis nos testes de integração.  
EF Core In-Memory: alternativa leve para testes rápidos de repositórios.  
Coverlet: coleta cobertura de código.  
ReportGenerator: converte arquivos de cobertura em HTML.  
Playwright / Cypress: frameworks E2E baseados em JavaScript.  

5. Boas Práticas de Testes
5.1 Convenções de Nome

Classe de teste: NomeDaClasseTests (ex.: BoletoServiceTests).  
Método de teste: Metodo_Scenario_ResultadoEsperado (ex.: GerarBoleto_MaiorQueZero_DeveRegistrar).  
5.2 Estrutura AAA

Arrange: preparar objetos, mocks e dados.  
Act: executar o método sob teste.  
Assert: validar resultados e efeitos colaterais.  
5.3 Isolamento

Unitários devem ser determinísticos e sem I/O.  
Use mocks para dependências (repositórios, serviços externos).  
5.4 Testes de Integração

Suba containers via Testcontainers (PostgreSQL, Redis).  
Use banco limpo a cada execução (EnsureDeleted()/Migrate()).  
Valide transações, migrations e cascades.  
5.5 Testes E2E

Seed de dados minimalista para cenários críticos (login, geração de boleto, reserva). 
Limpar estado ao final (afterAll ou hooks).  
Rodar headless em CI. 

6. Integração com CI
No GitHub Actions (ci.yml):
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      - name: Restore & Build
        run: dotnet build ./src --no-restore --configuration Release # Builda a solução inteira
      - name: Run Tests with Coverage
        run: |
          dotnet test ./src/conViver.Tests/conViver.Tests.csproj \
            --no-build \
            --configuration Release \
            --collect:"XPlat Code Coverage" \
            --results-directory ./coverage_results \
            --logger "trx;LogFileName=test-results.trx"
      - name: Generate Coverage Report
        run: |
          reportgenerator \
            -reports:./coverage_results/**/coverage.cobertura.xml \
            -targetdir:./coverage_report \
            -reporttypes:Html_Inline_AzurePipelines;Cobertura # Adiciona Cobertura para sumário no GH Actions
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        if: always() # Sempre fazer upload, mesmo se os testes falharem
        with:
          name: test-results
          path: ./coverage_results/**/*.trx
      - name: Upload Coverage Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: html-coverage-report
          path: ./coverage_report

# Opcional: Adicionar um passo para verificar o threshold de cobertura e falhar o build
# - name: Check code coverage
#   uses: ... (pode ser um script customizado ou uma action de mercado)

## 7. Troubleshooting

- **Containers não iniciam (Testcontainers)**: Verifique logs do Docker (`docker logs <container_id>`), ajuste versão da imagem no código de teste se necessário.
- **Timeout de DB em Testes de Integração**: Aumente o timeout de startup do Testcontainers se a máquina de CI for lenta.
- **Falhas de Migrations em Testes**: Certifique-se que os testes de integração aplicam migrações (`_dbContext.Database.MigrateAsync()`) em um banco de teste limpo.
- **Cobertura de Código Zero ou Incorreta**:
    - Assegure que o projeto de teste (`conViver.Tests.csproj`) referencia os projetos da aplicação (`conViver.Core`, `conViver.Application`, etc.).
    - Verifique se `<DebugType>Full</DebugType>` ou `<DebugType>Portable</DebugType>` está definido no `.csproj` dos projetos testados para geração de PDBs.
    - Confirme se a opção `<IsTestProject>true</IsTestProject>` está no `.csproj` do projeto de testes.
    - Cheque os filtros do Coverlet se estiverem sendo usados.

Seguindo este guia, a equipe garante qualidade, confiabilidade e rapidez na entrega de funcionalidades. Bons testes! 🚀


