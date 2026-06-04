#!/bin/bash
# 연결된 iPhone에서 다음 번호로 스크린샷 캡쳐.
# 사용법: ./scripts/capture-screenshot.sh
# 화면을 원하는 상태로 두고 실행 → screenshots/raw/0N.png 자동 저장.

set -e

DEVICE_ID="${DEVICE_ID:-00008110-0016046E2E20201E}"
RAW_DIR="$(dirname "$0")/../screenshots/raw"
mkdir -p "$RAW_DIR"

# 다음 빈 번호 찾기 (01~06)
NEXT=""
for i in 01 02 03 04 05 06; do
  if [ ! -f "$RAW_DIR/$i.png" ]; then
    NEXT="$i"
    break
  fi
done

if [ -z "$NEXT" ]; then
  echo "이미 6장 다 있음. 다시 찍으려면 screenshots/raw/0N.png 삭제 후 실행."
  exit 0
fi

OUT="$RAW_DIR/$NEXT.png"
echo "→ $OUT 캡쳐 중..."
xcrun devicectl device process screenshot \
  --device "$DEVICE_ID" \
  --output "$OUT" \
  > /dev/null

echo "✅ 저장: $OUT"
echo ""
echo "남은 슬롯:"
for i in 01 02 03 04 05 06; do
  if [ -f "$RAW_DIR/$i.png" ]; then
    echo "  [✓] $i.png"
  else
    echo "  [ ] $i.png"
  fi
done
