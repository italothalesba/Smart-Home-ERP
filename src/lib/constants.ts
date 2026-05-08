export const INGREDIENT_RATIOS: Record<string, { amount: number, unit: string }> = {
  // Mercearia
  'Arroz': { amount: 0.125, unit: 'kg' },
  'Feijão': { amount: 0.1, unit: 'kg' },
  'Cuscuz': { amount: 0.1, unit: 'kg' },
  'Macarrão': { amount: 0.1, unit: 'kg' },
  'Açúcar': { amount: 0.05, unit: 'kg' },
  'Sal': { amount: 0.005, unit: 'kg' },
  'Óleo': { amount: 0.02, unit: 'L' },
  'Azeite': { amount: 0.01, unit: 'L' },
  'Café': { amount: 0.02, unit: 'kg' },
  'Farinha de Trigo': { amount: 0.1, unit: 'kg' },
  'Mandioca': { amount: 0.2, unit: 'kg' },
  'Tapioca': { amount: 0.1, unit: 'kg' },
  
  // Proteínas
  'Frango': { amount: 0.2, unit: 'kg' },
  'Carne Moída': { amount: 0.2, unit: 'kg' },
  'Bisteca': { amount: 0.25, unit: 'kg' },
  'Fígado': { amount: 0.2, unit: 'kg' },
  'Calabresa': { amount: 0.1, unit: 'kg' },
  'Ovo': { amount: 2, unit: 'un' },
  'Peixe': { amount: 0.2, unit: 'kg' },
  'Salsicha': { amount: 2, unit: 'un' },
  'Mortadela': { amount: 0.05, unit: 'kg' },
  'Presunto': { amount: 0.05, unit: 'kg' },
  'Queijo Mussarela': { amount: 0.05, unit: 'kg' },

  // Laticínios
  'Leite': { amount: 0.25, unit: 'L' },
  'Iogurte': { amount: 1, unit: 'un' },
  'Requeijão': { amount: 0.03, unit: 'kg' },
  'Manteiga': { amount: 0.02, unit: 'kg' },
  'Creme de Leite': { amount: 0.1, unit: 'L' },
  'Leite Condensado': { amount: 0.1, unit: 'L' },

  // Hortifruti
  'Banana': { amount: 2, unit: 'un' },
  'Laranja': { amount: 1, unit: 'un' },
  'Maçã': { amount: 1, unit: 'un' },
  'Tomate': { amount: 0.1, unit: 'kg' },
  'Cebola': { amount: 0.05, unit: 'kg' },
  'Alho': { amount: 0.01, unit: 'kg' },
  'Batata': { amount: 0.15, unit: 'kg' },
  'Cenoura': { amount: 0.1, unit: 'kg' },
  'Alface': { amount: 0.2, unit: 'un' },
  
  // Padaria
  'Pão Francês': { amount: 2, unit: 'un' },
  'Pão de Forma': { amount: 2, unit: 'fatia' },
  'Bolo': { amount: 0.1, unit: 'kg' },
};

export const MARKET_LIST = [
  'Carrefour',
  'Pão de Açúcar',
  'Extra',
  'Assaí',
  'Atacadão',
  'Mercado de Bairro',
  'Hortifruti / Feira'
];

