import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MealType } from '../types';

export async function seedUserData(userId: string) {
  const batch: Promise<any>[] = [];

  // 1. Finances (Ganhos e Gastos do usuário)
  const finances = [
    { title: 'Dra Neta', value: 1500, type: 'income', category: 'Trabalho' },
    { title: 'LA Tuner', value: 800, type: 'income', category: 'Trabalho' },
    { title: 'Pensão', value: 450, type: 'income', category: 'Outros' },
    { title: 'Aluguel', value: 600, type: 'expense', category: 'Moradia' },
    { title: 'Energia Abril', value: 74.91, type: 'expense', category: 'Contas' },
    { title: 'Internet', value: 100, type: 'expense', category: 'Contas' },
    { title: 'Plano', value: 50, type: 'expense', category: 'Contas' },
    { title: 'Nubank', value: 76, type: 'expense', category: 'Crédito' },
    { title: 'Green', value: 300, type: 'expense', category: 'Saúde' },
    { title: 'Mãe', value: 250, type: 'expense', category: 'Família' },
  ];

  finances.forEach(f => {
    batch.push(addDoc(collection(db, `users/${userId}/finances`), { ...f, ownerId: userId, updatedAt: serverTimestamp() }));
  });

  // 2. Products (Market / Shopping List)
  const products = [
    { name: 'Arroz', quantity: 5, unit: 'pct', price: 4, category: 'Mercearia' },
    { name: 'Cuscuz', quantity: 8, unit: 'pct', price: 1.7, category: 'Mercearia' },
    { name: 'Macarrão', quantity: 4, unit: 'pct', price: 2.5, category: 'Mercearia' },
    { name: 'Óleo', quantity: 2, unit: 'garrafa', price: 9, category: 'Mercearia' },
    { name: 'Tapioca', quantity: 4, unit: 'pct', price: 6, category: 'Mercearia' },
    { name: 'Molho de Tomate', quantity: 8, unit: 'un', price: 2, category: 'Mercearia' },
    { name: 'Sal', quantity: 1, unit: 'pct', price: 1.2, category: 'Mercearia' },
    { name: 'Açúcar', quantity: 2, unit: 'pct', price: 2.5, category: 'Mercearia' },
    { name: 'CreamCracker', quantity: 6, unit: 'pct', price: 4.5, category: 'Mercearia' },
    { name: 'Creme de Leite', quantity: 8, unit: 'caixa', price: 3, category: 'Mercearia' },
    { name: 'Margarina', quantity: 2, unit: 'Kg', price: 10, category: 'Mercearia' },
    { name: 'Café', quantity: 2, unit: 'pct', price: 14, category: 'Mercearia' },
    { name: 'Milho e Ervilha', quantity: 2, unit: 'lata', price: 5, category: 'Mercearia' },
    { name: 'Goiabada', quantity: 1, unit: 'un', price: 8, category: 'Mercearia' },
    { name: 'Bananada', quantity: 1, unit: 'un', price: 7, category: 'Mercearia' },
    { name: 'Fígado', quantity: 3, unit: 'Kg', price: 15, category: 'Proteínas' },
    { name: 'Frango', quantity: 5, unit: 'Kg', price: 14, category: 'Proteínas' },
    { name: 'Carne Moída', quantity: 2, unit: 'Kg', price: 16, category: 'Proteínas' },
    { name: 'Ovo', quantity: 40, unit: 'un', price: 0.3, category: 'Proteínas' },
    { name: 'Calabresa', quantity: 3, unit: 'pct', price: 10, category: 'Proteínas' },
    { name: 'Bisteca', quantity: 2, unit: 'Kg', price: 16, category: 'Proteínas' },
    { name: 'Mortadela Defumada', quantity: 500, unit: 'g', price: 0.03, category: 'Proteínas' },
    { name: 'Queijo Mussarela', quantity: 300, unit: 'g', price: 0.066, category: 'Proteínas' },
    { name: 'Leite', quantity: 8, unit: 'Litro', price: 5, category: 'Laticínios' },
    { name: 'Pão Francês', quantity: 20, unit: 'un', price: 0.75, category: 'Padaria' },
    { name: 'Sabonete', quantity: 6, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
    { name: 'Detergente', quantity: 8, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
    { name: 'Sabão Líquido', quantity: 2, unit: 'un', price: 16, category: 'Higiene/Limpeza' },
    { name: 'Cloro', quantity: 4, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
    { name: 'Papel Higiênico', quantity: 1, unit: 'pct', price: 18, category: 'Higiene/Limpeza' },
    { name: 'Pasta de Dente', quantity: 2, unit: 'un', price: 4, category: 'Higiene/Limpeza' },
    { name: 'Esponja de Louça', quantity: 6, unit: 'un', price: 2, category: 'Higiene/Limpeza' },
    { name: 'Lã de Alumínio', quantity: 2, unit: 'un', price: 4, category: 'Higiene/Limpeza' },
    { name: 'Desinfetante', quantity: 2, unit: 'un', price: 8, category: 'Higiene/Limpeza' },
    { name: 'Shampoo/Cond/Deso', quantity: 1, unit: 'kit', price: 40, category: 'Higiene/Limpeza' },
    { name: 'Ração Gato', quantity: 2, unit: 'Kg', price: 18, category: 'Pets' },
    { name: 'Ração Cachorra', quantity: 3, unit: 'Kg', price: 12, category: 'Pets' },
    { name: 'Mix Vegetais/Frutas', quantity: 1, unit: 'Semanal', price: 100, category: 'Hortifruti' },
  ];

  products.forEach(p => {
    batch.push(addDoc(collection(db, `users/${userId}/products`), { ...p, ownerId: userId, updatedAt: serverTimestamp() }));
  });

  // 3. Meals (Diet)
  const meals = [
    // Segunda
    { day: 'Segunda', type: MealType.CAFE, title: 'Cuscuz com ovo, café com leite e fritas', ingredients: ['Cuscuz', 'Ovo', 'Café', 'Leite', 'Frutas'] },
    { day: 'Segunda', type: MealType.ALMOCO, title: 'Sobra de Domingo', ingredients: [] },
    { day: 'Segunda', type: MealType.LANCHE, title: '1/3 CreamCracker, goiabada e café', ingredients: ['CreamCracker', 'Goiabada', 'Café'] },
    { day: 'Segunda', type: MealType.JANTAR, title: 'Macarrão à Bolonhesa', ingredients: ['Carne moída', 'Molho', 'Milho', 'Ervilha', 'Cebola', 'Tomate', 'Coentro'] },
    
    // Terça
    { day: 'Terça', type: MealType.CAFE, title: '2 Tapiocas com ovo, café com leite e banana', ingredients: ['Tapioca', 'Ovo', 'Café', 'Leite', 'Banana'] },
    { day: 'Terça', type: MealType.ALMOCO, title: 'Sobra de Segunda', ingredients: [] },
    { day: 'Terça', type: MealType.LANCHE, title: '2 Pães com mortadela, café e 1 laranja', ingredients: ['Pão', 'Mortadela', 'Café', 'Laranja'] },
    { day: 'Terça', type: MealType.JANTAR, title: 'Arroz, Frango ensopado e salada', ingredients: ['Arroz', 'Frango', 'Cenoura', 'Batata', 'Cebola', 'Coentro'] },

    // Quarta
    { day: 'Quarta', type: MealType.CAFE, title: '1/3 CreamCracker, café com leite e 1 ovo mexido', ingredients: ['CreamCracker', 'Café', 'Leite', 'Ovo'] },
    { day: 'Quarta', type: MealType.ALMOCO, title: 'Cuscuz, calabresa refogada e salada verde', ingredients: ['Cuscuz', 'Calabresa', 'Salada verde'] },
    { day: 'Quarta', type: MealType.LANCHE, title: '2 Pães com ovo e café', ingredients: ['Pão', 'Ovo', 'Café'] },
    { day: 'Quarta', type: MealType.JANTAR, title: 'Arroz, Fígado acebolado, salada e abacaxi', ingredients: ['Arroz', 'Fígado', 'Cebola', 'Tomate', 'Repolho', 'Abacaxi'] },

    // Quinta
    { day: 'Quinta', type: MealType.CAFE, title: 'Cuscuz com ovo, café com leite e frutas', ingredients: ['Cuscuz', 'Ovo', 'Café', 'Leite', 'Frutas'] },
    { day: 'Quinta', type: MealType.ALMOCO, title: 'Sobra de Quarta', ingredients: [] },
    { day: 'Quinta', type: MealType.LANCHE, title: 'Bananada com 1/3 CreamCracker', ingredients: ['Bananada', 'CreamCracker'] },
    { day: 'Quinta', type: MealType.JANTAR, title: 'Macarrão com calabresa e queijo', ingredients: ['Macarrão', 'Calabresa', 'Creme de leite', 'Queijo', 'Alho', 'Cebola'] },

    // Sexta
    { day: 'Sexta', type: MealType.CAFE, title: '2 Pães com mortadela e café com leite', ingredients: ['Pão', 'Mortadela', 'Café', 'Leite'] },
    { day: 'Sexta', type: MealType.ALMOCO, title: 'Sobra de Quinta', ingredients: [] },
    { day: 'Sexta', type: MealType.LANCHE, title: 'Cuscuz com ovo e café', ingredients: ['Cuscuz', 'Ovo', 'Café'] },
    { day: 'Sexta', type: MealType.JANTAR, title: 'Arroz, Bisteca grelhada e salada', ingredients: ['Arroz', 'Bisteca', 'Repolho', 'Cenoura'] },

    // Sábado
    { day: 'Sábado', type: MealType.CAFE, title: 'Cuscuz completo (ovo/fruta), café com leite', ingredients: ['Cuscuz', 'Ovo', 'Fruta', 'Café', 'Leite'] },
    { day: 'Sábado', type: MealType.ALMOCO, title: 'Arroz, Frango, Vegetais e Salada', ingredients: ['Arroz', 'Frango', 'Vegetais', 'Salada'] },
    { day: 'Sábado', type: MealType.LANCHE, title: 'Frutas variadas e café', ingredients: ['Frutas', 'Café'] },
    { day: 'Sábado', type: MealType.JANTAR, title: 'Macarrão ao molho com carne moída e queijo', ingredients: ['Macarrão', 'Molho de tomate', 'Carne moída', 'Queijo'] },

    // Domingo
    { day: 'Domingo', type: MealType.CAFE, title: 'Tapioca com ovo, frutas e café com leite', ingredients: ['Tapioca', 'Ovo', 'Frutas', 'Café', 'Leite'] },
    { day: 'Domingo', type: MealType.ALMOCO, title: 'Arroz, Bisteca, Batata e Salada', ingredients: ['Arroz', 'Bisteca', 'Batata', 'Salada'] },
    { day: 'Domingo', type: MealType.LANCHE, title: 'Pães com queijo e café', ingredients: ['Pão', 'Queijo', 'Café'] },
    { day: 'Domingo', type: MealType.JANTAR, title: 'Frango assado, Arroz, Maionese e Salada', ingredients: ['Frango assado', 'Arroz', 'Legumes', 'Maionese', 'Salada'] },
  ];

  meals.forEach(m => {
    batch.push(addDoc(collection(db, `users/${userId}/meals`), { ...m, ownerId: userId, updatedAt: serverTimestamp() }));
  });

  await Promise.all(batch);
}
