
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Minus, Loader2, CheckCircle2, ArrowRight, Bell } from 'lucide-react';
import { AiMark as Sparkles } from './Logo';
import { useAuth } from '@clerk/clerk-react';
import { buildAuthHeaders } from '../utils/api';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import type { Language } from '../utils/translations';

// RJ-5.7: com sessão, a Sofia sabe quem é a pessoa, consulta dados com as permissões dela e propõe
// ações. As ações só acontecem quando a pessoa carrega em "Confirmar" (chamada ao endereço da app que
// já existe). Sem sessão (página inicial), continua a Sofia informativa de /api/ai/chat.
interface Proposal {
  kind: 'api' | 'navigate';
  label: string;
  detail?: string;
  method?: 'POST';
  path?: string;
  body?: Record<string, unknown>;
  view?: 'app' | 'backoffice';
  tab?: string;
}

interface Nudge { id: string; level: 'info' | 'warning' | 'critical'; text: string; destination: string }

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  proposals?: Proposal[];
}

type ProposalState = { status: 'idle' | 'running' | 'done' | 'error' | 'cancelled'; message?: string };

/** Pede ao ecrã que mude de separador (MainApp e Backoffice ouvem este evento). */
export function sofiaNavigate(view: 'app' | 'backoffice', tab: string) {
  window.dispatchEvent(new CustomEvent('sofia:navigate', { detail: { view, tab } }));
}

const QUICK_PROMPTS: Record<string, string[]> = {
  customer: ['Que avaliações tenho por responder?', 'Quantos créditos me restam?', 'Como ligo o Google?'],
  agency_owner: ['Que avaliações tenho por responder?', 'Quantos créditos restam à agência?', 'Como convido alguém para a equipa?'],
  agency_member: ['Que avaliações tenho por responder?', 'O que posso fazer como membro da equipa?'],
  operator: ['Que erros estão fora do prazo?', 'Mostra os erros críticos por resolver', 'Há erros técnicos novos?'],
  super_admin: ['Que erros estão fora do prazo?', 'Mostra os erros críticos por resolver', 'Há erros técnicos novos?'],
};

const DISMISS_KEY = `sofia-nudges-dismissed-${new Date().toISOString().slice(0, 10)}`;
const readDismissed = (): string[] => { try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch { return []; } };
const writeDismissed = (ids: string[]) => { try { localStorage.setItem(DISMISS_KEY, JSON.stringify(ids)); } catch { /* sem armazenamento */ } };

interface SofiaChatProps {
  lang?: Language;
}

