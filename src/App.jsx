import { useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import {
  Activity, AudioLines, Bot, Check, ChevronDown, Command, Cpu, Headphones,
  MessageSquare, Mic, MicOff, Monitor, Moon, Power, Send, Settings2,
  ShieldCheck, Sparkles, Wifi, Zap
} from 'lucide-react';

const AppControl = registerPlugin('AppControl');
const DEFAULT_FISH_VOICE_ID = '05b36da8574341d0803391491850db20';
const FISH_AUDIO_MODEL = 's2.1-pro-free';

const initialMessages = [
  { role: 'assistant', text: 'Good evening. J.A.R.V.I.S. interface is online. I’m ready when you are.', time: 'NOW' },
];

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const OPENAI_DEFAULT_MODEL = 'gpt-5.4-mini';

const APP_CATALOG = [
  { id: 'chrome', label: 'Chrome', packageName: 'com.android.chrome', webUrl: 'https://www.google.com/chrome/' },
  { id: 'youtube', label: 'YouTube', packageName: 'com.google.android.youtube', webUrl: 'https://www.youtube.com/' },
  { id: 'maps', label: 'Maps', packageName: 'com.google.android.apps.maps', webUrl: 'https://maps.google.com/' },
  { id: 'gmail', label: 'Gmail', packageName: 'com.google.android.gm', webUrl: 'https://mail.google.com/' },
  { id: 'messages', label: 'Messages', packageName: 'com.google.android.apps.messaging', webUrl: 'https://messages.google.com/web/' },
  { id: 'phone', label: 'Phone', packageName: 'com.google.android.dialer', webUrl: null },
  { id: 'calendar', label: 'Calendar', packageName: 'com.google.android.calendar', webUrl: 'https://calendar.google.com/' },
  { id: 'spotify', label: 'Spotify', packageName: 'com.spotify.music', webUrl: 'https://open.spotify.com/' },
  { id: 'whatsapp', label: 'WhatsApp', packageName: 'com.whatsapp', webUrl: 'https://web.whatsapp.com/' },
  { id: 'settings', label: 'Settings', packageName: 'com.android.settings', webUrl: null },
  { id: 'play_store', label: 'Play Store', packageName: 'com.android.vending', webUrl: 'https://play.google.com/store' },
];

const WEB_DESTINATIONS = {
  google: { label: 'Google', url: 'https://www.google.com/' },
  youtube: { label: 'YouTube', url: 'https://www.youtube.com/' },
  maps: { label: 'Google Maps', url: 'https://maps.google.com/' },
  gmail: { label: 'Gmail', url: 'https://mail.google.com/' },
  github: { label: 'GitHub', url: 'https://github.com/' },
  stackoverflow: { label: 'Stack Overflow', url: 'https://stackoverflow.com/' },
  openai_platform: { label: 'OpenAI Platform', url: 'https://platform.openai.com/' },
  groq_console: { label: 'Groq Console', url: 'https://console.groq.com/' },
};

const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'open_app',
      description: 'Launch an installed app by its visible name, only when the user clearly asks to open or launch it. JARVIS resolves the name locally against installed apps.',
      parameters: {
        type: 'object',
        properties: { app_name: { type: 'string', minLength: 1, maxLength: 120, description: 'The visible app name, such as Calculator, Discord, or Chrome.' } },
        required: ['app_name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_website',
      description: 'Open one of the pre-approved website destinations only when the user asks to open or visit it.',
      parameters: {
        type: 'object',
        properties: { site: { type: 'string', enum: Object.keys(WEB_DESTINATIONS) } },
        required: ['site'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Open a Google search for a query only when the user explicitly asks to search or look something up online. This opens a browser page; it does not read the results.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', minLength: 1, maxLength: 240 } },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'copy_text',
      description: 'Copy text to the local clipboard only when the user explicitly asks to copy it.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', minLength: 1, maxLength: 12000 } },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create an event directly in the Android calendar when the user asks to add, schedule, or remind them about something. For a date without a time, create an all-day event. Default reminder is 900 minutes before the event (9 AM the previous day for an all-day event); ask a follow-up if the date or title is unclear. Android will request calendar permission if needed.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 180 },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}
      description: 'Read visible accessibility labels and controls on the current Android screen only when the user asks what is on screen, asks JARVIS to inspect/read the screen, or requests a task that requires looking at the current screen.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tap_text',
      description: 'Tap a visible Android control by its exact on-screen text or accessibility label, only when the user explicitly asks to tap, click, press, or select that control. Never use for Send, Submit, Delete, Buy, Pay, Confirm, or other consequential controls; ask the user to confirm instead.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', minLength: 1, maxLength: 180 } },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Enter user-requested text into the currently focused non-password Android text field, only when the user explicitly asks JARVIS to type or enter text. Never infer credentials or secrets.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', maxLength: 2000 } },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scroll_screen',
      description: 'Scroll the current Android screen up, down, left, or right only when the user explicitly asks to scroll.',
      parameters: {
        type: 'object',
        properties: { direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] } },
        required: ['direction'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigation_action',
      description: 'Perform Android Back, Home, or Recents navigation only when the user explicitly asks for that navigation action.',
      parameters: {
        type: 'object',
        properties: { action: { type: 'string', enum: ['back', 'home', 'recents'] } },
        required: ['action'],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = [
  'You are J.A.R.V.I.S., a helpful personal AI assistant. Be clear, capable, and concise.',
  'You can use the app-launch tool to open installed apps by their visible name. JARVIS resolves the requested app locally; it does not send the full installed-app list to the AI provider.',
  'On Android, you can create calendar events directly using the calendar tool. For requests like reminders, choose a clear title and date; if no time is given, make an all-day event with a 900-minute reminder by default. Ask the user when an important detail is unclear. Android may ask for calendar permission, and you must report the actual tool result without claiming an event or notification exists unless confirmed.',
  'Call action tools only when the user clearly and directly asks for that action. Never claim an action succeeded until the app tool result says it succeeded.',
  'On Android, if JARVIS Screen Control is explicitly enabled by the user in Android Accessibility settings, you can inspect visible accessibility labels, tap a labelled control, type into a focused non-password field, scroll, and use Back/Home/Recents. Screen labels read by a requested screen action are sent to the selected AI provider to reason about the task; password fields are excluded. Some unlabeled or protected UI cannot be controlled.',
  'Never tap Send, Submit, Delete, Buy, Pay, Confirm, or other consequential controls; ask the user to perform or explicitly confirm that final step themselves. Never access passwords, one-time codes, or payment details. Do not claim a screen action worked unless its tool result says it succeeded.',
  'For coding and terminal requests, write the command with its intended operating system, explain what it does, and flag risky/destructive effects. Draft commands for the user to review; never attempt to execute them.',
  'Android can launch visible installed apps. Windows can launch apps listed in the Start menu. Browser mode can only open known website fallbacks.',
].join(' ');

function normalizeAppName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^(the|my)\s+/, '')
    .replace(/[^a-z0-9]+/g, '');
}

async function discoverInstalledApps() {
  if (typeof window !== 'undefined' && window.jarvisDesktop?.listApps) {
    const result = await window.jarvisDesktop.listApps();
    return Array.isArray(result) ? result : [];
  }

  if (Capacitor.getPlatform() === 'android') {
    const result = await AppControl.listLaunchableApps();
    return Array.isArray(result?.apps) ? result.apps : [];
  }

  return APP_CATALOG.map(item => ({
    name: item.label,
    packageName: item.packageName,
    id: item.id,
    webUrl: item.webUrl,
    platform: 'web',
  }));
}

function findInstalledApp(requestedName, apps) {
  const needle = normalizeAppName(requestedName);
  if (!needle) return { app: null, ambiguous: [] };
  const semanticName = name => normalizeAppName(name)
    .replace(/^(google|microsoft|mozilla|meta|samsung|the)/, '');

  const scored = (apps || []).map(item => {
    const label = item.name || item.label || '';
    const normalized = normalizeAppName(label);
    const semantic = semanticName(label);
    let score = 0;
    if (normalized === needle) score = 100;
    else if (semantic === needle) score = 95;
    else if (normalized.startsWith(needle)) score = 70;
    else if (semantic.startsWith(needle)) score = 68;
    else if (normalized.includes(needle) && needle.length >= 3) score = 55;
    else if (needle.includes(normalized) && normalized.length >= 4) score = 50;
    return { item, score };
  }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return { app: null, ambiguous: [] };
  const bestScore = scored[0].score;
  const best = scored.filter(entry => entry.score === bestScore).map(entry => entry.item);
  if (best.length === 1) return { app: best[0], ambiguous: [] };
  return { app: null, ambiguous: best.slice(0, 5).map(item => item.name || item.label) };
}

async function openExternalUrl(url) {
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/|$)/i.test(url)) {
    return { success: false, message: 'That destination is not an approved HTTPS link.' };
  }

  if (typeof window !== 'undefined' && window.jarvisDesktop?.openExternal) {
    const result = await window.jarvisDesktop.openExternal(url);
    return result?.success
      ? result
      : { success: false, message: result?.message || 'Windows could not open that link.' };
  }

  if (Capacitor.getPlatform() === 'android') {
    const result = await AppLauncher.openUrl({ url });
    return result.completed
      ? { success: true, message: 'Opened ' + url + '.' }
      : { success: false, message: 'Android could not open that link.' };
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return opened
    ? { success: true, message: 'Requested the browser to open ' + url + '.' }
    : { success: false, message: 'The browser blocked this new tab. Open the link manually: ' + url };
}

