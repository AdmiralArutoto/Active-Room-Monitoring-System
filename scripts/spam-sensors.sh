#!/bin/bash
# Spam random on/off states to sensors (~60 req/min = 1 req/sec)

API="http://localhost:3000/api/states"

SENSORS=(
  "B02.F01.r103.light"
  "B02.F01.R101.light"
  "B02.F01.R101.motion"
  "B02.F01.wc.motion"
)

STATES=("on" "off")

while true; do
  sensor=${SENSORS[$((RANDOM % ${#SENSORS[@]}))]}
  state=${STATES[$((RANDOM % 2))]}

  curl -s -o /dev/null -X POST "$API/$sensor" \
    -H "Content-Type: application/json" \
    -d "{\"state\": \"$state\"}"

  echo "[$(date +%H:%M:%S)] $sensor → $state"
  sleep 1
done
