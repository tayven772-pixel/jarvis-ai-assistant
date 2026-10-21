# J.A.R.V.I.S. AI Assistant

A standalone J.A.R.V.I.S.-inspired assistant project, completely separate from Meta Code and Omniroute.

## Current starter
- Responsive blue holographic dashboard
- Responsive JARVIS-style chat interface and voice input where supported
- Prompt-based app launching on Android and Windows using a local installed-app list
- Optional Fish Audio text-to-speech with the configured voice reference ID
- Direct Groq or OpenAI API chat-completions connection using a key entered by the user
- The Groq API key is kept in application memory only and is not written to browser storage
- The default model can be changed in Settings; available models depend on Groq's current model catalogue
- Device actions remain disabled until implemented with clear permissions and confirmations

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
``

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

## AI providers and token usage
This project does not depend on Omniroute. The UI can be developed and tested in demo mode without using any AI tokens. When you choose your provider or local model, integrate it through a secure backend or a local provider connection appropriate to that setup. Do not ship secret API keys inside the web app, APK, EXE, or public repository.

## Device actions and privacy
- Android's generated build includes a Capacitor plugin that enumerates launchable app names locally and opens a selected package when the user directly asks JARVIS to launch it. The installed-app list is not sent to the AI provider. This debug build declares the QUERY_ALL_PACKAGES permission; Google Play distribution would require checking current policy and declaring a permitted core use.
- The Windows desktop bridge reads app names and IDs from the Windows Start menu, then launches only an exact ID from that list. It does not run arbitrary shell commands, type into other apps, or capture the screen.
- For spoken replies, enter a Fish Audio API key in Settings. The default voice reference ID is 05b36da8574341d0803391491850db20. Chat model credentials and the Fish Audio key are held in React memory only. Voice reply text is sent to Fish Audio for speech generation; provider usage limits or charges may apply.
- OpenAI API access is separate from the ChatGPT subscription and uses a separate API key. It cannot attach this app to a particular ChatGPT conversation.
- This provides prompt-based app launching, not full Screen MCP-style screenshot/click/type control. A full desktop-control bridge is a separate integration and should use explicit permissions and a local companion service.
