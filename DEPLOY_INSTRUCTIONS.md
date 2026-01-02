# Deploying Supabase Edge Functions

## Prerequisites
1. Make sure you're logged in to Supabase CLI
2. Your project should be linked to your Supabase project

## Step 1: Login to Supabase (if not already logged in)
Open your terminal and run:
```powershell
npx supabase login
```
This will open a browser window for you to authenticate.

## Step 2: Link to Your Project (if not already linked)
If you haven't linked your project yet, run:
```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
```
Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID.

## Step 3: Deploy the Functions

### Option A: Deploy All Functions at Once
Run the PowerShell script:
```powershell
.\deploy-functions.ps1
```

### Option B: Deploy Functions Individually
Deploy each updated function:

```powershell
# Deploy purchase-phone-number
npx supabase functions deploy purchase-phone-number

# Deploy search-available-numbers
npx supabase functions deploy search-available-numbers

# Deploy get-twilio-numbers
npx supabase functions deploy get-twilio-numbers

# Deploy test-sip-connection
npx supabase functions deploy test-sip-connection
```

## Step 4: Verify Deployment
After deployment, you can verify the functions are deployed by checking your Supabase dashboard:
1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Verify all functions are listed and up to date

## Updated Functions
The following functions have been updated to use Twilio subaccounts:
- ✅ `purchase-phone-number` - Purchases phone numbers in user's subaccount
- ✅ `search-available-numbers` - Searches numbers in user's subaccount
- ✅ `get-twilio-numbers` - Lists numbers from user's subaccount
- ✅ `test-sip-connection` - Tests SIP connection using user's subaccount

## Notes
- The shared helper function `_shared/get-twilio-subaccount.ts` is automatically included when deploying
- Make sure to run the database migration first: `20250125000001_add_twilio_subaccounts.sql`
- All functions now automatically create subaccounts for users on first use
