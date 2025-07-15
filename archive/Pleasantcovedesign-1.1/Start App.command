#!/bin/bash
cd "$(dirname "$0")"
npm run dev &
sleep 3
open "http://localhost:5173"
wait 