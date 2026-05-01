## Problem

Clicking the SSLCommerz "online payment" button shows: **"পেমেন্ট শুরু করা যায়নি — Edge Function returned a non-2xx status code"**.

Root cause: `supabase/functions/sslcz-init/index.ts` calls `userClient.auth.getClaims(token)` but the function pins `@supabase/supabase-js@2.45.0`, which does not expose `getClaims()` (it was added in a later 2.50+ release). The call throws a `TypeError`, the catch-all returns HTTP 500, and the client surfaces the generic "non-2xx" message.

Settings, RLS, and the rest of the flow check out — only the JWT verification line is broken.

## Fix

Replace the unsupported `getClaims` call with `auth.getUser(token)`, which is available in 2.45.0 and returns the authenticated user (or an error) after validating the JWT against Supabase Auth.

### Change in `supabase/functions/sslcz-init/index.ts`

Replace:
```ts
const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
const userId = claims.claims.sub as string;
```

With:
```ts
const token = authHeader.replace("Bearer ", "");
const { data: userData, error: uErr } = await userClient.auth.getUser(token);
if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
const userId = userData.user.id;
```

No other files, RLS policies, or config changes are needed. `verify_jwt = true` in `config.toml` stays as is — the edge runtime still rejects unauthenticated requests at the gateway, and our explicit `getUser` call provides the user id we need for the order row.

## Verification

1. Deploy and click "অনলাইন পেমেন্ট" while logged in → should redirect to SSLCommerz gateway.
2. Click while logged out → should show "প্রথমে লগইন করুন" (handled in `SslczPayButton.tsx`, not the function).
3. Tamper with the token → function returns 401 "Unauthorized".
