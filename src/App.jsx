import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import {
  Activity, AudioLines, Bot, Check, ChevronDown, Command, Cpu, Headphones,
  MessageSquare, Mic, MicOff, Monitor, Moon, Power, Send, Settings2,
  ShieldCheck, Sparkles, Wifi, Zap
} from 'lucide-react';

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
      description: 'Open one supported app only when the user clearly asks to open or launch an app. This does not send messages, place calls, or change app settings.',
      parameters: {
        type: 'object',
        properties: { app: { type: 'string', enum: APP_CATALOG.map(item => item.id), description: 'The supported app identifier.' } },
        required: ['app'],
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
];

const SYSTEM_PROMPT = [
  'You are J.A.R.V.I.S., a helpful personal AI assistant. Be clear, capable, and concise.',
  'You can use only the tools explicitly provided by the app: open an allowlisted app, open an allowlisted website, open a Google search page, or copy text when clearly requested.',
  'Call action tools only when the user clearly and directly asks for that action. Never claim an action succeeded until the app tool result says it succeeded.',
  'You cannot execute arbitrary shell commands, run scripts, control arbitrary apps, send messages, place calls, or silently change device settings.',
  'For coding and terminal requests, write the command with its intended operating system, explain what it does, and flag risky/destructive effects. Draft commands for the user to review; never attempt to execute them.',
  'The app may be running as a browser, Windows desktop app, or Android app. On the browser/desktop build, supported shortcuts may open a web version instead of a native phone app.',
].join(' ');

async function openExternalUrl(url) {
  if (Capacitor.getPlatform() === 'android') {
    const result = await AppLauncher.openUrl({ url });
    return result.completed
      ? { success: true, message: 'Opened ' + url + '.' }
      : { success: false, message: 'Android could not open that link.' };
  }
  window.open(url, '_blank', 'noopener,noreferrer');
  return { success: true, message: 'Requested the browser to open ' + url + '.' };
}

async function openAppById(appId) {
  const app = APP_CATALOG.find(item => item.id === appId);
  if (!app) return { success: false, message: 'That app is not on the supported allowlist.' };

  if (Capacitor.getPlatform() === 'android') {
    try {
      const canOpen = await AppLauncher.canOpenUrl({ url: app.packageName });
      if (canOpen.value) {
        const result = await AppLauncher.openUrl({ url: app.packageName });
        if (result.completed) return { success: true, message: 'Opening ' + app.label + ' on this phone.' };
      }
    } catch (error) {
      // Fall through to the web fallback when the native app is not discoverable.
    }

    if (app.webUrl) {
      try {
        await AppLauncher.openUrl({ url: app.webUrl });
        return { success: true, message: app.label + ' was not detected as installed, so I opened its web version.' };
      } catch (error) {
        return { success: false, message: 'Could not launch ' + app.label + ' or its web version.' };
      }
    }
    return { success: false, message: app.label + ' could not be found on this phone. It may not be installed, or your phone may use a different app package.' };
  }

  if (app.webUrl) {
    try {
      window.open(app.webUrl, '_blank', 'noopener,noreferrer');
      return { success: true, message: 'Opened the web version of ' + app.label + '.' };
    } catch (error) {
      return { success: false, message: 'Your browser blocked the web link. Open it manually: ' + app.webUrl };
    }
  }

  return { success: false, message: app.label + ' can only be opened from the installed Android app.' };
}

