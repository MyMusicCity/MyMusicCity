# PowerShell script to update event images
$appUrl = "https://my-music-city.onrender.com"
$endpoint = "/api/admin/update-all-images"
$fullUrl = $appUrl + $endpoint

Write-Host "🎵 Updating event images in database..." -ForegroundColor Cyan
Write-Host "Making request to: $fullUrl" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $fullUrl -Method Post -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Success!" -ForegroundColor Green
        Write-Host "📸 Updated $($response.updatedCount) events with new images" -ForegroundColor Green
        Write-Host "💭 $($response.message)" -ForegroundColor Green
    } else {
        Write-Host "❌ Something went wrong:" -ForegroundColor Red
        Write-Host $response -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error updating images:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "1. Make sure your app is deployed and running on Render" -ForegroundColor Yellow
    Write-Host "2. Wait a few minutes after pushing for deployment to complete" -ForegroundColor Yellow
    Write-Host "3. Check the app URL is correct" -ForegroundColor Yellow
}