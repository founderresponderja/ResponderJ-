import { db } from "../db";
import { pageContents } from "@shared/schema";

const aboutContent = {
  pageKey: "about",
  title: "Quem Somos - Responder Já",
  content: JSON.stringify({
    hero: {
      title: "Quem Somos",
      subtitle: "Transformamos a comunicação digital das empresas portuguesas através de inteligência artificial"
    },
    mission: {
      title: "Nossa Missão",
      content: "Democratizar o acesso a respostas inteligentes e profissionais para todas as empresas, independentemente do seu tamanho. Através da nossa plataforma de IA, ajudamos negócios a manter uma presença digital consistente e envolvente."
    },
    vision: {
      title: "Nossa Visão",
      content: "Ser a principal plataforma de comunicação digital em Portugal, capacitando milhares de empresas a construir relacionamentos mais fortes com os seus clientes através de interações autênticas e personalizadas."
    },
    values: [
      {
        title: "Excelência",
        content: "Comprometemo-nos a entregar sempre a mais alta qualidade em cada resposta gerada pela nossa IA.",
        icon: "Award",
        color: "yellow-500"
      },
      {
        title: "Inovação",
        content: "Estamos sempre na vanguarda da tecnologia, implementando as mais recentes inovações em IA conversacional.",
        icon: "Zap",
        color: "purple-500"
      },
      {
        title: "Acessibilidade",
        content: "Tornamos a tecnologia avançada acessível a todas as empresas, desde startups até grandes corporações.",
        icon: "Globe",
        color: "green-500"
      }
    ],
    team: {
      title: "Nossa Equipa",
      subtitle: "Especialistas em IA e Comunicação Digital",
      content: "A nossa equipa é composta por especialistas em inteligência artificial, desenvolvimento de software, marketing digital e comunicação empresarial. Juntos, combinamos décadas de experiência para criar soluções que realmente fazem a diferença no dia a dia das empresas portuguesas.",
      badges: [
        "Engenheiros de IA",
        "Especialistas em UX/UI",
        "Consultores de Marketing",
        "Analistas de Dados",
        "Suporte ao Cliente"
      ]
    },
    technology: {
      title: "Nossa Tecnologia",
      sections: [
        {
          title: "IA Avançada",
          content: "Utilizamos os modelos de linguagem mais avançados, treinados especificamente para o contexto empresarial português, garantindo respostas culturalmente apropriadas e profissionais."
        },
        {
          title: "Segurança de Dados",
          content: "Implementamos os mais altos padrões de segurança, incluindo encriptação AES-256 e conformidade total com o RGPD, protegendo sempre os dados dos nossos clientes."
        },
        {
          title: "Integração Multi-Plataforma",
          content: "Conectamos com Facebook, Instagram, Google My Business e outras plataformas, centralizando toda a comunicação digital numa única ferramenta intuitiva."
        },
        {
          title: "Escalabilidade",
          content: "Nossa infraestrutura suporta desde pequenos negócios até grandes agências, adaptando-se automaticamente às necessidades de cada cliente."
        }
      ]
    },
    cta: {
      title: "Pronto para Transformar a Sua Comunicação Digital?",
      subtitle: "Junte-se a centenas de empresas que já confiam na nossa plataforma",
      buttonText: "Começar Teste Gratuito"
    }
  }),
  metadata: {
    lastModified: new Date().toISOString(),
    version: "1.0"
  },
  isActive: true
};

async function seedAboutContent() {
  try {
    console.log("Inserindo conteúdo da página 'Quem somos'...");
    
    // Verifica se já existe
    const existing = await db
      .select()
      .from(pageContents)
      .where(eq(pageContents.pageKey, "about"));
    
    if (existing.length > 0) {
      console.log("Conteúdo já existe. Atualizando...");
      await db
        .update(pageContents)
        .set(aboutContent)
        .where(eq(pageContents.pageKey, "about"));
    } else {
      console.log("Criando novo conteúdo...");
      await db.insert(pageContents).values(aboutContent);
    }
    
    console.log("✅ Conteúdo da página 'Quem somos' inserido com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inserir conteúdo:", error);
    // Não sair com erro para não bloquear o servidor principal se chamado de lá
  }
}

// Helper para importação no routes.ts
import { eq } from "drizzle-orm";

export default seedAboutContent;