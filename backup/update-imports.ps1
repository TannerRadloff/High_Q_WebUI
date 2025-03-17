# Update import paths throughout the codebase

# Define the mapping of old paths to new paths
$importMappings = @{
    # Components
    "src/components/features/multimodal-input" = "app/features/multimodal"
    "src/components/features/overview" = "app/features/overview"
    "src/components/features/workflow-selector" = "app/features/workflow"
    "src/components/features/suggestion" = "app/features/suggestion"
    "src/components/features/toolbar" = "app/features/toolbar"
    "src/components/features/data-stream-handler" = "app/features/data-stream"
    "src/components/features/visibility-selector" = "app/features/visibility"
    "src/components/features/icons" = "app/features/icons"
    "src/components/features/ui/button" = "app/features/ui"
    "src/components/features/ui/tooltip" = "app/features/ui"
    "src/components/features/chat" = "app/features/chat"
    "src/components/features/messages" = "app/features/messages"
    "src/components/features/message" = "app/features/messages"
    "src/components/features/message-actions" = "app/features/messages"
    "src/components/features/message-editor" = "app/features/messages"
    "src/components/features/message-reasoning" = "app/features/messages"
    "src/components/features/agent-selector" = "app/features/agents"
    "src/components/features/agent-status-panel" = "app/features/agents"
    "src/components/features/model-selector" = "app/features/ui"
    "src/components/features/document" = "app/features/documents"
    "src/components/features/document-preview" = "app/features/documents"
    "src/components/features/artifact" = "app/features/artifacts"
    "src/components/features/artifact-actions" = "app/features/artifacts"
    "src/components/features/preview-attachment" = "app/features/chat"
    
    # Hooks
    "src/hooks/use-artifact" = "app/utils/hooks/use-artifact"
    "src/hooks/use-scroll-to-bottom" = "app/utils/hooks/use-scroll-to-bottom"
    "src/hooks/use-mobile" = "app/utils/hooks/use-mobile"
    "src/hooks/use-did-update" = "app/utils/hooks/use-did-update"
    "src/hooks/use-auto-resize-textarea" = "app/utils/hooks/use-auto-resize-textarea"
    "src/hooks/use-chat-visibility" = "app/utils/hooks/use-chat-visibility"
}

# Get all TypeScript and JavaScript files in the project
$files = Get-ChildItem -Path "app", "src" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*\.git*" }

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -ErrorAction Stop
        $contentAsString = $content -join "`n"
        $modified = $false
        
        foreach ($oldPath in $importMappings.Keys) {
            $newPath = $importMappings[$oldPath]
            
            # Check for different import patterns
            $patterns = @(
                "from ['`"]$oldPath['`"]",
                "from ['`"]$oldPath/['`"]",
                "import ['`"]$oldPath['`"]",
                "import ['`"]$oldPath/['`"]",
                "require\(['`"]$oldPath['`"]\)",
                "require\(['`"]$oldPath/['`"]\)"
            )
            
            foreach ($pattern in $patterns) {
                if ($contentAsString -match $pattern) {
                    $modified = $true
                    $replacement = $pattern -replace [regex]::Escape($oldPath), $newPath
                    $contentAsString = $contentAsString -replace $pattern, $replacement
                }
            }
        }
        
        if ($modified) {
            Write-Host "Updating imports in $($file.FullName)"
            Set-Content -Path $file.FullName -Value $contentAsString
        }
    }
    catch {
        Write-Host "Error processing file $($file.FullName): $_"
    }
}

Write-Host "Import paths updated successfully!" 