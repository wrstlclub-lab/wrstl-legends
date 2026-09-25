# WRSTL Legends 1.5 — deploying and going to the app stores

## What changed in 1.5
- Pride's Pack now mirrors passport v31: four quarter stamps (Pride / Amber / Sable / Rally),
  each with a task the child does and a task the coach knows, earned anywhere on the map.
  Old saves keep their progress; the badge still gives +2 Heart.
- Amber, Rally and Sable's roles read as in the passport (T-shirt choice + Pride's Pack).
- Version shown on the More screen; WRSTL_URL set to www.wrstl.club.
- Manifest: shortcut "My passport", launch_handler, colour-scheme.
- sw.js version stamped from the file hash, so every installed copy picks the update up.

## Deploy (GitHub Pages, repo wrstlclub-lab/wrstl-legends)
1. Copy everything in this `website` folder into the repo root (keep intro.mp4).
2. `python bump_sw.py` after ANY edit to index.html or the manifest — this is what makes
   phones that already installed the game fetch the new version.
3. Commit and push. Pages redeploys in about a minute. Installed copies update on their
   next launch (they show "A new version is ready").

## Already app-ready (no store needed)
- Android (Chrome): More → "Install WRSTL Legends" — a proper icon, full screen, offline.
- iPhone/iPad: More → the guided "Add to Home Screen" steps.
Both work with no signal after the first open and save on the device.

## Putting it in the stores (when you want it)
The game is a Progressive Web App, so the stores get a thin wrapper around the live site —
no second code base, and every update you push to Pages reaches the store apps too.
- Google Play: PWABuilder (pwabuilder.com) → paste https://wrstlclub-lab.github.io/wrstl-legends/
  → Android package (Trusted Web Activity). Needs a Google Play developer account (one-off fee)
  and an `assetlinks.json` file on the site (PWABuilder gives it to you; drop it in `.well-known/`).
- Apple App Store: PWABuilder → iOS package, opened in Xcode on a Mac, submitted with an Apple
  Developer account (yearly fee). Apple prefers apps that do more than wrap a site; the offline
  play, home-screen install and saved careers help that case.
- Either way, a custom domain (e.g. legends.wrstl.club) before packaging saves re-publishing later:
  the store apps are tied to the URL.
