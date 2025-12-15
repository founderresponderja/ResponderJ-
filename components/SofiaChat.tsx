
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Minus, 
  Sparkles, 
  Loader2
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SofiaChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Olá! Sou a Sofia, a sua assistente do Responder Já. 🤖\n\nComo posso ajudar a melhorar a sua reputação online hoje?',
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
    if (isOpen && !isMinimized) {
      scrollToBottom();
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue;
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
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) throw new Error('Network error');

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "Não consegui processar o pedido.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Sofia Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, estou com dificuldades de conexão. Tente novamente mais tarde. 🔌',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const avatarUrl = "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80";

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group animate-fade-in"
        aria-label="Abrir Chat de Suporte"
      >
        <div className="relative">
          <Avatar className="w-8 h-8 border-2 border-white/20">
            <AvatarImage src={avatarUrl} alt="Sofia AI" />
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-brand-600 rounded-full"></span>
        </div>
        <span className="font-medium pr-1 hidden sm:inline">Ajuda IA</span>
      </button>
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
            <span className="font-medium text-sm">Sofia - Responder Já</span>
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
              <Sparkles size={10} /> Assistente IA
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
            placeholder="Pergunte algo..."
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
                A Sofia pode cometer erros. Verifique informações importantes.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SofiaChat;
