#!/bin/zsh
# Usage: sim.sh open <url> [wait] | shot <name> [px] | scroll <pts> [wait] | hswipe <y> <pts> | tap <x> <y> | source
# Needs: ssh alias `macbook`, iPhone 17 sim booted there, WebDriverAgent running on :8100.
# Drive the iPhone 17 simulator on the MacBook: Apple simctl for URLs/screenshots, WDA (already running) for gestures.
UDID=634719CB-1DC1-4293-8508-CE0A99234BC8
S=${OUT_DIR:-/tmp/prodani-sim}; mkdir -p $S/shots
R() { ssh -o BatchMode=yes macbook "$@"; }
sid() { R "curl -s -X POST -H 'Content-Type: application/json' -d '{\"capabilities\":{}}' localhost:8100/session" | python3 -c 'import sys,json;print(json.load(sys.stdin)["sessionId"])'; }
case $1 in
  open) R "xcrun simctl openurl $UDID '$2'"; sleep ${3:-8};;
  shot) R "xcrun simctl io $UDID screenshot --type=png /tmp/s.png >/dev/null 2>&1" && scp -q macbook:/tmp/s.png $S/shots/$2.full.png && sips -Z ${3:-1000} $S/shots/$2.full.png --out $S/shots/$2.png >/dev/null && echo $S/shots/$2.png;;
  scroll) # finger flick that moves content up by ~$2 points (default 500), started mid-screen to avoid Safari's toolbar
    D=${2:-500}; ID=$(sid); FY=650; TY=$((650-D)); [ $TY -lt 90 ] && TY=90
    R "curl -s -X POST -H 'Content-Type: application/json' -d '{\"actions\":[{\"type\":\"pointer\",\"id\":\"f1\",\"parameters\":{\"pointerType\":\"touch\"},\"actions\":[{\"type\":\"pointerMove\",\"duration\":0,\"x\":200,\"y\":$FY},{\"type\":\"pointerDown\"},{\"type\":\"pointerMove\",\"duration\":600,\"x\":200,\"y\":$TY},{\"type\":\"pause\",\"duration\":150},{\"type\":\"pointerUp\"}]}]}' localhost:8100/session/$ID/actions" >/dev/null; sleep ${3:-1.5};;
  tap) ID=$(sid); R "curl -s -X POST -H 'Content-Type: application/json' -d '{\"x\":$2,\"y\":$3}' localhost:8100/session/$ID/wda/tap" | head -c 200; echo; sleep ${4:-1.5};;
  source) ID=$(sid); R "curl -s 'localhost:8100/session/$ID/source?format=description'" | python3 -c 'import sys,json;print(json.load(sys.stdin)["value"])';;
esac
case $1 in
  hswipe) # horizontal finger swipe at height $2, by $3 points (positive = content moves left)
    ID=$(sid); Y=$2; D=${3:-250}; FX=$((300)); TX=$((300-D)); [ $TX -lt 10 ] && TX=10
    R "curl -s -X POST -H 'Content-Type: application/json' -d '{\"actions\":[{\"type\":\"pointer\",\"id\":\"f1\",\"parameters\":{\"pointerType\":\"touch\"},\"actions\":[{\"type\":\"pointerMove\",\"duration\":0,\"x\":$FX,\"y\":$Y},{\"type\":\"pointerDown\"},{\"type\":\"pointerMove\",\"duration\":400,\"x\":$TX,\"y\":$Y},{\"type\":\"pause\",\"duration\":100},{\"type\":\"pointerUp\"}]}]}' localhost:8100/session/$ID/actions" >/dev/null; sleep ${4:-1.5};;
esac
