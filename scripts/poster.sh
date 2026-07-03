#!/usr/bin/env bash
# Grab a poster frame from a video: poster.sh talk.mp4 [00:00:02]
set -euo pipefail
in="${1:?usage: poster.sh <video> [timestamp]}"
ts="${2:-00:00:02}"
out="${in%.*}.jpg"
ffmpeg -y -ss "$ts" -i "$in" -frames:v 1 -q:v 3 "$out"
echo "poster written to $out"
