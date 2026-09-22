# Ultimate Guitar Zombie

A small, unofficial Chrome extension that keeps your screen awake while **Ultimate Guitar autoscroll is running on the focused tab/chord page**. It uses Ultimate Guitar’s actual favicon.

Protection stops when you pause autoscroll, switch tabs or apps, navigate away, or close the page. It resumes when you return to a page whose autoscroll is still running. There is no extra play button or manual toggle.

## Install in Chrome

1. Download or clone this repository and keep it in a permanent folder.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select this repository’s **extension/** folder.
4. Refresh any Ultimate Guitar pages already open.
5. On macOS, install the helper below for screensaver protection.

No build step or JavaScript package installation is needed to load the extension.

### macOS screensaver helper

Chrome’s [`power` API](https://developer.chrome.com/docs/extensions/reference/api/power) prevents display sleep and dimming. Its [macOS implementation](https://github.com/chromium/chromium/blob/main/services/device/wake_lock/power_save_blocker/power_save_blocker_mac.cc) uses a display-sleep assertion; screensaver suppression additionally needs local user-activity assertions. The included helper uses macOS IOKit to renew that assertion only during focused autoscroll.

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

Open an Ultimate Guitar `/tab/…` page, start its Autoscroll control, and keep the page focused. Pin the extension if you want to see its status:

- **ON**: wake request active and Mac helper connected.
- **!**: wake request active, but the helper is missing, connecting, or unavailable.
- No badge: no wake request.

The popup itself takes focus away from the page, so protection pauses while the popup is open. Return focus to the page to resume.

Detection supports the classic Autoscroll button’s stop SVG and the newer toolbar’s Pause/Stop label. It observes actual control state rather than assuming that every click successfully starts scrolling. Ordinary scrolling and unrelated media playback do not activate protection. An unknown site layout defaults to inactive; Ultimate Guitar UI changes may require updating `extension/detector.js`.

## Privacy and permissions

- `power`: request and release display wakefulness.
- `nativeMessaging`: communicate with the bundled local Mac helper.
- A content script runs only on HTTPS Ultimate Guitar subdomains. It inspects autoscroll controls and focus; wake requests are restricted to `/tab/…` pages.

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

`pnpm test` covers focus gating, lifecycle cleanup, timeout, and asynchronous race handling. `test:extension` loads the real unpacked extension in isolated Chromium with synthetic page markup. `test:browser` checks start/pause against a live Ultimate Guitar page in installed Chrome, then tests unrelated/disabled controls. Live tests may fail if the site changes or blocks automation. Test profiles are temporary and never use your normal Chrome profile.

The native test checks real macOS power assertions, explicit stop, disconnect, and heartbeat expiry. A full timed screensaver test is still a manual check: start autoscroll on a sufficiently long page, leave it focused beyond your configured screensaver delay, then pause and confirm normal idle behavior returns.

To scan committed history for secrets before pushing:

```sh
gitleaks git . --redact
```

The scanner allowlist contains only the exact public extension identity key, which generic secret detection otherwise flags. Other keys remain subject to scanning. The popup follows the system light/dark appearance.

`AGENTS.md` and `CLAUDE.md` were copied verbatim from `proton-calentter` as requested; some instructions still describe that project.

## Icon attribution

The bundled 32×32 icon is Ultimate Guitar’s [favicon](https://tabs.ultimate-guitar.com/static/public/ug/img/product_icons/ug/favicon_v2.png), downloaded September 22, 2026. Ultimate Guitar owns its branding. This project is not affiliated with or endorsed by Ultimate Guitar.
