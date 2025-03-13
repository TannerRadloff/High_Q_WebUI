#!/bin/bash

# Clean the .next directory
echo "Cleaning .next directory..."
rimraf .next

# Run the Next.js build
echo "Running Next.js build..."
next build

# Create the directory for the client reference manifest
echo "Creating directory for client reference manifest..."
mkdir -p .next/standalone/.next/server/app/\(chat\)

# Copy the client reference manifest file
echo "Copying client reference manifest file..."
cp app/\(chat\)/page_client-reference-manifest.js .next/standalone/.next/server/app/\(chat\)/

echo "Build completed successfully!" 