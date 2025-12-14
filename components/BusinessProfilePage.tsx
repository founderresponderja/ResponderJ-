import React, { useState, useEffect } from 'react';
import { Save, Store, Globe, MessageSquare, CircleAlert, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

// Interfaces
interface BusinessProfile {
  id?: string;
  businessName: string;
  businessType: string;
  description: string;
  website: string;
  responseGuidelines: string;
  defaultTone: string;
}

const BusinessProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: "",
    businessType: "",
    description: "",
    website: "",
    responseGuidelines: "",
    defaultTone: "professional"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    // Simulação de fetch de dados
    // Na implementação real, isto chamaria /api/business-profile
    const fetchProfile = async () => {
      try {
        // Simulando delay de rede
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Tentar ler do localStorage para persistência local nesta demo
        const savedProfile = localStorage.getItem('demo_business_profile');
        if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
        } else {
            // Dados de exemplo se não houver nada guardado
            setProfile({
                businessName: "",
                businessType: "",
                description: "",
                website: "",
                responseGuidelines: "",
                defaultTone: "professional"
            });
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field: keyof BusinessProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    // Limpar mensagem ao editar
    if (message) setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    if (!profile.businessName.trim()) {
        setMessage({ type: 'error', text: "O nome do negócio é obrigatório." });
        setIsSaving(false);
        return;
    }

    try {
        // Simulação de save
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Guardar no localStorage para demo
        localStorage.setItem('demo_business_profile', JSON.stringify(profile));
        
        setMessage({ type: 'success', text: "Perfil guardado com sucesso!" });
    } catch (error) {
        setMessage({ type: 'error', text: "Erro ao guardar perfil. Tente novamente." });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Loader2 className="animate-spin w-8 h-8 mb-4 text-brand-600" />
            <p>A carregar perfil...</p>
        </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Perfil de Negócio</h2>
            <p className="text-slate-500 dark:text-slate-400">Personalize a IA com os detalhes da sua empresa para respostas mais precisas.</p>
        </div>

        <form onSubmit={handleSubmit}>
            <Card className="border-0 shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <CardTitle className="text-lg">Informações Gerais</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nome do Negócio *</label>
                            <input 
                                type="text" 
                                value={profile.businessName}
                                onChange={(e) => handleChange('businessName', e.target.value)}
                                placeholder="Ex: Restaurante O Pescador"
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Negócio</label>
                            <select 
                                value={profile.businessType}
                                onChange={(e) => handleChange('businessType', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                            >
                                <option value="">Selecione o tipo</option>
                                <option value="restaurant">Restaurante</option>
                                <option value="hotel">Hotelaria</option>
                                <option value="retail">Retalho</option>
                                <option value="service">Serviços</option>
                                <option value="health">Saúde</option>
                                <option value="beauty">Beleza & Bem-Estar</option>
                                <option value="real-estate">Imobiliária</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Website</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input 
                                type="url" 
                                value={profile.website}
                                onChange={(e) => handleChange('website', e.target.value)}
                                placeholder="https://www.oseunegocio.com"
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição do Negócio</label>
                        <textarea 
                            value={profile.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Descreva o seu negócio, o que o torna único, pratos principais ou serviços..."
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-colors"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6 border-0 shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <CardTitle className="text-lg">Preferências de Resposta</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Diretrizes de Resposta</label>
                        <textarea 
                            value={profile.responseGuidelines}
                            onChange={(e) => handleChange('responseGuidelines', e.target.value)}
                            placeholder="Instruções específicas para a IA (ex: mencionar sempre o número de telefone para reservas, assinar como 'A Gerência', evitar certas palavras...)"
                            rows={4}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-colors"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Estas diretrizes serão usadas para instruir a IA em todas as respostas geradas.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tom Padrão</label>
                        <select 
                            value={profile.defaultTone}
                            onChange={(e) => handleChange('defaultTone', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                        >
                            <option value="professional">Profissional</option>
                            <option value="friendly">Amigável</option>
                            <option value="casual">Informal</option>
                            <option value="grateful">Agradecido</option>
                            <option value="witty">Bem-humorado</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
                <CircleAlert className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">Porquê configurar o perfil?</p>
                    <ul className="list-disc list-inside space-y-1 text-xs opacity-90">
                        <li>Respostas mais personalizadas e relevantes</li>
                        <li>Manter voz da marca consistente</li>
                        <li>Incluir automaticamente informações de contacto quando relevante</li>
                    </ul>
                </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                {message && (
                    <div className={`w-full sm:w-auto text-sm px-4 py-2 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {message.text}
                    </div>
                )}
                <div className="flex-1 hidden sm:block"></div>
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Perfil
                </button>
            </div>
        </form>
    </div>
  );
};

export default BusinessProfilePage;