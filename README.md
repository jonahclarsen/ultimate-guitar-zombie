# Ultimate Guitar Zombie

A small, unofficial Chrome extension that keeps your screen awake while **an Ultimate Guitar tab/chord page is focused**. It uses Ultimate Guitar’s actual favicon.

Without autoscroll, protection expires after **five minutes without page activity**. Scrolling (including inside a scrollable panel), moving the pointer, clicking, typing, or touching the page resets the timer and resumes expired protection. With autoscroll running, protection stays on continuously. Pausing autoscroll starts a fresh five-minute allowance.

Protection stops immediately when you switch tabs or apps, navigate away, or close the page. Time spent away still counts toward the idle timeout; simply refocusing an expired page does not reset it. There is no extra play button or manual toggle.

## Install in Chrome

1. Download or clone this repository and keep it in a permanent folder.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select this repository’s **extension/** folder.
4. Refresh any Ultimate Guitar pages already open.
5. On macOS, install the helper below for screensaver protection.

No build step or JavaScript package installation is needed to load the extension. After pulling an update, click the extension’s **Reload** button at `chrome://extensions` and refresh the Ultimate Guitar page. The existing Mac helper does not need reinstalling for versions 1.1.0–1.1.1.

### macOS screensaver helper

Chrome’s [`power` API](https://developer.chrome.com/docs/extensions/reference/api/power) prevents display sleep and dimming. Its [macOS implementation](https://github.com/chromium/chromium/blob/main/services/device/wake_lock/power_save_blocker/power_save_blocker_mac.cc) uses a display-sleep assertion; screensaver suppression additionally needs local user-activity assertions. The included helper uses macOS IOKit to renew that assertion only while a focused tab page qualifies for protection.

From the repository folder, run:

```sh
bash native/install.sh
```

The installer requires Apple’s Swift compiler (included with Xcode Command Line Tools). If needed, install those first with `xcode-select --install`.

The installer builds the helper and registers it for this extension in Google Chrome. No administrator access is required. It installs only these files:

- `~/Library/Application Support/Ultimate Guitar Zombie/ug-zombie-host`
- `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ultimate_guitar_zombie.awake.json`

The helper runs only when Chrome connects to it. It releases its assertion on disconnect or an explicit stop, and expires protection after roughly 10–12 seconds without a heartbeat. It does not change your screensaver settings, create a login item, move your mouse, or type anything. The normal idle timer resumes after protection ends. It does not override manual locking or managed security policies.

The included registration supports Google Chrome on macOS. Other Chromium browsers need their own native-host registration. Without the helper, the extension still requests display wakefulness, but macOS screensaver protection is incomplete.

To uninstall the helper:

```sh
bash native/uninstall.sh
```

Then remove or disable the extension at `chrome://extensions`.

## Use

Open an Ultimate Guitar `/tab/…` page and keep it focused. Autoscroll is optional. Pin the extension if you want to see its status:

- **ON**: wake request active and Mac helper connected.
- **!**: wake request active, but the helper is missing, connecting, or unavailable.
- No badge: no wake request.

The popup itself takes focus away from the page, so protection pauses while the popup is open. Return focus to the page to resume if the idle allowance has not expired; otherwise interact with the page.

Detection supports the classic Autoscroll button’s stop SVG and the newer toolbar’s Pause/Stop label. It observes actual control state rather than assuming that every click successfully starts scrolling. Ordinary scrolling renews the idle allowance; unrelated media playback and DOM mutations do not. An unknown autoscroll layout falls back to the five-minute inactivity policy; Ultimate Guitar UI changes may require updating `extension/detector.js`.

## Privacy and permissions

- `power`: request and release display wakefulness.
- `nativeMessaging`: communicate with the bundled local Mac helper.
- A content script runs only on HTTPS Ultimate Guitar subdomains. It inspects autoscroll controls, focus, and page activity; wake requests are restricted to `/tab/…` pages.

No analytics, remote executable code, stored browsing history, credentials, or account access. No page contents or song URLs are sent to the helper; messages contain only an active/inactive flag. Extension code makes no network requests.

The manifest’s `key` is a **public** key, used solely to keep the unpacked extension ID stable (`mojincimfcfkknfajgkndfdihefmfdpd`) for native-host registration. No private key is retained or required.

## Development and checks

Prefer pnpm:

```sh
pnpm install
pnpm test
pnpm exec playwright install chromium
pnpm test:extension
pnpm test:browser
# macOS, after installing the helper:
python3 tests/native.py
```

`pnpm test` covers the five-minute idle boundary, activity renewal, continuous autoscroll, pause allowance, focus gating, lifecycle cleanup, heartbeat timeout, and asynchronous race handling. Idle-policy tests use a controlled clock, with no five-minute test waits. `test:extension` loads the real unpacked extension in isolated Chromium with synthetic page markup. `test:browser` checks start/pause against a live Ultimate Guitar page in installed Chrome, then tests unrelated/disabled controls. Live tests may fail if the site changes or blocks automation. Test profiles are temporary and never use your normal Chrome profile.

The native test checks real macOS power assertions, explicit stop, disconnect, and heartbeat expiry. A full timed screensaver test is still a manual check: open a tab page and confirm protection expires after five idle minutes and resumes on scrolling. Then start autoscroll on a sufficiently long page, leave it focused beyond your configured screensaver delay, and confirm protection remains on. After stopping autoscroll, allow five idle minutes for the normal idle behavior to resume.

To scan committed history for secrets before pushing:

```sh
gitleaks git . --redact
```

The scanner allowlist contains only the exact public extension identity key, which generic secret detection otherwise flags. Other keys remain subject to scanning. The popup follows the system light/dark appearance.

`AGENTS.md` and `CLAUDE.md` were copied verbatim from `proton-calentter` as requested; some instructions still describe that project.

## Icon attribution

The bundled icons use Ultimate Guitar’s [favicon](https://tabs.ultimate-guitar.com/static/public/ug/img/product_icons/ug/favicon_v2.png) and matching [48px](https://tabs.ultimate-guitar.com/static/public/ug/img/product_icons/ug/apple-touch-icon-48x48_v3.png) and [192px](https://tabs.ultimate-guitar.com/static/public/ug/img/product_icons/ug/apple-touch-icon-192x192_v3.png) site icons, downloaded September 22, 2026. The manifest declares 16px, 32px, 48px, and 128px versions, including the 48px icon used on Chrome’s extensions page. Ultimate Guitar owns its branding. This project is not affiliated with or endorsed by Ultimate Guitar.