async function runAssistantTool(toolCall, userRequest) {
  let args;
  try {
    args = JSON.parse(toolCall.function?.arguments || '{}');
  } catch {
    return { success: false, message: 'The AI returned invalid action arguments, so nothing was done.' };
  }

  const asksToOpen = /\b(open|launch|start|switch to|bring up|take me to|go to|visit)\b/i.test(userRequest);
  const asksToSearch = /\b(search|look up|find online|google)\b/i.test(userRequest);
  const asksToCopy = /\b(copy|clipboard)\b/i.test(userRequest);

  switch (toolCall.function?.name) {
    case 'open_app':
      if (!asksToOpen) return { success: false, message: 'Not executed: the user did not clearly ask to open an app.' };
      return await openAppById(args.app);
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
  const [actionInProgress, setActionInProgress] = useState('');
  const isAndroidApp = Capacitor.getPlatform() === 'android';
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
      const toolCalls = Array.isArray(firstMessage.tool_calls) ? firstMessage.tool_calls : [];

      if (toolCalls.length > 0) {
        setStatus('RUNNING APPROVED ACTIONS');
        apiMessages.push(firstMessage);
        const toolResults = [];

        for (let index = 0; index < toolCalls.length; index += 1) {
          const toolCall = toolCalls[index];
          let result;
          if (index >= 2) {
            result = { success: false, message: 'JARVIS limits each message to two actions.' };
          } else {
            try {
              result = await runAssistantTool(toolCall, clean);
            } catch (error) {
              result = { success: false, message: 'Action failed: ' + (error?.message || 'Unknown error') };
            }
          }
          toolResults.push(result);
          apiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        setStatus('SUMMARIZING ACTION');
        const finalData = await requestCompletion(apiMessages, false);
        answer = finalData?.choices?.[0]?.message?.content?.trim() || '';
        if (!answer) answer = toolResults.map(result => result.message).join('\n');
        setStatus(toolResults.some(result => result.success) ? 'ACTION COMPLETE' : 'ACTION NOT COMPLETED');
      } else {
        setStatus(providerName + ' CONNECTED');
      }

      if (!answer) throw new Error(providerName + ' returned an empty response. Try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
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

  const launchFromShortcut = async appId => {
    if (actionInProgress) return;
    setActionInProgress(appId);
    try {
      const result = await openAppById(appId);
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
          <p>{isAndroidApp ? 'Tap an app to open it on your phone. If it is not installed, JARVIS may open its website.' : 'In the browser and Windows builds, these shortcuts open web versions. Install the Android APK for native app launching.'}</p>
        </div>
        <span className="device-mode">{isAndroidApp ? 'ANDROID BRIDGE READY' : 'WEB LINKS ONLY'}</span>
      </div>
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
      <div className="console-disclaimer"><ShieldCheck size={13} /> {provider.toUpperCase()} AI · ALLOWLISTED ACTIONS ONLY · NO ARBITRARY COMMAND EXECUTION</div>
    </section>

    <footer className="footer"><span>J.A.R.V.I.S. INTERFACE <b>v0.1.0</b></span><span>BUILT FOR HUMAN-APPROVED ASSISTANCE</span><span><span className="status-dot" /> SYSTEM READY</span></footer>

    {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head"><div><span className="eyebrow">CONNECTION CONTROL</span><h2 id="settings-title">Configure AI link</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></div>
        <p className="modal-copy">Choose Groq or OpenAI API. Keys stay in this app's memory only and are cleared when JARVIS closes or reloads. OpenAI API is not the same as this ChatGPT conversation and uses separate API billing.</p>
        <label>AI PROVIDER <select value={provider} onChange={e => { const nextProvider = e.target.value; setProvider(nextProvider); setModel(nextProvider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL); setShowConnectHint(false); }}><option value="groq">Groq API</option><option value="openai">OpenAI API</option></select></label>
        <label>{provider === 'openai' ? 'OPENAI API KEY' : 'GROQ API KEY'} <input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={provider === 'openai' ? 'Paste your OpenAI Platform API key' : 'Paste your Groq API key'} /></label>
        <p className="provider-help"><a href={provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.groq.com/keys'} target="_blank" rel="noreferrer">Get {provider === 'openai' ? 'an OpenAI API key' : 'a Groq API key'} ↗</a>{provider === 'openai' ? ' API use is billed separately from ChatGPT plans.' : ' Check your provider usage limits.'}</p>
        <label>MODEL <input value={model} onChange={e => setModel(e.target.value)} placeholder={provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL} /></label>
        <div className="security-note"><ShieldCheck size={18} /><span><strong>Memory-only credential.</strong> The key is sent directly to the selected provider over HTTPS. Never commit it to GitHub or share screenshots that reveal it. Anyone who can inspect a running app may still be able to access its key.</span></div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => { setApiKey(''); setModel(provider === 'openai' ? OPENAI_DEFAULT_MODEL : DEFAULT_MODEL); setStatus('API KEY REQUIRED'); setShowConnectHint(false); }}>Clear key</button><button className="primary-button" onClick={saveSettings}><Check size={16} /> Use Groq</button></div>
        {showConnectHint && <p className="saved-note">{apiKey.trim() ? 'Groq key is held in memory. Send a message to test the connection.' : 'No key is configured. Add your Groq API key to use AI chat.'}</p>}
      </section>
    </div>}
  </main>;
}
