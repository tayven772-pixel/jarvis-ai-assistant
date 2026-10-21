# J.A.R.V.I.S. AI Assistant

A standalone J.A.R.V.I.S.-inspired assistant prototype, separate from Meta Code.

## Current starter
- Responsive blue holographic dashboard
- Chat-style assistant interface with a local demo response mode
- Voice input through browser speech recognition when supported
- Settings for configuring an OpenAI-compatible API endpoint (including a local Omniroute endpoint)
- Explicit confirmation before attempting any future device-control actions

## Run locally
Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## AI connection and secrets
The initial prototype does not send messages to an AI provider automatically. API integration should be added through a small server-side proxy so provider keys are not shipped in browser or Android code. Do not commit API keys, passwords, or private URLs.

For Omniroute, use a server-side endpoint that is reachable from the machine running the proxy. A browser-based app cannot reach another device's `localhost` directly.

## Roadmap
1. Holographic dashboard and chat prototype
2. Secure backend proxy for OpenAI-compatible / Omniroute APIs
3. Android packaging with Capacitor
4. Permissioned companion for device actions, with allowlists and confirmation prompts
5. Automated checks and build workflow

Device control is intentionally not enabled in this starter. Android and desktop operating systems restrict what apps can control; integrations must use documented permissions and user approval.
