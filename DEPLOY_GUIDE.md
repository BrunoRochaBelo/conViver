
# Guia de Deploy – conViver

**Data:** 16/06/2025  **Timezone:** America/Recife  
**Objetivo:** orientar deploy local, manual e CI/CD em Azure para API, Front Web e Mobile.

---

## 1. Pré-requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/) instalado  
- [Docker & Docker Compose](https://www.docker.com/) para dev local  
- [Azure CLI](https://docs.microsoft.com/cli/azure/) (versão ≥ 2.50)  
- Conta Azure com permissões de criar recursos  
- GitHub repo com workflows configurados  

---

## 2. Variáveis de Ambiente

Crie um arquivo `.env` (não commitar) ou defina no CI/CD/Key Vault:

```ini
# API
DB_CONNECTION=Host=...;Port=5432;Username=...;Password=...;Database=conviver;
JWT_SECRET=super-secret-at-least-32chars # Mínimo 32 caracteres seguros
REDIS_CONNECTION=localhost:6379 # Ou a string de conexão do seu provedor Redis

# URLs
BASE_URL=https://api.conviver.app # URL pública da API (exemplo)
FRONTEND_URL=https://www.conviver.app # URL pública do Frontend Web (exemplo)
CorsSettings__AllowedOrigins=https://www.conviver.app;http://localhost:3000 # Origens permitidas para CORS (use o formato "origem1;origem2")

No Azure App Service, use Configuration > Application settings para cadastrar essas mesmas variáveis.

NOTA: Para o cliente Web (`src/conViver.Web`), a URL da API é configurada em `src/conViver.Web/js/config.js` (variável `window.APP_CONFIG.API_BASE_URL`). Certifique-se de que este valor aponta para a URL correta da API (`BASE_URL` ou o endpoint do App Service) no ambiente de deploy.

## 3. Deploy Local com Docker Compose
No raiz do projeto, o arquivo `docker-compose.yml` define os serviços:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: conviver
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  api:
    build: ./conViver.API # Corrigido de ./src/WebApi
    depends_on:
      - postgres
      - redis
    environment:
      DB_CONNECTION: Host=postgres;Port=5432;Username=postgres;Password=devpass;Database=conviver;
      REDIS_CONNECTION: redis:6379
      JWT_SECRET: dev-secret # Altere para um segredo forte em produção
    ports:
      - "5000:80" # Mapeia a porta 80 do container para a 5000 do host
```

Suba tudo:
```bash
docker compose up -d
```

Crie o banco de dados e aplique as migrações (EF Core):
```bash
# Certifique-se que as ferramentas do EF Core estão instaladas
# dotnet tool install --global dotnet-ef
dotnet ef database update --project src/conViver.Infrastructure --startup-project src/conViver.API
```
*Nota: O `--startup-project src/conViver.API` pode ser necessário se o `DbContext` estiver sendo instanciado com DI configurado na API.*

Acesse `http://localhost:5000/swagger` para validar a API.

## 4. Deploy Manual no Azure
### 4.1. Criar Resource Group
az login
az group create --name rg-conviver --location brazilsouth

4.2. Criar Plano de App Service
az appservice plan create \
  --name plan-conviver \
  --resource-group rg-conviver \
  --sku S1 \
  --is-linux

4.3. Criar Web App para API
az webapp create \
  --name api-conviver \
  --resource-group rg-conviver \
  --plan plan-conviver \
  --runtime "DOTNET|8.0"

4.4. Configurar Application Settings
az webapp config appsettings set \
  --name api-conviver \
  --resource-group rg-conviver \
  --settings \
    DB_CONNECTION="Host=<seu-db-server>.postgres.database.azure.com;Port=5432;Username=<admin>;Password=<senha>;Database=conviver;" \
    REDIS_CONNECTION="<seu-redis>.redis.cache.windows.net:6380,password=<chave>,ssl=True,abortConnect=False" \
    JWT_SECRET="<seu-jwt-secret-super-longo-e-seguro>" \
    CorsSettings__AllowedOrigins="https://www.conviver.app;https://outro-dominio-front.com" \
    ASPNETCORE_ENVIRONMENT="Production" # Garante que a API rode em modo de Produção
```

### 4.5. Deploy do Código da API
No diretório do projeto da API (`src/conViver.API`):
```bash
dotnet publish -c Release -o ./publish
cd ./publish
zip -r ../api-deploy.zip .
cd ..
# O zip deve conter os arquivos da pasta publish, não a pasta publish em si.
# Alternativamente, o comando az webapp deploy pode lidar com a pasta diretamente.

az webapp deploy \
  --name api-conviver \
  --resource-group rg-conviver \
  --src-path ./api-deploy.zip \
  --type zip
```
*Nota: Verifique o caminho exato do `--src-path` ou use a opção de deploy via Git/GitHub Actions para maior robustez.*

### 4.6. Front Web estático (Azure Storage)

Criar Storage Account:
```bash
az storage account create \
  --name stconviverweb \
  --resource-group rg-conviver \
  --sku Standard_LRS \
  --kind StorageV2

 

Habilitar static website:
az storage blob service-properties update \
  --account-name stconviverweb \
  --static-website \
  --index-document index.html \
  --404-document index.html # Ou uma página 404.html customizada
```

Upload dos arquivos (do diretório `src/conViver.Web` ou sua pasta de build, se houver):
```bash
az storage blob upload-batch \
  --account-name stconviverweb \
  --source src/conViver.Web \
  --destination '$web' \
  --overwrite
```
*Nota: Se o `conViver.Web` tiver um processo de build (ex: minificação, SASS/LESS), execute-o antes e aponte `--source` para a pasta de saída do build.*

### 4.7. Mobile (App Stores)

Gere pacotes Android (.aab/.apk) e iOS (.ipa) via Visual Studio ou linha de comando:
```bash
# Para Android:
cd src/conViver.Mobile
dotnet publish -c Release -f net8.0-android /p:AndroidPackageFormat=apk # ou aab para Play Store
# O output estará em bin/Release/net8.0-android/publish/

# Para iOS (requer macOS e Xcode):
# dotnet publish -c Release -f net8.0-ios
# O output estará em bin/Release/net8.0-ios/publish/
```

Publique nos Stores conforme guidelines (Google Play Console / App Store Connect).

## 5. CI/CD com GitHub Actions
### 5.1. `ci.yml` (Build & Test)

- Roda `dotnet restore`, `dotnet build`, `dotnet test` em agentes Windows/Linux/Mac.
- Usa Coverlet para coverage e reporta badge (opcional).
- Pode incluir SonarQube para análise de código (opcional).

### 5.2. `cd.yml` (Deploy)

- **Gatilho**: push em `main` ou criação de release tag.
- **Jobs**:
    - **Build**:
        - Checkout do código.
        - Setup .NET SDK 8.x.
        - `dotnet publish src/conViver.API/conViver.API.csproj -c Release -o ./api-publish`
        - (Opcional) Build do frontend web se houver um passo de build.
        - Zipa o output de publish da API.
        - (Opcional) Zipa o output do frontend web.
    - **Deploy API**:
        - Login no Azure (`azure/login@v1`).
        - Deploy do zip da API para o Azure Web App (`azure/webapps-deploy@v2`).
    - **Deploy Front Web**:
        - Login no Azure.
        - Upload dos arquivos do frontend para o Azure Blob Storage (`$web`) usando `azure/CLI@v1` para `az storage blob upload-batch`.
    - **(Opcional) Purge CDN**: Se estiver usando Azure CDN, invalidar cache.

Exemplo de step de deploy API no `cd.yml`:
```yaml
- name: Azure Login
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }} # Secret configurado no GitHub Actions

- name: Deploy API to Azure Web App
  uses: azure/webapps-deploy@v2
  with:
    app-name: api-conviver # Nome do seu App Service
    package: ./api-publish # Caminho para o output do publish (ou o .zip)
    # publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }} # Alternativa ao Azure Login
```
*Nota: O `package` path deve corresponder ao output do passo de build/publish no workflow.*

## 6. Rollback

API: no Azure Portal > Deployment Center > selecione versão anterior.  
Front: reenvie versão estável à $web (via az storage blob upload-batch).  
Mobile: use releases rollback no console do Store.  

7. Monitoramento & Logs

Application Insights: integrado pela Startup do WebApi.  
Serilog: logs estruturados no App Service.  
Alerts: crie no Azure Monitor métricas de 5xx, latência > 1s, uso CPU > 80%.  

8. Dicas Finais

Mantenha secrets no Azure Key Vault e referencie via Managed Identity no App Service.  
Versione seu docker-compose.yml para dev-prod parity.  
Use slot de staging no Azure WebApp para testes antes de swap em produção.  


Com este guia, você está pronto para automatizar e gerenciar deploys de forma segura e repetível.
Boa sorte e mãos à obra! 🚀


