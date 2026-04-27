export const INGREDIENT_RATIOS: Record<string, { amount: number, unit: string }> = {
  'Arroz': { amount: 0.125, unit: 'Kg' },      // 125g per person/meal
  'Cuscuz': { amount: 0.125, unit: 'pct' },    // 1/8 pack per person/meal
  'Macarrão': { amount: 0.125, unit: 'pct' },  // 125g (1/4 pack) per person/meal (usually 500g)
  'Ovo': { amount: 2, unit: 'un' },            // 2 eggs per person/meal
  'Leite': { amount: 0.25, unit: 'Litro' },    // 250ml per person/meal
  'Pão Francês': { amount: 2, unit: 'un' },    // 2 breads per person/meal
  'Frango': { amount: 0.2, unit: 'Kg' },       // 200g per person/meal
  'Carne Moída': { amount: 0.2, unit: 'Kg' },  // 200g per person/meal
  'Bisteca': { amount: 0.25, unit: 'Kg' },     // 250g per person/meal
  'Fígado': { amount: 0.2, unit: 'Kg' },       // 200g per person/meal
  'Calabresa': { amount: 0.1, unit: 'pct' },   // 1/10 pack per person/meal
  'Queijo Mussarela': { amount: 0.03, unit: 'Kg' }, // 30g per person/meal
  'Mortadela': { amount: 0.05, unit: 'Kg' },   // 50g per person/meal
  'Tapioca': { amount: 0.1, unit: 'pct' },     // 1/10 pack per person/meal
  'Café': { amount: 0.015, unit: 'pct' },      // 15g (small portion of 250g pack)
  'CreamCracker': { amount: 0.05, unit: 'pct' }, // 5% of pack
  'Creme de Leite': { amount: 0.25, unit: 'caixa' },
  'Molho de Tomate': { amount: 0.25, unit: 'un' },
  'Banana': { amount: 1, unit: 'un' },
  'Laranja': { amount: 1, unit: 'un' },
  'Abacaxi': { amount: 0.1, unit: 'un' },
};
