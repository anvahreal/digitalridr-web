# Admin email notifications

The `notify-admins` Edge Function emails every profile with `is_admin = true`,
plus any comma-separated addresses in `ADMIN_NOTIFICATION_EMAILS`.

Set these Supabase Edge Function secrets before deployment:

```text
RESEND_API_KEY=<Resend API key>
EMAIL_FROM=DigitalRidr <notifications@your-verified-domain.com>
ADMIN_NOTIFICATION_EMAILS=backup-admin@example.com
ADMIN_NOTIFICATION_WEBHOOK_SECRET=<long random value>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to Edge Functions
by Supabase. The final secret must also be stored in Supabase Vault as
`admin_notification_webhook_secret`; see the signup migration for the SQL.

Deploy these functions together so their server-to-server calls are available:

```text
supabase functions deploy notify-admins --no-verify-jwt
supabase functions deploy submit-verification
supabase functions deploy korapay-webhook
supabase functions deploy send-email
supabase db push
```

Alerts are sent for: new user registrations, identity-verification submissions,
host applications, manual-payment bookings, confirmed KoraPay bookings, payout
requests, and booking cancellations.
