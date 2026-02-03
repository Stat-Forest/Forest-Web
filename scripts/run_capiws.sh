#!/usr/bin/env bash
# Simple helper to run CAPIWS vendor jar using the repo's config
# Usage: ./scripts/run_capiws.sh [path/to/capiws.jar]

set -euo pipefail

JAR_PATH="${1:-./capiws/capiws.jar}"
CONFIG_PATH="${2:-./capiws/config.properties}"

ABS_JAR="$(cd "$(dirname "$JAR_PATH")" >/dev/null 2>&1 && pwd)/$(basename "$JAR_PATH")"
ABS_CONFIG="$(cd "$(dirname "$CONFIG_PATH")" >/dev/null 2>&1 && pwd)/$(basename "$CONFIG_PATH")"

echo "Using JAR: $ABS_JAR"
echo "Using config: $ABS_CONFIG"

if ! command -v java >/dev/null 2>&1; then
  echo "Java not found. On macOS install OpenJDK with Homebrew:"
  echo "  brew install openjdk@17"
  echo "Then run this script again."
  exit 2
fi

if [ ! -f "$ABS_JAR" ]; then
  echo "CAPIWS jar not found at $ABS_JAR"
  echo "Place vendor capiws.jar at ./capiws/capiws.jar or pass its path as first argument."
  exit 3
fi

if [ ! -f "$ABS_CONFIG" ]; then
  echo "Config not found at $ABS_CONFIG"
  exit 4
fi

JAVA_CMD="java"

echo "Starting CAPIWS... (logs will print to stdout)"
echo "If you want to run in background, use: nohup $JAVA_CMD -jar $ABS_JAR --config $ABS_CONFIG &"

exec "$JAVA_CMD" -jar "$ABS_JAR" --config "$ABS_CONFIG"