async function launchInstalledApp(requestedName, installedApps) {
  const cleanName = String(requestedName || '').trim().slice(0, 120);
  if (!cleanName) return { success: false, message: 'Tell me the name of the app you want to open.' };

  const match = findInstalledApp(cleanName, installedApps);
  const target = match.app;
  if (!target) {
    if (match.ambiguous.length) {
      return { success: false, message: 'I found more than one matching app (' + match.ambiguous.join(', ') + '). Please use the full app name so I open the right one.' };
    }
    const known = APP_CATALOG.find(item =>
      normalizeAppName(item.label) === normalizeAppName(cleanName) ||
      normalizeAppName(item.id) === normalizeAppName(cleanName)
    );
    if (known?.webUrl) {
      const fallback = await openExternalUrl(known.webUrl);
      if (fallback.success) {
        return { success: true, message: 'I could not find an installed ' + known.label + ' app, so I opened its website instead.' };
      }
      return fallback;
    }
    return {
      success: false,
      message: 'I could not find an installed app named "' + cleanName + '". Try its name as it appears in your app drawer or Windows Start menu.',
    };
  }

  if (typeof window !== 'undefined' && window.jarvisDesktop?.launchApp) {
    const result = await window.jarvisDesktop.launchApp(target.appId);
    return result?.success
      ? { success: true, message: result.message || 'Asked Windows to open ' + target.name + '.' }
      : { success: false, message: result?.message || 'Windows could not launch ' + target.name + '.' };
  }

  if (Capacitor.getPlatform() === 'android') {
    if (!target.packageName) {
      return { success: false, message: 'Android did not provide a package identifier for ' + target.name + '.' };
    }
    const result = await AppControl.launchApp({ packageName: target.packageName });
    return result?.success
      ? { success: true, message: 'Launching ' + (result.name || target.name) + ' on your phone.' }
      : { success: false, message: 'Android could not launch ' + target.name + '.' };
  }

  const known = APP_CATALOG.find(item =>
    normalizeAppName(item.label) === normalizeAppName(target.name || '') ||
    normalizeAppName(item.id) === normalizeAppName(target.id || '')
  );
  if (known?.webUrl) return openExternalUrl(known.webUrl);
  return {
    success: false,
    message: 'This browser preview cannot launch installed apps. Install the Android APK or Windows app to use device launch.',
  };
}

