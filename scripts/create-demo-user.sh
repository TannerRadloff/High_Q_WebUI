#!/bin/bash

# Script to create a demo user in Supabase
# Make sure to set SUPABASE_SERVICE_ROLE_KEY in your .env.local file before running

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
else
  echo "Error: .env.local file not found"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: Required environment variables are missing"
  echo "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file"
  exit 1
fi

# Demo user details
EMAIL="demo@example.com"
PASSWORD="demo1"
USERNAME="demo"

echo "Creating demo user in Supabase..."

# Create the user using the Supabase API
RESPONSE=$(curl -s -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"username\": \"${USERNAME}\",
      \"full_name\": \"Demo User\"
    }
  }")

# Check if successful
if echo "$RESPONSE" | grep -q "id"; then
  echo "Demo user created successfully"
  echo "Email: $EMAIL"
  echo "Password: $PASSWORD"
  echo "Username: $USERNAME"
else
  echo "Error creating demo user:"
  echo "$RESPONSE"
  exit 1
fi 