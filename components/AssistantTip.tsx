import React from 'react';

interface AssistantTipProps {
  status: 'idle' | 'loading' | 'success' | 'error';
}

const AssistantTip: React.FC<AssistantTipProps> = ({ status }) => {
  // Imagem realista de estilo profissional (Unsplash) - Nova foto
  const avatarUrl = "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  let message = "";
  let moodColor = "bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800 text-slate-700 dark:text-slate-300";

  switch (status) {
    case 'idle':
      message = "Olá! Sou a Sofia, a sua assistente de IA. Cole uma review abaixo e eu ajudo a escrever a resposta perfeita num instante.";
      break;
    case 'loading':
      message = "Estou a analisar o sentimento do cliente e a escrever a melhor resposta... Só um momento!";
      moodColor = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300";
      break;
    case 'success':
      message = "Aqui tem! Preparei esta sugestão baseada no que o cliente escreveu. O que acha? Pode copiar ou pedir-me para tentar de novo.";
      moodColor = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300";
      break;
    case 'error':
      message = "Oops, tive um pequeno bloqueio criativo (erro de conexão). Importa-se de tentar novamente?";
      moodColor = "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-300";
      break;
  }

  return (
    <div className="flex items-start gap-4 mb-6 animate-fade-in group">
      <div className="relative flex-shrink-0">
        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-brand-300 to-indigo-300 shadow-md">
            <img 
            src={avatarUrl} 
            alt="AI Assistant Sofia" 
            className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800"
            />
        </div>
        <div className={`absolute bottom-0 right-0 w-4 h-4 border-2 border-white dark:border-slate-900 rounded-full ${status === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
      </div>
      
      <div className="flex-1 mt-1">
        <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Sofia</h3>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">AI Assistant</span>
        </div>
        <div className={`relative p-3 rounded-2xl rounded-tl-none border shadow-sm ${moodColor} transition-colors duration-300`}>
           <p className="text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default AssistantTip;