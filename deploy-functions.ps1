# Supabase Edge Functions Deployment Script
# Run this script after logging in to Supabase CLI

Write-Host "Deploying Supabase Edge Functions..." -ForegroundColor Green

# Deploy all updated functions
Write-Host "`nDeploying create-subscription..." -ForegroundColor Yellow
npx supabase functions deploy create-subscription

Write-Host "`nDeploying get-plans..." -ForegroundColor Yellow
npx supabase functions deploy get-plans

Write-Host "`nDeploying purchase-phone-number..." -ForegroundColor Yellow
npx supabase functions deploy purchase-phone-number

Write-Host "`nDeploying search-available-numbers..." -ForegroundColor Yellow
npx supabase functions deploy search-available-numbers

Write-Host "`nDeploying get-twilio-numbers..." -ForegroundColor Yellow
npx supabase functions deploy get-twilio-numbers

Write-Host "`nDeploying test-sip-connection..." -ForegroundColor Yellow
npx supabase functions deploy test-sip-connection

Write-Host "`nDeploying payments-webhook..." -ForegroundColor Yellow
npx supabase functions deploy payments-webhook

Write-Host "`nDeploying send-employee-invitation..." -ForegroundColor Yellow
npx supabase functions deploy send-employee-invitation

Write-Host "`nDeploying voice-twiml..." -ForegroundColor Yellow
npx supabase functions deploy voice-twiml

Write-Host "`nDeploying twiml-webhook..." -ForegroundColor Yellow
npx supabase functions deploy twiml-webhook

Write-Host "`n✅ All functions deployed successfully!" -ForegroundColor Green
