import React from 'react';
import { ArrowLeft, ShieldCheck, UserCheck, Scale, AlertCircle } from 'lucide-react';

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
                Politica de Privacidade
              </h1>
              <p className="text-purple-100 text-sm mt-1">Ultima atualizacao: 10 de abril de 2026</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900 m-0">Compromisso de conformidade</h2>
            </div>
            <p className="text-blue-800 mb-0 leading-relaxed">
              A Amplia Solutions Unipessoal, Lda. compromete-se a tratar dados pessoais de forma licita, leal, transparente e segura, nos termos do RGPD e legislacao aplicavel.
            </p>
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            <h1>Politica de Privacidade - Responder Ja</h1>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 not-prose mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
                <p className="m-0 text-amber-800 text-sm">
                  Documento preparado para publicacao; recomenda-se revisao juridica periodica sempre que houver mudancas de negocio.
                </p>
              </div>
            </div>

            <h2>1. Responsavel pelo tratamento</h2>
            <ul>
              <li><strong>Entidade:</strong> Amplia Solutions Unipessoal, Lda.</li>
              <li><strong>Email de contacto:</strong> dpo@ampliasolutions.pt</li>
              <li><strong>Morada:</strong> Impasse da Sagrada Familia, n. 10 R/C Esq., 2735-374 Agualva-Cacem, Lisboa, Portugal</li>
              <li><strong>NIF:</strong> PT222428635</li>
            </ul>

            <h2>2. Ambito e legislacao aplicavel</h2>
            <p>Esta Politica aplica-se ao tratamento de dados pessoais no contexto da plataforma Responder Ja e respetivos serviços associados.</p>
            <ul>
              <li>Regulamento (UE) 2016/679 (RGPD).</li>
              <li>Lei n. 58/2019 (execucao do RGPD em Portugal).</li>
              <li>Diretiva ePrivacy e legislacao nacional sobre cookies/comunicacoes eletronicas.</li>
              <li>Demais normas portuguesas, europeias e internacionais aplicaveis.</li>
            </ul>

            <h2>3. Categorias de dados pessoais</h2>
            <ul>
              <li><strong>Conta e autenticacao:</strong> nome, email, identificadores tecnicos, credenciais e estado da conta.</li>
              <li><strong>Dados de utilizacao:</strong> logs, enderecos IP, metadados de dispositivo/navegador, eventos de seguranca e operacao.</li>
              <li><strong>Conteudos introduzidos:</strong> reviews, textos de resposta, configuracoes de tom e informacoes de contexto fornecidas pelo cliente.</li>
              <li><strong>Dados de faturacao:</strong> identificadores de cliente e informacoes de transacao processadas por prestadores de pagamento.</li>
            </ul>

            <h2>4. Finalidades e bases legais</h2>
            <ul>
              <li><strong>Execucao de contrato</strong> (art. 6.1.b RGPD): criar e gerir conta, prestar funcionalidades do Servico, suporte tecnico e faturacao.</li>
              <li><strong>Cumprimento de obrigacoes legais</strong> (art. 6.1.c RGPD): obrigacoes fiscais, contabilisticas e cooperacao com autoridades.</li>
              <li><strong>Interesse legitimo</strong> (art. 6.1.f RGPD): seguranca, prevencao de fraude, melhoria de servico e estabilidade tecnica.</li>
              <li><strong>Consentimento</strong> (art. 6.1.a RGPD): cookies nao essenciais e comunicacoes promocionais, quando exigivel.</li>
            </ul>

            <h2>5. Conservacao dos dados</h2>
            <ul>
              <li><strong>Dados de conta:</strong> durante a relacao contratual e prazos legais subsequentes.</li>
              <li><strong>Registos fiscais/contabilisticos:</strong> por periodo legalmente exigido (tipicamente ate 10 anos).</li>
              <li><strong>Logs tecnicos e de seguranca:</strong> pelo tempo necessario para seguranca, auditoria e defesa de direitos.</li>
              <li><strong>Marketing:</strong> ate retirada de consentimento ou oposicao valida.</li>
            </ul>

            <h2>6. Destinatarios e subcontratantes</h2>
            <p>
              Os dados podem ser tratados por subcontratantes estritamente necessarios a prestacao do Servico (infraestrutura, autenticacao, comunicacoes, pagamentos, IA), ao abrigo de contratos com clausulas de protecao de dados.
            </p>
            <ul>
              <li>O acesso e limitado ao estritamente necessario.</li>
              <li>Sao adotadas medidas tecnicas e organizativas adequadas.</li>
              <li>Quando aplicavel, e celebrado DPA com subcontratantes.</li>
            </ul>

            <h2>7. Transferencias internacionais</h2>
            <p>
              Quando houver transferencias para fora do EEE, sao aplicadas garantias adequadas, incluindo decisoes de adequacao da Comissao Europeia ou Clausulas Contratuais-Tipo, conforme o caso.
            </p>

            <h2>8. Seguranca da informacao</h2>
            <p>
              Sao implementadas medidas de seguranca proporcionais ao risco, incluindo controlo de acessos, cifragem quando aplicavel, registo de eventos, monitorizacao e procedimentos de resposta a incidentes.
            </p>

            <h2>9. Direitos dos titulares</h2>
            <p>Nos termos do RGPD, o titular pode exercer os direitos de:</p>
            <ul>
              <li>Acesso, retificacao, apagamento e limitacao.</li>
              <li>Portabilidade dos dados, quando aplicavel.</li>
              <li>Oposicao a tratamentos baseados em interesse legitimo.</li>
              <li>Retirada de consentimento, sem comprometer tratamentos anteriores licitos.</li>
            </ul>
            <p>Pedidos: <strong>dpo@ampliasolutions.pt</strong>.</p>

            <h2>10. Cookies e tecnologias semelhantes</h2>
            <p>
              Utilizamos cookies estritamente necessarios para funcionamento do Servico e, mediante consentimento quando exigivel, cookies de analise e funcionalidade. Para detalhe adicional, consulte a Politica de Cookies.
            </p>

            <h2>11. Menores</h2>
            <p>
              O Servico nao se destina a menores sem capacidade para contratar nos termos legais aplicaveis. Se houver tratamento indevido de dados de menores, adotaremos medidas para remocao imediata.
            </p>

            <h2>12. Reclamacoes</h2>
            <p>
              O titular pode apresentar reclamacao junto da CNPD: <a href="https://www.cnpd.pt/" className="text-purple-600 hover:underline">www.cnpd.pt</a>.
            </p>

            <h2>13. Alteracoes a esta Politica</h2>
            <p>
              Esta Politica pode ser atualizada por motivos legais, regulatorios ou operacionais. A versao em vigor sera sempre publicada nesta pagina com data de atualizacao.
            </p>
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Scale className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900 m-0">Base legal de referencia</h3>
            </div>
            <p className="text-blue-800 mb-0 text-sm">
              Regulamento (UE) 2016/679 (RGPD), Lei n. 58/2019, regras ePrivacy aplicaveis, e demais normativa portuguesa, europeia e internacional relevante em materia de protecao de dados e comercio eletronico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
