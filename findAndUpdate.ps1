Write-Host "Checking app status first..."

# Try different possible URLs
$possibleUrls = @(
    "https://my-music-city.onrender.com",
    "https://mymusiccity.onrender.com", 
    "https://my-music-city-app.onrender.com"
)

foreach ($baseUrl in $possibleUrls) {
    Write-Host "Trying: $baseUrl/api/health"
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
        Write-Host "SUCCESS! App is running at: $baseUrl"
        Write-Host "Health response: $($response | ConvertTo-Json)"
        
        # Now try to update images
        Write-Host "Updating images..."
        $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/update-all-images" -Method Post -ContentType "application/json"
        Write-Host "Update response: $($updateResponse | ConvertTo-Json)"
        break
    } catch {
        Write-Host "Failed: $($_.Exception.Message)"
    }
}