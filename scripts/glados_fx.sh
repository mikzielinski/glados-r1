#!/usr/bin/env bash
# Polish GLaDOS ring-mod chain (Piper starter kit). Usage: ./glados_fx.sh in.wav out.wav [preset]
# preset: subtle | ingame (default) | heavy
set -euo pipefail
IN="${1:?input wav}"; OUT="${2:?output wav}"; PRESET="${3:-ingame}"

case "$PRESET" in
  subtle) SINE=50;  W=0.18 ;;
  ingame) SINE=64;  W=0.32 ;;
  heavy)  SINE=95;  W=0.60 ;;
  *) echo "preset: subtle | ingame | heavy"; exit 1 ;;
esac

SR=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$IN")

ffmpeg -y -i "$IN" \
  -f lavfi -i "sine=frequency=${SINE}:sample_rate=${SR}" \
  -filter_complex "
   [0:a]highpass=f=120, lowpass=f=7600,
        equalizer=f=1800:t=q:w=1.4:g=4,
        equalizer=f=3200:t=q:w=1.6:g=3        [voc];
   [voc][1:a]amultiply                        [rm];
   [voc]anull                                 [dry];
   [dry][rm]amix=inputs=2:weights=1 ${W}      [mix];
   [mix]chorus=0.5:0.9:50|60:0.4|0.32:0.25|0.3:2|2.3,
        aecho=0.8:0.7:55|110:0.28|0.18,
        acompressor=threshold=-18dB:ratio=3:attack=8:release=160,
        alimiter=limit=0.95                    [out]" \
  -map "[out]" -ar "$SR" -ac 1 "$OUT"

echo "OK: $OUT (preset=$PRESET sine=${SINE}Hz weight=$W)"
