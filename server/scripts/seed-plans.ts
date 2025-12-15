
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { subscriptionPlans, creditPackages } from '@shared/schema';
import * as schema from '@shared/schema';
import ws from "ws";
import process from "process";

// Configuração para Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Configuração da base de dados
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function seedSubscriptionPlans() {
  try {
    console.log('🌱 A popular planos de subscrição...');

    // Inserir planos de subscrição
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        slug: 'starter',
        description: 'Perfeito para pequenos negócios que começam a automatizar respostas',
        priceMonthly: '19.00',
        priceYearly: '190.00', // 10 meses + 2 grátis
        monthlyResponses: 200,
        maxLocations: 1,
        maxUsers: 3,
        features: [
          "200 respostas AI por mês",
          "1 localização de negócio",
          "3 utilizadores",
          "BYOK (IA) opcional",
          "Integração Facebook & Instagram",
          "Integração Google My Business",
          "Suporte por email"
        ],
        byokSupported: true,
        hasApiAccess: false,
        hasPrioritySupport: false,
        isActive: true,
        orderIndex: 1
      },
      {
        id: 'pro',
        name: 'Pro',
        slug: 'pro', 
        description: 'Para negócios em crescimento que precisam de mais funcionalidades',
        priceMonthly: '49.00',
        priceYearly: '490.00', // 10 meses + 2 grátis
        monthlyResponses: 1000,
        maxLocations: 3,
        maxUsers: -1, // ilimitado 
        features: [
          "1.000 respostas AI por mês",
          "3 localizações de negócio",
          "Utilizadores ilimitados",
          "Importação CSV em lote",
          "Memória avançada de conversas",
          "Todas as integrações sociais",
          "Relatórios detalhados",
          "Suporte prioritário"
        ],
        byokSupported: false,
        hasApiAccess: false,
        hasPrioritySupport: true,
        isActive: true,
        orderIndex: 2
      },
      {
        id: 'agency',
        name: 'Agência',
        slug: 'agency',
        description: 'Para agências e grandes empresas com múltiplos clientes',
        priceMonthly: '149.00',
        priceYearly: '1490.00', // 10 meses + 2 grátis
        monthlyResponses: 5000,
        maxLocations: 10,
        maxUsers: -1, // ilimitado
        features: [
          "5.000 respostas AI por mês",
          "10 localizações de negócio",
          "Utilizadores ilimitados",
          "Todas as funcionalidades Pro",
          "Acesso à API completa",
          "Suporte prioritário 24/7",
          "White-label disponível",
          "Gestão multi-cliente",
          "Onboarding personalizado"
        ],
        byokSupported: false,
        hasApiAccess: true,
        hasPrioritySupport: true,
        isActive: true,
        orderIndex: 3
      }
    ];

    // Limpar tabela de planos existentes
    await db.delete(subscriptionPlans);
    console.log('🗑️ Planos existentes removidos');

    // Inserir novos planos
    for (const plan of plans) {
      await db.insert(subscriptionPlans).values(plan);
      console.log(`✅ Plano "${plan.name}" criado - €${plan.priceMonthly}/mês`);
    }

    console.log('📦 A popular pacotes de créditos...');

    // Inserir pacotes de créditos
    const creditPacksData = [
      {
        id: 'pack-1000', 
        name: 'Pack 1000 respostas',
        slug: 'pack-1000',
        description: 'Pacote adicional de 1000 respostas AI',
        credits: 1000,
        price: '15.00',
        isActive: true,
        sortOrder: 1,
        isPopular: false,
        originalPrice: '15.00'
      },
      {
        id: 'pack-2500',
        name: 'Pack 2500 respostas',
        slug: 'pack-2500', 
        description: 'Pacote adicional de 2500 respostas AI',
        credits: 2500,
        price: '35.00',
        isActive: true,
        sortOrder: 3,
        isPopular: true,
        originalPrice: '37.50',
        discount: 7
      },
      {
        id: 'pack-5000',
        name: 'Pack 5000 respostas',
        slug: 'pack-5000',
        description: 'Pacote adicional de 5000 respostas AI',
        credits: 5000,
        price: '65.00',
        isActive: true,
        sortOrder: 4,
        isPopular: false,
        originalPrice: '75.00',
        discount: 13
      }
    ];

    // Limpar tabela de pacotes existentes
    await db.delete(creditPackages);
    console.log('🗑️ Pacotes existentes removidos');

    // Inserir novos pacotes
    for (const pack of creditPacksData) {
      await db.insert(creditPackages).values(pack);
      console.log(`✅ Pacote "${pack.name}" criado - €${pack.price} (${pack.credits} créditos)`);
    }

    console.log('\n🎉 Todos os planos e pacotes foram criados com sucesso!');
    console.log('\n📊 Resumo dos planos:');
    console.log('• Starter: €19/mês - 200 respostas, 1 local, 3 users');
    console.log('• Pro: €49/mês - 1000 respostas, 3 locais, 10 users');
    console.log('• Agência: €149/mês - 5000 respostas, 10 locais, users ilimitados');
    console.log('\n💰 Pacotes de créditos adicionais:');
    console.log('• Pack 1000: €15.00');
    console.log('• Pack 2500: €35.00');
    console.log('• Pack 5000: €65.00');

  } catch (error) {
    console.error('❌ Erro ao criar planos:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionPlans();
}

export { seedSubscriptionPlans };
