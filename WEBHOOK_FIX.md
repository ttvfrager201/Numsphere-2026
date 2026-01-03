# URGENT: Fix Stripe Webhook URL

## The Problem

Your webhook URL in Stripe Dashboard is **WRONG**:
❌ `https://hqjhrmhqdutmkvtdtolh.supabase.co/functions/v1/supabase-functions-payments-webhook`

This is causing 404 errors, so subscriptions stay "incomplete" forever.

## The Fix

### Step 1: Update Webhook URL in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click on your existing webhook endpoint
3. Click "Update details" or "..." menu → "Update endpoint"
4. Change the URL to:
   ```
   https://hqjhrmhqdutmkvtdtolh.supabase.co/functions/v1/payments-webhook
   ```
   ✅ Remove the `supabase-functions-` prefix!

5. Make sure these events are selected:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

6. Save the endpoint

### Step 2: Resend Failed Webhooks

For the subscription you just created:

1. Go to: https://dashboard.stripe.com/test/events
2. Find event `evt_1SlDGcB6b7vINOBHUF4QSjey` (invoice.payment_succeeded)
3. Click on it
4. Click "Resend event" button
5. Select your webhook endpoint
6. Click "Send"

This will trigger the webhook with the correct URL and update your subscription to "active"!

### Step 3: Manually Fix Existing Subscriptions (Optional)

If resending doesn't work immediately, you can manually update in Supabase:

```sql
-- Update the Professional plan subscription
UPDATE subscriptions 
SET status = 'active' 
WHERE stripe_id = 'sub_1SlDGUB6b7vINOBH1rh8AaQu';

-- Update the Starter plan subscription (if you have one)
UPDATE subscriptions 
SET status = 'active' 
WHERE stripe_id = 'sub_1SlDDQB6b7vINOBHizfqReGj';
```

## Verify It's Working

After fixing the webhook URL, test with a new subscription:

1. Create a new test subscription
2. Complete payment
3. Check Stripe webhook logs - should show ✅ 200 instead of ❌ 404
4. Check subscription in database - should be "active" not "incomplete"

## Quick Reference

**Correct Webhook URL**: 
```
https://hqjhrmhqdutmkvtdtolh.supabase.co/functions/v1/payments-webhook
```

**Incorrect URL** (what you have now):
```
https://hqjhrmhqdutmkvtdtolh.supabase.co/functions/v1/supabase-functions-payments-webhook
```

The difference: Remove `supabase-functions-` from the URL!
