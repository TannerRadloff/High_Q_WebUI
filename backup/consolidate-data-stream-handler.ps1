# Script to consolidate DataStreamHandler components
# This script:
# 1. Ensures there's only one implementation of DataStreamHandler
# 2. Updates all imports to reference the canonical path
# 3. Removes duplicate files

# Define the canonical path for DataStreamHandler
$canonicalPath = "app/features/data-stream/data-stream-handler"
$canonicalImport = "@/app/features/data-stream/data-stream-handler"

# Define potential duplicate locations
$potentialDuplicates = @(
    "src/components/data-stream-handler.tsx",
    "src/components/features/data-stream-handler.tsx"
)

# Find and remove duplicate files
Write-Host "Checking for duplicate DataStreamHandler files..."
foreach ($file in $potentialDuplicates) {
    if (Test-Path $file) {
        Write-Host "Found duplicate at $file - removing..."
        Remove-Item $file -Force
    }
}

# Check that the canonical file exists
if (-not (Test-Path "$canonicalPath.tsx")) {
    Write-Host "Error: Canonical DataStreamHandler file not found at $canonicalPath.tsx"
    exit 1
}

# Get all TypeScript and JavaScript files in the project
Write-Host "Scanning codebase for DataStreamHandler imports..."
$files = Get-ChildItem -Path "app", "src" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
    Where-Object { 
        $_.FullName -notlike "*node_modules*" -and 
        $_.FullName -notlike "*\.git*" -and
        $_.FullName -ne "$canonicalPath.tsx" -and
        $_.FullName -ne (Resolve-Path "app/features/data-stream/index.ts").Path
    }

$importPatterns = @(
    "from ['`"]@/src/components/data-stream-handler['`"]",
    "from ['`"]@/src/components/features/data-stream-handler['`"]",
    "import ['`"]@/src/components/data-stream-handler['`"]",
    "import ['`"]@/src/components/features/data-stream-handler['`"]"
)

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -ErrorAction Stop
        $contentAsString = $content -join "`n"
        $modified = $false
        
        # Check if file contains DataStreamHandler imports
        foreach ($pattern in $importPatterns) {
            if ($contentAsString -match $pattern) {
                Write-Host "Updating imports in $($file.FullName)"
                $modified = $true
                $contentAsString = $contentAsString -replace $pattern, "from '$canonicalImport'"
            }
        }
        
        # Save the file if modified
        if ($modified) {
            Set-Content -Path $file.FullName -Value $contentAsString
        }
    }
    catch {
        Write-Host "Error processing file $($file.FullName): $_"
    }
}

# Ensure index.ts exports the DataStreamHandler component
$indexPath = "app/features/data-stream/index.ts"
$indexContent = "export * from './data-stream-handler';"

if (Test-Path $indexPath) {
    $currentContent = Get-Content -Path $indexPath
    $currentContentString = $currentContent -join "`n"
    if ($currentContentString -notmatch "export.*data-stream-handler") {
        Write-Host "Updating index.ts to export DataStreamHandler"
        Set-Content -Path $indexPath -Value $indexContent
    }
} else {
    Write-Host "Creating index.ts to export DataStreamHandler"
    New-Item -Path $indexPath -ItemType File -Force
    Set-Content -Path $indexPath -Value $indexContent
}

Write-Host "DataStreamHandler consolidation completed successfully!" 