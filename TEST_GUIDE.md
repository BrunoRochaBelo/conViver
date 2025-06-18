
# Test Guide – conViver

**Data:** 16/06/2025  **Timezone:** America/Recife  
Este documento descreve como estruturar, escrever e executar testes em todos os níveis da aplicação conViver: unitários, de integração e (opcional) end-to-end.

---

## 1. Visão Geral

| Tipo de Teste       | Projeto(s)                                | Ferramenta(s)                   |
|---------------------|-------------------------------------------|---------------------------------|
| **Unitários**       | `tests/Core.Tests`<br>`tests/Application.Tests` | xUnit, Moq                      |
| **Integração**      | `tests/Infrastructure.Tests`              | xUnit, Testcontainers, EF Core In-Memory / Testcontainers para PostgreSQL & Redis |
| **End-to-End (E2E)**| (opcional) pasta `tests/E2E.Tests`       | Playwright / Cypress / Selenium |

---

## 2. Preparando o Ambiente

1. **.NET SDK 8.0** instalado e no `PATH`.  
2. Variáveis de ambiente (pode usar `dotnet user-secrets` ou `.env`):  
   ```bash
   export DB_CONNECTION="Host=localhost;Port=5432;Username=postgres;Password=devpass;Database=conviver_test;"
   export REDIS_CONNECTION="localhost:6379"
   export JWT_SECRET="test-secret-32chars"


Docker rodando para testes de integração com Testcontainers. 

3. Executando Testes Localmente
3.1 Unitários
dotnet test tests/Core.Tests \
  --configuration Release \
  --no-build
dotnet test tests/Application.Tests \
  --configuration Release \
  --no-build

3.2 Integração
dotnet test tests/Infrastructure.Tests \
  --configuration Release \
  --no-build


Esses testes usam Testcontainers para subir um PostgreSQL e um Redis isolados; aguarde alguns segundos para que os containers fiquem prontos.

3.3 Cobertura de Código (Coverlet)
Para gerar relatório de cobertura:
dotnet test tests/Core.Tests \
  --collect:"XPlat Code Coverage" \
  --results-directory ./coverage/Core

dotnet test tests/Application.Tests \
  --collect:"XPlat Code Coverage" \
  --results-directory ./coverage/Application

Depois use ReportGenerator:
reportgenerator \
  -reports:coverage/**/*.xml \
  -targetdir:coverage/report \
  -reporttypes:Html

Abra coverage/report/index.html no navegador.
3.4 End-to-End (opcional)
Se implementado, rodar via CLI da ferramenta E2E escolhida:
cd tests/E2E.Tests
npx playwright test
# ou
npx cypress run


4. Ferramentas & Frameworks

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
        run: dotnet build --no-restore --configuration Release
      - name: Run Unit Tests
        run: dotnet test tests/Core.Tests --no-build --configuration Release
      - name: Run Application Tests
        run: dotnet test tests/Application.Tests --no-build --configuration Release
      - name: Run Integration Tests
        run: dotnet test tests/Infrastructure.Tests --no-build --configuration Release
      - name: Report Coverage
        run: |
          reportgenerator -reports:tests/**/coverage.cobertura.xml \
                          -targetdir:coverage-report \
                          -reporttypes:Html
      - name: Upload Coverage Report
        uses: actions/upload-artifact@v3
        with:
          name: coverage-report
          path: coverage-report

Defina coverage threshold mínimo (ex.: 80%) na etapa de reportgenerator ou via Coverlet settings; falhar o job se abaixo do limite.

7. Troubleshooting

Containers não iniciam: verifique logs (docker logs <container>), ajuste versão da imagem.  
Timeout de DB: aumente Testcontainers startup timeout.  
Faltou migrations: execute dotnet ef migrations add … antes de rodar os testes de integração.  
Cobertura zero: assegure que o projeto de testes referencia o projeto alvo e que a opção <IsTestProject>true</IsTestProject> esteja no .csproj.  


Seguindo este guia, a equipe garante qualidade, confiabilidade e rapidez na entrega de funcionalidades. Bons testes! 🚀


