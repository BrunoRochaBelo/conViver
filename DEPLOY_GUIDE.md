
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
JWT_SECRET=super-secret-at-least-32chars
REDIS_CONNECTION=localhost:6379

# URLs
BASE_URL=https://api.conviver.app
FRONTEND_URL=https://www.conviver.app
API_CORS_ALLOWED_ORIGINS=https://www.conviver.app;http://localhost:3000

No Azure App Service, use Configuration > Application settings para cadastrar essas mesmas variáveis.

NOTA: Para o cliente Web (`conViver.Web`), a URL da API é configurada em `js/config.js` (`window.APP_CONFIG.API_BASE_URL`). Certifique-se de que este valor aponta para a URL correta da API (`BASE_URL`) no ambiente de deploy.

3. Deploy Local com Docker Compose
No raiz do projeto, inclui docker-compose.yml:
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
    build: ./src/WebApi
    depends_on:
      - postgres
      - redis
    environment:
      DB_CONNECTION: Host=postgres;Port=5432;Username=postgres;Password=devpass;Database=conviver;
      REDIS_CONNECTION: redis:6379
      JWT_SECRET: dev-secret
    ports:
      - "5000:80"


Suba tudo:
docker compose up -d

 

Crie o banco (EF Core):
dotnet tool install --global dotnet-ef
dotnet ef database update --project src/Infrastructure

 

Acesse http://localhost:5000/swagger
 para validar.  

4. Deploy Manual no Azure
4.1. Criar Resource Group
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
    DB_CONNECTION="Host=...;Port=5432;Username=...;Password=...;Database=conviver;" \
    REDIS_CONNECTION="..." \
    JWT_SECRET="..." \
    API_CORS_ALLOWED_ORIGINS="https://www.conviver.app;https://outro-dominio-front.com"

4.5. Deploy do Código
No diretório src/WebApi:
dotnet publish -c Release -o ./publish
az webapp deploy \
  --name api-conviver \
  --resource-group rg-conviver \
  --src-path ./publish \
  --type zip

4.6. Front Web estática (Azure Storage)

Criar Storage Account:
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
  --404-document 404.html

 

Upload dos arquivos (src/WebFrontend):
az storage blob upload-batch \
  --account-name stconviverweb \
  --source src/WebFrontend \
  --destination '$web'

 
4.7. Mobile (App Stores)

Gere pacotes Android/APK e iOS via Visual Studio:
cd src/MobileApp.Maui
dotnet build -c Release -f net8.0-android
dotnet build -c Release -f net8.0-ios

 

Publique nos Stores conforme guidelines (Google Play / App Store Connect). 

5. CI/CD com GitHub Actions
5.1. ci.yml (Build & Test)

Roda dotnet restore, dotnet build, dotnet test em Windows/Linux/Mac.  
Usa Coverlet para coverage e reporta badge. 
5.2. cd.yml (Deploy)

Gatilho: push em main.  
Jobs: Build – .NET publish.  
Deploy API – zip deploy para api-conviver (Azure WebApp).  
Deploy Front – az cli upload para Storage Blob $web.  
Purge CDN (opcional) – invalidar cache no Azure CDN.    

Exemplo de step de deploy API no cd.yml:
- name: Azure Login
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Deploy API
  uses: azure/webapps-deploy@v2
  with:
    app-name: api-conviver
    package: src/WebApi/bin/Release/net8.0/publish.zip

 


6. Rollback

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


