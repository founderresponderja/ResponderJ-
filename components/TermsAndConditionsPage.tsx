import React from 'react';
import { ArrowLeft, FileText, Scale, AlertCircle } from 'lucide-react';

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
                Termos e Condicoes
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
              <Scale className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900 m-0">Identificacao do prestador</h2>
            </div>
            <div className="text-blue-800 text-sm space-y-1">
              <p><strong>Entidade:</strong> Amplia Solutions Unipessoal, Lda.</p>
              <p><strong>Servico:</strong> Responder Ja (SaaS de apoio a resposta a reviews)</p>
              <p><strong>Contacto:</strong> legal@ampliasolutions.pt</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
            <h1>Termos e Condicoes de Utilizacao</h1>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 not-prose mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5" />
                <p className="m-0 text-amber-800 text-sm">
                  Este texto e uma base operacional de conformidade e deve ser validado por assessoria juridica antes de publicacao final.
                </p>
              </div>
            </div>

            <h2>1. Objeto e aceitacao</h2>
            <p>
              Estes Termos regulam o acesso e utilizacao da plataforma Responder Ja ("Servico"), disponibilizada pela Amplia Solutions Unipessoal, Lda. ("Prestador"). Ao utilizar o Servico, o Utilizador aceita estes Termos, a Politica de Privacidade e a Politica de Cookies.
            </p>

            <h2>2. Elegibilidade e conta</h2>
            <ul>
              <li>O Utilizador deve ter capacidade juridica para contratar.</li>
              <li>As credenciais de acesso sao pessoais e intransmissiveis.</li>
              <li>O Utilizador deve notificar imediatamente uso indevido da conta.</li>
            </ul>

            <h2>3. Descricao do servico</h2>
            <p>
              O Servico disponibiliza funcionalidades de apoio por IA para producao e gestao de respostas em canais digitais e ferramentas de suporte operacional.
            </p>
            <ul>
              <li>As sugestoes geradas por IA sao apoio a decisao e exigem revisao humana.</li>
              <li>O Utilizador e responsavel pelo conteudo final publicado e pela respetiva conformidade legal.</li>
            </ul>

            <h2>4. Planos, pagamentos e renovacao</h2>
            <ul>
              <li>Os planos, precos e limites de utilizacao constam da pagina comercial em vigor.</li>
              <li>Salvo indicacao em contrario, a subscricao renova automaticamente.</li>
              <li>O cancelamento produz efeitos no fim do periodo pago, salvo obrigacao legal diversa.</li>
              <li>Em caso de incumprimento de pagamento, o acesso pode ser suspenso ate regularizacao.</li>
            </ul>

            <h2>5. Obrigacoes do Utilizador</h2>
            <ul>
              <li>Utilizar o Servico de forma licita, diligente e de boa-fe.</li>
              <li>Nao inserir conteudo ilicito, difamatorio, discriminatorio ou que viole direitos de terceiros.</li>
              <li>Garantir base legal para tratamento de dados pessoais carregados no Servico.</li>
              <li>Nao contornar limites tecnicos, mecanismos de seguranca ou politicas de uso.</li>
            </ul>

            <h2>6. Protecao de dados e privacidade</h2>
            <p>
              O tratamento de dados pessoais e efetuado em conformidade com o Regulamento (UE) 2016/679 (RGPD), Lei n. 58/2019 e demais legislacao aplicavel. Detalhes constam na Politica de Privacidade.
            </p>

            <h2>7. Propriedade intelectual</h2>
            <ul>
              <li>O software, marca, design e documentacao pertencem ao Prestador ou licenciantes.</li>
              <li>E concedida licenca limitada, nao exclusiva e nao transferivel para uso do Servico durante a subscricao ativa.</li>
            </ul>

            <h2>8. Disponibilidade, manutencao e alteracoes</h2>
            <p>
              O Prestador adota esforcos razoaveis para assegurar disponibilidade e seguranca do Servico, podendo realizar manutencoes programadas e alteracoes tecnicas justificadas.
            </p>

            <h2>9. Suspensao e cessacao</h2>
            <p>
              O Prestador pode suspender ou cessar o acesso em caso de incumprimento grave, risco de seguranca, uso abusivo ou obrigacao legal. O Utilizador pode cessar nos termos do plano contratado.
            </p>

            <h2>10. Garantias e limitacao de responsabilidade</h2>
            <ul>
              <li>O Servico e prestado "como esta", sem garantias absolutas de disponibilidade continua.</li>
              <li>Na medida permitida por lei, o Prestador nao responde por danos indiretos, perda de negocio, lucros cessantes ou perda de dados.</li>
              <li>A responsabilidade agregada do Prestador limita-se ao montante pago pelo Utilizador nos 12 meses anteriores ao evento, salvo norma imperativa em contrario.</li>
            </ul>

            <h2>11. Lei aplicavel e foro</h2>
            <p>
              Estes Termos regem-se pela lei portuguesa e normativa europeia aplicavel. Em caso de litigio, e competente o foro legalmente aplicavel em Portugal, sem prejuizo dos direitos imperativos dos consumidores.
            </p>

            <h2>12. Resolucao alternativa de litigios (consumo)</h2>
            <p>
              O Utilizador consumidor pode recorrer a entidades RAL e ao Portal do Consumidor (<a href="https://www.consumidor.gov.pt/" className="text-purple-600 hover:underline">www.consumidor.gov.pt</a>) ou plataforma ODR da UE (<a href="https://ec.europa.eu/consumers/odr" className="text-purple-600 hover:underline">ec.europa.eu/consumers/odr</a>).
            </p>

            <h2>13. Contactos</h2>
            <ul>
              <li><strong>Email:</strong> legal@ampliasolutions.pt</li>
              <li><strong>Morada:</strong> Impasse da Sagrada Familia, n. 10 R/C Esq., 2735-374 Agualva-Cacem, Lisboa, Portugal</li>
              <li><strong>NIF:</strong> PT222428635</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;
