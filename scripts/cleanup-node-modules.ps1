# scripts/cleanup-node-modules.ps1
# Helper to remove server node_modules and clear npm cache on Windows.
# Run PowerShell as Administrator if you hit permission errors.

Param()

Write-Host "Removing server/node_modules (if present) and clearing npm cache..."

$serverNM = Join-Path $PSScriptRoot "..\server\node_modules"
if (Test-Path $serverNM) {
    try {
        Remove-Item -LiteralPath $serverNM -Recurse -Force -ErrorAction Stop
        Write-Host "Removed server/node_modules"
    } catch {
        Write-Warning "Failed to remove node_modules: $_. Exception: $($_.Exception.Message)"
        Write-Host "You may need to close editors/terminals or reboot to release file locks, then retry."
        exit 1
    }
} else {
    Write-Host "server/node_modules not present"
}

Write-Host "Clearing npm cache..."
try {
    npm cache clean --force
    Write-Host "npm cache cleaned"
} catch {
    Write-Warning "npm cache clean failed: $_"
}

Write-Host "You can now try: npm --prefix server install"
