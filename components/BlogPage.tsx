import React from 'react';

type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  readTime: string;
  content: string[];
};

const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'como-responder-reviews-negativas-google',
    title: 'Como responder a reviews negativas no Google',
    description:
      'Guia prático para responder reviews negativas no Google com empatia, método e impacto em SEO local.',
    coverImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
    readTime: '6 min',
    content: [
      'Reviews negativas não são o fim da reputação de uma empresa. Na verdade, podem tornar-se uma oportunidade de mostrar profissionalismo e capacidade de resolver problemas.',
      'O primeiro passo é responder rapidamente e com tom humano. Evite respostas defensivas. Agradeça o feedback, reconheça o problema e explique qual o próximo passo para corrigir a situação.',
      'No contexto de SEO local, responder reviews com consistência ajuda o Google a perceber que o perfil está ativo. Isso pode melhorar a visibilidade no Google Maps, especialmente quando há volume de interações recentes.',
      'Use uma estrutura simples: agradecer + reconhecer + solução + convite a continuar a conversa em privado. Esta fórmula reduz conflito público e aumenta hipóteses de recuperação do cliente.',
      'Automatizar este processo com IA acelera equipas pequenas, mas deve existir aprovação humana antes de publicar. A combinação de velocidade com revisão garante qualidade e autenticidade.',
    ],
  },
  {
    slug: 'seo-local-restaurantes-portugal',
    title: 'SEO local para restaurantes em Portugal',
    description:
      'Estratégia de SEO local para restaurantes portugueses: Google Business Profile, reviews e sinais de confiança.',
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    readTime: '7 min',
    content: [
      'Para restaurantes em Portugal, o SEO local começa no Google Business Profile: categoria correta, horário atualizado, fotos de qualidade e descrição com palavras-chave locais.',
      'As reviews têm impacto direto na decisão de visita. Quanto mais respostas úteis e contextualizadas, maior a perceção de confiança do utilizador e dos motores de busca.',
      'Inclua termos naturais como "restaurante em Lisboa" ou "comida tradicional no Porto" quando fizer sentido na resposta. Evite repetir palavras-chave de forma artificial.',
      'Também é importante manter consistência NAP (nome, morada, telefone) em diretórios e redes sociais. Inconsistências reduzem a confiança algorítmica.',
      'Uma rotina semanal de resposta a reviews, atualização de fotos e análise de métricas costuma trazer ganhos visíveis em impressões e cliques no mapa.',
    ],
  },
  {
    slug: 'automatizar-gestao-reputacao-online',
    title: 'Automatizar gestão de reputação online',
    description:
      'Como automatizar a gestão de reputação online sem perder autenticidade na comunicação com clientes.',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    readTime: '8 min',
    content: [
      'Automatizar reputação online é deixar de depender de processos manuais para monitorizar reviews, sugerir respostas e acompanhar resultados.',
      'Um bom fluxo inclui: recolha centralizada de reviews, classificação de sentimento, proposta de resposta por IA e aprovação antes de publicação.',
      'Para PME, isto reduz o tempo operacional e melhora consistência de tom. Em vez de responder de forma reativa, a equipa atua com processo.',
      'Outro benefício é aprender com as edições humanas. Quando a equipa ajusta respostas, o sistema pode guardar padrões e evoluir sugestões futuras.',
      'A automação não substitui a marca. Ela remove fricção, acelera decisões e cria espaço para relações mais estratégicas com os clientes.',
    ],
  },
];

interface BlogPageProps {
  onBackToHome: () => void;
}

const BlogPage: React.FC<BlogPageProps> = ({ onBackToHome }) => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/blog';
  const slug = path.startsWith('/blog/') ? path.replace('/blog/', '') : null;
  const article = slug ? BLOG_ARTICLES.find((item) => item.slug === slug) : null;

  if (article) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <button
            onClick={onBackToHome}
            className="mb-6 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voltar
          </button>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{article.title}</h1>
          <p className="text-slate-500 mb-6">{article.description}</p>
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-64 md:h-80 object-cover rounded-xl mb-8"
            loading="lazy"
            decoding="async"
          />
          <div className="space-y-4 leading-7">
            {article.content.map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">Blog Responder Já</h1>
          <button
            onClick={onBackToHome}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Voltar ao site
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-10">
          Artigos práticos sobre responder reviews Google, gestão de reputação online em Portugal e automação com IA.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {BLOG_ARTICLES.map((item) => (
            <a
              key={item.slug}
              href={`/blog/${item.slug}`}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={item.coverImage}
                alt={item.title}
                className="w-full h-40 object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="p-4">
                <p className="text-xs text-slate-500 mb-2">{item.readTime} leitura</p>
                <h2 className="font-semibold mb-2">{item.title}</h2>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export const blogArticles = BLOG_ARTICLES;
export default BlogPage;
