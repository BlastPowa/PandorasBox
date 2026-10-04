# Connect pandorasbox.live

The existing app is hosted by Vercel as project `pandoras-box` and is available at https://pandoras-box-tau.vercel.app. The domain is registered with Spaceship.

## Vercel

1. Open the existing `pandoras-box` project, then **Settings → Domains**.
2. Add `pandorasbox.live` to **Production**.
3. The configured primary domain is `www.pandorasbox.live`; `pandorasbox.live` redirects to it with HTTP 308.
4. The verified Vercel dashboard values are A / `@` / `216.198.79.1` and CNAME / `www` / `7757696da984c413.vercel-dns-017.com`. If Vercel changes its recommendations, use the latest displayed values.

## Spaceship

1. Open **Advanced DNS**, then select `pandorasbox.live`.
2. Update the website's root (`@`) A record to Vercel's displayed IP address. Replace the existing root parking A records; keep unrelated email and verification records.
3. Set the `www` CNAME record to the exact Vercel CNAME target.
4. If Vercel requests ownership verification, add the exact TXT record it displays.
5. Keep the current Spaceship nameservers when using this DNS-record method.
6. Return to Vercel and refresh the domain check until both domains show **Valid Configuration** and HTTPS is ready.

## Supabase sign-in and email links

In the app's existing Supabase project, open **Authentication → URL Configuration**:

- Set **Site URL** to `https://www.pandorasbox.live` after the domain is live.
- Add `https://www.pandorasbox.live/auth/callback` and `https://www.pandorasbox.live/auth/callback?next=**` to **Redirect URLs** (the app includes a `next` query parameter).
- Add `https://www.pandorasbox.live/reset-password` to **Redirect URLs**.
- Preserve the existing Vercel and local development URLs.

The app derives signup, Google sign-in and password-reset redirects from the current browser origin. Setting a Vercel `NEXT_PUBLIC_SITE_URL` variable alone does not update Supabase's allowlist.

If AniList or MyAnimeList integrations are configured, add the new callback in the provider's existing developer application settings:

- AniList: `https://www.pandorasbox.live/api/integrations/anilist/callback`
- MyAnimeList: `https://www.pandorasbox.live/api/integrations/mal/callback`

## Browser companion

Version 1.3.5 allows the local progress bridge on the root domain, `www`, the original Vercel domain and localhost. Install/reload the updated companion and refresh the app tab. Popup detail links retain the original Vercel URL until the new domain is verified live; switch `PBOX_WEB_ORIGIN` in `extension/popup/popup.ts` and rebuild/package the companion after verification.

## Verify

Check HTTPS, home, browse, a title page, sign-in, a signup confirmation link and a password-reset link. In the same browser as the updated companion, check **Home → Continue watching**. Existing accounts and libraries remain in the same Supabase project; sign in again on the new hostname.

## Local folder repair

The repository is at `C:\Users\Blast\Projects\Reel`. A Windows directory junction at `C:\Users\Blast\Downloads\Reel` points to it so existing chats can still open their saved working directory.

References: [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
