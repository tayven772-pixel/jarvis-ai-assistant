import { useEffect, useRef, useState } from 'react';
import {
  Activity, AudioLines, Bot, Check, ChevronDown, Command, Cpu, Headphones,
  MessageSquare, Mic, MicOff, Monitor, Moon, Power, Send, Settings2,
  ShieldCheck, Sparkles, Wifi, Zap
} from 'lucide-react';

const initialMessages = [
  { role: 'assistant', text: 'Good evening. J.A.R.V.I.S. interface is online. I’m ready when you are.', time: 'NOW' },
];

const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const SYSTEM_PROMPT = 'You are J.A.R.V.I.S., a helpful personal AI assistant. Be clear, capable, and concise. Do not claim to control a device or perform an action unless the app explicitly confirms that capability.';

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
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Your Groq API key is not connected. Open Settings, enter your key, and select Use Groq. The key is kept in memory only and will be cleared when you close or reload JARVIS.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('API KEY REQUIRED');
      return;
    }

    setSending(true);
    setStatus('CONTACTING GROQ');
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model.trim() || DEFAULT_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...conversation.filter(message => message.role === 'user' || message.role === 'assistant')
              .filter((message, index) => !(index === 0 && message.role === 'assistant'))
              .map(message => ({ role: message.role, content: message.text })),
          ],
          temperature: 0.7,
          max_completion_tokens: 1024,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = data?.error?.message || (response.status === 401
          ? 'Groq rejected the API key. Check that you copied it correctly.'
          : response.status === 429
            ? 'Groq rate limit reached. Wait a little and try again.'
            : `Groq returned HTTP ${response.status}.`);
        throw new Error(detail);
      }
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('Groq returned an empty response. Try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('GROQ CONNECTED');
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `I couldn't reach Groq: ${error?.message || 'Unknown network error'}. Check your internet connection, API key, model name, and Groq account limits, then try again.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
      setStatus('CONNECTION ERROR');
    } finally {
      setSending(false);
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
    setStatus(apiKey.trim() ? 'GROQ KEY READY' : 'API KEY REQUIRED');
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
        <div className="telemetry-card"><div className="telemetry-heading"><span>AI CONNECTIVITY</span><span className={apiKey ? '' : 'amber'}>{apiKey ? 'KEY READY' : 'OFFLINE'}</span></div><div className="connect-visual"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="telemetry-foot"><span>PROVIDER</span><span>{apiKey ? 'GROQ' : 'UNCONFIGURED'}</span></div></div>
        <div className="telemetry-card"><div className="telemetry-heading"><span>DEVICE BRIDGE</span><span>LOCKED</span></div><div className="bridge-lock"><ShieldCheck size={18} /><span>AWAITING PERMISSION MODEL</span></div><div className="telemetry-foot"><span>SAFE MODE</span><span>ENABLED</span></div></div>
        <button className="connect-button" onClick={() => setSettingsOpen(true)}><Zap size={16} /> CONFIGURE AI LINK <span>↗</span></button>
        <div className="right-note"><Sparkles size={14} /><span>Designed for extensibility. Real device metrics appear only after a supported companion is connected.</span></div>
      </aside>
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
      <div className="console-disclaimer"><ShieldCheck size={13} /> GROQ AI CHAT · NO DEVICE ACTIONS ARE EXECUTED</div>
    </section>

    <footer className="footer"><span>J.A.R.V.I.S. INTERFACE <b>v0.1.0</b></span><span>BUILT FOR HUMAN-APPROVED ASSISTANCE</span><span><span className="status-dot" /> SYSTEM READY</span></footer>

    {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-head"><div><span className="eyebrow">CONNECTION CONTROL</span><h2 id="settings-title">Configure AI link</h2></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button></div>
        <p className="modal-copy">Connect directly to Groq. Your key stays in this app's memory only; it is not saved to browser storage and will be cleared when JARVIS closes or reloads.</p>
        <label>GROQ API KEY <input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Paste your Groq API key" /></label>
        <label>GROQ MODEL <input value={model} onChange={e => setModel(e.target.value)} placeholder={DEFAULT_MODEL} /></label>
        <div className="security-note"><ShieldCheck size={18} /><span><strong>Memory-only credential.</strong> The key is sent directly to Groq over HTTPS with each request. Never commit it to GitHub or share screenshots that reveal it. Anyone who can inspect a running app may still be able to access its key.</span></div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => { setApiKey(''); setModel(DEFAULT_MODEL); setStatus('API KEY REQUIRED'); setShowConnectHint(false); }}>Clear key</button><button className="primary-button" onClick={saveSettings}><Check size={16} /> Use Groq</button></div>
        {showConnectHint && <p className="saved-note">{apiKey.trim() ? 'Groq key is held in memory. Send a message to test the connection.' : 'No key is configured. Add your Groq API key to use AI chat.'}</p>}
      </section>
    </div>}
  </main>;
}
