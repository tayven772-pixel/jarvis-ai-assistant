# J.A.R.V.I.S. AI Assistant

A standalone J.A.R.V.I.S.-inspired assistant project, separate from Meta Code.

## Features
- Responsive blue holographic dashboard with animated assistant core
- Chat with Groq, OpenAI, or a configurable OpenAI-compatible Omniroute endpoint
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
- Model names depend on the provider or Omniroute configuration.
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
