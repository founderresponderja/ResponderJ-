import React from 'react';
import { 
  ArrowLeft, 
  Scale, 
  ShieldCheck, 
  FileText, 
  Building2, 
  Gavel,
  AlertCircle
} from 'lucide-react';

interface TermsAndConditionsPageProps {
  onBack: () => void;
}

const TermsAndConditionsPage: React.FC<TermsAndConditionsPageProps> = ({ onBack }) => {
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
                <FileText className="w-6 h-6" />
                Termos e Condições
              </h1>
              <p className="text-purple-100 text-sm mt-1">Última atualização: 27 de agosto de 2025</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          
          {/* Legal Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900 m-0">Informação Legal</h2>
            </div>
            <div className="text-blue-800 text-sm space-y-1">
              <p><strong>Entidade:</strong> Amplia Solutions Unipessoal, Lda.</p>
              <p><strong>Produto:</strong> Responder Já - Plataforma de Gestão de Respostas com IA</p>
              <p><strong>Legislação aplicável:</strong> Direito Português e Europeu (RGPD)</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            <h1>Termos e Condições de Utilização</h1>

            <h2>1. DISPOSIÇÕES GERAIS</h2>
            <h3>1.1 Aceitação dos Termos</h3>
            <p>
              Ao aceder e utilizar a plataforma Responder Já, operada pela <strong>Amplia Solutions Unipessoal, Lda.</strong> (doravante "Empresa"), o utilizador (doravante "Cliente" ou "Utilizador") declara aceitar integralmente os presentes Termos e Condições, bem como a nossa Política de Privacidade e Política de Cookies.
            </p>
            <h3>1.2 Alterações aos Termos</h3>
            <p>
              A Empresa reserva-se o direito de alterar estes termos a qualquer momento, mediante notificação prévia de 30 dias através de email ou aviso na plataforma. A continuação da utilização dos serviços após as alterações constitui aceitação dos novos termos.
            </p>

            <h2>2. DESCRIÇÃO DOS SERVIÇOS</h2>
            <h3>2.1 Plataforma Responder Já</h3>
            <p>
              A Responder Já é uma plataforma SaaS (Software as a Service) que utiliza tecnologia de Inteligência Artificial para gerar respostas personalizadas para avaliações e comentários em múltiplas plataformas digitais, incluindo mas não limitado a:
            </p>
            <ul>
              <li>Google My Business</li>
              <li>Booking.com e Airbnb</li>
              <li>TheFork</li>
              <li>Facebook e Instagram</li>
              <li>TripAdvisor</li>
              <li>Outras redes sociais e plataformas de avaliação</li>
            </ul>

            <h3>2.2 Funcionalidades Principais</h3>
            <ul>
              <li><strong>Geração de Respostas com IA:</strong> Criação automática de 3 variações de resposta para cada review</li>
              <li><strong>Personalização por Plataforma:</strong> Respostas adaptadas aos requisitos específicos de cada plataforma</li>
              <li><strong>Gestão de Leads:</strong> Sistema completo de importação, segmentação e follow-up</li>
              <li><strong>Campanhas de Email:</strong> Envio automatizado e personalizado de campanhas</li>
              <li><strong>Analytics Avançados:</strong> Relatórios detalhados sobre performance e engagement</li>
              <li><strong>Gestão de Equipas:</strong> Colaboração multi-utilizador com controlo de permissões</li>
            </ul>

            <h2>3. PLANOS E SISTEMA DE CRÉDITOS</h2>
            <h3>3.1 Período de Teste</h3>
            <p>
              Oferecemos um período de teste gratuito de <strong>7 dias</strong> com 50 créditos incluídos, sem necessidade de cartão de crédito. O teste inicia automaticamente após o registo.
            </p>

            <h3>3.2 Planos de Subscrição</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 not-prose mb-4">
              <ul className="space-y-2 mb-0">
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-brand-500 rounded-full"></span><span><strong>Starter (€19/mês):</strong> 100 créditos mensais + funcionalidades básicas</span></li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span><span><strong>Pro (€49/mês):</strong> 500 créditos mensais + analytics avançados + gestão de equipas</span></li>
                <li className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span><span><strong>Enterprise (€149/mês):</strong> 2000 créditos mensais + todas as funcionalidades + suporte prioritário</span></li>
              </ul>
            </div>

            <h3>3.3 Sistema de Créditos</h3>
            <ul>
              <li>Cada geração de resposta consome <strong>1 crédito</strong></li>
              <li>Créditos não utilizados expiram no final do ciclo de faturação</li>
              <li>Créditos adicionais podem ser adquiridos conforme necessário</li>
            </ul>

            <h2>4. OBRIGAÇÕES DO UTILIZADOR</h2>
            <h3>4.1 Utilização Adequada</h3>
            <p>O Utilizador compromete-se a:</p>
            <ul>
              <li>Utilizar os serviços de forma legal e ética</li>
              <li>Fornecer informações verdadeiras e atualizadas</li>
              <li>Não partilhar credenciais de acesso com terceiros</li>
              <li>Respeitar os limites de utilização do plano contratado</li>
              <li>Não utilizar a plataforma para atividades fraudulentas ou maliciosas</li>
            </ul>

            <h3>4.2 Conteúdo Gerado</h3>
            <p>
              O Utilizador é responsável por revisar e aprovar todo o conteúdo gerado pela IA antes da publicação. A Empresa não se responsabiliza por conteúdo inadequado que seja publicado sem revisão prévia.
            </p>

            <h2>5. PRIVACIDADE E PROTEÇÃO DE DADOS</h2>
            <h3>5.1 Conformidade RGPD</h3>
            <p>
              Os serviços estão em total conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) e a Lei n.º 58/2019 de 8 de agosto. Para informações detalhadas sobre tratamento de dados, consulte a nossa <a href="/politica-privacidade" className="text-purple-600 hover:underline">Política de Privacidade</a>.
            </p>

            <h3>5.2 Segurança dos Dados</h3>
            <p>Implementamos medidas de segurança de nível militar, incluindo:</p>
            <ul>
              <li>Criptografia AES-256-GCM para dados em trânsito e repouso</li>
              <li>Autenticação multi-fator obrigatória</li>
              <li>Monitorização contínua de segurança 24/7</li>
              <li>Auditorias de segurança regulares</li>
            </ul>

            <h2>6. PROPRIEDADE INTELECTUAL</h2>
            <h3>6.1 Direitos da Empresa</h3>
            <p>
              Todos os direitos de propriedade intelectual sobre a plataforma, incluindo software, design, marca e documentação, pertencem exclusivamente à Amplia Solutions Unipessoal, Lda.
            </p>
            <h3>6.2 Direitos do Utilizador</h3>
            <p>
              O Utilizador mantém todos os direitos sobre o conteúdo que insere na plataforma e sobre as respostas geradas após revisão e aprovação.
            </p>

            <h2>7. LIMITAÇÃO DE RESPONSABILIDADE</h2>
            <h3>7.1 Disponibilidade do Serviço</h3>
            <p>
              Embora nos esforcemos para manter 99.9% de uptime, não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com 48 horas de antecedência.
            </p>
            <h3>7.2 Conteúdo Gerado por IA</h3>
            <p>
              A IA é uma ferramenta de apoio. O Utilizador é responsável por revisar e aprovar todo o conteúdo antes da publicação. Não nos responsabilizamos por consequências de conteúdo publicado sem revisão.
            </p>

            <h2>8. RESCISÃO</h2>
            <h3>8.1 Rescisão pelo Utilizador</h3>
            <p>
              O Utilizador pode cancelar a subscrição a qualquer momento através das definições da conta. O acesso mantém-se até ao final do período pago.
            </p>
            <h3>8.2 Rescisão pela Empresa</h3>
            <p>
              Reservamos o direito de suspender ou encerrar contas em caso de violação destes termos, com aviso prévio de 15 dias exceto em casos de violação grave.
            </p>

            <h2>9. JURISDIÇÃO E LEI APLICÁVEL</h2>
            <h3>9.1 Lei Aplicável</h3>
            <p>Estes Termos são regidos pela lei portuguesa e pelas diretivas europeias aplicáveis.</p>
            <h3>9.2 Resolução de Conflitos</h3>
            <p>
              Tentamos resolver disputas amigavelmente. Caso não seja possível, os tribunais portugueses têm jurisdição exclusiva para dirimir quaisquer litígios.
            </p>

            <h2>10. CONTACTOS</h2>
            <p>Para questões relacionadas com estes Termos e Condições, contacte-nos através de:</p>
            <ul>
              <li><strong>Email:</strong> legal@ampliasolutions.pt</li>
              <li><strong>Telefone:</strong> +351 XXX XXX XXX</li>
              <li><strong>Morada:</strong> [Endereço da Amplia Solutions Unipessoal, Lda.]</li>
            </ul>
          </div>

          <div className="mt-12 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900 m-0">Certificação Legal</h3>
            </div>
            <p className="text-green-800 mb-0 text-sm">
              Este documento foi elaborado em conformidade com a legislação portuguesa, europeia e regulamentação RGPD por especialistas jurídicos qualificados.<br/><br/>
              <strong>Última revisão legal:</strong> 27 de agosto de 2025
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;