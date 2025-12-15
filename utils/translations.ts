
export type Language = 'pt' | 'en' | 'es';

export const translations = {
  pt: {
    nav: {
      login: "Entrar na Conta",
      startFree: "Testar Grátis",
      logout: "Sair",
      back: "Voltar",
      proTip: "Dica SEO",
      proTipDesc: "Responda em < 24h para subir no ranking do Google.",
      usage: "Consumo Mensal",
      upgrade: "Fazer Upgrade",
      creditsLeft: "respostas restantes",
      menu: {
        generate: "Gerar Resposta IA",
        dashboard: "Estatísticas & SEO",
        platforms: "Plataformas Conectadas",
        plans: "Planos & Faturação",
        accounting: "Contabilidade",
        profile: "Perfil de Negócio",
        calendar: "Calendário Social",
        crm: "Gestão de Clientes",
        team: "Equipa"
      }
    },
    landing: {
      heroTitle: "Domine a sua Reputação Online e",
      heroHighlight: "Conquiste Mais Clientes",
      heroDesc: "A única plataforma de IA que responde automaticamente a avaliações no Google, Booking e TripAdvisor. Melhore o seu SEO Local, poupe 15h semanais e fidelize clientes com respostas profissionais.",
      ctaPrimary: "Começar Agora - 7 Dias Grátis",
      ctaSecondary: "Ver Demo ao Vivo",
      poweredBy: "Impulsionado por IA Gemini 2.5 e GPT-4",
      whyTitle: "A Solução Completa de Gestão de Reviews",
      whyDesc: "Software de automação de marketing essencial para restaurantes, hotéis e clínicas.",
      features: {
        time: { title: "Poupe 15h/semana", desc: "A nossa IA escreve respostas personalizadas e humanas. Diga adeus ao copy-paste e olá à produtividade." },
        seo: { title: "SEO Local Explosivo", desc: "O Google favorece empresas que respondem rápido. Suba no ranking do Google Maps e apareça primeiro." },
        insights: { title: "Análise de Sentimento", desc: "Entenda o que os clientes sentem. Dashboards detalhados com análise de tendências e keywords." }
      },
      pricingTitle: "Investimento Inteligente",
      pricingDesc: "Planos flexíveis que pagam o seu próprio valor com a retenção de apenas 1 cliente.",
      footer: "Responder Já © Todos os direitos reservados. Líder em Gestão de Reputação Online."
    },
    pricing: {
      month: "/mês",
      trial: "Trial Gratuito",
      regular: "Starter",
      pro: "Profissional",
      agency: "Agência / Enterprise",
      features: {
        responses: "respostas IA inteligentes",
        users: "utilizador(es)",
        dashboard: "Dashboard de SEO & Analytics",
        support: "Suporte Técnico Prioritário",
        api: "API & Integrações"
      },
      cta: {
        current: "Plano Atual",
        choose: "Selecionar Plano",
        contact: "Falar com Vendas"
      }
    },
    login: {
      welcome: "Gestão de Reviews Inteligente",
      subtitle: "Aceda ao painel de controlo da sua reputação online",
      email: "Email Profissional",
      password: "Palavra-passe",
      remember: "Manter sessão iniciada",
      forgot: "Recuperar acesso?",
      submit: "Entrar na Plataforma",
      loading: "A autenticar...",
      noAccount: "Ainda não gere a sua reputação?",
      create: "Criar Conta Grátis",
      security: "Segurança de nível bancário com encriptação AES-256."
    },
    app: {
      generatorTitle: "Gerador de Respostas IA",
      waitingInput: "A aguardar análise",
      waitingDesc: "Cole a review do cliente à esquerda. A nossa IA analisará o sentimento e gerará a resposta ideal.",
      dashboardTitle: "Dashboard de Performance",
      dashboardDesc: "Métricas de reputação, análise de sentimento e crescimento de reviews.",
      recentHistory: "Últimas Interações",
      noHistory: "Sem dados históricos. Comece a responder para ver a magia.",
      platformsTitle: "Ecossistema Digital",
      platformsDesc: "Centralize o Google My Business, Facebook, TripAdvisor e mais num só lugar.",
      supported: "Integração Ativa",
      manageOn: "Gerir no",
      whyCentralize: "Porquê Centralizar?",
      whyCentralizeDesc: "Consistência de marca em todos os canais melhora a confiança do consumidor em 73%.",
      limitReachedTitle: "Limite de Respostas Atingido",
      limitReachedDesc: "A sua popularidade está a crescer! Faça upgrade para continuar a responder a todos os clientes.",
      upgradeNow: "Desbloquear Mais Respostas",
      form: {
        newResponse: "Nova Resposta Inteligente",
        example: "Carregar Exemplo",
        platform: "Canal de Origem",
        resLanguage: "Idioma de Resposta",
        customerName: "Nome do Cliente",
        customerPlaceholder: "Ex: Maria Silva",
        rating: "Classificação Recebida",
        stars: "Estrelas",
        reviewText: "Texto da Avaliação",
        reviewPlaceholder: "Cole aqui o comentário do cliente para análise...",
        tone: "Tom de Voz da Marca",
        submitButton: "Gerar Resposta Otimizada",
        generating: "A Otimizar Resposta..."
      },
      card: {
        suggested: "Sugestão da IA",
        copy: "Copiar Texto",
        copied: "Copiado!",
        edit: "Personalizar",
        save: "Guardar",
        cancel: "Cancelar",
        regenerate: "Nova Versão",
        aiTip: "Dica de Especialista",
        aiTipDesc: "Personalize a resposta com o nome do cliente para aumentar a conexão emocional."
      },
      calendar: {
        title: "Calendário de Conteúdo",
        subtitle: "Planeie a sua presença nas redes sociais.",
        newPost: "Agendar Post",
        scheduled: "Agendado",
        published: "Publicado",
        drafts: "Rascunhos",
        engagement: "Taxa de Engajamento",
        noPosts: "Sem publicações agendadas.",
        createTitle: "Criar Conteúdo",
        postTitle: "Título",
        postDate: "Data de Publicação",
        postPlatform: "Rede Social",
        postStatus: "Estado",
        save: "Agendar",
        cancel: "Voltar"
      }
    }
  },
  en: {
    nav: {
      login: "Login",
      startFree: "Start Free Trial",
      logout: "Logout",
      back: "Back",
      proTip: "SEO Tip",
      proTipDesc: "Respond within 24h to boost local SEO ranking.",
      usage: "Monthly Usage",
      upgrade: "Upgrade Plan",
      creditsLeft: "replies left",
      menu: {
        generate: "AI Response Generator",
        dashboard: "Stats & SEO",
        platforms: "Connected Apps",
        plans: "Plans & Billing",
        accounting: "Accounting",
        profile: "Business Profile",
        calendar: "Social Calendar",
        crm: "CRM & Customers",
        team: "Team Management"
      }
    },
    landing: {
      heroTitle: "Master Your Online Reputation &",
      heroHighlight: "Win Loyal Customers",
      heroDesc: "Automatically respond to reviews on Google, Booking, and TripAdvisor using AI. Boost your Local SEO, save time, and grow your business.",
      ctaPrimary: "Start Free Trial",
      ctaSecondary: "View Live Demo",
      poweredBy: "Powered by Gemini 2.5 AI",
      whyTitle: "Why choose Responder Já?",
      whyDesc: "The ultimate reputation management tool for modern businesses.",
      features: {
        time: { title: "Save 15h/week", desc: "Stop typing manual replies. Our AI generates personalized, human-like responses instantly." },
        seo: { title: "Skyrocket Local SEO", desc: "Google rewards active businesses. Improve your ranking on Google Maps effortlessly." },
        insights: { title: "Sentiment Analysis", desc: "Understand your customers better with real-time sentiment tracking and keyword analysis." }
      },
      pricingTitle: "Smart Investment",
      pricingDesc: "Plans that pay for themselves with just one retained customer.",
      footer: "All rights reserved. Leading Online Reputation Management Software."
    },
    pricing: {
      month: "/month",
      trial: "Free Trial",
      regular: "Starter",
      pro: "Pro",
      agency: "Agency",
      features: {
        responses: "AI smart responses",
        users: "user(s)",
        dashboard: "SEO & Analytics Dashboard",
        support: "Priority Support",
        api: "API Access"
      },
      cta: {
        current: "Current Plan",
        choose: "Select Plan",
        contact: "Contact Sales"
      }
    },
    login: {
      welcome: "Welcome Back",
      subtitle: "Access your reputation management dashboard",
      email: "Business Email",
      password: "Password",
      remember: "Remember me",
      forgot: "Forgot password?",
      submit: "Sign In",
      loading: "Signing in...",
      noAccount: "Don't have an account?",
      create: "Create Free Account",
      security: "Enterprise-grade security with AES-256 encryption."
    },
    app: {
      generatorTitle: "AI Response Generator",
      waitingInput: "Awaiting Input",
      waitingDesc: "Paste the customer review on the left. Our AI will analyze sentiment and craft the perfect reply.",
      dashboardTitle: "Performance Dashboard",
      dashboardDesc: "Review analytics, sentiment tracking, and growth metrics.",
      recentHistory: "Recent Activity",
      noHistory: "No history yet. Start responding to see analytics.",
      platformsTitle: "Digital Ecosystem",
      platformsDesc: "Centralize Google My Business, Facebook, TripAdvisor, and more.",
      supported: "Supported",
      manageOn: "Manage on",
      whyCentralize: "Why Centralize?",
      whyCentralizeDesc: "Brand consistency across channels improves customer trust by 73%.",
      limitReachedTitle: "Limit Reached",
      limitReachedDesc: "You're growing fast! Upgrade to keep responding to all your customers.",
      upgradeNow: "Unlock More Replies",
      form: {
        newResponse: "New AI Response",
        example: "Load Example",
        platform: "Platform",
        resLanguage: "Response Language",
        customerName: "Customer Name",
        customerPlaceholder: "Ex: John Doe",
        rating: "Rating",
        stars: "Stars",
        reviewText: "Customer Review",
        reviewPlaceholder: "Paste the review here for analysis...",
        tone: "Brand Tone",
        submitButton: "Generate Optimized Reply",
        generating: "Optimizing Response..."
      },
      card: {
        suggested: "AI Suggestion",
        copy: "Copy",
        copied: "Copied!",
        edit: "Edit",
        save: "Save",
        cancel: "Cancel",
        regenerate: "Regenerate",
        aiTip: "AI Pro Tip",
        aiTipDesc: "Check factual details before publishing to maintain authenticity."
      },
      calendar: {
        title: "Social Calendar",
        subtitle: "Plan and view your content.",
        newPost: "New Post",
        scheduled: "Scheduled",
        published: "Published",
        drafts: "Drafts",
        engagement: "Avg. Engagement",
        noPosts: "No posts for this day.",
        createTitle: "Create Content",
        postTitle: "Title",
        postDate: "Date",
        postPlatform: "Platform",
        postStatus: "Status",
        save: "Save",
        cancel: "Cancel"
      }
    }
  },
  es: {
    nav: {
      login: "Entrar",
      startFree: "Prueba Gratis",
      logout: "Cerrar Sesión",
      back: "Volver",
      proTip: "Consejo SEO",
      proTipDesc: "Responde en < 24h para mejorar el ranking local.",
      usage: "Uso Mensual",
      upgrade: "Mejorar Plan",
      creditsLeft: "respuestas restantes",
      menu: {
        generate: "Generador IA",
        dashboard: "Estadísticas",
        platforms: "Apps Conectadas",
        plans: "Planes y Facturación",
        accounting: "Contabilidad",
        profile: "Perfil de Negocio",
        calendar: "Calendario Social",
        crm: "CRM y Clientes",
        team: "Equipo"
      }
    },
    landing: {
      heroTitle: "Domina tu Reputación Online y",
      heroHighlight: "Gana Clientes Leales",
      heroDesc: "Responde automáticamente reseñas en Google, Booking y TripAdvisor con IA. Mejora tu SEO Local, ahorra tiempo y haz crecer tu negocio.",
      ctaPrimary: "Probar Gratis Ahora",
      ctaSecondary: "Ver Demo",
      poweredBy: "Impulsado por IA Gemini 2.5",
      whyTitle: "¿Por qué usar Responder Já?",
      whyDesc: "La herramienta definitiva para la gestión de reputación online.",
      features: {
        time: { title: "Ahorra 15h/semana", desc: "No pierdas tiempo escribiendo. Nuestra IA genera respuestas personalizadas al instante." },
        seo: { title: "SEO Local Potente", desc: "Google premia a las empresas activas. Mejora tu posición en Google Maps." },
        insights: { title: "Análisis de Sentimiento", desc: "Entiende a tus clientes con análisis de tendencias en tiempo real." }
      },
      pricingTitle: "Planes Inteligentes",
      pricingDesc: "Empieza gratis y escala a medida que crece tu negocio.",
      footer: "Todos los derechos reservados."
    },
    pricing: {
      month: "/mes",
      trial: "Prueba Gratis",
      regular: "Starter",
      pro: "Pro",
      agency: "Agencia",
      features: {
        responses: "respuestas IA",
        users: "usuario(s)",
        dashboard: "Panel de Análisis SEO",
        support: "Soporte Prioritario",
        api: "Acceso API"
      },
      cta: {
        current: "Plan Actual",
        choose: "Elegir Plan",
        contact: "Contactar Ventas"
      }
    },
    login: {
      welcome: "Bienvenido de nuevo",
      subtitle: "Accede a tu panel de reputación online",
      email: "Correo profesional",
      password: "Contraseña",
      remember: "Recordarme",
      forgot: "¿Olvidaste la contraseña?",
      submit: "Entrar",
      loading: "Entrando...",
      noAccount: "¿No tienes una cuenta?",
      create: "Crear Cuenta Gratis",
      security: "Protegido por encriptación SSL empresarial."
    },
    app: {
      generatorTitle: "Generador de Respuestas IA",
      waitingInput: "Esperando entrada",
      waitingDesc: "Pega la reseña a la izquierda. Nuestra IA analizará el sentimiento y creará la mejor respuesta.",
      dashboardTitle: "Panel de Control",
      dashboardDesc: "Análisis de reseñas, seguimiento de sentimiento y métricas de crecimiento.",
      recentHistory: "Historial Reciente",
      noHistory: "Aún no hay historial. Empieza a responder ahora.",
      platformsTitle: "Ecosistema Digital",
      platformsDesc: "Optimizado para las principales plataformas donde están tus clientes.",
      supported: "Compatible",
      manageOn: "Gestionar en",
      whyCentralize: "¿Por qué centralizar?",
      whyCentralizeDesc: "Usar una sola herramienta garantiza consistencia y mejora la confianza.",
      limitReachedTitle: "Límite Alcanzado",
      limitReachedDesc: "¡Estás creciendo! Mejora tu plan para seguir respondiendo a todos.",
      upgradeNow: "Mejorar Ahora",
      form: {
        newResponse: "Nueva Respuesta Inteligente",
        example: "Ejemplo",
        platform: "Plataforma",
        resLanguage: "Idioma de Respuesta",
        customerName: "Nombre del Cliente",
        customerPlaceholder: "Ej: Juan Pérez",
        rating: "Valoración",
        stars: "Estrellas",
        reviewText: "Reseña del Cliente",
        reviewPlaceholder: "Pega aquí el comentario...",
        tone: "Tono de Voz",
        submitButton: "Generar Respuesta",
        generating: "Optimizando..."
      },
      card: {
        suggested: "Sugerencia IA",
        copy: "Copiar",
        copied: "¡Copiado!",
        edit: "Editar",
        save: "Guardar",
        cancel: "Cancelar",
        regenerate: "Regenerar",
        aiTip: "Consejo IA",
        aiTipDesc: "Verifica siempre los detalles antes de publicar."
      },
      calendar: {
        title: "Calendario Social",
        subtitle: "Planifica y visualiza tu contenido.",
        newPost: "Nuevo Post",
        scheduled: "Programado",
        published: "Publicado",
        drafts: "Borradores",
        engagement: "Engagement Medio",
        noPosts: "No hay posts para este día.",
        createTitle: "Crear Contenido",
        postTitle: "Título",
        postDate: "Fecha",
        postPlatform: "Plataforma",
        postStatus: "Estado",
        save: "Guardar",
        cancel: "Cancelar"
      }
    }
  }
};
