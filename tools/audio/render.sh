#!/usr/bin/env bash
# render.sh — the whole narrated-audio pipeline for one course pack (Full tier).
#   bash tools/audio/render.sh <courseDir> [voice]        (default voice: am_michael)
# Needs: python3, ffmpeg, node. Installs kokoro-onnx and downloads the model (~350 MB) from GitHub releases on first run.
# Time: roughly 0.5-1.3x the audio length in CPU time (70 min of audio took ~60 min on 2 cores). Safe to re-run: finished tracks are skipped.
set -euo pipefail
C="$(cd "$1" && pwd)"; V="${2:-am_michael}"; T="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$T/../.." && pwd)"
export KOKORO_DIR="${KOKORO_DIR:-$HOME/.cache/kokoro}"; mkdir -p "$KOKORO_DIR"
python3 -c "import kokoro_onnx, soundfile" 2>/dev/null || pip install --break-system-packages -q kokoro-onnx soundfile num2words
python3 -c "import num2words" 2>/dev/null || pip install --break-system-packages -q num2words
for f in kokoro-v1.0.onnx voices-v1.0.bin; do [ -s "$KOKORO_DIR/$f" ] || curl -sSL -o "$KOKORO_DIR/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"; done
node "$T/scripts.mjs" "$C"
python3 "$T/speak.py" "$C"
python3 -I "$T/synth.py" "$C" 0 2 "$V" > "$C/audio/synth0.log" 2>&1 &
python3 -I "$T/synth.py" "$C" 1 2 "$V" > "$C/audio/synth1.log" 2>&1 &
wait
mkdir -p "$C/audio/mp3"
for w in "$C"/audio/wav/*.wav; do b="$(basename "$w" .wav)"; [ -s "$C/audio/mp3/$b.mp3" ] && [ "$C/audio/mp3/$b.mp3" -nt "$w" ] && continue
  ffmpeg -y -loglevel error -i "$w" -af loudnorm=I=-18:TP=-2:LRA=11 -ac 1 -ar 24000 -b:a 64k "$C/audio/mp3/$b.mp3"; done
node "$T/tracks.mjs" "$C"
echo "done: $(ls "$C/audio/mp3" | wc -l) mp3 files in $C/audio/mp3 ($(du -sh "$C/audio/mp3" | cut -f1))"
