import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-07-30.basil",
});

const plans = [
  {
    id: "trial",
    name: "Trial",
    amount: 0,
    trial: true,
    description: "Trial gratis 7 dias sem cartao",
  },
  {
    id: "starter",
    name: "Starter",
    amount: 1999,
    description: "50 respostas IA, 1 utilizador",
  },
  {
    id: "pro",
    name: "Profissional",
    amount: 4999,
    description: "150 respostas IA, 1 utilizador, suporte prioritario",
  },
  {
    id: "agency",
    name: "Agencia/Enterprise",
    amount: 14999,
    description: "500 respostas IA, 5 utilizadores, suporte prioritario",
  },
];

for (const plan of plans) {
  const product = await stripe.products.create({
    name: `Responder Ja - ${plan.name}`,
    description: plan.description,
    metadata: { planId: plan.id },
  });

  const price = await stripe.prices.create({
    currency: "eur",
    unit_amount: plan.amount,
    recurring: { interval: "month" },
    product: product.id,
    nickname: plan.name,
    metadata: {
      planId: plan.id,
      trialDays: plan.trial ? "7" : "0",
    },
  });

  console.log(`${plan.id}: product=${product.id} price=${price.id}`);
}
