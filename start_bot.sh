#!/bin/bash
# Start script for ZOUMFX VIP Telegram Bot
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

exec python3 zoumfx_vip_bot.py
