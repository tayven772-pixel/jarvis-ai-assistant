# J.A.R.V.I.S. AI Assistant

A standalone J.A.R.V.I.S.-inspired assistant project, completely separate from Meta Code and Omniroute.

## Current starter
- Responsive blue holographic dashboard
- Chat-style assistant interface with local demo responses
- Voice input through browser speech recognition where supported
- Configurable AI integration is planned; the prototype does not call an AI API by default
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

## Device permissions
Desktop and Android operating systems restrict what apps can control. Add integrations only through documented APIs and operating-system permissions, with confirmation for consequential actions. This starter does not yet perform phone or computer control.
