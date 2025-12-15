
import { storage } from '../storage';
import type { InsertCreditPackage } from '@shared/schema';

export class CreditUpsellService {
  
  async initializeDefaultPackages(): Promise<void> {
    const existing = await storage.getAllCreditPackages();
    if (existing.length > 0) return;

    // Strategy: Scale down cost per credit as volume increases.
    // Base value roughly €0.20 per credit.
    const packages: InsertCreditPackage[] = [
      {
        id: 'pack-micro',
        name: 'Pack Micro',
        description: 'Ideal para testes ou baixo volume.',
        credits: 50,
        price: '9.00', // €0.18/credit
        originalPrice: '10.00',
        discount: 10,
        features: ['50 Créditos', 'Validade vitalícia'],
        isPopular: false,
        isActive: true,
        sortOrder: 1
      },
      {
        id: 'pack-starter',
        name: 'Pack Starter',
        description: 'O mais escolhido para pequenas empresas.',
        credits: 200,
        price: '29.00', // €0.145/credit
        originalPrice: '40.00',
        discount: 27,
        features: ['200 Créditos', 'Poupança de 27%', 'Validade vitalícia'],
        isPopular: true,
        isActive: true,
        sortOrder: 2
      },
      {
        id: 'pack-pro',
        name: 'Pack Pro',
        description: 'Para quem responde diariamente.',
        credits: 500,
        price: '59.00', // €0.118/credit
        originalPrice: '100.00',
        discount: 41,
        features: ['500 Créditos', 'Poupança de 41%', 'Prioridade na geração'],
        isPopular: false,
        isActive: true,
        sortOrder: 3
      },
      {
        id: 'pack-agency',
        name: 'Pack Agência',
        description: 'Volume massivo para gestão de múltiplas contas.',
        credits: 2000,
        price: '199.00', // €0.099/credit
        originalPrice: '400.00',
        discount: 50,
        features: ['2000 Créditos', 'Custo mais baixo por resposta', 'Suporte dedicado'],
        isPopular: false,
        isActive: true,
        sortOrder: 4
      }
    ];

    for (const pkg of packages) {
      await storage.createCreditPackage(pkg);
    }
    console.log("✅ Credit packages initialized.");
  }

  // Check if user needs upsell based on low credits
  async shouldShowUpsell(userId: string) {
      const user = await storage.getUserById(userId);
      if (!user) return { shouldShow: false };
      
      if (user.credits <= 5) {
          return {
              shouldShow: true,
              reason: 'low_credits',
              message: 'Tem menos de 5 créditos. Recarregue agora para não parar.'
          };
      }
      return { shouldShow: false };
  }
}

export const creditUpsellService = new CreditUpsellService();
