import React, { useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Meal, MealType, Product, MealIngredient, Finance, FinanceType, FinanceStatus } from '../../types';
import { generateShoppingList } from '../../lib/gemini';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Loader2, 
  ShoppingBag,
  Clock,
  ArrowRight,
  Calculator,
  X
} from 'lucide-react';
import { INGREDIENT_RATIOS } from '../../lib/constants';
import { MealDetailsModal } from '../MealDetailsModal';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MEAL_TYPE_LABELS = {
  [MealType.CAFE]: 'Café da Manhã',
  [MealType.ALMOCO]: 'Almoço',
  [MealType.LANCHE]: 'Lanche',
  [MealType.JANTAR]: 'Jantar'
};

const WEEK_DAYS = [
  'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
];

const MEAL_TYPE_ORDER = {
  [MealType.CAFE]: 1,
  [MealType.ALMOCO]: 2,
  [MealType.LANCHE]: 3,
  [MealType.JANTAR]: 4
};

export function MealView() {
  const { data: meals, add, update, remove } = useFirestore<Meal>('meals');
  const { data: products, update: updateProduct } = useFirestore<Product>('products');
  const { add: addFinance } = useFirestore<Finance>('finances');
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [form, setForm] = useState({
    day: 'Domingo',
    type: MealType.ALMOCO,
    title: '',
    instructions: '',
    peopleCount: 3,
    structuredIngredients: [] as MealIngredient[]
  });

  const [currentIngredient, setCurrentIngredient] = useState({
    productId: '',
    amountPerPerson: 0
  });

  const handleAddIngredient = () => {
    if (!currentIngredient.productId || currentIngredient.amountPerPerson <= 0) return;
    
    const product = products.find(p => p.id === currentIngredient.productId);
    if (!product) return;

    const newIngredient: MealIngredient = {
      productId: product.id,
      name: product.name,
      amountPerPerson: currentIngredient.amountPerPerson,
      unit: product.unit
    };

    setForm({
      ...form,
      structuredIngredients: [...form.structuredIngredients, newIngredient]
    });
    setCurrentIngredient({ productId: '', amountPerPerson: 0 });
  };

  const handleRemoveIngredient = (index: number) => {
    setForm({
      ...form,
      structuredIngredients: form.structuredIngredients.filter((_, i) => i !== index)
    });
  };

  const syncPantryOnMealChange = (ingredients: MealIngredient[], people: number) => {
    // The user wants to "automatically increase the quantity in the pantry according to need"
    // So for each ingredient, we ensure the pantry has at least (people * amountPerPerson)
    ingredients.forEach(ing => {
      if (!ing.productId) return;
      const product = products.find(p => p.id === ing.productId);
      if (product) {
        const needed = ing.amountPerPerson * people;
        // User requested: "automaticamente aumentar a quantidade na aba de estoque de acordo com a necessidade"
        // This implies that if the need is met, we don't necessarily decrease, but we definitely increase if needed.
        // Or perhaps they want a strict sync. Let's go with ensuring it reflects the "Planned" amount if it's higher.
        if (product.quantity < needed) {
          updateProduct(product.id, { quantity: needed });
        }
      }
    });
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    const ingredientsStringList = form.structuredIngredients.map(ing => `${ing.name} (${ing.amountPerPerson * form.peopleCount}${ing.unit})`);
    
    add({
      day: form.day,
      type: form.type,
      title: form.title,
      ingredients: ingredientsStringList,
      structuredIngredients: form.structuredIngredients,
      instructions: form.instructions,
      peopleCount: form.peopleCount
    });

    // Automatically adjust pantry based on "necessity"
    syncPantryOnMealChange(form.structuredIngredients, form.peopleCount);

    setIsAdding(false);
    setForm({ 
      day: 'Domingo', 
      type: MealType.ALMOCO, 
      title: '', 
      instructions: '', 
      peopleCount: 3,
      structuredIngredients: []
    });
  };

  const handleUpdatePeopleCount = (meal: Meal, newCount: number) => {
    if (newCount === meal.peopleCount) return;
    
    // Calculate new ingredients string if structured ingredients exist
    let newIngredientsStr = meal.ingredients;
    if (meal.structuredIngredients) {
      newIngredientsStr = meal.structuredIngredients.map(ing => 
        `${ing.name} (${(ing.amountPerPerson * newCount).toFixed(2)}${ing.unit})`
      );
    }
    
    update(meal.id, { 
      peopleCount: newCount,
      ingredients: newIngredientsStr
    });

    if (meal.structuredIngredients) {
      syncPantryOnMealChange(meal.structuredIngredients, newCount);
    }
  };

  const handleSyncDietAndStock = async () => {
    if (meals.length === 0) return;
    setIsGenerating(true);

    try {
      // 1. Map current requirements
      const requirements: Record<string, number> = {};
      
      meals.forEach(meal => {
        if (!meal.structuredIngredients) return;
        meal.structuredIngredients.forEach(ing => {
          if (!ing.productId) return;
          const people = meal.peopleCount || 3;
          const totalNeeded = ing.amountPerPerson * people;
          requirements[ing.productId] = (requirements[ing.productId] || 0) + totalNeeded;
        });
      });

      // 2. Calculate Deficit and Cost
      let totalFeiraCost = 0;
      const list: string[] = [];

      products.forEach(product => {
        const needed = requirements[product.id] || 0;
        const deficit = needed - product.quantity;

        if (deficit > 0) {
          const itemCost = deficit * (product.price || 0);
          totalFeiraCost += itemCost;
          list.push(`${product.name}: ${deficit.toFixed(2)}${product.unit} → R$ ${itemCost.toFixed(2)}`);
        }
      });

      setShoppingList(list);

      // 3. Add to Finances if there's a cost
      if (totalFeiraCost > 0) {
        await addFinance({
          description: `Feira Semanal (${new Date().toLocaleDateString('pt-BR')})`,
          value: totalFeiraCost,
          type: FinanceType.EXTRA,
          status: FinanceStatus.PENDENTE,
          dueDate: new Date().toISOString(),
          ownerId: 'system' // Hook handles ownerId usually, but keeping type safe
        });
        alert(`Sincronização Concluída!\n\nValor total da feira: R$ ${totalFeiraCost.toFixed(2)}\nLançado em Finanças com sucesso.`);
      } else {
        alert('Estoque está em dia com a dieta! Nenhuma compra necessária.');
      }
    } catch (error) {
      console.error('Sync Error:', error);
      alert('Erro ao sincronizar. Verifique os dados do estoque.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateList = async () => {
    if (meals.length === 0) return;
    setIsGenerating(true);
    const mealTitles = meals.map(m => `${m.day}: ${m.title} (${m.peopleCount || 3} pessoas)`);
    const list = await generateShoppingList(mealTitles);
    setShoppingList(list);
    setIsGenerating(false);
  };

  const loadSuggestedDiet = () => {
    const suggested = [
      // Domingo
      { 
        day: 'Domingo', 
        type: MealType.CAFE, 
        title: 'Tapioca com Ovo e Frutas', 
        ingredients: ['Tapioca', 'Ovo', 'Frutas', 'Café', 'Leite'],
        structuredIngredients: [
          { name: 'Tapioca', amountPerPerson: 0.1, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' },
          { name: 'Frutas', amountPerPerson: 1, unit: 'un' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' },
          { name: 'Leite', amountPerPerson: 0.25, unit: 'Litro' }
        ],
        instructions: '2 tapiocas com ovo por pessoa',
        peopleCount: 3
      },
      { 
        day: 'Domingo', 
        type: MealType.ALMOCO, 
        title: 'Bisteca com Batata e Salada', 
        ingredients: ['Arroz', 'Bisteca', 'Batata', 'Salada', 'Cebola', 'Tomate'],
        structuredIngredients: [
          { name: 'Arroz', amountPerPerson: 0.125, unit: 'Kg' },
          { name: 'Bisteca', amountPerPerson: 0.25, unit: 'Kg' },
          { name: 'Batata', amountPerPerson: 0.2, unit: 'Kg' },
          { name: 'Salada', amountPerPerson: 0.1, unit: 'un' }
        ],
        instructions: 'Bisteca suína com acompanhamentos',
        peopleCount: 3
      },
      { 
        day: 'Domingo', 
        type: MealType.LANCHE, 
        title: 'Pão com Queijo', 
        ingredients: ['Pão', 'Queijo', 'Café'],
        structuredIngredients: [
          { name: 'Pão Francês', amountPerPerson: 2, unit: 'un' },
          { name: 'Queijo Mussarela', amountPerPerson: 0.03, unit: 'Kg' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' }
        ],
        instructions: 'Pão francês com queijo',
        peopleCount: 3
      },
      { 
        day: 'Domingo', 
        type: MealType.JANTAR, 
        title: 'REFEIÇÃO COMPLETA: Frango Assado', 
        ingredients: ['Frango assado', 'Arroz', 'Batata', 'Legumes', 'Maionese', 'Salada', 'Cebola', 'Tomate', 'Coentro'],
        structuredIngredients: [
          { name: 'Frango', amountPerPerson: 0.25, unit: 'Kg' },
          { name: 'Arroz', amountPerPerson: 0.125, unit: 'Kg' },
          { name: 'Batata', amountPerPerson: 0.2, unit: 'Kg' }
        ],
        instructions: 'Frango assado, maionese de legumes e salada',
        peopleCount: 3
      },

      // Segunda
      { 
        day: 'Segunda', 
        type: MealType.CAFE, 
        title: 'Cuscuz com Ovo e Café com Leite', 
        ingredients: ['Cuscuz', 'Ovo', 'Café', 'Leite', 'Frutas'],
        structuredIngredients: [
          { name: 'Cuscuz', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' },
          { name: 'Leite', amountPerPerson: 0.25, unit: 'Litro' }
        ],
        instructions: '2 porções individuais de Cuscuz com Ovo por pessoa',
        peopleCount: 3
      },
      { 
        day: 'Segunda', 
        type: MealType.ALMOCO, 
        title: 'Sobra de Domingo', 
        ingredients: [],
        structuredIngredients: [],
        instructions: 'Aproveitamento de sobras',
        peopleCount: 1
      },
      { 
        day: 'Segunda', 
        type: MealType.LANCHE, 
        title: 'CreamCracker com Goiabada', 
        ingredients: ['CreamCracker', 'Goiabada', 'Café'],
        structuredIngredients: [
          { name: 'CreamCracker', amountPerPerson: 0.05, unit: 'pct' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' }
        ],
        instructions: '1/3 de pacote de CreamCracker',
        peopleCount: 1
      },
      { 
        day: 'Segunda', 
        type: MealType.JANTAR, 
        title: 'Macarrão à Bolonhesa', 
        ingredients: ['Macarrão', 'Carne moída', 'Molho de tomate', 'Milho', 'Ervilha', 'Cebola', 'Tomate', 'Coentro', 'Alho'],
        structuredIngredients: [
          { name: 'Macarrão', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Carne Moída', amountPerPerson: 0.2, unit: 'Kg' },
          { name: 'Molho de Tomate', amountPerPerson: 0.25, unit: 'un' }
        ],
        instructions: '1 pct Macarrão, 2 pct molho',
        peopleCount: 4
      },
      
      // Terça
      { 
        day: 'Terça', 
        type: MealType.CAFE, 
        title: 'Tapioca com Ovo e Banana', 
        ingredients: ['Tapioca', 'Ovo', 'Café', 'Leite', 'Banana'],
        structuredIngredients: [
          { name: 'Tapioca', amountPerPerson: 0.1, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' },
          { name: 'Leite', amountPerPerson: 0.25, unit: 'Litro' },
          { name: 'Banana', amountPerPerson: 1, unit: 'un' }
        ],
        instructions: '2 tapiocas com ovo por pessoa',
        peopleCount: 3
      },
      { 
        day: 'Terça', 
        type: MealType.ALMOCO, 
        title: 'Sobra de Segunda', 
        ingredients: [],
        structuredIngredients: [],
        instructions: 'Aproveitamento de sobras',
        peopleCount: 1
      },
      { 
        day: 'Terça', 
        type: MealType.LANCHE, 
        title: 'Pão com Mortadela Defumada', 
        ingredients: ['Pão', 'Mortadela', 'Café', 'Laranja'],
        structuredIngredients: [
          { name: 'Pão Francês', amountPerPerson: 2, unit: 'un' },
          { name: 'Mortadela', amountPerPerson: 0.05, unit: 'Kg' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' },
          { name: 'Laranja', amountPerPerson: 1, unit: 'un' }
        ],
        instructions: '2 Pães, mortadela, 1 laranja',
        peopleCount: 1
      },
      { 
        day: 'Terça', 
        type: MealType.JANTAR, 
        title: 'Frango Ensopado com Legumes', 
        ingredients: ['Arroz', 'Frango', 'Cenoura', 'Batata', 'Cebola', 'Coentro', 'Alho'],
        structuredIngredients: [
          { name: 'Arroz', amountPerPerson: 0.125, unit: 'Kg' },
          { name: 'Frango', amountPerPerson: 0.2, unit: 'Kg' }
        ],
        instructions: 'Frango cozido com cenoura e batata',
        peopleCount: 4
      },

      // Quarta
      { 
        day: 'Quarta', 
        type: MealType.CAFE, 
        title: 'CreamCracker com Ovo Mexido', 
        ingredients: ['CreamCracker', 'Café', 'Leite', 'Ovo'],
        structuredIngredients: [
          { name: 'CreamCracker', amountPerPerson: 0.05, unit: 'pct' },
          { name: 'Café', amountPerPerson: 0.015, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' }
        ],
        instructions: '1/3 CreamCracker p/ pessoa, 1 Ovo mexido p/ pessoa',
        peopleCount: 3
      },
      { 
        day: 'Quarta', 
        type: MealType.ALMOCO, 
        title: 'Cuscuz com Calabresa Refogada', 
        ingredients: ['Cuscuz', 'Calabresa', 'Verduras', 'Café'],
        structuredIngredients: [
          { name: 'Cuscuz', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Calabresa', amountPerPerson: 0.1, unit: 'pct' }
        ],
        instructions: 'Cuscuz com calabresa e salada verde',
        peopleCount: 2
      },
      { 
        day: 'Quarta', 
        type: MealType.LANCHE, 
        title: 'Pão com Ovo', 
        ingredients: ['Pão', 'Ovo', 'Café'],
        structuredIngredients: [
          { name: 'Pão Francês', amountPerPerson: 2, unit: 'un' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' }
        ],
        instructions: 'Pão com ovo e café',
        peopleCount: 2
      },
      { 
        day: 'Quarta', 
        type: MealType.JANTAR, 
        title: 'Fígado Acebolado e Salada', 
        ingredients: ['Arroz', 'Fígado', 'Cebola', 'Tomate', 'Repolho', 'Abacaxi'],
        structuredIngredients: [
          { name: 'Arroz', amountPerPerson: 0.125, unit: 'Kg' },
          { name: 'Fígado', amountPerPerson: 0.2, unit: 'Kg' },
          { name: 'Abacaxi', amountPerPerson: 0.1, unit: 'un' }
        ],
        instructions: 'Fígado acebolado com salada e abacaxi',
        peopleCount: 4
      },

      // Quinta
      { 
        day: 'Quinta', 
        type: MealType.CAFE, 
        title: 'Cuscuz com Ovo', 
        ingredients: ['Cuscuz', 'Ovo', 'Café', 'Leite', 'Frutas'],
        structuredIngredients: [
          { name: 'Cuscuz', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' }
        ],
        instructions: '2 porções individuais de Cuscuz com Ovo por pessoa',
        peopleCount: 3
      },
      { 
        day: 'Quinta', 
        type: MealType.ALMOCO, 
        title: 'Sobra de Quarta', 
        ingredients: [],
        structuredIngredients: [],
        instructions: 'Aproveitamento de sobras',
        peopleCount: 1
      },
      { 
        day: 'Quinta', 
        type: MealType.LANCHE, 
        title: 'Bananada com CreamCracker', 
        ingredients: ['Bananada', 'CreamCracker'],
        structuredIngredients: [
          { name: 'CreamCracker', amountPerPerson: 0.05, unit: 'pct' }
        ],
        instructions: 'Bananada com 1/3 de cream cracker',
        peopleCount: 1
      },
      { 
        day: 'Quinta', 
        type: MealType.JANTAR, 
        title: 'Macarrão com Calabresa e Queijo', 
        ingredients: ['Macarrão', 'Calabresa', 'Creme de leite', 'Queijo', 'Alho', 'Cebola'],
        structuredIngredients: [
          { name: 'Macarrão', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Calabresa', amountPerPerson: 0.1, unit: 'pct' },
          { name: 'Queijo Mussarela', amountPerPerson: 0.03, unit: 'Kg' }
        ],
        instructions: 'Macarrão cremoso com calabresa',
        peopleCount: 4
      },

      // Sexta
      { 
        day: 'Sexta', 
        type: MealType.CAFE, 
        title: 'Pão com Mortadela Defumada', 
        ingredients: ['Pão', 'Mortadela', 'Café', 'Leite'],
        structuredIngredients: [
          { name: 'Pão Francês', amountPerPerson: 2, unit: 'un' },
          { name: 'Mortadela', amountPerPerson: 0.05, unit: 'Kg' }
        ],
        instructions: '2 Pães com mortadela p/ pessoa',
        peopleCount: 3
      },
      { 
        day: 'Sexta', 
        type: MealType.ALMOCO, 
        title: 'Sobra de Quinta', 
        ingredients: [],
        structuredIngredients: [],
        instructions: 'Aproveitamento de sobras',
        peopleCount: 1
      },
      { 
        day: 'Sexta', 
        type: MealType.LANCHE, 
        title: 'Cuscuz com Ovo', 
        ingredients: ['Cuscuz', 'Ovo', 'Café'],
        structuredIngredients: [
          { name: 'Cuscuz', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' }
        ],
        instructions: 'Cuscuz rápido com ovo',
        peopleCount: 1
      },
      { 
        day: 'Sexta', 
        type: MealType.JANTAR, 
        title: 'Bisteca Grelhada e Salada de Repolho', 
        ingredients: ['Arroz', 'Bisteca', 'Repolho', 'Cenoura', 'Cebola', 'Alho'],
        structuredIngredients: [
          { name: 'Arroz', amountPerPerson: 0.125, unit: 'Kg' },
          { name: 'Bisteca', amountPerPerson: 0.25, unit: 'Kg' }
        ],
        instructions: 'Bisteca com arroz e salada de repolho',
        peopleCount: 4
      },

      // Sábado
      { 
        day: 'Sábado', 
        type: MealType.CAFE, 
        title: 'Cuscuz Completo', 
        ingredients: ['Cuscuz', 'Ovo', 'Fruta', 'Café', 'Leite'],
        structuredIngredients: [
          { name: 'Cuscuz', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Ovo', amountPerPerson: 2, unit: 'un' }
        ],
        instructions: 'Cuscuz completo com ovo e frutas',
        peopleCount: 3
      },
      { 
        day: 'Sábado', 
        type: MealType.ALMOCO, 
        title: 'Frango com Vegetais', 
        ingredients: ['Arroz', 'Frango', 'Vegetais variados', 'Salada verde', 'Cebola', 'Tomate'],
        structuredIngredients: [
          { name: 'Arroz', amountPerPerson: 0.125, unit: 'Kg' },
          { name: 'Frango', amountPerPerson: 0.2, unit: 'Kg' }
        ],
        instructions: 'Dia completo: Arroz, Frango e Salada',
        peopleCount: 3
      },
      { 
        day: 'Sábado', 
        type: MealType.LANCHE, 
        title: 'Frutas Variadas', 
        ingredients: ['Frutas', 'Café'],
        structuredIngredients: [
          { name: 'Frutas', amountPerPerson: 1, unit: 'un' }
        ],
        instructions: 'Mix de frutas da estação',
        peopleCount: 3
      },
      { 
        day: 'Sábado', 
        type: MealType.JANTAR, 
        title: 'Macarrão com Carne Moída e Queijo', 
        ingredients: ['Macarrão', 'Molho de tomate', 'Carne moída', 'Queijo', 'Cebola', 'Tomate'],
        structuredIngredients: [
          { name: 'Macarrão', amountPerPerson: 0.125, unit: 'pct' },
          { name: 'Carne Moída', amountPerPerson: 0.2, unit: 'Kg' },
          { name: 'Molho de Tomate', amountPerPerson: 0.25, unit: 'un' }
        ],
        instructions: 'Macarrão ao molho de tomate com queijo',
        peopleCount: 3
      },
    ];

    suggested.forEach(meal => {
      // Avoid exact duplicates
      if (!meals.find(m => m.day === meal.day && m.type === meal.type)) {
        add(meal);
      }
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-1 md:px-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Gastronomy Planner</p>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Plano <span className="text-slate-400">Nutricional</span>
          </h2>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={loadSuggestedDiet}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mr-1"
          >
            Sugestão IA
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
              isAdding ? "bg-slate-900 text-white" : "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
            )}
          >
            <Plus size={14} className={cn("transition-transform", isAdding && "rotate-45")} />
            {isAdding ? "Fechar" : "Nova Refeição"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Calendar */}
        <div className="lg:col-span-7 space-y-8">
          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddMeal}
                className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-5 shadow-xl overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Dia da Semana</label>
                    <select
                      value={form.day}
                      onChange={e => setForm({...form, day: e.target.value})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                    >
                      {WEEK_DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Qtd Pessoas</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      value={form.peopleCount}
                      onChange={e => setForm({...form, peopleCount: parseInt(e.target.value) || 1})}
                      className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tipo de Refeição</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({...form, type: e.target.value as MealType})}
                    className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                  >
                    {Object.entries(MEAL_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Ingredientes do Estoque</label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                       <select
                         value={currentIngredient.productId}
                         onChange={e => setCurrentIngredient({...currentIngredient, productId: e.target.value})}
                         className="flex-1 px-4 py-3 border border-slate-100 bg-slate-50 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer appearance-none"
                       >
                         <option value="">Selecionar Produto...</option>
                         {products.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                           <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                         ))}
                       </select>
                       <input 
                         type="number"
                         step="0.001"
                         placeholder="Qtd/Pessoa"
                         value={currentIngredient.amountPerPerson || ''}
                         onChange={e => setCurrentIngredient({...currentIngredient, amountPerPerson: parseFloat(e.target.value) || 0})}
                         className="w-24 px-4 py-3 border border-slate-100 bg-slate-50 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                       />
                       <button 
                         type="button"
                         onClick={handleAddIngredient}
                         className="p-3 bg-emerald-600 text-white rounded-xl transition-all cursor-pointer"
                       >
                         <Plus size={16} />
                       </button>
                    </div>

                    {form.structuredIngredients.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                        {form.structuredIngredients.map((ing, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 py-1 border-b border-white last:border-0 group">
                            <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black text-slate-700 uppercase truncate">{ing.name}</p>
                               <p className="text-[9px] font-bold text-slate-400">
                                 {ing.amountPerPerson} {ing.unit} por pessoa 
                                 <span className="mx-1">•</span> 
                                 Total: {(ing.amountPerPerson * form.peopleCount).toFixed(2)} {ing.unit}
                               </p>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveIngredient(idx)}
                              className="p-1.5 text-slate-300 transition-colors cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Título do Prato</label>
                  <input 
                    required
                    placeholder="Ex: Lasanha de Berinjela"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full px-5 py-3.5 border border-slate-100 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 cursor-pointer">
                  Confirmar Planejamento
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-10">
            {WEEK_DAYS.map(day => {
              const dayMeals = meals
                .filter(m => m.day === day)
                .sort((a, b) => (MEAL_TYPE_ORDER[a.type] || 0) - (MEAL_TYPE_ORDER[b.type] || 0));

              if (dayMeals.length === 0) return null;

              return (
                <div key={day} className="space-y-4">
                  <div className="flex items-center gap-4 px-2">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] shrink-0">{day}</h3>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                  <div className="grid gap-4">
                    {dayMeals.map(meal => (
                      <motion.div 
                        layout
                        key={meal.id} 
                        className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-sm flex items-center justify-between gap-4 group"
                      >
                        <div className="flex gap-4 items-center min-w-0">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-800 flex items-center justify-center shrink-0 shadow-sm border border-white">
                            <ChefHat size={24} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                 {MEAL_TYPE_LABELS[meal.type]}
                               </span>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                 Pessoas: 
                                 <input 
                                   type="number"
                                   min="1"
                                   defaultValue={meal.peopleCount || 1}
                                   onBlur={(e) => handleUpdatePeopleCount(meal, parseInt(e.target.value) || 1)}
                                   className="w-8 bg-transparent text-center font-black outline-none border-b border-transparent focus:border-slate-300"
                                 />
                               </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 truncate">{meal.title}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                               <button 
                                 onClick={() => setSelectedMeal(meal)}
                                 className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1.5 cursor-pointer"
                               >
                                 <Calculator size={10} /> Calculadora Técnica
                               </button>
                               <span className="text-slate-200">/</span>
                               <button 
                                 onClick={() => remove(meal.id)}
                                 className="text-[9px] font-black text-red-400 uppercase flex items-center gap-1.5 cursor-pointer"
                               >
                                 Excluir
                               </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="shrink-0 hidden md:block">
                           <ArrowRight size={16} className="text-slate-200" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {meals.length === 0 && !isAdding && (
            <div className="py-24 text-center space-y-4 bg-white rounded-[40px] border border-slate-100 border-dashed">
              <ChefHat size={48} className="mx-auto text-slate-100" />
              <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest leading-loose">
                Organismo Operacional Vazio<br/>Inicie o Planejamento Semanal
              </p>
            </div>
          )}
        </div>

        {/* Right Column: AI Shopping & Action Cards */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-slate-900 rounded-[40px] p-10 relative overflow-hidden shadow-2xl group min-h-[400px] flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-10 text-emerald-500/10">
                <Sparkles size={200} strokeWidth={0.5} />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                  <div className="w-12 h-1 bg-emerald-500 rounded-full mb-4" />
                  <h3 className="text-white text-3xl font-black tracking-tighter uppercase leading-tight">Shopping<br/>Intelligence</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">IA Generated Logistics</p>
                </div>

                {shoppingList.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 space-y-6 border border-white/10"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Inventory Requiriments</h4>
                      <button onClick={() => setShoppingList([])} className="p-2 bg-white/10 text-white rounded-xl cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
                      {shoppingList.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-slate-100 font-bold group/item py-1">
                          <div className="w-2 h-2 rounded-full border-2 border-emerald-500" />
                          <span className="truncate tracking-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">
                      O sistema analisa cada ingrediente, tempo de preparo e contagem de pessoas para prever a lista técnica da feira.
                    </p>

                    <button 
                      onClick={handleSyncDietAndStock}
                      disabled={isGenerating || meals.length === 0}
                      className="w-full bg-emerald-600 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95 cursor-pointer"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      {isGenerating ? 'Calculando Logística...' : 'Sincronizar Estoque & Finanças'}
                    </button>
                  </div>
                )}
              </div>

              <div className="relative z-10 flex items-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest border-t border-white/5 pt-8 mt-8">
                <Clock size={14} />
                <span>Próximo ciclo de atualização em 24h</span>
              </div>
           </div>

           <div className="bg-amber-600 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
              <ShoppingBag className="absolute -right-4 -bottom-4 text-white/10" size={100} />
              <h4 className="text-[11px] font-black uppercase tracking-widest mb-4 italic text-amber-200">Dica de Logística</h4>
              <p className="text-sm font-bold leading-relaxed">
                Tente agrupar preparos similares no mesmo dia para economizar gás e tempo de higienização de vegetais. O sistema prioriza insumos frescos para os primeiros dias da semana.
              </p>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedMeal && (
          <MealDetailsModal 
            meal={selectedMeal} 
            onClose={() => setSelectedMeal(null)} 
           />
        )}
      </AnimatePresence>
    </div>
  );
}
