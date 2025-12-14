import React from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  UserCheck, 
  Eye, 
  Database, 
  Briefcase, 
  Lock, 
  Server, 
  Mail, 
  CreditCard,
  Scale,
  Clock
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 text-slate-900 font-sans animate-fade-in">
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg border-b border-purple-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium text-white/90 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                Política de Privacidade
              </h1>
              <p className="text-purple-100 text-sm mt-1">Última atualização: 27 de agosto de 2025</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          
          {/* Commitment Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900 m-0">Compromisso com a Privacidade</h2>
            </div>
            <p className="text-blue-800 mb-0 leading-relaxed">
              A <strong>Amplia Solutions Unipessoal, Lda.</strong> está comprometida com a proteção da sua privacidade e o cumprimento rigoroso do RGPD e da legislação portuguesa sobre proteção de dados.
            </p>
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            <h1>Política de Privacidade - Responder Já</h1>

            <h2>1. RESPONSÁVEL PELO TRATAMENTO DOS DADOS</h2>
            <div className="bg-slate-50 p-6 rounded-lg not-prose border border-slate-100">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Entidade Responsável:</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li><strong>Denominação:</strong> Amplia Solutions Unipessoal, Lda.</li>
                <li><strong>NIF:</strong> [Número de Identificação Fiscal]</li>
                <li><strong>Morada:</strong> [Endereço completo]</li>
                <li><strong>Email:</strong> dpo@ampliasolutions.pt</li>
                <li><strong>Telefone:</strong> +351 XXX XXX XXX</li>
              </ul>
            </div>

            <h2>2. DADOS PESSOAIS RECOLHIDOS</h2>
            
            <h3>2.1 Dados de Registo e Identificação</h3>
            <div className="flex items-start gap-4 mb-6 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
              <Eye className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-purple-900 mb-2">Dados recolhidos:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Nome completo (primeiro nome e apelido)</li>
                  <li>Endereço de email (utilizado como identificador único)</li>
                  <li>Palavra-passe (criptografada com bcrypt)</li>
                  <li>Data de registo e última sessão</li>
                  <li>Tipo de plano e créditos disponíveis</li>
                </ul>
              </div>
            </div>

            <h3>2.2 Dados de Utilização e Técnicos</h3>
            <div className="flex items-start gap-4 mb-6 p-4 bg-green-50/50 rounded-lg border border-green-100">
              <Database className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Endereço IP e localização geográfica aproximada</li>
                  <li>Informações do dispositivo e navegador</li>
                  <li>Páginas visitadas e tempo de permanência</li>
                  <li>Interações com a plataforma (cliques, formulários)</li>
                  <li>Logs de sistema para segurança e debug</li>
                </ul>
              </div>
            </div>

            <h3>2.3 Dados de Negócio e Conteúdo</h3>
            <div className="flex items-start gap-4 mb-6 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
              <Briefcase className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Informações do perfil de negócio</li>
                  <li>Conteúdo das reviews e respostas geradas</li>
                  <li>Configurações de tom e personalização</li>
                  <li>Dados de integração com plataformas externas</li>
                  <li>Histórico de campanhas e leads</li>
                </ul>
              </div>
            </div>

            <h2>3. FINALIDADES DO TRATAMENTO</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3>3.1 Prestação de Serviços</h3>
                <p className="text-xs text-slate-500 font-mono mb-2">Art. 6º nº1 al. b) RGPD</p>
                <ul>
                  <li>Criação e gestão de conta de utilizador</li>
                  <li>Processamento de pagamentos e faturação</li>
                  <li>Geração de respostas personalizadas com IA</li>
                  <li>Envio de campanhas de email e notificações</li>
                  <li>Fornecimento de analytics e relatórios</li>
                </ul>
              </div>
              <div>
                <h3>3.2 Interesses Legítimos</h3>
                <p className="text-xs text-slate-500 font-mono mb-2">Art. 6º nº1 al. f) RGPD</p>
                <ul>
                  <li>Melhoria contínua dos serviços e experiência do utilizador</li>
                  <li>Prevenção de fraude e garantia de segurança</li>
                  <li>Análise de performance e otimização da plataforma</li>
                  <li>Comunicação sobre atualizações importantes do serviço</li>
                </ul>
              </div>
              <div>
                <h3>3.3 Consentimento Explícito</h3>
                <p className="text-xs text-slate-500 font-mono mb-2">Art. 6º nº1 al. a) RGPD</p>
                <ul>
                  <li>Envio de newsletters e comunicações promocionais</li>
                  <li>Utilização de cookies não essenciais</li>
                  <li>Personalização avançada com base em preferências</li>
                </ul>
              </div>
              <div>
                <h3>3.4 Obrigações Legais</h3>
                <p className="text-xs text-slate-500 font-mono mb-2">Art. 6º nº1 al. c) RGPD</p>
                <ul>
                  <li>Conservação de registos fiscais e contabilísticos</li>
                  <li>Resposta a solicitações das autoridades competentes</li>
                  <li>Cumprimento de regulamentação setorial</li>
                </ul>
              </div>
            </div>

            <h2>4. CONSERVAÇÃO DOS DADOS</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <h3 className="text-yellow-900 mt-0 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Períodos de Conservação
              </h3>
              <ul className="mb-0 text-yellow-800 space-y-2">
                <li><strong>Dados de conta ativa:</strong> Durante a vigência da relação contratual</li>
                <li><strong>Dados fiscais:</strong> 10 anos (obrigação legal portuguesa)</li>
                <li><strong>Logs de segurança:</strong> 12 meses</li>
                <li><strong>Dados de marketing:</strong> Até retirada do consentimento</li>
                <li><strong>Dados de suporte:</strong> 3 anos após resolução</li>
              </ul>
            </div>

            <h2>5. PARTILHA DE DADOS COM TERCEIROS</h2>
            <h3>5.1 Prestadores de Serviços (Subcontratantes)</h3>
            <p>Partilhamos dados apenas com fornecedores certificados sob contratos rígidos de proteção de dados:</p>
            
            <div className="grid md:grid-cols-2 gap-4 my-6 not-prose">
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-bold mb-2 text-purple-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Hosting e Infraestrutura
                </h4>
                <p className="mb-1 text-sm text-slate-800"><strong>Replit/Neon:</strong> Hosting da aplicação e base de dados</p>
                <p className="text-xs text-slate-500">Localização: Europa/EUA com adequação RGPD</p>
              </div>
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-bold mb-2 text-blue-700 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Inteligência Artificial
                </h4>
                <p className="mb-1 text-sm text-slate-800"><strong>OpenAI:</strong> Processamento de IA para geração de respostas</p>
                <p className="text-xs text-slate-500">Dados anonimizados, sem armazenamento permanente</p>
              </div>
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-bold mb-2 text-green-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Comunicações
                </h4>
                <p className="mb-1 text-sm text-slate-800"><strong>SendGrid:</strong> Envio de emails transacionais e campanhas</p>
                <p className="text-xs text-slate-500">Certificado ISO 27001, conforme RGPD</p>
              </div>
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-bold mb-2 text-orange-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Pagamentos
                </h4>
                <p className="mb-1 text-sm text-slate-800"><strong>Stripe:</strong> Processamento seguro de pagamentos</p>
                <p className="text-xs text-slate-500">PCI DSS Nível 1, dados não acessíveis pela Amplia</p>
              </div>
            </div>

            <h3>5.2 Garantias de Proteção</h3>
            <ul>
              <li>Todos os subcontratantes assinaram Acordos de Tratamento de Dados (DPA)</li>
              <li>Transferências internacionais cobertas por Cláusulas Contratuais Tipo</li>
              <li>Auditoria regular do cumprimento das medidas de segurança</li>
            </ul>

            <h2>6. SEGURANÇA DOS DADOS</h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                <h3 className="text-green-900 m-0 text-lg font-bold">Medidas de Segurança Implementadas</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6 text-green-800">
                <div>
                  <h4 className="text-green-900 font-semibold mb-2">🔐 Criptografia</h4>
                  <ul className="text-sm space-y-1">
                    <li>AES-256-GCM para dados em repouso</li>
                    <li>TLS 1.3 para dados em trânsito</li>
                    <li>Bcrypt para palavras-passe</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-green-900 font-semibold mb-2">🛡️ Controlo de Acesso</h4>
                  <ul className="text-sm space-y-1">
                    <li>Autenticação multi-fator obrigatória</li>
                    <li>Controlo baseado em funções (RBAC)</li>
                    <li>Sessões com timeout automático</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-green-900 font-semibold mb-2">📊 Monitorização</h4>
                  <ul className="text-sm space-y-1">
                    <li>Detecção de intrusões em tempo real</li>
                    <li>Logs de auditoria completos</li>
                    <li>Alertas automáticos de segurança</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-green-900 font-semibold mb-2">🔍 Testes Regulares</h4>
                  <ul className="text-sm space-y-1">
                    <li>Pentests trimestrais</li>
                    <li>Avaliações de vulnerabilidade</li>
                    <li>Simulações de incident response</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2>7. DIREITOS DOS TITULARES DOS DADOS</h2>
            <p>De acordo com o RGPD, tem os seguintes direitos sobre os seus dados pessoais:</p>
            
            <div className="grid md:grid-cols-2 gap-4 my-6 not-prose">
              <div className="border-l-4 border-purple-500 bg-white p-4 shadow-sm rounded-r-lg">
                <h4 className="text-purple-700 font-bold mb-1">🔍 Direito de Acesso (Art. 15º)</h4>
                <p className="text-sm text-slate-600 m-0">Obter confirmação e cópia dos dados pessoais que tratamos</p>
              </div>
              <div className="border-l-4 border-blue-500 bg-white p-4 shadow-sm rounded-r-lg">
                <h4 className="text-blue-700 font-bold mb-1">✏️ Direito de Retificação (Art. 16º)</h4>
                <p className="text-sm text-slate-600 m-0">Correção de dados inexatos ou incompletos</p>
              </div>
              <div className="border-l-4 border-red-500 bg-white p-4 shadow-sm rounded-r-lg">
                <h4 className="text-red-700 font-bold mb-1">🗑️ Direito de Apagamento (Art. 17º)</h4>
                <p className="text-sm text-slate-600 m-0">Eliminação dos dados quando não há base legal para o tratamento</p>
              </div>
              <div className="border-l-4 border-orange-500 bg-white p-4 shadow-sm rounded-r-lg">
                <h4 className="text-orange-700 font-bold mb-1">⏸️ Direito de Limitação (Art. 18º)</h4>
                <p className="text-sm text-slate-600 m-0">Restrição do tratamento em circunstâncias específicas</p>
              </div>
              <div className="border-l-4 border-green-500 bg-white p-4 shadow-sm rounded-r-lg">
                <h4 className="text-green-700 font-bold mb-1">📦 Direito de Portabilidade (Art. 20º)</h4>
                <p className="text-sm text-slate-600 m-0">Receber dados num formato estruturado e transferi-los</p>
              </div>
              <div className="border-l-4 border-gray-500 bg-white p-4 shadow-sm rounded-r-lg">
                <h4 className="text-gray-700 font-bold mb-1">❌ Direito de Oposição (Art. 21º)</h4>
                <p className="text-sm text-slate-600 m-0">Opor-se ao tratamento baseado em interesses legítimos</p>
              </div>
            </div>

            <h3>7.1 Como Exercer os Seus Direitos</h3>
            <p>Para exercer qualquer dos seus direitos, pode:</p>
            <ul>
              <li><strong>Email:</strong> dpo@ampliasolutions.pt</li>
              <li><strong>Formulário online:</strong> Área de definições da conta</li>
              <li><strong>Correio postal:</strong> [Endereço da empresa]</li>
            </ul>
            <p><strong>Prazo de resposta:</strong> Máximo de 30 dias (pode ser prorrogado por mais 60 dias em casos complexos, com justificação).</p>

            <h2>8. TRANSFERÊNCIAS INTERNACIONAIS</h2>
            <h3>8.1 Países Terceiros</h3>
            <p>Alguns dos nossos prestadores de serviços podem estar localizados fora do Espaço Económico Europeu. Garantimos adequado nível de proteção através de:</p>
            <ul>
              <li><strong>Decisões de Adequação da Comissão Europeia</strong></li>
              <li><strong>Cláusulas Contratuais Tipo da UE</strong></li>
              <li><strong>Certificações internacionais</strong> (Privacy Shield sucessor, ISO 27001)</li>
            </ul>

            <h2>9. COOKIES E TECNOLOGIAS SIMILARES</h2>
            <p>Utilizamos cookies e tecnologias similares para melhorar a sua experiência. Para informações detalhadas, consulte a nossa <a href="/cookies" className="text-purple-600 hover:underline">Política de Cookies</a>.</p>
            <h3>9.1 Categorias de Cookies</h3>
            <ul>
              <li><strong>Essenciais:</strong> Necessários para o funcionamento básico</li>
              <li><strong>Performance:</strong> Analytics e otimização (com consentimento)</li>
              <li><strong>Funcionais:</strong> Personalização da experiência</li>
              <li><strong>Marketing:</strong> Comunicações direcionadas (com consentimento)</li>
            </ul>

            <h2>10. MENORES DE IDADE</h2>
            <p>Os nossos serviços destinam-se a pessoas com mais de 16 anos. Não recolhemos intencionalmente dados de menores. Se tomarmos conhecimento de dados de menores, procederemos à sua eliminação imediata.</p>

            <h2>11. ALTERAÇÕES À POLÍTICA</h2>
            <p>Esta Política pode ser atualizada ocasionalmente. Alterações significativas serão comunicadas com 30 dias de antecedência via email e aviso na plataforma.</p>

            <h2>12. CONTACTOS E RECLAMAÇÕES</h2>
            
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
              <h3 className="mt-0">12.1 Encarregado de Proteção de Dados (DPO)</h3>
              <ul className="mb-0">
                <li><strong>Email:</strong> dpo@ampliasolutions.pt</li>
                <li><strong>Telefone:</strong> +351 XXX XXX XXX</li>
                <li><strong>Horário:</strong> Segunda a Sexta, 9h-18h</li>
              </ul>
            </div>

            <h3>12.2 Autoridade de Controlo</h3>
            <p>Tem o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD):</p>
            <ul>
              <li><strong>Website:</strong> www.cnpd.pt</li>
              <li><strong>Email:</strong> geral@cnpd.pt</li>
              <li><strong>Telefone:</strong> +351 213 928 400</li>
              <li><strong>Morada:</strong> Av. D. Carlos I, 134, 1º, 1200-651 Lisboa</li>
            </ul>
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900 m-0">Certificação e Conformidade</h3>
            </div>
            <p className="text-blue-800 mb-0 text-sm">
              Esta Política de Privacidade foi elaborada em total conformidade com:<br/>
              • Regulamento (UE) 2016/679 (RGPD)<br/>
              • Lei n.º 58/2019 de 8 de agosto (Lei de Proteção de Dados Portuguesa)<br/>
              • Diretiva ePrivacy (2002/58/CE)<br/><br/>
              <strong>Última revisão jurídica:</strong> 27 de agosto de 2025
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;