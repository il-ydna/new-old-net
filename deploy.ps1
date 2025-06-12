$bucket = "newoldnet-test-bucket"
$region = "us-east-2"

# Step 1: Create bucket
aws s3 mb "s3://$bucket" --region $region

# Step 2: Enable website hosting
aws s3 website "s3://$bucket/" --index-document index.html --error-document index.html

# Step 3: Set public read policy
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$bucket/*"
    }
  ]
}
"@

$policy | Out-File -Encoding ascii public-policy.json
aws s3api put-bucket-policy --bucket $bucket --policy file://public-policy.json

# Step 4: Upload files
aws s3 sync . "s3://$bucket" `
  --exclude "*" `
  --include "index.html" `
  --include "css/*" `
  --include "css/bg.jpg" `
  --include "js/*" `
  --include "auth/*" `
  --include "js/views/*" `
  --delete

# Step 5: Output URL
Write-Host "`n✅ Site deployed!"
Write-Host "🌐 View it at:"
Write-Host "http://$bucket.s3-website-$region.amazonaws.com"
