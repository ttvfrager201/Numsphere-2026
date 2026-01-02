# Supabase Edge Functions Deployment Script
# Run this script after logging in to Supabase CLI

Write-Host "Deploying Supabase Edge Functions..." -ForegroundColor Green

# Deploy all updated functions
Write-Host "`nDeploying purchase-phone-number..." -ForegroundColor Yellow
npx supabase functions deploy purchase-phone-number

Write-Host "`nDeploying search-available-numbers..." -ForegroundColor Yellow
npx supabase functions deploy search-available-numbers

Write-Host "`nDeploying get-twilio-numbers..." -ForegroundColor Yellow
npx supabase functions deploy get-twilio-numbers

Write-Host "`nDeploying test-sip-connection..." -ForegroundColor Yellow
npx supabase functions deploy test-sip-connection

Write-Host "`n✅ All functions deployed successfully!" -ForegroundColor Green
