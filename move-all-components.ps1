# Move all remaining components from src/components/features to app/features

# Create necessary directories
$directories = @(
    "app/features/artifacts",
    "app/features/chat",
    "app/features/messages",
    "app/features/documents",
    "app/features/agents",
    "app/features/ui",
    "app/features/multimodal",
    "app/features/overview",
    "app/features/workflow",
    "app/features/suggestion",
    "app/features/toolbar",
    "app/features/data-stream",
    "app/features/visibility",
    "app/features/icons",
    "app/features/version",
    "app/features/editors"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "Creating directory: $dir"
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }
}

# Define component mappings
$componentMappings = @{
    # Artifacts
    "artifact.tsx" = "app/features/artifacts/"
    "artifact-actions.tsx" = "app/features/artifacts/"
    "artifact-close-button.tsx" = "app/features/artifacts/"
    "artifact-messages.tsx" = "app/features/artifacts/"
    "create-artifact.tsx" = "app/features/artifacts/"
    
    # Chat
    "chat.tsx" = "app/features/chat/"
    "preview-attachment.tsx" = "app/features/chat/"
    
    # Messages
    "messages.tsx" = "app/features/messages/"
    "message.tsx" = "app/features/messages/"
    "message-actions.tsx" = "app/features/messages/"
    "message-editor.tsx" = "app/features/messages/"
    "message-reasoning.tsx" = "app/features/messages/"
    
    # Documents
    "document.tsx" = "app/features/documents/"
    "document-preview.tsx" = "app/features/documents/"
    "document-skeleton.tsx" = "app/features/documents/"
    
    # Agents
    "agent-selector.tsx" = "app/features/agents/"
    "agent-status-panel.tsx" = "app/features/agents/"
    
    # UI
    "model-selector.tsx" = "app/features/ui/"
    "suggested-actions.tsx" = "app/features/ui/"
    
    # Multimodal
    "multimodal-input.tsx" = "app/features/multimodal/"
    
    # Overview
    "overview.tsx" = "app/features/overview/"
    
    # Workflow
    "workflow-selector.tsx" = "app/features/workflow/"
    
    # Suggestion
    "suggestion.tsx" = "app/features/suggestion/"
    
    # Toolbar
    "toolbar.tsx" = "app/features/toolbar/"
    
    # Data Stream
    "data-stream-handler.tsx" = "app/features/data-stream/"
    
    # Visibility
    "visibility-selector.tsx" = "app/features/visibility/"
    
    # Icons
    "icons.tsx" = "app/features/icons/"
    
    # Version
    "version-footer.tsx" = "app/features/version/"
    
    # Editors
    "image-editor.tsx" = "app/features/editors/"
    "sheet-editor.tsx" = "app/features/editors/"
    "code-editor.tsx" = "app/features/editors/"
    "text-editor.tsx" = "app/features/editors/"
}

# Copy UI components
Copy-Item -Path "src/components/features/ui/*.tsx" -Destination "app/features/ui/" -Force

# Copy all components
foreach ($component in $componentMappings.Keys) {
    $sourcePath = "src/components/features/$component"
    $destinationPath = $componentMappings[$component]
    
    if (Test-Path $sourcePath) {
        Write-Host "Moving $component to $destinationPath"
        Copy-Item -Path $sourcePath -Destination $destinationPath -Force
    }
    else {
        Write-Host "Source file not found: $sourcePath"
    }
}

# Create index files for each directory
foreach ($dir in $directories) {
    $files = Get-ChildItem -Path $dir -Filter "*.tsx" | Where-Object { $_.Name -ne "index.tsx" }
    $exportStatements = $files | ForEach-Object {
        $componentName = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        "export * from './$componentName';"
    }
    
    if ($exportStatements.Count -gt 0) {
        Write-Host "Creating index.ts for $dir"
        $exportStatements -join "`n" | Out-File -FilePath "$dir/index.ts" -Encoding utf8 -Force
    }
}

Write-Host "All components moved successfully!" 