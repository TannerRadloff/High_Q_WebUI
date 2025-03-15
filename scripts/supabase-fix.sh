#!/bin/bash

# Supabase Fix Script
# ===================
# This script runs both the environment variable check and the RLS setup script
# to fix any Supabase configuration issues.

echo "🔍 Checking Supabase Environment Variables..."
node scripts/update-env-for-supabase.js

if [ $? -ne 0 ]; then
  echo "❌ Environment variable check failed. Please fix the issues and try again."
  exit 1
fi

echo -e "\n⚠️ Before proceeding: Make sure you've added the SUPABASE_SERVICE_ROLE_KEY to your .env.local file."
echo "   You can find it in your Supabase dashboard under Project Settings > API > Project API keys"
read -p "Continue with RLS setup? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n🔐 Setting up Row Level Security policies..."
  node scripts/setup-rls-policies.js
  
  if [ $? -ne 0 ]; then
    echo "❌ RLS setup failed. Please check the error messages and try again."
    exit 1
  fi
  
  echo -e "\n✅ Verifying Supabase configuration..."
  node scripts/verify-supabase-config.js
  
  echo -e "\n🎉 Supabase fix completed successfully!"
  echo "   You can now restart your application to apply the changes."
else
  echo "🛑 RLS setup cancelled. Please run this script again when you're ready."
  exit 0
fi 