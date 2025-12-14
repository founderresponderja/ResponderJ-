
export type Language = 'pt' | 'en' | 'es';

export const translations = {
  pt: {
    nav: {
      login: "Entrar",
      startFree: "Começar Grátis",
      logout: "Terminar Sessão",
      back: "Voltar",
      proTip: "Dica Pro",
      proTipDesc: "Responda em menos de 24h para melhorar o ranking.",
      usage: "Consumo Mensal",
      upgrade: "Fazer Upgrade",
      creditsLeft: "respostas restantes",
      menu: {
        generate: "Gerar Resposta",
        dashboard: "Estatísticas",
        platforms: "Apps Suportadas",
        plans: "Planos & Faturação",
        accounting: "Contabilidade",
        profile: "Perfil de Negócio",
        calendar: "Calendário Social",
        crm: "CRM & Clientes"
      }
    },
    landing: {
      heroTitle: "Transforme Avaliações em",
      heroHighlight: "Clientes Fiéis",
      heroDesc: "Responda automaticamente a comentários no Google, Booking e The Fork. Aumente a sua reputação online e poupe horas de trabalho com a nossa IA.",
      ctaPrimary: "Experimentar Agora",
      ctaSecondary: "Ver Demonstração",
      poweredBy: "Potenciado por IA Gemini 2.5",
      whyTitle: "Porquê usar o Responder Já?",
      whyDesc: "Gerir a reputação online não tem de ser um trabalho a tempo inteiro.",
      features: {
        time: { title: "Poupe 10h/semana", desc: "Não perca tempo a escrever a mesma resposta. A nossa IA gera respostas personalizadas." },
        seo: { title: "Melhore o SEO Local", desc: "Empresas que respondem a reviews têm melhor ranking no Google." },
        insights: { title: "Insights em Tempo Real", desc: "Analise o sentimento dos clientes e identifique tendências no dashboard." }
      },
      pricingTitle: "Planos para todas as fases",
      pricingDesc: "Comece grátis e escale conforme o seu negócio cresce.",
      footer: "Todos os direitos reservados."
    },
    pricing: {
      month: "/mês",
      trial: "Trial",
      regular: "Regular",
      pro: "Pro",
      agency: "Agência",
      features: {
        responses: "respostas IA",
        users: "utilizador(es)",
        dashboard: "Dashboard Analytics",
        support: "Suporte Prioritário",
        api: "Acesso à API"
      },
      cta: {
        current: "Plano Atual",
        choose: "Escolher Plano",
        contact: "Contactar Vendas"
      }
    },
    login: {
      welcome: "Bem-vindo de volta",
      subtitle: "Aceda à sua conta para gerir as suas reviews",
      email: "Email",
      password: "Palavra-passe",
      remember: "Lembrar-me",
      forgot: "Esqueceu-se?",
      submit: "Entrar",
      loading: "A entrar...",
      noAccount: "Não tem uma conta?",
      create: "Criar conta",
      security: "Protegido por encriptação SSL de nível empresarial."
    },
    app: {
      generatorTitle: "Gerador de Respostas",
      waitingInput: "À espera de input",
      waitingDesc: "Preencha o formulário à esquerda para ver a magia da IA acontecer aqui.",
      dashboardTitle: "Dashboard",
      dashboardDesc: "Análise das reviews respondidas.",
      recentHistory: "Histórico Recente",
      noHistory: "Ainda não há histórico.",
      platformsTitle: "Ecossistema de Reviews",
      platformsDesc: "Otimizado para as principais plataformas onde os seus clientes estão.",
      supported: "Suportado",
      manageOn: "Gerir no",
      whyCentralize: "Porquê centralizar?",
      whyCentralizeDesc: "Utilizar uma ferramenta única garante consistência e poupa tempo.",
      limitReachedTitle: "Limite Atingido",
      limitReachedDesc: "Atingiu o limite de respostas do seu plano atual. Faça upgrade para continuar a responder.",
      upgradeNow: "Fazer Upgrade Agora",
      form: {
        newResponse: "Nova Resposta",
        example: "Exemplo",
        platform: "Plataforma",
        resLanguage: "Idioma da Resposta",
        customerName: "Nome do Cliente (Opcional)",
        customerPlaceholder: "Ex: Maria Pereira",
        rating: "Classificação",
        stars: "Estrelas",
        reviewText: "Comentário do Cliente",
        reviewPlaceholder: "Cole aqui o comentário deixado pelo cliente...",
        tone: "Tom da Resposta",
        submitButton: "Responder Já",
        generating: "A gerar resposta..."
      },
      card: {
        suggested: "Resposta Sugerida",
        copy: "Copiar",
        copied: "Copiado!",
        aiTip: "Dica de IA",
        aiTipDesc: "Verifique sempre os detalhes factuais antes de publicar."
      },
      calendar: {
        title: "Calendário Social",
        subtitle: "Planeie e visualize o seu conteúdo.",
        newPost: "Novo Post",
        scheduled: "Agendado",
        published: "Publicado",
        drafts: "Rascunhos",
        engagement: "Engagement Médio",
        noPosts: "Sem posts para este dia.",
        createTitle: "Criar Conteúdo",
        postTitle: "Título",
        postDate: "Data",
        postPlatform: "Plataforma",
        postStatus: "Estado",
        save: "Guardar",
        cancel: "Cancelar"
      }
    }
  },
  en: {
    nav: {
      login: "Login",
      startFree: "Start for Free",
      logout: "Logout",
      back: "Back",
      proTip: "Pro Tip",
      proTipDesc: "Respond within 24h to improve your ranking.",
      usage: "Monthly Usage",
      upgrade: "Upgrade",
      creditsLeft: "replies left",
      menu: {
        generate: "Generate Response",
        dashboard: "Statistics",
        platforms: "Supported Apps",
        plans: "Plans & Billing",
        accounting: "Accounting",
        profile: "Business Profile",
        calendar: "Social Calendar",
        crm: "CRM & Customers"
      }
    },
    landing: {
      heroTitle: "Turn Reviews into",
      heroHighlight: "Loyal Customers",
      heroDesc: "Automatically respond to comments on Google, Booking, and The Fork. Boost your online reputation and save hours with our AI.",
      ctaPrimary: "Try it Now",
      ctaSecondary: "View Demo",
      poweredBy: "Powered by Gemini 2.5 AI",
      whyTitle: "Why use Responder Já?",
      whyDesc: "Managing online reputation doesn't have to be a full-time job.",
      features: {
        time: { title: "Save 10h/week", desc: "Don't waste time writing the same response. Our AI generates personalized replies." },
        seo: { title: "Improve Local SEO", desc: "Businesses that respond to reviews rank better on Google." },
        insights: { title: "Real-Time Insights", desc: "Analyze customer sentiment and identify trends on the dashboard." }
      },
      pricingTitle: "Plans for every stage",
      pricingDesc: "Start free and scale as your business grows.",
      footer: "All rights reserved."
    },
    pricing: {
      month: "/month",
      trial: "Trial",
      regular: "Regular",
      pro: "Pro",
      agency: "Agency",
      features: {
        responses: "AI responses",
        users: "user(s)",
        dashboard: "Analytics Dashboard",
        support: "Priority Support",
        api: "API Access"
      },
      cta: {
        current: "Current Plan",
        choose: "Choose Plan",
        contact: "Contact Sales"
      }
    },
    login: {
      welcome: "Welcome back",
      subtitle: "Access your account to manage your reviews",
      email: "Email",
      password: "Password",
      remember: "Remember me",
      forgot: "Forgot password?",
      submit: "Sign In",
      loading: "Signing in...",
      noAccount: "Don't have an account?",
      create: "Create account",
      security: "Protected by enterprise-grade SSL encryption."
    },
    app: {
      generatorTitle: "Response Generator",
      waitingInput: "Waiting for input",
      waitingDesc: "Fill out the form on the left to see the AI magic happen here.",
      dashboardTitle: "Dashboard",
      dashboardDesc: "Analysis of responded reviews.",
      recentHistory: "Recent History",
      noHistory: "No history yet.",
      platformsTitle: "Review Ecosystem",
      platformsDesc: "Optimized for the main platforms where your customers are.",
      supported: "Supported",
      manageOn: "Manage on",
      whyCentralize: "Why centralize?",
      whyCentralizeDesc: "Using a single tool ensures consistency and saves time.",
      limitReachedTitle: "Limit Reached",
      limitReachedDesc: "You have reached the response limit for your current plan. Upgrade to continue.",
      upgradeNow: "Upgrade Now",
      form: {
        newResponse: "New Response",
        example: "Example",
        platform: "Platform",
        resLanguage: "Response Language",
        customerName: "Customer Name (Optional)",
        customerPlaceholder: "Ex: John Doe",
        rating: "Rating",
        stars: "Stars",
        reviewText: "Customer Review",
        reviewPlaceholder: "Paste the customer review here...",
        tone: "Response Tone",
        submitButton: "Respond Now",
        generating: "Generating..."
      },
      card: {
        suggested: "Suggested Response",
        copy: "Copy",
        copied: "Copied!",
        aiTip: "AI Tip",
        aiTipDesc: "Always check factual details before publishing."
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
      startFree: "Empezar Gratis",
      logout: "Cerrar Sesión",
      back: "Volver",
      proTip: "Consejo Pro",
      proTipDesc: "Responde en menos de 24h para mejorar el ranking.",
      usage: "Uso Mensual",
      upgrade: "Mejorar Plan",
      creditsLeft: "respuestas restantes",
      menu: {
        generate: "Generar Respuesta",
        dashboard: "Estadísticas",
        platforms: "Apps Compatibles",
        plans: "Planes y Facturación",
        accounting: "Contabilidad",
        profile: "Perfil de Negocio",
        calendar: "Calendario Social",
        crm: "CRM y Clientes"
      }
    },
    landing: {
      heroTitle: "Convierte Reseñas en",
      heroHighlight: "Clientes Leales",
      heroDesc: "Responde automáticamente a comentarios en Google, Booking y The Fork. Mejora tu reputación online y ahorra horas con nuestra IA.",
      ctaPrimary: "Probar Ahora",
      ctaSecondary: "Ver Demo",
      poweredBy: "Impulsado por IA Gemini 2.5",
      whyTitle: "¿Por qué usar Responder Já?",
      whyDesc: "Gestionar la reputación online no tiene que ser un trabajo a tiempo completo.",
      features: {
        time: { title: "Ahorra 10h/semana", desc: "No pierdas tiempo escribiendo la misma respuesta. Nuestra IA genera respuestas personalizadas." },
        seo: { title: "Mejora el SEO Local", desc: "Las empresas que responden a reseñas posicionan mejor en Google." },
        insights: { title: "Insights en Tiempo Real", desc: "Analiza el sentimiento de los clientes e identifica tendencias." }
      },
      pricingTitle: "Planes para cada etapa",
      pricingDesc: "Empieza gratis y escala a medida que crece tu negocio.",
      footer: "Todos los derechos reservados."
    },
    pricing: {
      month: "/mes",
      trial: "Trial",
      regular: "Regular",
      pro: "Pro",
      agency: "Agencia",
      features: {
        responses: "respuestas IA",
        users: "usuario(s)",
        dashboard: "Panel de Análisis",
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
      subtitle: "Accede a tu cuenta para gestionar tus reseñas",
      email: "Correo electrónico",
      password: "Contraseña",
      remember: "Recordarme",
      forgot: "¿Olvidaste la contraseña?",
      submit: "Entrar",
      loading: "Entrando...",
      noAccount: "¿No tienes una cuenta?",
      create: "Crear cuenta",
      security: "Protegido por encriptación SSL de nível empresarial."
    },
    app: {
      generatorTitle: "Generador de Respostas",
      waitingInput: "Esperando entrada",
      waitingDesc: "Rellena el formulario de la izquierda para ver la magia de la IA.",
      dashboardTitle: "Panel de Control",
      dashboardDesc: "Análisis de reseñas respondidas.",
      recentHistory: "Historial Reciente",
      noHistory: "Aún no hay historial.",
      platformsTitle: "Ecosistema de Reseñas",
      platformsDesc: "Optimizado para las principales plataformas donde están tus clientes.",
      supported: "Compatible",
      manageOn: "Gestionar en",
      whyCentralize: "¿Por qué centralizar?",
      whyCentralizeDesc: "Usar una sola herramienta garantiza consistência y ahorra tiempo.",
      limitReachedTitle: "Límite Alcanzado",
      limitReachedDesc: "Has alcanzado el límite de respuestas de tu plan actual. Mejora tu plan para continuar.",
      upgradeNow: "Mejorar Ahora",
      form: {
        newResponse: "Nueva Respuesta",
        example: "Ejemplo",
        platform: "Plataforma",
        resLanguage: "Idioma de Respuesta",
        customerName: "Nombre del Cliente (Opcional)",
        customerPlaceholder: "Ej: Juan Pérez",
        rating: "Valoración",
        stars: "Estrellas",
        reviewText: "Comentario del Cliente",
        reviewPlaceholder: "Pega aquí el comentario del cliente...",
        tone: "Tono de Respuesta",
        submitButton: "Responder Ahora",
        generating: "Generando..."
      },
      card: {
        suggested: "Respuesta Sugerida",
        copy: "Copiar",
        copied: "¡Copiado!",
        aiTip: "Consejo IA",
        aiTipDesc: "Verifica siempre los detalles factuales antes de publicar."
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
