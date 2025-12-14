import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { Logo } from './Logo';

interface PageHeaderProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  backUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description,
  showBackButton = true, 
  showHomeButton = false, 
  backUrl = '/', 
  children,
  className = ''
}) => {
  return (
    <header className={`border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-4">
            <Logo size={24} showText={true} />
            {title && (
              <div className="hidden sm:block pl-4 border-l border-slate-200 dark:border-slate-700">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h1>
                {description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {children}
            {showHomeButton && (
              <a 
                href="/" 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Início</span>
              </a>
            )}
            {showBackButton && (
              <a 
                href={backUrl} 
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;