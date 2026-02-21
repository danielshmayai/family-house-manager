@echo off
cd /d C:\Daniel\AI\apps\family-house-manager
set DATABASE_URL=file:./dev.db

echo Starting development server...
start "Next.js Dev Server" cmd /c "npm run dev"

echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo Running tests...
node tests\api.test.js

echo.
echo Tests completed. Press any key to exit...
pause >nul
