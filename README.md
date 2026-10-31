# ZOUMFX VIP Community & Trading Bot (React Web Application)

A modern, responsive React + TypeScript web application for the **ZOUMFX VIP** XAUUSD (Gold) trading community, rewritten from the original Telegram bot while preserving all core trading logic, subscription tiers, invite system, USDT BEP20 manual review, and analytics.

---

## 🌟 Features

### 1. VIP Membership Portal
- **Welcome & Philosophy**: Read ZOUM's 5+ years XAUUSD gold trading journey, emphasizing precision, market structure analysis, and strict risk management.
- **VIP Subscription Plans**:
  - **VIP MONTHLY**: $5 (1 Month VIP Access)
  - **VIP HALF YEAR**: $25 (6 Months VIP Access, Popular)
  - **VIP YEARLY**: $50 (12 Months VIP Access, Best Value)
  - **VIP LIFETIME**: $100 (Lifetime VIP Access, Never Pay Again)
- **Invite Plans (Free VIP Access)**:
  - **MONTHLY INVITE**: 10 Trader Invites
  - **HALF YEAR INVITE**: 30 Trader Invites
  - **YEARLY INVITE**: 70 Trader Invites
  - **LIFETIME INVITE**: 125 Trader Invites
  - Direct connection to `@ZOUMFXI` with instant personal invite tracking link generation.

### 2. USDT BEP20 Payment & Manual Review Flow
- Official Deposit Address: `0x8887f5610a2f6d5cd7cd1f23ca445bc7c3e2bb6d` (USDT on Binance Smart Chain).
- One-click wallet copy with feedback.
- Interactive **"I HAVE PAID"** workflow:
  - Input sender/destination wallet address.
  - Upload payment proof screenshot (with live preview and instant demo receipts).
  - Generates tracked reference ID (e.g. `#101`) in Pending status.

### 3. Owner & Admin Dashboard (`/stats` & Review Queue)
- Configured with Admin ID (`584930219` or customizable).
- **Review Queue**: Inspect customer payment submissions, verify destination wallet, view full-resolution screenshot proof, and **APPROVE** or **REJECT**.
- **Auto Membership Activation**: Approval immediately computes exact access dates (including calendar month math for 1, 6, 12 months, or permanent Lifetime).
- **Live Stats & Metrics**:
  - Unique users, bot open events, and total plan selections.
  - Per-plan selection counts and unique users breakdown (Subscription & Invite).
  - Recent selections log with UTC+3 (Africa/Mogadishu) timestamps.
  - VIP Member directory with active, scheduled, and expired status.

### 4. Automatic VIP Membership & Expiry System
- **Automatic Unique Invite Links**:
  - When payment is approved, generates a private link via Telegram's `create_chat_invite_link`.
  - Strictly enforced `member_limit = 1` (single-person use).
  - 48-hour expiration timer for unused links.
- **Subscription Duration Tracking**:
  - **VIP MONTHLY**: 1 month of access.
  - **VIP HALF YEAR**: 6 months of access.
  - **VIP YEARLY**: 12 months of access.
  - **VIP LIFETIME**: Permanent access (never expired or removed).
  - Calendar month date math (`add_calendar_months`).
  - Extends existing subscriptions if renewal is purchased early.
- **Automatic Expiry & Removal Job**:
  - Scheduled background worker checks SQLite every 60 seconds.
  - Automatically kicks expired members from the channel via `ban_chat_member` + `unban_chat_member`.
  - Sends a polite renewal notification to the customer with direct link to VIP Plans.
  - Survives bot restarts: all dates and memberships are persistent in SQLite.
- **Channel Configuration Commands**:
  - `/setchannel <channel_id>`: Configures your VIP channel ID (e.g. `-100xxxxxxxxxx`).
  - `/channel`: Displays channel name, ID, and bot admin permissions.
  - `/checkexpiry`: Manually triggers the expiry worker on demand.
  - Auto-detection: Forwarding any post from the channel to the bot in private chat auto-configures the channel.
  - `ChatMemberHandler`: Automatically detects when the bot is granted admin rights in a channel.

### 4. Interactive Telegram Bot Simulator
- Built-in authentic Telegram dark theme chat interface.
- Test `/start`, `/help`, `/myid`, `/stats`, and `/cancel` commands.
- Interactive inline keyboards (`[💎 VIP PLANS]`, `[Subscription Plans]`, `[Invite Plans]`, `[I HAVE PAID]`, `[APPROVE]`, `[REJECT]`).
- Live synchronization with the app's local storage and admin queue.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
npm run build
```
