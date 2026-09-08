# Launch MedChain Spring Boot Backend
$backendDir = Join-Path $PSScriptRoot "medchain-backend"
Set-Location $backendDir
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Starting MedChain Backend on port 8080..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$jar = Join-Path $backendDir "target\medchain-backend-0.1.0.jar"
if (Test-Path $jar) {
    java -jar $jar
} else {
    mvn spring-boot:run
}
