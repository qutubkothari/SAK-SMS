# Deploy frontend to EC2
$distPath = "C:\Users\musta\OneDrive\Documents\GitHub\SAK-AI-Enquiry-Handler\apps\web\dist"
$keyPath = "C:\Users\musta\OneDrive\Documents\GitHub\SAK-AI-Enquiry-Handler\sak-sms-2.pem"
$server = "ubuntu@13.203.69.128"

Write-Host "Deploying frontend to EC2..." -ForegroundColor Green

# Upload files
Write-Host "Uploading files..." -ForegroundColor Yellow
scp -i $keyPath -r "$distPath\*" "${server}:/tmp/web-dist/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Files uploaded successfully!" -ForegroundColor Green
    
    # Deploy on server
    Write-Host "Deploying on server..." -ForegroundColor Yellow
    ssh -i $keyPath $server "sudo rm -rf /var/www/html/* && sudo cp -r /tmp/web-dist/* /var/www/html/ && ls -lh /var/www/html/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
        Write-Host "Hard refresh your browser (Ctrl+Shift+R) to see the new design" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Server deployment failed" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Upload failed - check SSH key/credentials" -ForegroundColor Red
}
