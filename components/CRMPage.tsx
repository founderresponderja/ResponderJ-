
import React, { useState } from 'react';
import { Users, Plus, Search, X, Save, CheckCircle2, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { translations, Language } from '../utils/translations';

interface CRMPageProps { lang: Language; }
interface Contact {
  id: string; name: string; company: string; email: string; phone: string;
  status: 'lead' | 'prospect' | 'customer';
  stage: 'Novo' | 'Contactado' | 'Convertido';
  lastContact: string; value: number;
}

const CRMPage: React.FC<CRMPageProps> = ({ lang }) => {
  const t = translations[lang].app.crm;
  const common = translations[lang].common;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suggestions, setSuggestions] = useState<Array<{ reviewId: number; contactName: string; companyName: string; reason: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<Contact>>({ name: '', company: '', email: '', phone: '', value: 0, status: 'lead', stage: 'Novo' });

  React.useEffect(() => {
    const load = async () => {
      const [leadsRes, suggRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/leads/suggestions/from-reviews'),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setContacts((data.leads || []).map((l: any) => ({
          id: String(l.id), name: l.contactName || 'Lead', company: l.companyName || 'Empresa', email: l.email || '', phone: l.phone || '',
          status: l.status === 'convertido' ? 'customer' : l.status === 'contactado' ? 'prospect' : 'lead',
          stage: l.status === 'convertido' ? 'Convertido' : l.status === 'contactado' ? 'Contactado' : 'Novo',
          lastContact: (l.updatedAt || l.createdAt || new Date().toISOString()).slice(0, 10), value: 0,
        })));
      }
      if (suggRes.ok) {
        const data = await suggRes.json();
        setSuggestions(data.suggestions || []);
      }
    };
    load();
  }, []);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.company.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalLeads = contacts.length;
  const converted = contacts.filter((c) => c.stage === 'Convertido').length;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const pipelineValue = contacts.reduce((sum, c) => sum + (c.value || 0), 0);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.company) return;
    const status = newContact.stage === 'Convertido' ? 'convertido' : newContact.stage === 'Contactado' ? 'contactado' : 'novo';
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: newContact.company,
        contactName: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        status,
      }),
    });
    if (res.ok) {
      const { lead } = await res.json();
      setContacts((prev) => [{
        id: String(lead.id), name: lead.contactName || 'Lead', company: lead.companyName || 'Empresa',
        email: lead.email || '', phone: lead.phone || '', status: status === 'convertido' ? 'customer' : status === 'contactado' ? 'prospect' : 'lead',
        stage: newContact.stage as any, lastContact: new Date().toISOString().slice(0, 10), value: Number(newContact.value) || 0,
      }, ...prev]);
    }
    setIsModalOpen(false);
    setNewContact({ name: '', company: '', email: '', phone: '', value: 0, status: 'lead', stage: 'Novo' });
  };

  const updateStage = async (contact: Contact, stage: Contact['stage']) => {
    const status = stage === 'Convertido' ? 'convertido' : stage === 'Contactado' ? 'contactado' : 'novo';
    await fetch(`/api/leads/${contact.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setContacts((prev) => prev.map((c) => c.id === contact.id ? { ...c, stage, status: status === 'convertido' ? 'customer' : status === 'contactado' ? 'prospect' : 'lead' } : c));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={18} /> {t.newContact}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><CardContent className="p-6 flex items-center justify-between"><div><p className="text-sm text-slate-500">{t.totalContacts}</p><p className="text-2xl font-bold">{totalLeads}</p></div><Users size={24} /></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center justify-between"><div><p className="text-sm text-slate-500">{t.pipelineValue}</p><p className="text-2xl font-bold">€{pipelineValue.toLocaleString()}</p></div><TrendingUp size={24} /></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center justify-between"><div><p className="text-sm text-slate-500">{t.conversionRate}</p><p className="text-2xl font-bold">{conversionRate}%</p></div><CheckCircle2 size={24} /></CardContent></Card>
      </div>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sugestões de follow-up (reviews positivas)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {suggestions.slice(0, 6).map((s) => (
              <div key={s.reviewId} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                <div><p className="font-medium">{s.contactName} · {s.companyName}</p><p className="text-sm text-slate-500">{s.reason}</p></div>
                <button onClick={() => { setNewContact((p) => ({ ...p, name: s.contactName, company: s.companyName, stage: 'Novo' })); setIsModalOpen(true); }} className="px-3 py-1.5 rounded bg-brand-600 text-white text-xs font-semibold">
                  Criar lead
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="contacts" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="contacts">Leads</TabsTrigger>
          <TabsTrigger value="pipeline">Funil</TabsTrigger>
        </TabsList>
        <TabsContent value="contacts">
          <Card>
            <CardHeader><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input placeholder={t.searchPlaceholder} className="pl-9 w-full rounded-md border py-2 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left"><th className="py-2">Nome</th><th>Empresa</th><th>Estado</th><th className="text-right">Ações</th></tr></thead>
                  <tbody>
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="py-2">{c.name}</td><td>{c.company}</td><td>{c.stage}</td>
                        <td className="text-right space-x-2">
                          <button onClick={() => updateStage(c, 'Novo')} className="text-xs px-2 py-1 rounded bg-slate-200">Novo</button>
                          <button onClick={() => updateStage(c, 'Contactado')} className="text-xs px-2 py-1 rounded bg-blue-200">Contactado</button>
                          <button onClick={() => updateStage(c, 'Convertido')} className="text-xs px-2 py-1 rounded bg-green-200">Convertido</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Novo', 'Contactado', 'Convertido'].map((stage) => (
              <Card key={stage}><CardHeader><CardTitle>{stage}</CardTitle></CardHeader><CardContent className="space-y-2">
                {contacts.filter((c) => c.stage === stage).map((c) => <div key={c.id} className="p-2 rounded border"><p className="font-medium">{c.company}</p><p className="text-xs text-slate-500">{c.name}</p></div>)}
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-4">
            <div className="flex justify-between items-center mb-3"><h3 className="font-bold">{t.newContact}</h3><button onClick={() => setIsModalOpen(false)}><X size={18} /></button></div>
            <form onSubmit={handleAddContact} className="space-y-3">
              <input required value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} placeholder="Nome" className="w-full rounded border p-2" />
              <input required value={newContact.company} onChange={(e) => setNewContact((p) => ({ ...p, company: e.target.value }))} placeholder="Empresa" className="w-full rounded border p-2" />
              <input value={newContact.email} onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="w-full rounded border p-2" />
              <select value={newContact.stage} onChange={(e) => setNewContact((p) => ({ ...p, stage: e.target.value as any }))} className="w-full rounded border p-2">
                <option value="Novo">Novo</option><option value="Contactado">Contactado</option><option value="Convertido">Convertido</option>
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded">{common.cancel}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-brand-600 text-white rounded flex items-center justify-center gap-2"><Save size={14} />{common.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
