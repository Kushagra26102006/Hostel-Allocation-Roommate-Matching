#!/usr/bin/env bash
# ==============================================================================
# OWASP ZAP Baseline Security Scan
# Scans running staging stack against OWASP Top 10 web vulnerabilities.
# Fails if High or Medium findings are detected.
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-${ZAP_TARGET_URL:-http://localhost:3000}}"
REPORT_DIR="${2:-${ZAP_REPORT_DIR:-$(pwd)/zap-reports}}"

mkdir -p "$REPORT_DIR"
chmod 777 "$REPORT_DIR"

echo "========================================================"
echo "Starting OWASP ZAP Baseline Scan on: $TARGET_URL"
echo "Report output directory: $REPORT_DIR"
echo "========================================================"

# Healthcheck to verify target is reachable before scanning
echo "Verifying target service availability..."
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s -f "$TARGET_URL/api/v1/health" > /dev/null || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  echo "Waiting for $TARGET_URL/api/v1/health to become ready ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "ERROR: Target $TARGET_URL was unreachable after 60s. Aborting scan."
  exit 1
fi

echo "Target is UP. Running ZAP container..."

# Run official zaproxy container
# zap-baseline.py return codes:
# 0 = success, no warnings/failures
# 1 = failure, warnings/failures detected
# 2 = warnings detected
# 3 = ZAP error
docker run --rm \
  --network="host" \
  -v "$REPORT_DIR":/zap/wrk/:rw \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
    -t "$TARGET_URL" \
    -r zap-report.html \
    -J zap-report.json \
    -w zap-report.md \
    -I \
    || ZAP_EXIT_CODE=$?

EXIT_CODE="${ZAP_EXIT_CODE:-0}"
echo "ZAP scan finished with code $EXIT_CODE."

# Parse report JSON if present to check for High/Medium alerts
REPORT_JSON="$REPORT_DIR/zap-report.json"
if [ -f "$REPORT_JSON" ]; then
  echo "Analyzing ZAP report findings..."
  HIGH_COUNT=$(grep -o '"riskcode": "3"' "$REPORT_JSON" | wc -l || true)
  MED_COUNT=$(grep -o '"riskcode": "2"' "$REPORT_JSON" | wc -l || true)
  LOW_COUNT=$(grep -o '"riskcode": "1"' "$REPORT_JSON" | wc -l || true)
  INFO_COUNT=$(grep -o '"riskcode": "0"' "$REPORT_JSON" | wc -l || true)

  echo "--------------------------------------------------------"
  echo "Scan Summary:"
  echo "  High Severity (Risk 3):   $HIGH_COUNT"
  echo "  Medium Severity (Risk 2): $MED_COUNT"
  echo "  Low Severity (Risk 1):    $LOW_COUNT"
  echo "  Informational (Risk 0):   $INFO_COUNT"
  echo "--------------------------------------------------------"

  if [ "$HIGH_COUNT" -gt 0 ] || [ "$MED_COUNT" -gt 0 ]; then
    echo "FAILED: Security baseline scan discovered $HIGH_COUNT High and $MED_COUNT Medium findings."
    exit 1
  else
    echo "SUCCESS: Zero High and Zero Medium findings discovered."
    exit 0
  fi
else
  echo "Report JSON not generated. Checking raw exit code."
  if [ "$EXIT_CODE" -eq 0 ] || [ "$EXIT_CODE" -eq 2 ]; then
    echo "Scan completed without critical failures."
    exit 0
  else
    echo "Scan encountered errors (code $EXIT_CODE)."
    exit "$EXIT_CODE"
  fi
fi
