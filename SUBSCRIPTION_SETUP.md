# Subscription System Setup Guide

## Overview
The subscription system now properly stores subscriptions and handles third-party payment methods (PayPal, etc.).

## What Was Fixed

### 1. Subscription Storage
- **Issue**: Subscriptions weren't being stored in the database after payment
- **Fix**: Added proper error handling and logging in `create-subscription` function
- **Result**: Subscriptions are now stored with all necessary fields including:
  - `user_id`, `stripe_id`, `status`, `customer_id`
  - `current_period_start`, `current_period_end`
  - `amount`, `currency`, `interval`
  - Metadata (coupon info, user email)

### 2. Third-Party Payment Methods
- **Issue**: PayPal and other payment methods weren't updating subscriptions
- **Fix**: Added webhook handlers for:
  - `payment_intent.succeeded` — Updates subscription when third-party payment succeeds
  - `payment_intent.payment_failed` — Logs failed third-party payments
- **Result**: All payment methods (card, PayPal, etc.) now properly activate subscriptions

### 3. Better Error Handling
- Added detailed logging throughout the subscription creation process
- Error messages now include full details for debugging
- Console logs show subscription creation status

## How It Works

### Subscription Creation Flow

1. **User clicks "Get Started"** → Navigates to checkout page
2. **User clicks "Continue to Payment"** → Calls `create-subscription` function
3. **Function creates Stripe subscription** → Returns client secret
4. **User completes payment** → Stripe processes payment
5. **Webhook fires** → One of these events:
   - `customer.subscription.created` — Creates subscription record
   - `invoice.payment_succeeded` — Updates subscription to "active"
   - `payment_intent.succeeded` — Updates subscription (for third-party payments)
6. **Subscription is active** → User can access features

### Webhook Events Handled

| Event | What It Does |
|-------|-------------|
| `customer.subscription.created` | Creates initial subscription record |
| `customer.subscription.updated` | Updates subscription status/period |
| `customer.subscription.deleted` | Marks subscription as canceled |
| `checkout.session.completed` | Updates subscription with checkout info |
| `invoice.payment_succeeded` | Activates subscription after successful payment |
| `invoice.payment_failed` | Marks subscription as past_due |
| `payment_intent.succeeded` | Activates subscription (third-party payments) |
| `payment_intent.payment_failed` | Logs failed third-party payment |

## Testing

### Test Subscription Creation

1. Go to `/pricing`
2. Click "Get Started" on any plan
3. Complete payment with test card: `4242 4242 4242 4242`
4. Check browser console for logs:
   ```
   Storing subscription in database: {...}
   Subscription stored successfully: {...}
   Payment succeeded, verifying subscription for user: ...
   Subscription verified: {...}
   ```
5. Check Supabase database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
   ```

### Test Third-Party Payments

1. Enable PayPal in Stripe Dashboard
2. Complete payment with PayPal
3. Webhook `payment_intent.succeeded` will fire
4. Subscription status updated to "active"

## Stripe Dashboard Setup

### Required Webhooks

Add these webhook endpoints in Stripe Dashboard:

**Endpoint URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/payments-webhook`

**Events to listen for**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Environment Variables

Ensure these are set in Supabase:
- `STRIPE_SECRET_KEY` — Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Your webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for database access

## Debugging

### Check Subscription Status

```typescript
import { getSubscriptionStatus } from "@/utils/subscription";

const status = await getSubscriptionStatus(userId);
console.log("Is Active:", status.isActive);
console.log("Status:", status.status);
console.log("Needs Payment:", status.needsPayment);
```

### Check Webhook Logs

1. Go to Supabase Dashboard → Edge Functions → payments-webhook
2. Click "Logs" to see webhook processing
3. Look for errors or failed events

### Check Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. View recent webhook events and their responses

## Common Issues

### Subscription not storing
- **Check**: Edge function logs for errors
- **Check**: Database permissions (RLS policies)
- **Fix**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set

### Third-party payments not working
- **Check**: Webhook events are being sent
- **Check**: `payment_intent.succeeded` handler is working
- **Fix**: Ensure webhook is listening for payment_intent events

### Subscription shows as "incomplete"
- **Check**: Payment was successful in Stripe
- **Check**: `invoice.payment_succeeded` webhook fired
- **Fix**: Manually trigger webhook or wait for next billing cycle

## Files Modified

1. `supabase/functions/create-subscription/index.ts` — Better error handling, detailed logging
2. `supabase/functions/payments-webhook/index.ts` — Added third-party payment handlers
3. `src/app/checkout/page.tsx` — Better subscription verification
4. `src/utils/subscription.ts` — Subscription status utilities
5. `src/hooks/useSubscription.ts` — React hook for subscription status

## Next Steps

1. Test with real Stripe account (not test mode)
2. Monitor webhook logs for any errors
3. Set up email notifications for failed payments
4. Add subscription management page for users