async function runAssistantTool(toolCall, userRequest, installedApps) {
  let args;
  try {
    args = JSON.parse(toolCall.function?.arguments || '{}');
  } catch {
    return { success: false, message: 'The AI returned invalid action arguments, so nothing was done.' };
  }

  const asksToOpen = /\b(open|launch|start|switch to|bring up|take me to|go to|visit)\b/i.test(userRequest)
    && !/\b(don't|do not|never|shouldn't|should not|without)\b.{0,50}\b(open|launch|start)\b/i.test(userRequest);
  const asksToSearch = /\b(search|look up|find online|google)\b/i.test(userRequest)
    && !/\b(don't|do not|never|shouldn't|should not|without)\b.{0,50}\b(search|look up|google)\b/i.test(userRequest);
  const asksToCopy = /\b(copy|clipboard)\b/i.test(userRequest)
    && !/\b(don't|do not|never|shouldn't|should not|without)\b.{0,50}\b(copy)\b/i.test(userRequest);

  switch (toolCall.function?.name) {
    case 'open_app':
      if (!asksToOpen) return { success: false, message: 'Not executed: the user did not clearly ask to open an app.' };
      return await launchInstalledApp(args.app_name, installedApps);
    case 'open_website': {
      if (!asksToOpen) return { success: false, message: 'Not executed: the user did not clearly ask to open a website.' };
      const destination = WEB_DESTINATIONS[args.site];
      if (!destination) return { success: false, message: 'That website is not on the approved destination list.' };
      return await openExternalUrl(destination.url);
    }
    case 'search_web': {
      if (!asksToSearch) return { success: false, message: 'Not executed: the user did not clearly ask to search online.' };
      const query = String(args.query || '').trim().slice(0, 240);
      if (!query) return { success: false, message: 'The search query was empty.' };
      const url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      return await openExternalUrl(url);
    }
    case 'create_calendar_event': {
      if (!/\\b(create|add|schedule|set up|remind|reminder|calendar|event)\\b/i.test(userRequest)) {
        return { success: false, message: 'Not executed: ask JARVIS to create or schedule a calendar event or reminder.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Direct calendar creation is currently available in the Android app only.' };
      const title = String(args.title || '').trim().slice(0, 180);
      const date = String(args.date || '');
      const time = String(args.time || '');
      const allDay = Boolean(args.all_day) || !time;
      const reminderMinutes = Number.isInteger(args.reminder_minutes) ? args.reminder_minutes : 900;
      if (!title || !/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return { success: false, message: 'The event needs a clear title and date. Ask the user for missing details instead of guessing.' };
      return await AppControl.createCalendarEvent({ title, date, time, allDay, reminderMinutes });
    }
    case 'inspect_screen': {
      if (!/\\b(inspect|read|look at|what is on|what's on|see|check|tap|click|press|select|type|enter|scroll|swipe)\\b/i.test(userRequest)) {
        return { success: false, message: 'Not executed: the user did not clearly ask JARVIS to inspect the screen.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen inspection is currently available in the Android app only.' };
      const result = await AppControl.inspectScreen();
      return { success: true, screen: result, message: result.message + ' Visible labels will be sent to the selected AI provider for this requested task.' };
    }
    case 'tap_text': {
      if (!/\\b(tap|click|press|select)\\b/i.test(userRequest)) return { success: false, message: 'Not executed: explicitly ask JARVIS to tap, click, press, or select a control.' };
      if (/\\b(send|submit|delete|remove|buy|purchase|pay|confirm|transfer|post|publish|place order|call|dial)\\b/i.test(args.text || '')) {
        return { success: false, message: 'Safety pause: I will not activate a consequential control automatically. Please review the screen and perform that final action yourself.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen tapping is currently available in the Android app only.' };
      return await AppControl.tapText({ text: String(args.text || '').slice(0, 180) });
    }
    case 'type_text': {
      if (!/\\b(type|enter|write|fill in|put)\\b/i.test(userRequest)) return { success: false, message: 'Not executed: the user did not clearly ask JARVIS to type text.' };
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen typing is currently available in the Android app only.' };
      return await AppControl.typeText({ text: String(args.text || '').slice(0, 2000) });
    }
    case 'scroll_screen': {
      if (!/\\b(scroll|swipe)\\b/i.test(userRequest)) return { success: false, message: 'Not executed: the user did not clearly ask JARVIS to scroll.' };
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen scrolling is currently available in the Android app only.' };
      return await AppControl.scrollScreen({ direction: args.direction });
    }
    case 'navigation_action': {
      const action = String(args.action || '');
      if (!(action === 'back' && /\\b(go back|press back|back button)\\b/i.test(userRequest))
          && !(action === 'home' && /\\b(go home|home screen|press home)\\b/i.test(userRequest))
          && !(action === 'recents' && /\\b(recent apps|open recents|show recents)\\b/i.test(userRequest))) {
        return { success: false, message: 'Not executed: ask explicitly for Back, Home, or Recents.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Android navigation is available in the Android app only.' };
      return await AppControl.navigationAction({ action });
    }
    case 'copy_text': {
      if (!asksToCopy) return { success: false, message: 'Not executed: the user did not clearly ask to copy text.' };
      const text = String(args.text || '').slice(0, 12000);
      if (!text) return { success: false, message: 'There was no text to copy.' };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
        await navigator.clipboard.writeText(text);
        return { success: true, message: 'Copied the requested text to the clipboard.' };
      } catch (error) {
        return { success: false, message: 'I could not access the clipboard. You can select and copy the text manually.' };
      }
    }
    default:
      return { success: false, message: 'That action is not supported by JARVIS.' };
  }
}

function Orb({ listening }) {
  return <div className={`orb-wrap ${listening ? 'orb-listening' : ''}`} aria-label="Assistant status visualization">
    <div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-ring ring-three" />
    <div className="orb-core"><div className="core-glint" /><div className="core-line" /></div>
    <div className="orb-scan" />
  </div>;
}

export default function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState('groq');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const apiKey = provider === 'openai' ? openAiApiKey : groqApiKey;
  const setApiKey = provider === 'openai' ? setOpenAiApiKey : setGroqApiKey;
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [fishApiKey, setFishApiKey] = useState('');
  const [voiceModelId, setVoiceModelId] = useState(DEFAULT_FISH_VOICE_ID);
  const [speakResponses, setSpeakResponses] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('FISH AUDIO KEY REQUIRED');
  const [installedApps, setInstalledApps] = useState([]);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [actionInProgress, setActionInProgress] = useState('');
  const isAndroidApp = Capacitor.getPlatform() === 'android';
  const isDesktopApp = typeof window !== 'undefined' && Boolean(window.jarvisDesktop);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [showConnectHint, setShowConnectHint] = useState(false);
  const [status, setStatus] = useState('API KEY REQUIRED');
  const [time, setTime] = useState(new Date());
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let active = true;
    const refresh = () => AppControl.accessibilityStatus()
      .then(result => { if (active) setAccessibilityEnabled(Boolean(result?.enabled)); })
      .catch(() => { if (active) setAccessibilityEnabled(false); });
    refresh();
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { active = false; document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  useEffect(() => {
    let active = true;
    discoverInstalledApps()
      .then(apps => { if (active) setInstalledApps(apps); })
      .catch(() => { if (active) setInstalledApps(APP_CATALOG.map(item => ({ name: item.label, packageName: item.packageName, id: item.id, webUrl: item.webUrl, platform: 'web' }))); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);


  const speakText = async (text) => {
    if (!fishApiKey.trim()) throw new Error('Add a Fish Audio API key in Settings to enable this voice.');
    const cleanText = String(text || '').trim().slice(0, 3500);
    if (!cleanText) throw new Error('There is no text to speak.');

    setVoiceStatus('GENERATING SPEECH');
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + fishApiKey.trim(),
        'Content-Type': 'application/json',
        'model': FISH_AUDIO_MODEL,
      },
      body: JSON.stringify({
        text: cleanText,
        reference_id: voiceModelId.trim() || DEFAULT_FISH_VOICE_ID,
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const detailText = await response.text().catch(() => '');
      let detail = detailText;
      try {
        const parsed = JSON.parse(detailText);
        detail = parsed?.message || parsed?.error?.message || detailText;
      } catch {}
      throw new Error(detail ? 'Fish Audio returned HTTP ' + response.status + ': ' + String(detail).slice(0, 220) : 'Fish Audio returned HTTP ' + response.status + '.');
    }

    const audioBlob = await response.blob();
    if (!audioBlob.size) throw new Error('Fish Audio returned an empty audio file.');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(objectUrl);
    audioUrlRef.current = objectUrl;
    audioRef.current = audio;
    audio.onended = () => {
      if (audioRef.current === audio) setVoiceStatus('VOICE READY');
      URL.revokeObjectURL(objectUrl);
      if (audioUrlRef.current === objectUrl) audioUrlRef.current = null;
    };
    audio.onerror = () => {
      if (audioRef.current === audio) setVoiceStatus('AUDIO PLAYBACK ERROR');
      URL.revokeObjectURL(objectUrl);
      if (audioUrlRef.current === objectUrl) audioUrlRef.current = null;
    };
    await audio.play();
    setVoiceStatus('SPEAKING');
  };

  const testVoice = async () => {
    try {
      await speakText('Hello. JARVIS voice system is online. How can I help you today?');
    } catch (error) {
      setVoiceStatus('VOICE ERROR');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I could not play the Fish Audio voice: ' + (error?.message || 'Unknown error') + '. Check your Fish Audio key, voice ID, network connection, and account usage.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  const speakResponse = text => {
    if (!speakResponses || !fishApiKey.trim()) return;
    void speakText(text).catch(error => {
      setVoiceStatus('VOICE ERROR');
      console.error('Fish Audio speech failed:', error?.message || error);
    });
  };

  const sendMessage = async (text = input) => {
    const clean = text.trim();
    if (!clean || sending) return;
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const conversation = [...messages, { role: 'user', text: clean, time: stamp }];
    setMessages(conversation);
    setInput('');

    if (!apiKey.trim()) {
      const providerName = provider === 'openai' ? 'OpenAI API' : 'Groq';
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Your ' + providerName + ' API key is not connected. Open Settings to add it. Keys stay in app memory only and are cleared when JARVIS closes or reloads.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('API KEY REQUIRED');
      return;
    }

    setSending(true);
    const providerName = provider === 'openai' ? 'OPENAI' : 'GROQ';
    const endpoint = provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';
    const selectedModel = model.trim() || (provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL);

    const requestCompletion = async (apiMessages, allowTools) => {
      const body = {
        model: selectedModel,
        messages: apiMessages,
        max_completion_tokens: 1200,
      };
      if (provider === 'groq') body.temperature = 0.7;
      if (allowTools) {
        body.tools = AI_TOOLS;
        body.tool_choice = 'auto';
      } else {
        body.tool_choice = 'none';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey.trim(),
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.error?.message || (response.status === 401
          ? providerName + ' rejected the API key. Check that you copied it correctly.'
          : response.status === 429
            ? providerName + ' rate limit or usage limit reached. Wait and try again.'
            : providerName + ' returned HTTP ' + response.status + '.');
        throw new Error(detail);
      }
      return data;
    };

    try {
      setStatus('CONTACTING ' + providerName);
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversation
          .filter(message => message.role === 'user' || message.role === 'assistant')
          .filter((message, index) => !(index === 0 && message.role === 'assistant'))
          .map(message => ({ role: message.role, content: message.text })),
      ];

      const firstData = await requestCompletion(apiMessages, true);
      const firstMessage = firstData?.choices?.[0]?.message;
      if (!firstMessage) throw new Error(providerName + ' returned an empty response.');

      let answer = firstMessage.content?.trim() || '';
      let currentMessage = firstMessage;
      let toolCalls = Array.isArray(currentMessage.tool_calls) ? currentMessage.tool_calls : [];
      let actionCount = 0;
      const toolResults = [];

      for (let round = 0; round < 5 && toolCalls.length > 0; round += 1) {
        setStatus(round === 0 ? 'RUNNING APPROVED ACTIONS' : 'CONTINUING SCREEN TASK');
        apiMessages.push(currentMessage);

        // Run one action per model round, then let the model observe its result
        // before it chooses the next step. This prevents blind multi-tap chains.
        const chosenCall = toolCalls[0];
        let result;
        if (actionCount >= 5) {
          result = { success: false, message: 'JARVIS stopped after five actions for this request. Review the current screen before continuing.' };
        } else {
          try {
            result = await runAssistantTool(chosenCall, clean, installedApps);
          } catch (error) {
            result = { success: false, message: 'Action failed: ' + (error?.message || 'Unknown error') };
          }
          actionCount += 1;
        }
        toolResults.push(result);
        apiMessages.push({
          role: 'tool',
          tool_call_id: chosenCall.id,
          content: JSON.stringify(result),
        });

        for (const deferredCall of toolCalls.slice(1)) {
          const deferred = { success: false, message: 'Only one action is executed per step. Review the last action result and request the next safe action separately.' };
          toolResults.push(deferred);
          apiMessages.push({
            role: 'tool',
            tool_call_id: deferredCall.id,
            content: JSON.stringify(deferred),
          });
        }

        if (actionCount >= 5) {
          answer = toolResults.map(item => item.message).filter(Boolean).join('\n');
          break;
        }
        setStatus('CHECKING ACTION RESULT');
        const nextData = await requestCompletion(apiMessages, true);
        currentMessage = nextData?.choices?.[0]?.message;
        if (!currentMessage) throw new Error(providerName + ' returned an empty response.');
        answer = currentMessage.content?.trim() || '';
        toolCalls = Array.isArray(currentMessage.tool_calls) ? currentMessage.tool_calls : [];
        if (toolCalls.length === 0) break;
      }

      if (toolCalls.length > 0 && actionCount >= 5) {
        answer = (answer ? answer + '\n\n' : '') + 'I stopped after five actions to keep control bounded. Check the current screen before continuing.';
      }
      if (actionCount > 0) {
        setStatus(toolResults.some(result => result.success) ? 'ACTION COMPLETE' : 'ACTION NOT COMPLETED');
        if (!answer) answer = toolResults.map(result => result.message).filter(Boolean).join('\n');
      } else {
        setStatus(providerName + ' CONNECTED');
      }

      if (!answer) throw new Error(providerName + ' returned an empty response. Try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      speakResponse(answer);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I could not reach ' + providerName + ': ' + (error?.message || 'Unknown network error') + '. Check your internet connection, API key, model name, and API account limits, then try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('CONNECTION ERROR');
    } finally {
      setSending(false);
    }
  };

  const openAccessibilitySettings = async () => {
    try {
      await AppControl.openAccessibilitySettings();
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Android Accessibility settings opened. Find JARVIS Screen Control and enable it only if you want JARVIS to inspect and operate labelled controls on your phone. Return to JARVIS afterward.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Could not open Accessibility settings: ' + (error?.message || 'Unknown error') + '. Open Android Settings > Accessibility manually.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  const launchFromShortcut = async appId => {
    if (actionInProgress) return;
    setActionInProgress(appId);
    try {
      const shortcut = APP_CATALOG.find(item => item.id === appId);
      const result = await launchInstalledApp(shortcut?.label || appId, installedApps);
      setStatus(result.success ? 'DEVICE ACTION COMPLETE' : 'DEVICE ACTION UNAVAILABLE');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: result.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setStatus('DEVICE ACTION UNAVAILABLE');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Could not open that app: ' + (error?.message || 'Unknown error') + '.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setActionInProgress('');
    }
  };

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Voice input is not supported in this browser. Try a recent version of Chrome or Edge.', time: 'NOW' }]);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-CA';
    recognition.interimResults = false;
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const saveSettings = () => {
    setStatus(apiKey.trim() ? (provider === 'openai' ? 'OPENAI API KEY READY' : 'GROQ KEY READY') : 'API KEY REQUIRED');
    setShowConnectHint(true);
    setSettingsOpen(false);
  };

  return <main className="app-shell">
    <div className="ambient ambient-a" /><div className="ambient ambient-b" />
    <header className="topbar">
      <a className="brand" href="#" aria-label="JARVIS home"><div className="brand-mark"><AudioLines size={21} /></div><div><strong>J.A.R.V.I.S.</strong><span>PERSONAL INTELLIGENCE</span></div></a>
      <div className="top-status"><span className="status-dot" /> ALL SYSTEMS STANDBY <span className="status-divider" /> {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings2 size={19} /></button>
    </header>

    <section className="hero-grid">
      <aside className="side-panel left-panel">
        <div className="eyebrow"><span className="eyebrow-line" /> SYSTEM OVERVIEW</div>
        <div className="metric"><div className="metric-icon"><Cpu size={17} /></div><div><span>CORE STATUS</span><strong>STANDBY</strong></div><span className="tiny-led" /></div>
        <div className="metric"><div className="metric-icon"><Wifi size={17} /></div><div><span>NETWORK</span><strong>LOCAL INTERFACE</strong></div><span className="tiny-led" /></div>
        <div className="metric"><div className="metric-icon"><ShieldCheck size={17} /></div><div><span>PERMISSIONS</span><strong>LOCKED BY DEFAULT</strong></div><span className="tiny-led muted" /></div>
        <div className="panel-rule" />
        <div className="eyebrow"><span className="eyebrow-line" /> QUICK COMMANDS</div>
        <button className="quick-command" onClick={() => sendMessage('Give me a system status summary')}><Activity size={16} /><span>System status</span><span className="command-arrow">↗</span></button>
        <button className="quick-command" onClick={() => sendMessage('Help me plan a coding project')}><Command size={16} /><span>Project assistant</span><span className="command-arrow">↗</span></button>
        <button className="quick-command" onClick={() => sendMessage('Explain the available voice features')}><Headphones size={16} /><span>Voice interface</span><span className="command-arrow">↗</span></button>
        <div className="side-foot"><span className="pulse-small" /> SECURE SESSION <span>·</span> LOCAL UI</div>
      </aside>

      <section className="center-stage">
        <div className="stage-topline"><span>FIG. 01 / ASSISTANT CORE</span><span>HOLOGRAPHIC INTERFACE <span className="blue">●</span></span></div>
        <Orb listening={listening} />
        <div className="core-label"><span className="core-label-line" /><span>J.A.R.V.I.S.</span><span className="core-label-line" /></div>
        <p className="core-subtitle">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
        <div className="core-state"><span className="status-dot" /> {listening ? 'LISTENING FOR INPUT' : status}</div>
        <div className="waveform" aria-hidden="true">{Array.from({ length: 49 }, (_, i) => <i key={i} style={{ '--h': `${8 + Math.abs(Math.sin(i * 0.73) * Math.cos(i * 0.21)) * (listening ? 42 : 22)}px`, '--delay': `${i * -0.045}s` }} />)}</div>
        <div className="stage-bottom"><span>VOICE RECOGNITION {listening ? 'ACTIVE' : 'AVAILABLE'}</span><span>AI LINK <b>{apiKey ? 'KEY READY' : 'NOT CONNECTED'}</b></span></div>
      </section>

      <aside className="side-panel right-panel">
        <div className="eyebrow"><span className="eyebrow-line" /> INTERFACE TELEMETRY</div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>PROCESSING LOAD</span><span>--</span></div><div className="bar-track"><span style={{ width: '18%' }} /></div><div className="telemetry-foot"><span>UI SAMPLE</span><span>NOT DEVICE DATA</span></div></div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>AI CONNECTIVITY</span><span className={apiKey ? '' : 'amber'}>{apiKey ? 'KEY READY' : 'OFFLINE'}</span></div><div className="connect-visual"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="telemetry-foot"><span>PROVIDER</span><span>{apiKey ? provider.toUpperCase() : 'UNCONFIGURED'}</span></div></div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>DEVICE BRIDGE</span><span>{isAndroidApp ? 'READY' : 'WEB MODE'}</span></div><div className="bridge-lock"><ShieldCheck size={18} /><span>{isAndroidApp ? 'ALLOWLISTED APP LAUNCH' : 'WEB LINKS ONLY'}</span></div><div className="telemetry-foot"><span>MODE</span><span>{isAndroidApp ? 'ANDROID' : 'BROWSER / DESKTOP'}</span></div></div>
        <button className="connect-button" onClick={() => setSettingsOpen(true)}><Zap size={16} /> CONFIGURE AI LINK <span>↗</span></button>
        <div className="right-note"><Sparkles size={14} /><span>Android can launch the supported apps below. Browser and Windows modes open web destinations instead.</span></div>
      </aside>
    </section>

    <section className="device-actions">
      <div className="device-actions-head">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> DEVICE ACTIONS</div>
          <p>{isAndroidApp ? 'Ask JARVIS to open any launchable app by name. The installed-app list stays on your phone and is not sent to the AI provider.' : isDesktopApp ? 'Ask JARVIS to open an app by name. Windows launching is limited to Start menu apps; JARVIS will not run arbitrary shell commands.' : 'Install the Android APK or Windows app for prompt-based launch of installed apps.'}</p>
        </div>
        <div className="device-mode">{isAndroidApp ? (accessibilityEnabled ? 'SCREEN CONTROL ENABLED' : 'APP LAUNCH READY') : isDesktopApp ? 'WINDOWS APP CONTROL' : 'WEB LINKS ONLY'}{installedApps.length ? ' · ' + installedApps.length + ' APPS' : ''}</div>
      </div>
      {isAndroidApp && <div className="screen-control-row">
        <div className="screen-control-copy">
          <strong>{accessibilityEnabled ? 'SCREEN CONTROL CONNECTED' : 'ENABLE FULLER PHONE CONTROL'}</strong>
          <span>{accessibilityEnabled ? 'JARVIS can read labelled controls and tap, type, scroll, and navigate when you explicitly ask.' : 'Android requires you to enable this optional accessibility service yourself. Screen labels requested for a task are sent to your selected AI provider.'}</span>
        </div>
        <button className="primary-button" onClick={openAccessibilitySettings}>{accessibilityEnabled ? 'Accessibility settings' : 'Enable screen control'} ↗</button>
      </div>}
      <div className="app-shortcuts">
        {APP_CATALOG.map(app => <button className="app-shortcut" type="button" key={app.id} disabled={Boolean(actionInProgress)} onClick={() => launchFromShortcut(app.id)}>
          <span className="app-shortcut-mark">{app.label.slice(0, 1)}</span>
          <span className="app-shortcut-label">{actionInProgress === app.id ? 'OPENING ' + app.label.toUpperCase() : app.label}</span>
          <span className="app-shortcut-arrow">↗</span>
        </button>)}
      </div>
    </section>

    <section className="assistant-console">
      <div className="console-header"><div className="console-title"><MessageSquare size={16} /><span>ASSISTANT CONSOLE</span><span className="console-count">{messages.length.toString().padStart(2, '0')} MESSAGES</span></div><button className="clear-button" onClick={() => setMessages(initialMessages)}>CLEAR SESSION <span>↻</span></button></div>
      <div className="messages">
        {messages.map((message, i) => <div className={`message-row ${message.role}`} key={i}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={17} /> : <span>YOU</span>}</div><div className="message-content"><div className="message-meta"><strong>{message.role === 'assistant' ? 'J.A.R.V.I.S.' : 'OPERATOR'}</strong><span>{message.time}</span></div><p>{message.text}</p></div></div>)}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
        <button className={`mic-button ${listening ? 'active' : ''}`} type="button" onClick={toggleVoice} aria-label={listening ? 'Stop voice input' : 'Start voice input'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={sending ? 'J.A.R.V.I.S. is thinking...' : 'Ask J.A.R.V.I.S. anything...'} aria-label="Message the assistant" disabled={sending} />
        <span className="input-hint">ENTER ↵</span>
        <button className="send-button" type="submit" aria-label="Send message" disabled={sending}><Send size={17} /></button>
      </form>
      <div className="console-disclaimer"><ShieldCheck size={13} /> {provider.toUpperCase()} AI · USER-ENABLED ANDROID SCREEN CONTROL · CONSEQUENTIAL ACTIONS REQUIRE MANUAL REVIEW</div>
    </section>

    <footer className="footer"><span>J.A.R.V.I.S. INTERFACE <b>v0.1.0</b></span><span>BUILT FOR HUMAN-APPROVED ASSISTANCE</span><span><span className="status-dot" /> SYSTEM READY</span></footer>

    {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head"><div><span className="eyebrow">CONNECTION CONTROL</span><h2 id="settings-title">Configure AI link</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></div>
        <p className="modal-copy">Choose Groq or OpenAI for chat. You can also connect Fish Audio for JARVIS speech. Keys stay in memory only and are cleared when JARVIS closes or reloads. OpenAI API is separate from your ChatGPT plan.</p>
        <label>AI PROVIDER <select value={provider} onChange={e => { const nextProvider = e.target.value; setProvider(nextProvider); setModel(nextProvider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL); setShowConnectHint(false); }}><option value="groq">Groq API</option><option value="openai">OpenAI API</option></select></label>
        <label>{provider === 'openai' ? 'OPENAI API KEY' : 'GROQ API KEY'} <input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={provider === 'openai' ? 'Paste your OpenAI Platform API key' : 'Paste your Groq API key'} /></label>
        <p className="provider-help"><a href={provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.groq.com/keys'} target="_blank" rel="noreferrer">Get {provider === 'openai' ? 'an OpenAI API key' : 'a Groq API key'} ↗</a>{provider === 'openai' ? ' API use is billed separately from ChatGPT plans.' : ' Check your provider usage limits.'}</p>
        <label>MODEL <input value={model} onChange={e => setModel(e.target.value)} placeholder={provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL} /></label>
        <div className="security-note"><ShieldCheck size={18} /><span><strong>Memory-only credential.</strong> Chat and approved tools go directly to the selected AI API over HTTPS. Never commit keys to GitHub. Anyone inspecting a running app may still be able to access its key.</span></div>
        <div className="voice-settings">
          <div className="eyebrow"><span className="eyebrow-line" /> VOICE OUTPUT</div>
          <label>FISH AUDIO API KEY <input type="password" autoComplete="off" value={fishApiKey} onChange={e => setFishApiKey(e.target.value)} placeholder="Paste your Fish Audio API key" /></label>
          <p className="provider-help"><a href="https://fish.audio/developers/" target="_blank" rel="noreferrer">Fish Audio developer portal ↗</a> Text from JARVIS replies is sent to Fish Audio to create speech.</p>
          <label>FISH AUDIO VOICE ID <input value={voiceModelId} onChange={e => setVoiceModelId(e.target.value)} placeholder={DEFAULT_FISH_VOICE_ID} /></label>
          <label className="voice-toggle"><input type="checkbox" checked={speakResponses} onChange={e => setSpeakResponses(e.target.checked)} /> Speak JARVIS responses aloud automatically</label>
          <div className="voice-actions"><span>STATUS: {voiceStatus}</span><button className="secondary-button" disabled={!fishApiKey.trim()} onClick={testVoice}>Test voice</button><button className="secondary-button" onClick={() => { setFishApiKey(''); setVoiceStatus('FISH AUDIO KEY REQUIRED'); }}>Clear voice key</button></div>
          <div className="security-note"><ShieldCheck size={18} /><span><strong>Voice privacy and usage.</strong> The selected voice ID and reply text are sent to Fish Audio to generate speech. Your Fish Audio key remains in app memory; usage limits or charges may apply.</span></div>
        </div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => { setApiKey(''); setModel(provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL); setStatus('API KEY REQUIRED'); setShowConnectHint(false); }}>Clear AI key</button><button className="primary-button" onClick={saveSettings}><Check size={16} /> {provider === 'openai' ? 'Use OpenAI' : 'Use Groq'}</button></div>
        {showConnectHint && <p className="saved-note">{apiKey.trim() ? provider === 'openai' ? 'OpenAI key is held in memory. Send a message to test the connection.' : 'Groq key is held in memory. Send a message to test the connection.' : 'No AI key is configured. Add a provider API key to use chat.'}</p>}
      </section>
    </div>}
  </main>;
}
 },
          time: { type: 'string', description: 'Local 24-hour time HH:mm, or empty string for an all-day event.' },
          all_day: { type: 'boolean' },
          reminder_minutes: { type: 'integer', minimum: -1, maximum: 40320, description: '-1 means no reminder; otherwise minutes before the event. Default 900.' }
        },
        required: ['title', 'date', 'time', 'all_day', 'reminder_minutes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inspect_screen',
      description: 'Read visible accessibility labels and controls on the current Android screen only when the user asks what is on screen, asks JARVIS to inspect/read the screen, or requests a task that requires looking at the current screen.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tap_text',
      description: 'Tap a visible Android control by its exact on-screen text or accessibility label, only when the user explicitly asks to tap, click, press, or select that control. Never use for Send, Submit, Delete, Buy, Pay, Confirm, or other consequential controls; ask the user to confirm instead.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', minLength: 1, maxLength: 180 } },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Enter user-requested text into the currently focused non-password Android text field, only when the user explicitly asks JARVIS to type or enter text. Never infer credentials or secrets.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', maxLength: 2000 } },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scroll_screen',
      description: 'Scroll the current Android screen up, down, left, or right only when the user explicitly asks to scroll.',
      parameters: {
        type: 'object',
        properties: { direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] } },
        required: ['direction'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigation_action',
      description: 'Perform Android Back, Home, or Recents navigation only when the user explicitly asks for that navigation action.',
      parameters: {
        type: 'object',
        properties: { action: { type: 'string', enum: ['back', 'home', 'recents'] } },
        required: ['action'],
        additionalProperties: false,
      },
    },
  },
];

const SYSTEM_PROMPT = [
  'You are J.A.R.V.I.S., a helpful personal AI assistant. Be clear, capable, and concise.',
  'You can use the app-launch tool to open installed apps by their visible name. JARVIS resolves the requested app locally; it does not send the full installed-app list to the AI provider.',
  'Call action tools only when the user clearly and directly asks for that action. Never claim an action succeeded until the app tool result says it succeeded.',
  'On Android, if JARVIS Screen Control is explicitly enabled by the user in Android Accessibility settings, you can inspect visible accessibility labels, tap a labelled control, type into a focused non-password field, scroll, and use Back/Home/Recents. Screen labels read by a requested screen action are sent to the selected AI provider to reason about the task; password fields are excluded. Some unlabeled or protected UI cannot be controlled.',
  'Never tap Send, Submit, Delete, Buy, Pay, Confirm, or other consequential controls; ask the user to perform or explicitly confirm that final step themselves. Never access passwords, one-time codes, or payment details. Do not claim a screen action worked unless its tool result says it succeeded.',
  'For coding and terminal requests, write the command with its intended operating system, explain what it does, and flag risky/destructive effects. Draft commands for the user to review; never attempt to execute them.',
  'Android can launch visible installed apps. Windows can launch apps listed in the Start menu. Browser mode can only open known website fallbacks.',
].join(' ');

function normalizeAppName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^(the|my)\s+/, '')
    .replace(/[^a-z0-9]+/g, '');
}

async function discoverInstalledApps() {
  if (typeof window !== 'undefined' && window.jarvisDesktop?.listApps) {
    const result = await window.jarvisDesktop.listApps();
    return Array.isArray(result) ? result : [];
  }

  if (Capacitor.getPlatform() === 'android') {
    const result = await AppControl.listLaunchableApps();
    return Array.isArray(result?.apps) ? result.apps : [];
  }

  return APP_CATALOG.map(item => ({
    name: item.label,
    packageName: item.packageName,
    id: item.id,
    webUrl: item.webUrl,
    platform: 'web',
  }));
}

function findInstalledApp(requestedName, apps) {
  const needle = normalizeAppName(requestedName);
  if (!needle) return { app: null, ambiguous: [] };
  const semanticName = name => normalizeAppName(name)
    .replace(/^(google|microsoft|mozilla|meta|samsung|the)/, '');

  const scored = (apps || []).map(item => {
    const label = item.name || item.label || '';
    const normalized = normalizeAppName(label);
    const semantic = semanticName(label);
    let score = 0;
    if (normalized === needle) score = 100;
    else if (semantic === needle) score = 95;
    else if (normalized.startsWith(needle)) score = 70;
    else if (semantic.startsWith(needle)) score = 68;
    else if (normalized.includes(needle) && needle.length >= 3) score = 55;
    else if (needle.includes(normalized) && normalized.length >= 4) score = 50;
    return { item, score };
  }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return { app: null, ambiguous: [] };
  const bestScore = scored[0].score;
  const best = scored.filter(entry => entry.score === bestScore).map(entry => entry.item);
  if (best.length === 1) return { app: best[0], ambiguous: [] };
  return { app: null, ambiguous: best.slice(0, 5).map(item => item.name || item.label) };
}

async function openExternalUrl(url) {
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/|$)/i.test(url)) {
    return { success: false, message: 'That destination is not an approved HTTPS link.' };
  }

  if (typeof window !== 'undefined' && window.jarvisDesktop?.openExternal) {
    const result = await window.jarvisDesktop.openExternal(url);
    return result?.success
      ? result
      : { success: false, message: result?.message || 'Windows could not open that link.' };
  }

  if (Capacitor.getPlatform() === 'android') {
    const result = await AppLauncher.openUrl({ url });
    return result.completed
      ? { success: true, message: 'Opened ' + url + '.' }
      : { success: false, message: 'Android could not open that link.' };
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  return opened
    ? { success: true, message: 'Requested the browser to open ' + url + '.' }
    : { success: false, message: 'The browser blocked this new tab. Open the link manually: ' + url };
}

async function launchInstalledApp(requestedName, installedApps) {
  const cleanName = String(requestedName || '').trim().slice(0, 120);
  if (!cleanName) return { success: false, message: 'Tell me the name of the app you want to open.' };

  const match = findInstalledApp(cleanName, installedApps);
  const target = match.app;
  if (!target) {
    if (match.ambiguous.length) {
      return { success: false, message: 'I found more than one matching app (' + match.ambiguous.join(', ') + '). Please use the full app name so I open the right one.' };
    }
    const known = APP_CATALOG.find(item =>
      normalizeAppName(item.label) === normalizeAppName(cleanName) ||
      normalizeAppName(item.id) === normalizeAppName(cleanName)
    );
    if (known?.webUrl) {
      const fallback = await openExternalUrl(known.webUrl);
      if (fallback.success) {
        return { success: true, message: 'I could not find an installed ' + known.label + ' app, so I opened its website instead.' };
      }
      return fallback;
    }
    return {
      success: false,
      message: 'I could not find an installed app named "' + cleanName + '". Try its name as it appears in your app drawer or Windows Start menu.',
    };
  }

  if (typeof window !== 'undefined' && window.jarvisDesktop?.launchApp) {
    const result = await window.jarvisDesktop.launchApp(target.appId);
    return result?.success
      ? { success: true, message: result.message || 'Asked Windows to open ' + target.name + '.' }
      : { success: false, message: result?.message || 'Windows could not launch ' + target.name + '.' };
  }

  if (Capacitor.getPlatform() === 'android') {
    if (!target.packageName) {
      return { success: false, message: 'Android did not provide a package identifier for ' + target.name + '.' };
    }
    const result = await AppControl.launchApp({ packageName: target.packageName });
    return result?.success
      ? { success: true, message: 'Launching ' + (result.name || target.name) + ' on your phone.' }
      : { success: false, message: 'Android could not launch ' + target.name + '.' };
  }

  const known = APP_CATALOG.find(item =>
    normalizeAppName(item.label) === normalizeAppName(target.name || '') ||
    normalizeAppName(item.id) === normalizeAppName(target.id || '')
  );
  if (known?.webUrl) return openExternalUrl(known.webUrl);
  return {
    success: false,
    message: 'This browser preview cannot launch installed apps. Install the Android APK or Windows app to use device launch.',
  };
}

async function runAssistantTool(toolCall, userRequest, installedApps) {
  let args;
  try {
    args = JSON.parse(toolCall.function?.arguments || '{}');
  } catch {
    return { success: false, message: 'The AI returned invalid action arguments, so nothing was done.' };
  }

  const asksToOpen = /\b(open|launch|start|switch to|bring up|take me to|go to|visit)\b/i.test(userRequest)
    && !/\b(don't|do not|never|shouldn't|should not|without)\b.{0,50}\b(open|launch|start)\b/i.test(userRequest);
  const asksToSearch = /\b(search|look up|find online|google)\b/i.test(userRequest)
    && !/\b(don't|do not|never|shouldn't|should not|without)\b.{0,50}\b(search|look up|google)\b/i.test(userRequest);
  const asksToCopy = /\b(copy|clipboard)\b/i.test(userRequest)
    && !/\b(don't|do not|never|shouldn't|should not|without)\b.{0,50}\b(copy)\b/i.test(userRequest);

  switch (toolCall.function?.name) {
    case 'open_app':
      if (!asksToOpen) return { success: false, message: 'Not executed: the user did not clearly ask to open an app.' };
      return await launchInstalledApp(args.app_name, installedApps);
    case 'open_website': {
      if (!asksToOpen) return { success: false, message: 'Not executed: the user did not clearly ask to open a website.' };
      const destination = WEB_DESTINATIONS[args.site];
      if (!destination) return { success: false, message: 'That website is not on the approved destination list.' };
      return await openExternalUrl(destination.url);
    }
    case 'search_web': {
      if (!asksToSearch) return { success: false, message: 'Not executed: the user did not clearly ask to search online.' };
      const query = String(args.query || '').trim().slice(0, 240);
      if (!query) return { success: false, message: 'The search query was empty.' };
      const url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      return await openExternalUrl(url);
    }
    case 'inspect_screen': {
      if (!/\\b(inspect|read|look at|what is on|what's on|see|check|tap|click|press|select|type|enter|scroll|swipe)\\b/i.test(userRequest)) {
        return { success: false, message: 'Not executed: the user did not clearly ask JARVIS to inspect the screen.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen inspection is currently available in the Android app only.' };
      const result = await AppControl.inspectScreen();
      return { success: true, screen: result, message: result.message + ' Visible labels will be sent to the selected AI provider for this requested task.' };
    }
    case 'tap_text': {
      if (!/\\b(tap|click|press|select)\\b/i.test(userRequest)) return { success: false, message: 'Not executed: explicitly ask JARVIS to tap, click, press, or select a control.' };
      if (/\\b(send|submit|delete|remove|buy|purchase|pay|confirm|transfer|post|publish|place order|call|dial)\\b/i.test(args.text || '')) {
        return { success: false, message: 'Safety pause: I will not activate a consequential control automatically. Please review the screen and perform that final action yourself.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen tapping is currently available in the Android app only.' };
      return await AppControl.tapText({ text: String(args.text || '').slice(0, 180) });
    }
    case 'type_text': {
      if (!/\\b(type|enter|write|fill in|put)\\b/i.test(userRequest)) return { success: false, message: 'Not executed: the user did not clearly ask JARVIS to type text.' };
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen typing is currently available in the Android app only.' };
      return await AppControl.typeText({ text: String(args.text || '').slice(0, 2000) });
    }
    case 'scroll_screen': {
      if (!/\\b(scroll|swipe)\\b/i.test(userRequest)) return { success: false, message: 'Not executed: the user did not clearly ask JARVIS to scroll.' };
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Screen scrolling is currently available in the Android app only.' };
      return await AppControl.scrollScreen({ direction: args.direction });
    }
    case 'navigation_action': {
      const action = String(args.action || '');
      if (!(action === 'back' && /\\b(go back|press back|back button)\\b/i.test(userRequest))
          && !(action === 'home' && /\\b(go home|home screen|press home)\\b/i.test(userRequest))
          && !(action === 'recents' && /\\b(recent apps|open recents|show recents)\\b/i.test(userRequest))) {
        return { success: false, message: 'Not executed: ask explicitly for Back, Home, or Recents.' };
      }
      if (Capacitor.getPlatform() !== 'android') return { success: false, message: 'Android navigation is available in the Android app only.' };
      return await AppControl.navigationAction({ action });
    }
    case 'copy_text': {
      if (!asksToCopy) return { success: false, message: 'Not executed: the user did not clearly ask to copy text.' };
      const text = String(args.text || '').slice(0, 12000);
      if (!text) return { success: false, message: 'There was no text to copy.' };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
        await navigator.clipboard.writeText(text);
        return { success: true, message: 'Copied the requested text to the clipboard.' };
      } catch (error) {
        return { success: false, message: 'I could not access the clipboard. You can select and copy the text manually.' };
      }
    }
    default:
      return { success: false, message: 'That action is not supported by JARVIS.' };
  }
}

function Orb({ listening }) {
  return <div className={`orb-wrap ${listening ? 'orb-listening' : ''}`} aria-label="Assistant status visualization">
    <div className="orb-ring ring-one" /><div className="orb-ring ring-two" /><div className="orb-ring ring-three" />
    <div className="orb-core"><div className="core-glint" /><div className="core-line" /></div>
    <div className="orb-scan" />
  </div>;
}

export default function App() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState('groq');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const apiKey = provider === 'openai' ? openAiApiKey : groqApiKey;
  const setApiKey = provider === 'openai' ? setOpenAiApiKey : setGroqApiKey;
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [fishApiKey, setFishApiKey] = useState('');
  const [voiceModelId, setVoiceModelId] = useState(DEFAULT_FISH_VOICE_ID);
  const [speakResponses, setSpeakResponses] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState('FISH AUDIO KEY REQUIRED');
  const [installedApps, setInstalledApps] = useState([]);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState(false);
  const [actionInProgress, setActionInProgress] = useState('');
  const isAndroidApp = Capacitor.getPlatform() === 'android';
  const isDesktopApp = typeof window !== 'undefined' && Boolean(window.jarvisDesktop);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [showConnectHint, setShowConnectHint] = useState(false);
  const [status, setStatus] = useState('API KEY REQUIRED');
  const [time, setTime] = useState(new Date());
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let active = true;
    const refresh = () => AppControl.accessibilityStatus()
      .then(result => { if (active) setAccessibilityEnabled(Boolean(result?.enabled)); })
      .catch(() => { if (active) setAccessibilityEnabled(false); });
    refresh();
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { active = false; document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  useEffect(() => {
    let active = true;
    discoverInstalledApps()
      .then(apps => { if (active) setInstalledApps(apps); })
      .catch(() => { if (active) setInstalledApps(APP_CATALOG.map(item => ({ name: item.label, packageName: item.packageName, id: item.id, webUrl: item.webUrl, platform: 'web' }))); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);


  const speakText = async (text) => {
    if (!fishApiKey.trim()) throw new Error('Add a Fish Audio API key in Settings to enable this voice.');
    const cleanText = String(text || '').trim().slice(0, 3500);
    if (!cleanText) throw new Error('There is no text to speak.');

    setVoiceStatus('GENERATING SPEECH');
    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + fishApiKey.trim(),
        'Content-Type': 'application/json',
        'model': FISH_AUDIO_MODEL,
      },
      body: JSON.stringify({
        text: cleanText,
        reference_id: voiceModelId.trim() || DEFAULT_FISH_VOICE_ID,
        format: 'mp3',
      }),
    });

    if (!response.ok) {
      const detailText = await response.text().catch(() => '');
      let detail = detailText;
      try {
        const parsed = JSON.parse(detailText);
        detail = parsed?.message || parsed?.error?.message || detailText;
      } catch {}
      throw new Error(detail ? 'Fish Audio returned HTTP ' + response.status + ': ' + String(detail).slice(0, 220) : 'Fish Audio returned HTTP ' + response.status + '.');
    }

    const audioBlob = await response.blob();
    if (!audioBlob.size) throw new Error('Fish Audio returned an empty audio file.');

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);

    const objectUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(objectUrl);
    audioUrlRef.current = objectUrl;
    audioRef.current = audio;
    audio.onended = () => {
      if (audioRef.current === audio) setVoiceStatus('VOICE READY');
      URL.revokeObjectURL(objectUrl);
      if (audioUrlRef.current === objectUrl) audioUrlRef.current = null;
    };
    audio.onerror = () => {
      if (audioRef.current === audio) setVoiceStatus('AUDIO PLAYBACK ERROR');
      URL.revokeObjectURL(objectUrl);
      if (audioUrlRef.current === objectUrl) audioUrlRef.current = null;
    };
    await audio.play();
    setVoiceStatus('SPEAKING');
  };

  const testVoice = async () => {
    try {
      await speakText('Hello. JARVIS voice system is online. How can I help you today?');
    } catch (error) {
      setVoiceStatus('VOICE ERROR');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I could not play the Fish Audio voice: ' + (error?.message || 'Unknown error') + '. Check your Fish Audio key, voice ID, network connection, and account usage.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  const speakResponse = text => {
    if (!speakResponses || !fishApiKey.trim()) return;
    void speakText(text).catch(error => {
      setVoiceStatus('VOICE ERROR');
      console.error('Fish Audio speech failed:', error?.message || error);
    });
  };

  const sendMessage = async (text = input) => {
    const clean = text.trim();
    if (!clean || sending) return;
    const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const conversation = [...messages, { role: 'user', text: clean, time: stamp }];
    setMessages(conversation);
    setInput('');

    if (!apiKey.trim()) {
      const providerName = provider === 'openai' ? 'OpenAI API' : 'Groq';
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Your ' + providerName + ' API key is not connected. Open Settings to add it. Keys stay in app memory only and are cleared when JARVIS closes or reloads.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('API KEY REQUIRED');
      return;
    }

    setSending(true);
    const providerName = provider === 'openai' ? 'OPENAI' : 'GROQ';
    const endpoint = provider === 'openai'
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';
    const selectedModel = model.trim() || (provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL);

    const requestCompletion = async (apiMessages, allowTools) => {
      const body = {
        model: selectedModel,
        messages: apiMessages,
        max_completion_tokens: 1200,
      };
      if (provider === 'groq') body.temperature = 0.7;
      if (allowTools) {
        body.tools = AI_TOOLS;
        body.tool_choice = 'auto';
      } else {
        body.tool_choice = 'none';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey.trim(),
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.error?.message || (response.status === 401
          ? providerName + ' rejected the API key. Check that you copied it correctly.'
          : response.status === 429
            ? providerName + ' rate limit or usage limit reached. Wait and try again.'
            : providerName + ' returned HTTP ' + response.status + '.');
        throw new Error(detail);
      }
      return data;
    };

    try {
      setStatus('CONTACTING ' + providerName);
      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversation
          .filter(message => message.role === 'user' || message.role === 'assistant')
          .filter((message, index) => !(index === 0 && message.role === 'assistant'))
          .map(message => ({ role: message.role, content: message.text })),
      ];

      const firstData = await requestCompletion(apiMessages, true);
      const firstMessage = firstData?.choices?.[0]?.message;
      if (!firstMessage) throw new Error(providerName + ' returned an empty response.');

      let answer = firstMessage.content?.trim() || '';
      let currentMessage = firstMessage;
      let toolCalls = Array.isArray(currentMessage.tool_calls) ? currentMessage.tool_calls : [];
      let actionCount = 0;
      const toolResults = [];

      for (let round = 0; round < 5 && toolCalls.length > 0; round += 1) {
        setStatus(round === 0 ? 'RUNNING APPROVED ACTIONS' : 'CONTINUING SCREEN TASK');
        apiMessages.push(currentMessage);

        // Run one action per model round, then let the model observe its result
        // before it chooses the next step. This prevents blind multi-tap chains.
        const chosenCall = toolCalls[0];
        let result;
        if (actionCount >= 5) {
          result = { success: false, message: 'JARVIS stopped after five actions for this request. Review the current screen before continuing.' };
        } else {
          try {
            result = await runAssistantTool(chosenCall, clean, installedApps);
          } catch (error) {
            result = { success: false, message: 'Action failed: ' + (error?.message || 'Unknown error') };
          }
          actionCount += 1;
        }
        toolResults.push(result);
        apiMessages.push({
          role: 'tool',
          tool_call_id: chosenCall.id,
          content: JSON.stringify(result),
        });

        for (const deferredCall of toolCalls.slice(1)) {
          const deferred = { success: false, message: 'Only one action is executed per step. Review the last action result and request the next safe action separately.' };
          toolResults.push(deferred);
          apiMessages.push({
            role: 'tool',
            tool_call_id: deferredCall.id,
            content: JSON.stringify(deferred),
          });
        }

        if (actionCount >= 5) {
          answer = toolResults.map(item => item.message).filter(Boolean).join('\n');
          break;
        }
        setStatus('CHECKING ACTION RESULT');
        const nextData = await requestCompletion(apiMessages, true);
        currentMessage = nextData?.choices?.[0]?.message;
        if (!currentMessage) throw new Error(providerName + ' returned an empty response.');
        answer = currentMessage.content?.trim() || '';
        toolCalls = Array.isArray(currentMessage.tool_calls) ? currentMessage.tool_calls : [];
        if (toolCalls.length === 0) break;
      }

      if (toolCalls.length > 0 && actionCount >= 5) {
        answer = (answer ? answer + '\n\n' : '') + 'I stopped after five actions to keep control bounded. Check the current screen before continuing.';
      }
      if (actionCount > 0) {
        setStatus(toolResults.some(result => result.success) ? 'ACTION COMPLETE' : 'ACTION NOT COMPLETED');
        if (!answer) answer = toolResults.map(result => result.message).filter(Boolean).join('\n');
      } else {
        setStatus(providerName + ' CONNECTED');
      }

      if (!answer) throw new Error(providerName + ' returned an empty response. Try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      speakResponse(answer);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'I could not reach ' + providerName + ': ' + (error?.message || 'Unknown network error') + '. Check your internet connection, API key, model name, and API account limits, then try again.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('CONNECTION ERROR');
    } finally {
      setSending(false);
    }
  };

  const openAccessibilitySettings = async () => {
    try {
      await AppControl.openAccessibilitySettings();
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Android Accessibility settings opened. Find JARVIS Screen Control and enable it only if you want JARVIS to inspect and operate labelled controls on your phone. Return to JARVIS afterward.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Could not open Accessibility settings: ' + (error?.message || 'Unknown error') + '. Open Android Settings > Accessibility manually.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  const launchFromShortcut = async appId => {
    if (actionInProgress) return;
    setActionInProgress(appId);
    try {
      const shortcut = APP_CATALOG.find(item => item.id === appId);
      const result = await launchInstalledApp(shortcut?.label || appId, installedApps);
      setStatus(result.success ? 'DEVICE ACTION COMPLETE' : 'DEVICE ACTION UNAVAILABLE');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: result.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setStatus('DEVICE ACTION UNAVAILABLE');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Could not open that app: ' + (error?.message || 'Unknown error') + '.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setActionInProgress('');
    }
  };

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Voice input is not supported in this browser. Try a recent version of Chrome or Edge.', time: 'NOW' }]);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-CA';
    recognition.interimResults = false;
    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const saveSettings = () => {
    setStatus(apiKey.trim() ? (provider === 'openai' ? 'OPENAI API KEY READY' : 'GROQ KEY READY') : 'API KEY REQUIRED');
    setShowConnectHint(true);
    setSettingsOpen(false);
  };

  return <main className="app-shell">
    <div className="ambient ambient-a" /><div className="ambient ambient-b" />
    <header className="topbar">
      <a className="brand" href="#" aria-label="JARVIS home"><div className="brand-mark"><AudioLines size={21} /></div><div><strong>J.A.R.V.I.S.</strong><span>PERSONAL INTELLIGENCE</span></div></a>
      <div className="top-status"><span className="status-dot" /> ALL SYSTEMS STANDBY <span className="status-divider" /> {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings2 size={19} /></button>
    </header>

    <section className="hero-grid">
      <aside className="side-panel left-panel">
        <div className="eyebrow"><span className="eyebrow-line" /> SYSTEM OVERVIEW</div>
        <div className="metric"><div className="metric-icon"><Cpu size={17} /></div><div><span>CORE STATUS</span><strong>STANDBY</strong></div><span className="tiny-led" /></div>
        <div className="metric"><div className="metric-icon"><Wifi size={17} /></div><div><span>NETWORK</span><strong>LOCAL INTERFACE</strong></div><span className="tiny-led" /></div>
        <div className="metric"><div className="metric-icon"><ShieldCheck size={17} /></div><div><span>PERMISSIONS</span><strong>LOCKED BY DEFAULT</strong></div><span className="tiny-led muted" /></div>
        <div className="panel-rule" />
        <div className="eyebrow"><span className="eyebrow-line" /> QUICK COMMANDS</div>
        <button className="quick-command" onClick={() => sendMessage('Give me a system status summary')}><Activity size={16} /><span>System status</span><span className="command-arrow">↗</span></button>
        <button className="quick-command" onClick={() => sendMessage('Help me plan a coding project')}><Command size={16} /><span>Project assistant</span><span className="command-arrow">↗</span></button>
        <button className="quick-command" onClick={() => sendMessage('Explain the available voice features')}><Headphones size={16} /><span>Voice interface</span><span className="command-arrow">↗</span></button>
        <div className="side-foot"><span className="pulse-small" /> SECURE SESSION <span>·</span> LOCAL UI</div>
      </aside>

      <section className="center-stage">
        <div className="stage-topline"><span>FIG. 01 / ASSISTANT CORE</span><span>HOLOGRAPHIC INTERFACE <span className="blue">●</span></span></div>
        <Orb listening={listening} />
        <div className="core-label"><span className="core-label-line" /><span>J.A.R.V.I.S.</span><span className="core-label-line" /></div>
        <p className="core-subtitle">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
        <div className="core-state"><span className="status-dot" /> {listening ? 'LISTENING FOR INPUT' : status}</div>
        <div className="waveform" aria-hidden="true">{Array.from({ length: 49 }, (_, i) => <i key={i} style={{ '--h': `${8 + Math.abs(Math.sin(i * 0.73) * Math.cos(i * 0.21)) * (listening ? 42 : 22)}px`, '--delay': `${i * -0.045}s` }} />)}</div>
        <div className="stage-bottom"><span>VOICE RECOGNITION {listening ? 'ACTIVE' : 'AVAILABLE'}</span><span>AI LINK <b>{apiKey ? 'KEY READY' : 'NOT CONNECTED'}</b></span></div>
      </section>

      <aside className="side-panel right-panel">
        <div className="eyebrow"><span className="eyebrow-line" /> INTERFACE TELEMETRY</div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>PROCESSING LOAD</span><span>--</span></div><div className="bar-track"><span style={{ width: '18%' }} /></div><div className="telemetry-foot"><span>UI SAMPLE</span><span>NOT DEVICE DATA</span></div></div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>AI CONNECTIVITY</span><span className={apiKey ? '' : 'amber'}>{apiKey ? 'KEY READY' : 'OFFLINE'}</span></div><div className="connect-visual"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="telemetry-foot"><span>PROVIDER</span><span>{apiKey ? provider.toUpperCase() : 'UNCONFIGURED'}</span></div></div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>DEVICE BRIDGE</span><span>{isAndroidApp ? 'READY' : 'WEB MODE'}</span></div><div className="bridge-lock"><ShieldCheck size={18} /><span>{isAndroidApp ? 'ALLOWLISTED APP LAUNCH' : 'WEB LINKS ONLY'}</span></div><div className="telemetry-foot"><span>MODE</span><span>{isAndroidApp ? 'ANDROID' : 'BROWSER / DESKTOP'}</span></div></div>
        <button className="connect-button" onClick={() => setSettingsOpen(true)}><Zap size={16} /> CONFIGURE AI LINK <span>↗</span></button>
        <div className="right-note"><Sparkles size={14} /><span>Android can launch the supported apps below. Browser and Windows modes open web destinations instead.</span></div>
      </aside>
    </section>

    <section className="device-actions">
      <div className="device-actions-head">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> DEVICE ACTIONS</div>
          <p>{isAndroidApp ? 'Ask JARVIS to open any launchable app by name. The installed-app list stays on your phone and is not sent to the AI provider.' : isDesktopApp ? 'Ask JARVIS to open an app by name. Windows launching is limited to Start menu apps; JARVIS will not run arbitrary shell commands.' : 'Install the Android APK or Windows app for prompt-based launch of installed apps.'}</p>
        </div>
        <div className="device-mode">{isAndroidApp ? (accessibilityEnabled ? 'SCREEN CONTROL ENABLED' : 'APP LAUNCH READY') : isDesktopApp ? 'WINDOWS APP CONTROL' : 'WEB LINKS ONLY'}{installedApps.length ? ' · ' + installedApps.length + ' APPS' : ''}</div>
      </div>
      {isAndroidApp && <div className="screen-control-row">
        <div className="screen-control-copy">
          <strong>{accessibilityEnabled ? 'SCREEN CONTROL CONNECTED' : 'ENABLE FULLER PHONE CONTROL'}</strong>
          <span>{accessibilityEnabled ? 'JARVIS can read labelled controls and tap, type, scroll, and navigate when you explicitly ask.' : 'Android requires you to enable this optional accessibility service yourself. Screen labels requested for a task are sent to your selected AI provider.'}</span>
        </div>
        <button className="primary-button" onClick={openAccessibilitySettings}>{accessibilityEnabled ? 'Accessibility settings' : 'Enable screen control'} ↗</button>
      </div>}
      <div className="app-shortcuts">
        {APP_CATALOG.map(app => <button className="app-shortcut" type="button" key={app.id} disabled={Boolean(actionInProgress)} onClick={() => launchFromShortcut(app.id)}>
          <span className="app-shortcut-mark">{app.label.slice(0, 1)}</span>
          <span className="app-shortcut-label">{actionInProgress === app.id ? 'OPENING ' + app.label.toUpperCase() : app.label}</span>
          <span className="app-shortcut-arrow">↗</span>
        </button>)}
      </div>
    </section>

    <section className="assistant-console">
      <div className="console-header"><div className="console-title"><MessageSquare size={16} /><span>ASSISTANT CONSOLE</span><span className="console-count">{messages.length.toString().padStart(2, '0')} MESSAGES</span></div><button className="clear-button" onClick={() => setMessages(initialMessages)}>CLEAR SESSION <span>↻</span></button></div>
      <div className="messages">
        {messages.map((message, i) => <div className={`message-row ${message.role}`} key={i}><div className="message-avatar">{message.role === 'assistant' ? <Bot size={17} /> : <span>YOU</span>}</div><div className="message-content"><div className="message-meta"><strong>{message.role === 'assistant' ? 'J.A.R.V.I.S.' : 'OPERATOR'}</strong><span>{message.time}</span></div><p>{message.text}</p></div></div>)}
        <div ref={bottomRef} />
      </div>
      <form className="composer" onSubmit={e => { e.preventDefault(); sendMessage(); }}>
        <button className={`mic-button ${listening ? 'active' : ''}`} type="button" onClick={toggleVoice} aria-label={listening ? 'Stop voice input' : 'Start voice input'}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder={sending ? 'J.A.R.V.I.S. is thinking...' : 'Ask J.A.R.V.I.S. anything...'} aria-label="Message the assistant" disabled={sending} />
        <span className="input-hint">ENTER ↵</span>
        <button className="send-button" type="submit" aria-label="Send message" disabled={sending}><Send size={17} /></button>
      </form>
      <div className="console-disclaimer"><ShieldCheck size={13} /> {provider.toUpperCase()} AI · USER-ENABLED ANDROID SCREEN CONTROL · CONSEQUENTIAL ACTIONS REQUIRE MANUAL REVIEW</div>
    </section>

    <footer className="footer"><span>J.A.R.V.I.S. INTERFACE <b>v0.1.0</b></span><span>BUILT FOR HUMAN-APPROVED ASSISTANCE</span><span><span className="status-dot" /> SYSTEM READY</span></footer>

    {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head"><div><span className="eyebrow">CONNECTION CONTROL</span><h2 id="settings-title">Configure AI link</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></div>
        <p className="modal-copy">Choose Groq or OpenAI for chat. You can also connect Fish Audio for JARVIS speech. Keys stay in memory only and are cleared when JARVIS closes or reloads. OpenAI API is separate from your ChatGPT plan.</p>
        <label>AI PROVIDER <select value={provider} onChange={e => { const nextProvider = e.target.value; setProvider(nextProvider); setModel(nextProvider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL); setShowConnectHint(false); }}><option value="groq">Groq API</option><option value="openai">OpenAI API</option></select></label>
        <label>{provider === 'openai' ? 'OPENAI API KEY' : 'GROQ API KEY'} <input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={provider === 'openai' ? 'Paste your OpenAI Platform API key' : 'Paste your Groq API key'} /></label>
        <p className="provider-help"><a href={provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.groq.com/keys'} target="_blank" rel="noreferrer">Get {provider === 'openai' ? 'an OpenAI API key' : 'a Groq API key'} ↗</a>{provider === 'openai' ? ' API use is billed separately from ChatGPT plans.' : ' Check your provider usage limits.'}</p>
        <label>MODEL <input value={model} onChange={e => setModel(e.target.value)} placeholder={provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL} /></label>
        <div className="security-note"><ShieldCheck size={18} /><span><strong>Memory-only credential.</strong> Chat and approved tools go directly to the selected AI API over HTTPS. Never commit keys to GitHub. Anyone inspecting a running app may still be able to access its key.</span></div>
        <div className="voice-settings">
          <div className="eyebrow"><span className="eyebrow-line" /> VOICE OUTPUT</div>
          <label>FISH AUDIO API KEY <input type="password" autoComplete="off" value={fishApiKey} onChange={e => setFishApiKey(e.target.value)} placeholder="Paste your Fish Audio API key" /></label>
          <p className="provider-help"><a href="https://fish.audio/developers/" target="_blank" rel="noreferrer">Fish Audio developer portal ↗</a> Text from JARVIS replies is sent to Fish Audio to create speech.</p>
          <label>FISH AUDIO VOICE ID <input value={voiceModelId} onChange={e => setVoiceModelId(e.target.value)} placeholder={DEFAULT_FISH_VOICE_ID} /></label>
          <label className="voice-toggle"><input type="checkbox" checked={speakResponses} onChange={e => setSpeakResponses(e.target.checked)} /> Speak JARVIS responses aloud automatically</label>
          <div className="voice-actions"><span>STATUS: {voiceStatus}</span><button className="secondary-button" disabled={!fishApiKey.trim()} onClick={testVoice}>Test voice</button><button className="secondary-button" onClick={() => { setFishApiKey(''); setVoiceStatus('FISH AUDIO KEY REQUIRED'); }}>Clear voice key</button></div>
          <div className="security-note"><ShieldCheck size={18} /><span><strong>Voice privacy and usage.</strong> The selected voice ID and reply text are sent to Fish Audio to generate speech. Your Fish Audio key remains in app memory; usage limits or charges may apply.</span></div>
        </div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => { setApiKey(''); setModel(provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL); setStatus('API KEY REQUIRED'); setShowConnectHint(false); }}>Clear AI key</button><button className="primary-button" onClick={saveSettings}><Check size={16} /> {provider === 'openai' ? 'Use OpenAI' : 'Use Groq'}</button></div>
        {showConnectHint && <p className="saved-note">{apiKey.trim() ? provider === 'openai' ? 'OpenAI key is held in memory. Send a message to test the connection.' : 'Groq key is held in memory. Send a message to test the connection.' : 'No AI key is configured. Add a provider API key to use chat.'}</p>}
      </section>
    </div>}
  </main>;
}
