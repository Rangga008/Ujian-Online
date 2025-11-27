# Script untuk install semua dependencies
Write-Host "Installing dependencies for all projects..." -ForegroundColor Cyan

Write-Host "`n[1/3] Installing Backend dependencies..." -ForegroundColor Yellow
Set-Location -Path "backend"
npm install

Write-Host "`n[2/3] Installing Admin Panel dependencies..." -ForegroundColor Yellow
Set-Location -Path "..\admin-panel"
npm install

Write-Host "`n[3/3] Installing Student Portal dependencies..." -ForegroundColor Yellow
Set-Location -Path "..\student-portal"
npm install

Set-Location -Path ".."
Write-Host "`n✅ All dependencies installed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Create database 'ujian_online' in MySQL"
Write-Host "2. Configure .env files"
Write-Host "3. Run seed: cd backend && npm run seed"
Write-Host "4. Start services with: .\start-backend.ps1, .\start-admin.ps1, .\start-student.ps1"
