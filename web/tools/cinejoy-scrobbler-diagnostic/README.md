# PBox Cinejoy Auto Sync

This Chrome extension automatically copies Pandora's Box movie/TV library entries into Cinejoy and mirrors Cinejoy playback back into Pandora's Box after a one-time install.

## Install once

1. Download and extract `pbox-cinejoy-auto-sync.zip` from PBox Settings → Integrations.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted extension folder that contains `manifest.json`.
6. Open Pandora's Box in a tab and sign in once.

If an older version is already loaded, replace the extracted files with the new download and click **Reload** on the extension card in `chrome://extensions`.

After that, no DevTools commands or manual progress entry are required.

Reload PBox Settings → Integrations after installation. The Cinejoy card will show **Extension detected** when the extension is active.

## Automatic behaviour

- Detects Cinejoy movie URLs such as `/watch/movie/{tmdbId}`.
- Detects Cinejoy TV URLs such as `/watch/tv/{tmdbId}/{season}/{episode}`.
- Watches the actual `<video>` element, including videos inside embedded cross-origin player frames.
- Sends playback progress to Pandora's Box roughly every 30 seconds plus play, pause, seek and end events.
- Marks a movie or episode complete at 90% watched or when the player fires `ended`.
- Auto-adds a missing TMDB movie or series to the user's PBox library.
- Copies PBox movies and shows with TMDB IDs into Cinejoy using a `Pandora's Box` Cinejoy list.
- Re-checks for new PBox titles when your library changes and on a five-minute background interval while PBox is open.
- Provides a **Sync PBox list to Cinejoy** button in Settings → Integrations for a full rescan/retry.
- Saves movie timestamps and TV season/episode timestamps while playback is in progress.
- Saves live episode percentage plus the latest completed season/episode so Home can show exact Cinejoy activity.
- Queues updates while PBox is closed, offline or signed out and retries them automatically once PBox is available again.
- If Trakt Auto Sync is enabled in PBox, completed movies and episodes are queued into the existing Trakt sync pipeline automatically.

## Why the extension requests broad site access

Cinejoy can place the real player inside a third-party iframe. Chrome will only allow the extension to inspect that player frame when the extension has permission for the iframe's host. The content script asks the background worker whether the current tab is Cinejoy before it monitors video, so normal non-Cinejoy pages are ignored.

The latest diagnostic playback events are retained locally under `cinejoyPlaybackEvents` to help identify player changes if Cinejoy changes providers later.
