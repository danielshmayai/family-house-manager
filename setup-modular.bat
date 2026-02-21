@echo off
echo ========================================
echo  Family House Manager - Modular Setup
echo ========================================
echo.

echo [1/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo [2/5] Running database migrations...
call npx prisma migrate dev --name init_modular
if %errorlevel% neq 0 (
    echo ERROR: Failed to run migrations
    pause
    exit /b 1
)
echo.

echo [3/5] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    pause
    exit /b 1
)
echo.

echo [4/5] Seeding database with default categories and activities...
call npx ts-node prisma/seed-modular.ts
if %errorlevel% neq 0 (
    echo WARNING: Seeding failed - you may need to add data manually
)
echo.

echo [5/5] Setup complete!
echo.
echo ========================================
echo  Ready to start!
echo ========================================
echo.
echo To run the development server:
echo   npm run dev
echo.
echo Then visit:
echo   Home:        http://localhost:3000
echo   Admin:       http://localhost:3000/admin
echo   Leaderboard: http://localhost:3000/leaderboard
echo   Team:        http://localhost:3000/users
echo.
echo ========================================
echo.
pause
