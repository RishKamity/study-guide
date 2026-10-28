#!/usr/bin/env bash
# render.sh — the whole narrated-audio pipeline for one course pack (Full tier).
#   bash tools/audio/render.sh <courseDir> [voice]        (default voice: am_michael)
# Needs: python3, ffmpeg, node (on Windows: Git Bash or WSL). Installs kokoro-onnx and downloads the model (~350 MB) on first run.
# Speed: with an NVIDIA GPU it installs onnxruntime-gpu and renders far faster than real time.
#        On CPU it runs one part per core: roughly 0.5-1.3x the audio length on 2 cores (70 min of audio took ~60 min), faster with more.
# Overrides: AUDIO_CPU=1 (never use the GPU), AUDIO_PARTS=N (number of parallel parts). Safe to re-run: finished tracks are skipped.
set -euo pipefail
C="$(cd "$1" && pwd)"; V="${2:-am_michael}"; T="$(cd "$(dirname "$0")" && pwd)"
PY="$(command -v python3 || command -v python)"; export PIP_BREAK_SYSTEM_PACKAGES=1
export KOKORO_DIR="${KOKORO_DIR:-$HOME/.cache/kokoro}"; mkdir -p "$KOKORO_DIR"
"$PY" -c "import kokoro_onnx, soundfile, num2words" 2>/dev/null || "$PY" -m pip install -q kokoro-onnx soundfile num2words
for f in kokoro-v1.0.onnx voices-v1.0.bin; do [ -s "$KOKORO_DIR/$f" ] || curl -sSL -o "$KOKORO_DIR/$f" "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f"; done

# GPU: an NVIDIA card but no CUDA build of onnxruntime yet -> swap in onnxruntime-gpu (CUDA and cuDNN come as pip wheels)
has_cuda() { "$PY" -c "import onnxruntime as o, sys; sys.exit(0 if 'CUDAExecutionProvider' in o.get_available_providers() else 1)" 2>/dev/null; }
if [ -z "${AUDIO_CPU:-}" ] && command -v nvidia-smi >/dev/null 2>&1 && ! has_cuda; then
  echo "NVIDIA GPU found: installing onnxruntime-gpu"
  "$PY" -m pip uninstall -y -q onnxruntime >/dev/null 2>&1 || true
  "$PY" -m pip install -q "onnxruntime-gpu[cuda,cudnn]" || { echo "could not install onnxruntime-gpu; using the CPU"; "$PY" -m pip install -q onnxruntime; }
fi
cores="$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)"
if [ -z "${AUDIO_CPU:-}" ] && has_cuda; then DEV=gpu; N="${AUDIO_PARTS:-2}"; else DEV=cpu; N="${AUDIO_PARTS:-$(( cores > 8 ? 8 : cores ))}"; fi
[ "$N" -ge 1 ] 2>/dev/null || N=1

node "$T/scripts.mjs" "$C"
"$PY" "$T/speak.py" "$C"
echo "rendering on the $DEV with $N part(s) at once"
pids=()
for ((i = 0; i < N; i++)); do AUDIO_DEVICE="$DEV" "$PY" "$T/synth.py" "$C" "$i" "$N" "$V" > "$C/audio/synth$i.log" 2>&1 & pids+=($!); done
bad=0; for p in "${pids[@]}"; do wait "$p" || bad=1; done
[ "$bad" = 0 ] || { echo "a render part failed: see $C/audio/synth*.log"; exit 1; }

mkdir -p "$C/audio/mp3"
for w in "$C"/audio/wav/*.wav; do b="$(basename "$w" .wav)"; [ -s "$C/audio/mp3/$b.mp3" ] && [ "$C/audio/mp3/$b.mp3" -nt "$w" ] && continue
  ffmpeg -y -loglevel error -i "$w" -af loudnorm=I=-18:TP=-2:LRA=11 -ac 1 -ar 24000 -b:a 64k "$C/audio/mp3/$b.mp3"; done
node "$T/tracks.mjs" "$C"
echo "done: $(ls "$C/audio/mp3" | wc -l) mp3 files in $C/audio/mp3 ($(du -sh "$C/audio/mp3" | cut -f1))"
