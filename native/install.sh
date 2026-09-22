#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname)" != Darwin ]]; then echo 'The screensaver helper is for macOS.' >&2; exit 1; fi
install_dir="$HOME/Library/Application Support/Ultimate Guitar Zombie"
manifest_dir="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$install_dir" "$manifest_dir"
/usr/bin/swiftc -O main.swift -o "$install_dir/ug-zombie-host"
chmod 755 "$install_dir/ug-zombie-host"
# JSONEncoder handles any quotes or backslashes in the user's home directory.
/usr/bin/swift manifest.swift "$install_dir/ug-zombie-host" "$(cat extension-id)" > "$manifest_dir/com.ultimate_guitar_zombie.awake.json"
printf 'Installed Mac screensaver helper at %s\nLoad the extension/ folder in chrome://extensions.\n' "$install_dir"
