@echo off
setlocal enabledelayedexpansion

echo 🔍 Checking Supabase Environment Variables...
node scripts/update-env-for-supabase.js

if %ERRORLEVEL% neq 0 (
  echo ❌ Environment variable check failed. Please fix the issues and try again.
  exit /b 1
)

echo.
echo ⚠️ Before proceeding: Make sure you've added the SUPABASE_SERVICE_ROLE_KEY to your .env.local file.
echo    You can find it in your Supabase dashboard under Project Settings ^> API ^> Project API keys
set /p CONTINUE="Continue with RLS setup? (y/n) "

if /i "%CONTINUE%"=="y" (
  echo.
  echo 🔐 Setting up Row Level Security policies...
  node scripts/setup-rls-policies.js
  
  if %ERRORLEVEL% neq 0 (
    echo ❌ RLS setup failed. Please check the error messages and try again.
    exit /b 1
  )
  
  echo.
  echo ✅ Verifying Supabase configuration...
  node scripts/verify-supabase-config.js
  
  echo.
  echo 🎉 Supabase fix completed successfully!
  echo    You can now restart your application to apply the changes.
) else (
  echo 🛑 RLS setup cancelled. Please run this script again when you're ready.
  exit /b 0
)

endlocal 