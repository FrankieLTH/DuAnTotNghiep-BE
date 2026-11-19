$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    docker compose -p duanmoi config --quiet
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker configuration is invalid. Copy .env.example to .env in the repository root and fill JWT_SECRET, DUANMOI_SMTP_USER, DUANMOI_SMTP_PASS.'
    }
    # Build directly to support Windows workspace paths containing spaces/diacritics.
    docker build -t duanmoi-backend:latest -f docker/backend.Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw 'Backend image build failed.' }
    docker build -t duanmoi-frontend:latest -f docker/frontend.Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw 'Frontend image build failed.' }
    docker compose -p duanmoi up -d --no-build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'Container startup failed. Check docker compose -p duanmoi logs.' }
    Write-Host 'Website: http://localhost:5174'
    Write-Host 'Admin:   http://localhost:5174/admin'
} finally {
    Pop-Location
}
