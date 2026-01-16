#!/usr/bin/env pwsh

# Colors for output
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

Write-Host "================================================" -ForegroundColor $InfoColor
Write-Host "Exam Visibility Fix - Database Reset & Reseed" -ForegroundColor $InfoColor
Write-Host "================================================`n" -ForegroundColor $InfoColor

# Get backend path
$backendPath = "C:\laragon\www\003 Aplikasi-Javascript\Ujian-Online\backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend path not found: $backendPath" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host "📁 Backend path: $backendPath`n" -ForegroundColor $InfoColor

# Step 1: Navigate to backend
Write-Host "Step 1: Navigating to backend directory..." -ForegroundColor $InfoColor
Push-Location $backendPath

# Step 2: Clear npm cache (optional)
Write-Host "Step 2: Clearing npm cache..." -ForegroundColor $InfoColor
npm cache clean --force

# Step 3: Run seed with purge flag
Write-Host "`nStep 3: Running database seed with purge..." -ForegroundColor $InfoColor
Write-Host "   - This will DELETE all existing data" -ForegroundColor $WarningColor
Write-Host "   - And create fresh test data with correct class assignments" -ForegroundColor $WarningColor
Write-Host "`nRunning: SEED_PURGE=true npm run seed`n" -ForegroundColor $InfoColor

$env:SEED_PURGE = "true"
npm run seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Seed failed! Check database connection." -ForegroundColor $ErrorColor
    Pop-Location
    exit 1
}

Write-Host "`n✅ Database seeded successfully!`n" -ForegroundColor $SuccessColor

# Step 4: Show next steps
Write-Host "================================================" -ForegroundColor $InfoColor
Write-Host "✅ Setup Complete!" -ForegroundColor $SuccessColor
Write-Host "================================================`n" -ForegroundColor $InfoColor

Write-Host "📋 Next Steps:" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "1. Start Backend Server:" -ForegroundColor $InfoColor
Write-Host "   npm run start:dev" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "2. Watch for debug logs showing:" -ForegroundColor $InfoColor
Write-Host "   - 🔍 TOTAL EXAMS IN DATABASE: 5" -ForegroundColor $WarningColor
Write-Host "   - 🔍 TOTAL CLASSES IN DATABASE: 9" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "3. Start Student Portal:" -ForegroundColor $InfoColor
Write-Host "   cd ../student-portal" -ForegroundColor $WarningColor
Write-Host "   npm run dev" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "4. Login as Student:" -ForegroundColor $InfoColor
Write-Host "   Email: siswa1@test.com (or similar)" -ForegroundColor $WarningColor
Write-Host "   Password: siswa123" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "5. Navigate to Ujian Tab:" -ForegroundColor $InfoColor
Write-Host "   Should now see published exams for that class!" -ForegroundColor $WarningColor
Write-Host ""

Write-Host "================================================" -ForegroundColor $InfoColor
Write-Host "Database Login Credentials:" -ForegroundColor $InfoColor
Write-Host "================================================" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "Students (choose one):" -ForegroundColor $InfoColor
for ($i = 1; $i -le 10; $i++) {
    $email = "siswa$i@test.com"
    Write-Host "  • $email (NIS: 202400$($i.ToString().PadLeft(1, '0')))" -ForegroundColor $WarningColor
}
Write-Host "  Password: siswa123" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "Teachers:" -ForegroundColor $InfoColor
Write-Host "  • guru.matematika@sekolah.com" -ForegroundColor $WarningColor
Write-Host "  • guru.bindonesia@sekolah.com" -ForegroundColor $WarningColor
Write-Host "  • guru.inggris@sekolah.com" -ForegroundColor $WarningColor
Write-Host "  Password: guru123" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "Admin:" -ForegroundColor $InfoColor
Write-Host "  • admin@ujian.com" -ForegroundColor $WarningColor
Write-Host "  • Password: admin123" -ForegroundColor $WarningColor
Write-Host ""

Pop-Location
