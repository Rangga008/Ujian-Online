# Script untuk menjalankan Student Portal
Write-Host "Starting Student Portal on port 3002..." -ForegroundColor Green
Set-Location -Path "student-portal"
npm run dev
