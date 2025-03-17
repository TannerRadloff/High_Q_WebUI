# Move components from src/components/features to app/features

# Multimodal
Copy-Item -Path "src/components/features/multimodal-input.tsx" -Destination "app/features/multimodal/"

# Overview
Copy-Item -Path "src/components/features/overview.tsx" -Destination "app/features/overview/"

# Workflow
Copy-Item -Path "src/components/features/workflow-selector.tsx" -Destination "app/features/workflow/"

# Suggestion
Copy-Item -Path "src/components/features/suggestion.tsx" -Destination "app/features/suggestion/"

# Toolbar
Copy-Item -Path "src/components/features/toolbar.tsx" -Destination "app/features/toolbar/"

# Data Stream
Copy-Item -Path "src/components/features/data-stream-handler.tsx" -Destination "app/features/data-stream/"

# Visibility
Copy-Item -Path "src/components/features/visibility-selector.tsx" -Destination "app/features/visibility/"

# Icons
Copy-Item -Path "src/components/features/icons.tsx" -Destination "app/features/icons/"

# UI components
mkdir -p app/features/ui
Copy-Item -Path "src/components/features/ui/*.tsx" -Destination "app/features/ui/"

# Create index files
$directories = @(
    "app/features/multimodal",
    "app/features/overview",
    "app/features/workflow",
    "app/features/suggestion",
    "app/features/toolbar",
    "app/features/data-stream",
    "app/features/visibility",
    "app/features/icons"
)

foreach ($dir in $directories) {
    $files = Get-ChildItem -Path $dir -Filter "*.tsx" | Where-Object { $_.Name -ne "index.tsx" }
    $exportStatements = $files | ForEach-Object {
        $componentName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        "export * from './$componentName';"
    }
    
    if ($exportStatements.Count -gt 0) {
        $exportStatements -join "`n" | Out-File -FilePath "$dir/index.ts" -Encoding utf8
    }
}

Write-Host "Components moved successfully!" 