#!/bin/bash
set -euo pipefail
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ultimate_guitar_zombie.awake.json"
rm -f "$HOME/Library/Application Support/Ultimate Guitar Zombie/ug-zombie-host"
rmdir "$HOME/Library/Application Support/Ultimate Guitar Zombie" 2>/dev/null || true
printf 'Helper removed. Disable or remove the extension in chrome://extensions.\n'
