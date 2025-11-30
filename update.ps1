Write-Host "Updating event images in database..."

$appUrl = "https://my-music-city.onrender.com/api/admin/update-all-images"
Write-Host "Making request to: $appUrl"

try {
    $response = Invoke-RestMethod -Uri $appUrl -Method Post -ContentType "application/json"
    
    Write-Host "Success!"
    Write-Host "Response:"
    $response | ConvertTo-Json
} catch {
    Write-Host "Error:"
    Write-Host $_.Exception.Message
}