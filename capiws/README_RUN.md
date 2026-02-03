Running CAPIWS (E-IMZO local service) for stat-urmon.uz

This document explains how to install Java on macOS, run the vendor capiws.jar, and common troubleshooting steps.

Prerequisites
- You must have the vendor-provided `capiws.jar` (not included in this repo). Place it at `capiws/capiws.jar` or note its path.
- `capiws/config.properties` and `capiws/keys/` are present in this repo.

1) Install Java (macOS - Homebrew)

Run the following commands:

brew update
brew install openjdk@17

# Optionally make OpenJDK available system-wide (example for Apple Silicon):
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
java -version

2) Place vendor jar

Copy the vendor `capiws.jar` into the repo directory:

cp /path/to/vendor/capiws.jar ./capiws/capiws.jar

3) Run using helper script

This repo includes `scripts/run_capiws.sh` which checks Java and runs the jar with the repo config:

chmod +x scripts/run_capiws.sh
./scripts/run_capiws.sh ./capiws/capiws.jar ./capiws/config.properties

To run in background:

nohup java -jar ./capiws/capiws.jar --config ./capiws/config.properties > capiws.log 2>&1 &

4) Check port and logs

lsof -i :8080
curl -v http://127.0.0.1:8080/
tail -f capiws.log

5) macOS launchd example (optional)

Create a plist at ~/Library/LaunchAgents/org.stat-urmon.capiws.plist with appropriate Java invocation and load it with launchctl. Example commands:

launchctl load ~/Library/LaunchAgents/org.stat-urmon.capiws.plist
launchctl unload ~/Library/LaunchAgents/org.stat-urmon.capiws.plist

6) Troubleshooting
- TLS / keystore errors: verify files referenced in `capiws/config.properties` exist and passwords are correct.
- API keys: set `VITE_EIMZO_API_KEYS` in `.env` and restart the frontend.
- If `window.EIMZOClient` is undefined in browser console, check CAPIWS is running and accessible.

If you share the capiws logs or browser console output I can help debug specific errors.
