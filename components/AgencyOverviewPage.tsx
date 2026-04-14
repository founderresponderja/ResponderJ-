import React from 'react';
import jsPDF from 'jspdf';
import { Building2, Clock3, Download, Star, MessageSquare } from 'lucide-react';

type AgencyClientOverview = {
  clientId: number;
  clientName: string;
  logoUrl?: string | null;
  pendingReviews: number;
  averageRating: number;
  responsesThisWeek: number;
  connectedPlatforms: string[];
};

interface AgencyOverviewPageProps {
  clients: AgencyClientOverview[];
}

const AgencyOverviewPage: React.FC<AgencyOverviewPageProps> = ({ clients }) => {
  const exportClientReport = (client: AgencyClientOverview) => {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text(`Relatorio Mensal - ${client.clientName}`, 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Data: ${new Date().toLocaleDateString()}`, 14, 28);
    pdf.text(`Reviews pendentes: ${client.pendingReviews}`, 14, 40);
    pdf.text(`Avaliacao media: ${client.averageRating.toFixed(2)} / 5`, 14, 48);
    pdf.text(`Respostas esta semana: ${client.responsesThisWeek}`, 14, 56);
    pdf.text(`Plataformas ligadas: ${client.connectedPlatforms.join(', ') || 'Nenhuma'}`, 14, 64);
    pdf.save(`relatorio-${client.clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Agency Overview</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visao consolidada dos teus clientes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {clients.map((client) => (
          <div key={client.clientId} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              {client.logoUrl ? (
                <img src={client.logoUrl} alt={client.clientName} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Building2 size={18} className="text-slate-500" />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{client.clientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{client.connectedPlatforms.join(', ') || 'Sem plataformas ligadas'}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1"><Clock3 size={14} /> Reviews pendentes</span>
                <span className="font-semibold">{client.pendingReviews}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1"><Star size={14} /> Avaliacao media</span>
                <span className="font-semibold">{client.averageRating.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1"><MessageSquare size={14} /> Respostas esta semana</span>
                <span className="font-semibold">{client.responsesThisWeek}</span>
              </div>
            </div>

            <button
              onClick={() => exportClientReport(client)}
              className="mt-4 w-full px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download size={14} /> Exportar PDF mensal
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgencyOverviewPage;
