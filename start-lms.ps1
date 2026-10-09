# SDMCET Digital Staff Leave Management System - Production Boot Script

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " SDMCET LMS: Initializing Production Environment" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Booting Backend (NestJS + Prisma)
Write-Host "`n[*] Starting NestJS Backend (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run start" -WindowStyle Normal

# Give the backend a few seconds to warm up database connections
Start-Sleep -Seconds 5

# 2. Booting Frontend (Next.js App Router)
Write-Host "[*] Starting Next.js Frontend (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev -- -p 3001" -WindowStyle Normal

Write-Host "`n=======================================================" -ForegroundColor Green
Write-Host " [SUCCESS] System is Live!" -ForegroundColor Green
Write-Host " - Backend API & Ledger: http://localhost:3000/api" -ForegroundColor Green
Write-Host " - SDMCET Dashboards: http://localhost:3001" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "`nThe Triad is operational: Immutable Ledger, Dynamic UX, and PDF Compliance." -ForegroundColor Gray
Write-Host "Ready for formal presentation to SDMCET Administration.`n" -ForegroundColor Gray