const SofiaChat: React.FC<SofiaChatProps> = ({ lang = 'pt' }) => {
  const i18n = {
    pt: {
      welcome: 'Olá! Sou a Sofia, a sua assistente do Responder Já. 🤖\n\nComo posso ajudar a melhorar a sua reputação online hoje?',
      connectionError: 'Desculpe, estou com dificuldades de conexão. Tente novamente mais tarde. 🔌',
      fallback: 'Não consegui processar o pedido.',
      askPlaceholder: 'Pergunte algo...',
      assistant: 'Assistente IA',
      aiHelp: 'Ajuda IA',
      caution: 'A Sofia pode cometer erros. Verifique informações importantes.',
      ariaOpen: 'Abrir Chat de Suporte',
      title: 'Sofia - Responder Já',
    },
    en: {
      welcome: 'Hi! I am Sofia, your Responder Já assistant. 🤖\n\nHow can I help improve your online reputation today?',
      connectionError: 'Sorry, I am having connection issues right now. Please try again shortly. 🔌',
      fallback: 'I could not process your request.',
      askPlaceholder: 'Ask me something...',
      assistant: 'AI Assistant',
      aiHelp: 'AI Help',
      caution: 'Sofia can make mistakes. Verify important information.',
      ariaOpen: 'Open Support Chat',
      title: 'Sofia - Responder Já',
    },
    es: {
      welcome: '¡Hola! Soy Sofia, tu asistente de Responder Já. 🤖\n\n¿Cómo puedo ayudarte a mejorar tu reputación online hoy?',
      connectionError: 'Lo siento, tengo problemas de conexión ahora mismo. Inténtalo de nuevo en breve. 🔌',
      fallback: 'No pude procesar tu solicitud.',
      askPlaceholder: 'Pregúntame algo...',
      assistant: 'Asistente IA',
      aiHelp: 'Ayuda IA',
      caution: 'Sofia puede cometer errores. Verifica la información importante.',
      ariaOpen: 'Abrir Chat de Soporte',
      title: 'Sofia - Responder Já',
    },
  }[lang];

  const { isSignedIn, getToken } = useAuth();
  const [audience, setAudience] = useState<string | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => readDismissed());
  const [teaserClosed, setTeaserClosed] = useState(false);
  const [proposalState, setProposalState] = useState<Record<string, ProposalState>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: i18n.welcome,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: i18n.welcome,
      timestamp: new Date(),
    }]);
  }, [i18n.welcome]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen, isMinimized]);

  // Avisos proativos (sem IA): ao entrar e a cada 10 minutos.
  useEffect(() => {
    if (!isSignedIn) { setNudges([]); setAudience(null); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/sofia/nudges', { headers: await buildAuthHeaders({ getToken }) });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) { setNudges(Array.isArray(data.nudges) ? data.nudges : []); setAudience(data.audience || null); }
      } catch { /* sem avisos */ }
    };
    load();
    const timer = window.setInterval(load, 10 * 60 * 1000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [isSignedIn, getToken]);

  const visibleNudges = nudges.filter((n) => !dismissed.includes(n.id));
  const dismissNudge = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    writeDismissed(next);
  };
  const navView: 'app' | 'backoffice' = audience === 'operator' || audience === 'super_admin' ? 'backoffice' : 'app';

  const runProposal = async (key: string, p: Proposal) => {
    if (p.kind === 'navigate') {
      sofiaNavigate(p.view || navView, p.tab || '');
      setProposalState((s) => ({ ...s, [key]: { status: 'done', message: 'Aberto.' } }));
      return;
    }
    setProposalState((s) => ({ ...s, [key]: { status: 'running' } }));
    try {
      const headers = await buildAuthHeaders({ getToken });
      const res = await fetch(p.path || '', { method: p.method || 'POST', headers, body: JSON.stringify(p.body || {}) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `Erro ${res.status}`);
      setProposalState((s) => ({ ...s, [key]: { status: 'done', message: 'Feito.' } }));
      window.dispatchEvent(new CustomEvent('sofia:changed', { detail: { path: p.path } }));
    } catch (error: any) {
      setProposalState((s) => ({ ...s, [key]: { status: 'error', message: error?.message || 'Não foi possível.' } }));
    }
  };

  useEffect(() => {
    const openFromDashboard = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('sofia:open', openFromDashboard);
    return () => window.removeEventListener('sofia:open', openFromDashboard);
  }, []);

  const handleSendMessage = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const userMsg = (preset ?? inputValue).trim();
    if (!userMsg || isLoading) return;

    const userMessageObj: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessageObj]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.filter((m) => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content }));
      const response = isSignedIn
        ? await fetch('/api/sofia/chat', {
            method: 'POST',
            headers: await buildAuthHeaders({ getToken }),
            body: JSON.stringify({ message: userMsg, history, language: lang }),
          })
        : await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userMsg, history, language: lang }),
          });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Network error');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || i18n.fallback,
        timestamp: new Date(),
        proposals: Array.isArray(data.proposals) ? data.proposals : [],
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Sofia Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: (error as any)?.message && !(String((error as any).message).includes('Network')) ? `${(error as any).message} 🔌` : i18n.connectionError,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const avatarUrl = "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";

  if (!isOpen) {
    const top = visibleNudges[0];
    return (
      <>
      {top && !teaserClosed && (
        <div className="fixed bottom-24 right-6 z-50 max-w-[300px] rounded-2xl border border-slate-200 bg-white p-3 pr-8 text-sm text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 animate-fade-in">
          <button onClick={() => setTeaserClosed(true)} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600" aria-label="Fechar aviso"><X size={14} /></button>
          <button className="text-left" onClick={() => { setIsOpen(true); setIsMinimized(false); }}>
            <span className="font-semibold">Sofia:</span> {top.text}
            {visibleNudges.length > 1 && <span className="mt-1 block text-xs text-slate-500">+{visibleNudges.length - 1} {visibleNudges.length === 2 ? 'aviso' : 'avisos'}</span>}
          </button>
        </div>
      )}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group animate-fade-in"
        aria-label={i18n.ariaOpen}
      >
        <div className="relative">
          <Avatar className="w-8 h-8 border-2 border-white/20">
            <AvatarImage src={avatarUrl} alt="Sofia AI" />
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-brand-600 rounded-full"></span>
        </div>
        <span className="font-medium pr-1 hidden sm:inline">{i18n.aiHelp}</span>
        {visibleNudges.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{visibleNudges.length}</span>
        )}
      </button>
      </>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
        <div 
          className="flex items-center justify-between p-3 bg-gradient-to-r from-brand-600 to-purple-600 rounded-t-xl cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2 text-white">
            <Avatar className="w-6 h-6 border border-white/30">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">{i18n.title}</span>
          </div>
          <div className="flex gap-2 text-white/80">
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[90vw] sm:w-[380px] h-[500px] sm:h-[600px] max-h-[80vh] flex flex-col bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-600 to-purple-600 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-white/20 shadow-sm">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-brand-700 bg-white">S</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-brand-600 rounded-full animate-pulse"></span>
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Sofia</h3>
            <p className="text-xs text-white/80 flex items-center gap-1">
              <Sparkles size={10} /> {i18n.assistant}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/90"
            title="Minimizar"
          >
            <Minus size={18} />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/90"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        {visibleNudges.length > 0 && (
          <div className="space-y-2">
            {visibleNudges.map((n) => (
              <div key={n.id} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${n.level === 'critical' ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200' : n.level === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200' : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200'}`}>
                <Bell size={14} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p>{n.text}</p>
                  <button onClick={() => sofiaNavigate(navView, n.destination)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold underline">Ver <ArrowRight size={12} /></button>
                </div>
                <button onClick={() => dismissNudge(n.id)} className="opacity-60 hover:opacity-100" aria-label="Dispensar aviso"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {isSignedIn && audience && messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {(QUICK_PROMPTS[audience] || []).map((q) => (
              <button key={q} onClick={() => handleSendMessage(undefined, q)} disabled={isLoading}
                className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50 dark:border-brand-800 dark:bg-slate-900 dark:text-brand-300">
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
              }`}
            >
              {msg.content.split('\n').map((line, i) => (
                <p key={i} className={`min-h-[1.2em] ${i > 0 ? 'mt-1' : ''}`}>
                   {line || <br/>}
                </p>
              ))}
              {msg.proposals && msg.proposals.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.proposals.map((p, idx) => {
                    const key = `${msg.id}-${idx}`;
                    const st = proposalState[key] || { status: 'idle' };
                    return (
                      <div key={key} className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-800 dark:bg-brand-950/30">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{p.label}</p>
                        {p.detail && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{p.detail}</p>}
                        {st.status === 'done' && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle2 size={14} /> {st.message}</p>}
                        {st.status === 'error' && <p className="mt-2 text-xs font-semibold text-red-600">{st.message}</p>}
                        {st.status === 'cancelled' && <p className="mt-2 text-xs text-slate-500">Cancelado.</p>}
                        {(st.status === 'idle' || st.status === 'error' || st.status === 'running') && (
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => runProposal(key, p)} disabled={st.status === 'running'}
                              className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                              {st.status === 'running' ? <Loader2 size={12} className="animate-spin" /> : p.kind === 'navigate' ? <ArrowRight size={12} /> : <CheckCircle2 size={12} />}
                              {p.kind === 'navigate' ? 'Abrir' : 'Confirmar'}
                            </button>
                            {p.kind === 'api' && st.status !== 'running' && (
                              <button onClick={() => setProposalState((s) => ({ ...s, [key]: { status: 'cancelled' } }))}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300">
                                Cancelar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={`text-[10px] mt-1 text-right opacity-70 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form 
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-transparent focus-within:border-brand-300 dark:focus-within:border-brand-800 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/30 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={i18n.askPlaceholder}
            className="flex-1 bg-transparent border-none outline-none text-sm px-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={`p-2.5 rounded-lg transition-all duration-200 ${
              !inputValue.trim() || isLoading
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm active:scale-95'
            }`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
        <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {i18n.caution}
            </p>
        </div>
      </div>
    </div>
  );
};

export default SofiaChat;
