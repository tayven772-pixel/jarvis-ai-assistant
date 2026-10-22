# J.A.R.V.I.S. AI Assistant

A standalone J.A.R.V.I.S.-inspired assistant project, separate from Meta Code.

## Features
- Responsive blue holographic dashboard with animated assistant core
- Read-only disk usage dashboard and local folder-size/file-type analysis for user-selected folders (browser folder-picker support varies by device)
- Chat with Groq, OpenAI, Omniroute, or auto-detected models from a custom OpenAI-compatible API endpoint
- Local conversation history (last 80 messages) and user-editable memory notes
- Browser speech recognition for voice input where supported
- Optional Fish Audio text-to-speech for spoken replies
- Android launchable-app discovery and app launching through the native Capacitor bridge
- Windows Start-menu app discovery and launch through a constrained Electron IPC bridge
- Android calendar event creation with a permission request and explicit result reporting
- Optional Android accessibility controls, only when a user manually enables the service in Android Settings
- A coding-workspace quick prompt to start planning, writing, reviewing, and debugging code with the selected AI provider

## Run locally
Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Build the Windows app locally
```bash
npm install
npm run desktop:build
```

The Windows installer is written to `release/`. To run the desktop app during development, use `npm run desktop:dev`.

## Build Android locally
Install Android Studio and its Android SDK first, then run:

```bash
npm install
npm run build
npx cap add android
python scripts/configure_android_manifest.py
npx cap sync android
npx cap open android
```

In Android Studio, build a debug APK using **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The APK is not signed for public release. Keep signing keys private.

## Build automatically on GitHub
The **Build JARVIS installers** workflow runs on relevant pushes to `main` or manually from the repository's Actions tab. It produces two downloadable workflow artifacts:
- `jarvis-android-debug-apk` — a test APK, not a Play Store release
- `jarvis-windows-installer` — Windows installer (.exe)

Open the repository's **Actions** tab, select a completed workflow run, and download its artifacts. Builds have not been verified until a workflow run completes successfully.

## Configure AI
Open Settings and choose Groq, OpenAI, or Omniroute.
- Groq and OpenAI need a provider API key. OpenAI API use is billed separately from ChatGPT plans.
- Omniroute uses an OpenAI-compatible base URL, defaulting to `http://127.0.0.1:20128/v1`. On Windows, localhost refers to the same computer. On Android, localhost refers to the phone, not a separate VPS or computer. A remote endpoint must be reachable from the device and configured securely; do not expose an unauthenticated service to the public internet.
- Auto-detect works with APIs that implement the OpenAI-compatible `/models` and `/chat/completions` endpoints; leave Model blank to discover the first listed model, or enter a model ID manually. It cannot automatically make an unrelated proprietary API compatible.
- Do not ship API keys inside the web app, APK, EXE, or public repository. Keys entered in Settings stay in app memory only.

## Memory and privacy
- The last 80 chat messages and editable memory notes are saved in this app's local storage on the device. They are not encrypted; anyone with access to the device or app profile may be able to read them.
- The saved notes are added to the system context when a chat request is sent. Do not put passwords, API keys, private tokens, or sensitive information in notes.
- Use **Clear memory** in Settings to remove the saved notes. Use **Clear session** to reset the visible chat history.
- Chat text and approved tool requests are sent to the selected AI endpoint. Spoken-reply text is sent to Fish Audio when voice output is enabled. Check the selected provider's privacy and usage terms.

## Device actions and permissions
- Android's generated build declares package visibility so JARVIS can discover launchable apps. Google Play distribution requires reviewing the current package-visibility policy.
- Windows launching is restricted to an exact app ID returned from the Windows Start menu list. It does not run arbitrary shell commands.
- Android screen-control features require the user to enable the accessibility service manually. Screen labels used for a requested task may be sent to the selected AI provider. Some protected or unlabeled controls cannot be operated.
- Consequential actions such as sending messages, deleting, purchasing, or posting are reserved for manual review.
- Android calendar events are created only after the app requests calendar permission. Calendar creation is not currently available on Windows.


## JARVIS MCP server (early, read-only version)

JARVIS includes a local Model Context Protocol (MCP) server for MCP clients that can launch a local process over stdio. It currently exposes safe, read-only tools:
- `jarvis_status` — report the bridge status and capabilities
- `jarvis_check_local_ai` — check a local Ollama endpoint and list installed model names
- `jarvis_connection_guide` — explain the connection setup

Run it from the repository folder:

```bash
npm install
npm run mcp:server
```

MCP clients normally launch this process themselves. Configure the client with the absolute path to your Node.js executable and the absolute path to `mcp/server.js` as an argument. The process uses stdio for MCP messages, so do not add ordinary console logging to stdout.

**Client compatibility:** this local stdio server can be used by compatible desktop clients that support launching local MCP processes. ChatGPT's remote MCP connection requires a separately hosted endpoint that is reachable and uses a supported remote transport; this local stdio process alone is not enough. Remote hosting should include authentication and access controls. This starter server does not offer arbitrary shell commands, file modification, or computer/phone control.


## Hosted remote MCP (optional)

The original `npm run mcp:server` command remains the local stdio server for desktop clients.
A separate HTTP entry point is provided for hosted remote MCP:

- `npm run mcp:remote` starts the Streamable-HTTP-style endpoint on `PORT` (default 3000).
- `GET /health` is a non-sensitive health check.
- `POST /mcp` requires `Authorization: Bearer <JARVIS_MCP_TOKEN>`.
- Set `JARVIS_MCP_TOKEN` to a randomly generated secret of at least 32 characters in the hosting provider's secret environment settings. Do not commit it or paste it into public issues.
- `render.yaml` is a deployment blueprint for Render. Create the service from the repository and enter the secret when prompted. Free services may sleep when idle.
- After deployment, test `https://YOUR-SERVICE.onrender.com/health`; the MCP endpoint is `https://YOUR-SERVICE.onrender.com/mcp`.

This is a minimal JSON-response HTTP transport implementation intended for compatibility testing. MCP clients vary in support for bearer-token authentication and protocol versions, so successful deployment does not guarantee that every client can connect. ChatGPT custom MCP connectors are configured on the web, not the mobile app, and require a plan/workspace that supports custom connectors. Claude remote connectors require a publicly reachable HTTPS endpoint. The hosted server only reports status and whether Ollama runs on the hosting server; it cannot inspect Ollama on your phone or PC, and does not control either device.
