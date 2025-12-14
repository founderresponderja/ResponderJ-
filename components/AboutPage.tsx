import React, { useState } from 'react';
import { ArrowLeft, Rocket, Code, Lightbulb, CircleCheckBig, Building2 } from 'lucide-react';
import { Theme } from '../App';

interface AboutPageProps {
  onBack: () => void;
  theme: Theme;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack, theme }) => {
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-gradient-to-br from-slate-50 to-emerald-50'} transition-colors duration-300`}>
      {/* Header */}
      <header className="border-b border-emerald-100 dark:border-emerald-900/30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </button>
            <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-slate-800 dark:text-white">Amplia Solutions</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-2xl shadow-lg shadow-emerald-500/20">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div className="mb-6 inline-block px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-sm font-semibold tracking-wide">
            Amplia Solutions
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent leading-tight">
            Startup Portuguesa de <br/> Soluções SaaS com IA
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Criamos soluções multiplataforma inteligentes, rápidas e acessíveis, desenvolvidas à medida das necessidades de cada cliente.
          </p>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">A Nossa Visão</h2>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                A Amplia Solutions nasceu da convicção de que a tecnologia deve ser acessível e transformadora para empresas de todos os tamanhos. Especializamo-nos no desenvolvimento de soluções SaaS que integram inteligência artificial de forma prática e eficiente.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Como startup portuguesa, estamos comprometidos em oferecer soluções multiplataforma inovadoras que se adaptam às necessidades específicas de cada cliente, sempre com foco na rapidez de implementação e custo-benefício.
              </p>
            </div>
            <div className="flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-2xl blur-2xl opacity-20 animate-pulse"></div>
                <div className="relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-emerald-100 dark:border-emerald-900/50">
                  <Lightbulb className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-center text-slate-900 dark:text-white">Soluções à Medida</h3>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3">
                        <CircleCheckBig className="text-emerald-500 w-5 h-5" />
                        <span className="text-slate-600 dark:text-slate-300">Software Inteligente</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CircleCheckBig className="text-emerald-500 w-5 h-5" />
                        <span className="text-slate-600 dark:text-slate-300">Adaptação Rápida</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CircleCheckBig className="text-emerald-500 w-5 h-5" />
                        <span className="text-slate-600 dark:text-slate-300">Foco no Cliente</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-slate-900 dark:text-white">O Que Nos Define</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Rocket className="w-6 h-6 text-white" />,
                  title: "Velocidade de Implementação",
                  desc: "Desenvolvemos e implementamos soluções rapidamente, permitindo que os nossos clientes vejam resultados em pouco tempo."
                },
                {
                  icon: <Code className="w-6 h-6 text-white" />,
                  title: "Multiplataforma",
                  desc: "As nossas soluções funcionam em web, mobile e desktop, garantindo acessibilidade total aos utilizadores."
                },
                {
                  icon: <Lightbulb className="w-6 h-6 text-white" />,
                  title: "IA Integrada",
                  desc: "Incorporamos inteligência artificial de forma intuitiva, automatizando processos e melhorando a eficiência operacional."
                }
              ].map((item, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/50 hover:shadow-md transition-all text-center group">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-400 mb-3">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-800 dark:to-green-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl font-bold mb-6">Descubra o Que Podemos Criar Juntos</h2>
          <p className="text-xl mb-8 text-emerald-50">
            Experimente o Responder Já, a nossa primeira solução SaaS com IA, e descubra como podemos transformar a comunicação digital da sua empresa.
          </p>
          <button 
            onClick={onBack}
            className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
          >
            <Rocket className="w-5 h-5" />
            Começar Gratuitamente
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
             <Building2 className="w-6 h-6 text-emerald-500" />
             <span className="text-xl font-bold">Amplia Solutions</span>
          </div>
          <p className="text-slate-400 mb-8">© {new Date().getFullYear()} Amplia Solutions. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-8 text-sm">
            <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">Privacidade</a>
            <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">Termos</a>
            <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;