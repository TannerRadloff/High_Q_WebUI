# Remove empty directories in the src directory

function Remove-EmptyDirectories {
    param (
        [string]$Path
    )
    
    # Get all subdirectories
    $dirs = Get-ChildItem -Path $Path -Directory
    
    foreach ($dir in $dirs) {
        # Recursively process subdirectories
        Remove-EmptyDirectories -Path $dir.FullName
        
        # Check if directory is empty
        $items = Get-ChildItem -Path $dir.FullName -Force
        if ($items.Count -eq 0) {
            Write-Host "Removing empty directory: $($dir.FullName)"
            Remove-Item -Path $dir.FullName -Force
        }
    }
}

# Start with the src directory
Remove-EmptyDirectories -Path "src"

Write-Host "Empty directories removed successfully!" 