import React from "react";
import { Lock, X } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onUpgrade?: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  title = "Funcionalidade bloqueada no teu plano",
  description = "Faz upgrade para desbloquear esta funcionalidade.",
  onUpgrade
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
          >
            Fechar
          </button>
          <button
            onClick={onUpgrade}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Ver planos
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
