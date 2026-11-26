$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    # Build directly to support Windows workspace paths containing spaces/diacritics.
    docker build -t duanmoi-backend -f project/backend/Dockerfile project
    if ($LASTEXITCODE -ne 0) { throw 'Backend image build failed.' }
    docker build -t duanmoi-frontend -f project/frontend/Dockerfile project
    if ($LASTEXITCODE -ne 0) { throw 'Frontend image build failed.' }
    docker compose -p duanmoi up -d --no-build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'Container startup failed. Check docker compose -p duanmoi logs.' }
    Write-Host 'Website: http://localhost:5174'
    Write-Host 'Admin:   http://localhost:5174/admin'
} finally {
    Pop-Location
}
