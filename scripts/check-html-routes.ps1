Param(
    [string]$BaseUrl = "http://localhost:5000"
)

$ErrorActionPreference = 'Stop'

$routes = @(
    '/index.html',
    '/login.html',
    '/forgot-password.html',
    '/register.html',
    '/reset-password.html',
    '/pages/dashboard.html',
    '/pages/comunicacao.html',
    '/pages/financeiro.html',
    '/pages/portaria.html',
    '/pages/ocorrencias.html',
    '/pages/reservas.html'
)

Write-Host "Starting web server..."
$server = Start-Process 'dotnet' "run --project $PSScriptRoot/../conViver.Web --urls $BaseUrl" -PassThru

# Aguarda servidor iniciar
Start-Sleep -Seconds 5

$success = $true
foreach ($route in $routes) {
    $url = "$BaseUrl$route"
    Write-Host "Verificando $url"
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
        if ($response.StatusCode -ne 200) {
            Write-Error "Rota $route retornou status $($response.StatusCode)"
            $success = $false
        }
    } catch {
        Write-Error "Erro ao acessar $url: $_"
        $success = $false
    }
}

Write-Host "Parando servidor..."
Stop-Process -Id $server.Id -Force

if (-not $success) {
    Write-Error "Uma ou mais rotas falharam."
    exit 1
}

Write-Host "Todas as rotas responderam com status 200."
