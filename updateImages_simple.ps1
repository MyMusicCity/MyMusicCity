Write-Host "🎵 Updating event images in database..." -ForegroundColor Cyan

$appUrl = "https://my-music-city.onrender.com/api/admin/update-all-images"
Write-Host "Making request to: $appUrl" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $appUrl -Method Post -ContentType "application/json"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "📸 Response:" -ForegroundColor Green
    Write-Host $response -ForegroundColor Green
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}