export const MARKET_CATALOG = [
  // MERCEARIA
  { name: 'Arroz Polido 5kg', category: 'Mercearia', unit: 'pct', price: 28.90, minStock: 1, brands: ['Prato Fino', 'Tio João', 'Camil'] },
  { name: 'Feijão Carioca 1kg', category: 'Mercearia', unit: 'pct', price: 8.50, minStock: 2, brands: ['Camil', 'Kicaldo', 'Turquesa'] },
  { name: 'Macarrão Espaguete 500g', category: 'Mercearia', unit: 'pct', price: 4.20, minStock: 2, brands: ['Barilla', 'Vitarella', 'Petybon'] },
  { name: 'Óleo de Soja 900ml', category: 'Mercearia', unit: 'L', price: 6.50, minStock: 2, brands: ['Liza', 'Soya', 'Vila Velha'] },
  { name: 'Azeite de Oliva 500ml', category: 'Mercearia', unit: 'L', price: 34.00, minStock: 1, brands: ['Andorinha', 'Gallo', 'Borges'] },
  { name: 'Açúcar Refinado 1kg', category: 'Mercearia', unit: 'pct', price: 4.80, minStock: 1, brands: ['União', 'Guarani', 'Caravelas'] },
  { name: 'Sal Refinado 1kg', category: 'Mercearia', unit: 'pct', price: 2.50, minStock: 1, brands: ['Lebre', 'Cisne'] },
  { name: 'Café em Pó 250g', category: 'Mercearia', unit: 'pct', price: 14.90, minStock: 2, brands: ['Pilão', 'Melitta', '3 Corações'] },
  { name: 'Farinha de Trigo 1kg', category: 'Mercearia', unit: 'pct', price: 5.50, minStock: 1, brands: ['Dona Benta', 'Renata'] },
  { name: 'Cuscuz/Flocão 500g', category: 'Mercearia', unit: 'pct', price: 2.20, minStock: 4, brands: ['Vitamilho', 'Maratá', 'Coringa'] },
  { name: 'Tapioca 500g', category: 'Mercearia', unit: 'pct', price: 6.90, minStock: 1, brands: ['Da Terrinha', 'Akio'] },
  { name: 'Maionese 500g', category: 'Mercearia', unit: 'un', price: 8.90, minStock: 1, brands: ['Hellmanns', 'Liza'] },
  { name: 'Extrato de Tomate', category: 'Mercearia', unit: 'un', price: 3.50, minStock: 4, brands: ['Elefante', 'Pomarola'] },
  { name: 'Creme de Leite 200g', category: 'Mercearia', unit: 'caixa', price: 3.20, minStock: 4, brands: ['Nestlé', 'Itambé', 'Piracanjuba'] },
  { name: 'Leite Condensado 395g', category: 'Mercearia', unit: 'caixa', price: 6.50, minStock: 2, brands: ['Moça', 'Itambé', 'Piracanjuba'] },

  // PROTEINAS
  { name: 'Peito de Frango kg', category: 'Proteínas', unit: 'kg', price: 18.50, minStock: 2, brands: ['Sadia', 'Perdigão', 'Seara'] },
  { name: 'Carne Moída kg', category: 'Proteínas', unit: 'kg', price: 32.00, minStock: 1, brands: ['Friboi', 'Swift'] },
  { name: 'Bisteca Suína kg', category: 'Proteínas', unit: 'kg', price: 19.90, minStock: 1, brands: ['Sadia', 'Perdigão'] },
  { name: 'Ovos Brancos 30un', category: 'Proteínas', unit: 'un', price: 18.00, minStock: 1, brands: ['Mantiqueira', 'Granja'] },
  { name: 'Calabresa kg', category: 'Proteínas', unit: 'kg', price: 24.90, minStock: 1, brands: ['Sadia', 'Perdigão', 'Seara'] },

  // LATICINIOS / MATINAIS
  { name: 'Leite Integral 1L', category: 'Matinais / Bebidas', unit: 'L', price: 5.50, minStock: 12, brands: ['Ninho', 'Piracanjuba', 'Itambé'] },
  { name: 'Manteiga com Sal 200g', category: 'Padaria / Laticínios', unit: 'un', price: 11.90, minStock: 1, brands: ['Aviação', 'Itambé'] },
  { name: 'Requeijão Cremoso 200g', category: 'Padaria / Laticínios', unit: 'un', price: 8.90, minStock: 1, brands: ['Vigor', 'Poços de Caldas', 'Itambé'] },
  { name: 'Iogurte Natural 170g', category: 'Matinais / Bebidas', unit: 'un', price: 3.50, minStock: 4, brands: ['Nestlé', 'Danone', 'Itambé'] },

  // HORTIFRUTI
  { name: 'Banana Prata kg', category: 'Hortifruti', unit: 'kg', price: 6.90, minStock: 2 },
  { name: 'Laranja Pêra kg', category: 'Hortifruti', unit: 'kg', price: 4.50, minStock: 3 },
  { name: 'Maçã Fuji kg', category: 'Hortifruti', unit: 'kg', price: 9.90, minStock: 1 },
  { name: 'Batata Inglesa kg', category: 'Hortifruti', unit: 'kg', price: 5.90, minStock: 2 },
  { name: 'Cebola Branca kg', category: 'Hortifruti', unit: 'kg', price: 6.50, minStock: 1 },
  { name: 'Alho Roxo 100g', category: 'Hortifruti', unit: 'un', price: 5.00, minStock: 2 },
  { name: 'Tomate Italiano kg', category: 'Hortifruti', unit: 'kg', price: 8.90, minStock: 1 },

  // HIGIENE E LIMPEZA
  { name: 'Detergente Líquido 500ml', category: 'Higiene / Limpeza', unit: 'un', price: 2.20, minStock: 3, brands: ['Ypê', 'Limpol'] },
  { name: 'Sabão em Pó 1kg', category: 'Higiene / Limpeza', unit: 'pct', price: 12.50, minStock: 1, brands: ['Omo', 'Brilhante', 'Tixan'] },
  { name: 'Amaciante de Roupas 2L', category: 'Higiene / Limpeza', unit: 'L', price: 14.90, minStock: 1, brands: ['Downy', 'Comfort', 'Ypê'] },
  { name: 'Papel Higiênico 12un', category: 'Higiene / Limpeza', unit: 'pct', price: 16.90, minStock: 1, brands: ['Neve', 'Personal', 'Fofinho'] },
  { name: 'Sabonete 90g', category: 'Higiene / Limpeza', unit: 'un', price: 2.50, minStock: 6, brands: ['Dove', 'Lux', 'Rexona'] },
  { name: 'Shampoo 400ml', category: 'Higiene / Limpeza', unit: 'un', price: 15.90, minStock: 1, brands: ['Seda', 'Pantene', 'Elseve'] },
];
