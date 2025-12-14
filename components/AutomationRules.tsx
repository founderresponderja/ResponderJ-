import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Play, 
  MessageSquare, 
  Star, 
  Heart, 
  Type, 
  X, 
  Save, 
  Bot,
  Activity,
  Beaker,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Switch } from './ui/Switch';
import { AutomationRule } from '../types';

const AutomationRules: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Simulator State
  const [testComment, setTestComment] = useState("Adorei a comida, estava tudo delicioso!");
  const [testRating, setTestRating] = useState("5");
  const [testPlatform, setTestPlatform] = useState("google");
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  // New Rule State
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    platform: 'google',
    isActive: true,
    trigger: { type: 'rating', value: '5', condition: 'equals' },
    action: { type: 'auto_respond', template: 'Agradeça pela avaliação de 5 estrelas e convide a voltar.' }
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/automation/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (error) {
      console.error("Failed to fetch automation rules", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/automation/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      
      if (res.ok) {
        await fetchRules();
        setIsModalOpen(false);
        setNewRule({
            name: '',
            platform: 'google',
            isActive: true,
            trigger: { type: 'rating', value: '5', condition: 'equals' },
            action: { type: 'auto_respond', template: '' }
        });
      }
    } catch (error) {
      console.error("Failed to create rule", error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        setRules(rules.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
      }
    } catch (error) {
      console.error("Failed to toggle rule", error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar esta regra?")) return;
    try {
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRules(rules.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete rule", error);
    }
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResults([]);
    try {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testComment,
          platform: testPlatform,
          rating: parseFloat(testRating),
          sentiment: 'positive' // Simplified for UI
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setTestResults(data.triggeredRules);
      }
    } catch (error) {
      console.error("Test failed", error);
    } finally {
      setIsTesting(false);
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'rating': return <Star className="w-4 h-4 text-amber-500" />;
      case 'sentiment': return <Heart className="w-4 h-4 text-rose-500" />;
      case 'keyword': return <Type className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'equals': return 'igual a';
      case 'contains': return 'contém';
      case 'greater_than': return 'maior que';
      case 'less_than': return 'menor que';
      default: return condition;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Regras de Resposta Automática
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure a IA para responder automaticamente a comentários específicos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={18} /> Nova Regra
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
          {rules.length === 0 && !isLoading ? (
            <Card className="border-dashed border-2 bg-slate-50 dark:bg-slate-900/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Sem regras ativas</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Crie regras para automatizar as suas respostas.</p>
                <button onClick={() => setIsModalOpen(true)} className="text-brand-600 font-medium hover:underline">
                  Criar primeira regra
                </button>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-brand-300 dark:hover:border-brand-700 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${rule.isActive ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <Zap size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white">{rule.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          {rule.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                          {getTriggerIcon(rule.trigger.type)} 
                          <span className="capitalize">{rule.trigger.type}</span>
                        </span>
                        <span className="text-slate-400">is</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {getConditionLabel(rule.trigger.condition)} "{rule.trigger.value}"
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">Execuções</p>
                      <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{rule.triggerCount}</p>
                    </div>
                    <Switch 
                      checked={rule.isActive} 
                      onCheckedChange={() => handleToggleActive(rule.id, rule.isActive)} 
                    />
                    <button 
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {rule.action.template && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <MessageSquare size={12} /> Diretriz de Resposta
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          "{rule.action.template}"
                      </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Simulator Panel */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 sticky top-24">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Beaker className="w-5 h-5 text-brand-600" />
                <CardTitle className="text-lg">Simulador</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plataforma</label>
                <select 
                  value={testPlatform}
                  onChange={(e) => setTestPlatform(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-sm"
                >
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="tripadvisor">TripAdvisor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Classificação</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setTestRating(star.toString())}
                      className={`p-1 transition-colors ${parseInt(testRating) >= star ? 'text-amber-400' : 'text-slate-300'}`}
                    >
                      <Star size={20} fill={parseInt(testRating) >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comentário de Teste</label>
                <textarea 
                  value={testComment}
                  onChange={(e) => setTestComment(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm min-h-[100px]"
                  placeholder="Escreva um comentário para testar as regras..."
                />
              </div>

              <button 
                onClick={handleRunTest}
                disabled={isTesting}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Testar Automação
              </button>

              {testResults.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                  <div className="flex items-center gap-2 text-green-600 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-bold">{testResults.length} Regra(s) Ativada(s)</span>
                  </div>
                  
                  <div className="space-y-3">
                    {testResults.map((result, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                        <div className="font-bold text-slate-900 dark:text-white mb-1">{result.ruleName}</div>
                        <div className="text-slate-500 text-xs mb-2">Ação: {result.action}</div>
                        {result.generatedResponse && (
                          <div className="bg-brand-50 dark:bg-brand-900/20 p-2 rounded text-slate-700 dark:text-slate-300 text-xs border-l-2 border-brand-500">
                            <strong>IA Gerou:</strong><br/>
                            "{result.generatedResponse}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {testResults.length === 0 && !isTesting && (
                 <p className="text-center text-xs text-slate-400 mt-2">Nenhuma regra corresponde aos critérios.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nova Regra de Automação</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateRule} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Regra</label>
                <input 
                  type="text" 
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  placeholder="Ex: Agradecer 5 estrelas Google"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plataforma</label>
                  <select 
                    value={newRule.platform}
                    onChange={(e) => setNewRule({...newRule, platform: e.target.value})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="tripadvisor">TripAdvisor</option>
                    <option value="booking">Booking.com</option>
                    <option value="thefork">TheFork</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gatilho</label>
                  <select 
                    value={newRule.trigger?.type}
                    onChange={(e) => setNewRule({...newRule, trigger: { ...newRule.trigger!, type: e.target.value as any }})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="rating">Classificação (Estrelas)</option>
                    <option value="sentiment">Sentimento</option>
                    <option value="keyword">Palavra-chave</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Condição</label>
                  <select 
                    value={newRule.trigger?.condition}
                    onChange={(e) => setNewRule({...newRule, trigger: { ...newRule.trigger!, condition: e.target.value as any }})}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  >
                    <option value="equals">Igual a</option>
                    <option value="contains">Contém</option>
                    <option value="greater_than">Maior que</option>
                    <option value="less_than">Menor que</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                  {newRule.trigger?.type === 'sentiment' ? (
                      <select 
                        value={newRule.trigger.value}
                        onChange={(e) => setNewRule({...newRule, trigger: { ...newRule.trigger!, value: e.target.value }})}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                      >
                        <option value="positive">Positivo</option>
                        <option value="neutral">Neutro</option>
                        <option value="negative">Negativo</option>
                      </select>
                  ) : (
                      <input 
                        type="text" 
                        required
                        value={newRule.trigger?.value}
                        onChange={(e) => setNewRule({...newRule, trigger: { ...newRule.trigger!, value: e.target.value }})}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                        placeholder={newRule.trigger?.type === 'rating' ? '1-5' : 'Ex: "mau serviço"'}
                      />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Diretrizes da Resposta (Template)</label>
                <textarea 
                  required
                  value={newRule.action?.template}
                  onChange={(e) => setNewRule({...newRule, action: { ...newRule.action!, template: e.target.value }})}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none transition-colors"
                  rows={4}
                  placeholder="Instrua a IA sobre como responder (ex: Agradecer e convidar a voltar, mencionar o prato X...)"
                />
                <p className="text-xs text-slate-500 mt-1">A IA usará este texto como guia para gerar a resposta final.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Save size={16} /> Guardar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRules;