# ---- CONFIG ----
$bucket = "newoldnet-test-bucket"
$region = "us-east-2"
$distributionId = "EZPWNWO1RJM0N"  # <-- Replace this

# ---- Step 1: Sync updated files to S3 ----
Write-Host "`n🔄 Syncing files to S3..."
aws s3 sync . "s3://$bucket" `
  --exclude "*" `
  --include "index.html" `
  --include "css/**" `
  --include "js/**" `
  --include "static/**" `
  --delete

# ---- Step 2: Invalidate CloudFront cache ----
Write-Host "`n🚀 Invalidating CloudFront cache..."
aws cloudfront create-invalidation `
  --distribution-id $distributionId `
  --paths "/*"

# ---- Step 3: Done ----
Write-Host "`n✅ Site published!"
Write-Host "🌐 Live at:"
Write-Host "https://$((aws cloudfront get-distribution --id $distributionId --query 'Distribution.DomainName' --output text))"
