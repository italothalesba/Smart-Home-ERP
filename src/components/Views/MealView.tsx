import React, { useState } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Meal, MealType } from '../../types';
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
  Calculator
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
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [form, setForm] = useState({
    day: 'Domingo',
    type: MealType.ALMOCO,
    title: '',
    ingredients: '',
    instructions: '',
    peopleCount: 3
  });

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      day: form.day,
      type: form.type,
      title: form.title,
      ingredients: form.ingredients.split(',').map(i => i.trim()).filter(i => i),
      instructions: form.instructions,
      peopleCount: form.peopleCount
    });
    setIsAdding(false);
    setForm({ day: 'Domingo', type: MealType.ALMOCO, title: '', ingredients: '', instructions: '', peopleCount: 3 });
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
    <div className="space-y-8">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Planejamento Diário</h2>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nutrição & Logística</p>
      </div>

      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-emerald-600" />
          <h3 className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Cardápio da Semana</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadSuggestedDiet}
            className="px-4 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Sugerida
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all shadow-lg",
              isAdding ? "bg-slate-800" : "bg-emerald-600 shadow-emerald-100"
            )}
          >
            <Plus size={20} className={cn("transition-transform", isAdding && "rotate-45")} />
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddMeal}
          className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Dia</label>
              <select
                value={form.day}
                onChange={e => setForm({...form, day: e.target.value})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
              >
                {WEEK_DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Pessoas</label>
              <input 
                type="number"
                min="1"
                required
                value={form.peopleCount}
                onChange={e => setForm({...form, peopleCount: parseInt(e.target.value) || 1})}
                className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Tipo de Refeição</label>
            <select
              value={form.type}
              onChange={e => setForm({...form, type: e.target.value as MealType})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
            >
              {Object.entries(MEAL_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Nome do Prato</label>
            <input 
              required
              placeholder="Ex: Lasanha de Berinjela"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Ingredientes (Sugerido)</label>
            <input 
              placeholder="Separe por vírgula"
              value={form.ingredients}
              onChange={e => setForm({...form, ingredients: e.target.value})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Detalhes (Pessoas / Qtdas)</label>
            <textarea 
              placeholder="Ex: 3 pessoas - 2 porções individuais"
              value={form.instructions}
              onChange={e => setForm({...form, instructions: e.target.value})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-20 resize-none"
            />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors">
            Salvar Planejamento
          </button>
        </motion.form>
      )}

      <div className="space-y-8">
        {WEEK_DAYS.map(day => {
          const dayMeals = meals
            .filter(m => m.day === day)
            .sort((a, b) => (MEAL_TYPE_ORDER[a.type] || 0) - (MEAL_TYPE_ORDER[b.type] || 0));

          if (dayMeals.length === 0) return null;

          return (
            <div key={day} className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="h-px bg-slate-100 flex-1" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{day}</span>
                <div className="h-px bg-slate-100 flex-1" />
              </div>
              <div className="space-y-3">
                {dayMeals.map(meal => (
                  <div 
                    key={meal.id} 
                    className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-start justify-between gap-4 transition-all group"
                  >
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ChefHat size={24} />
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                            {MEAL_TYPE_LABELS[meal.type]}
                          </span>
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Pessoas:</span>
                            <input 
                              type="number"
                              min="1"
                              defaultValue={meal.peopleCount || 1}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val !== meal.peopleCount) {
                                  update(meal.id, { peopleCount: val });
                                }
                              }}
                              className="text-[10px] font-black text-slate-900 bg-transparent w-8 outline-none text-center"
                            />
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{meal.title}</h4>
                        <button 
                          onClick={() => setSelectedMeal(meal)}
                          className="flex items-center gap-2 hover:bg-emerald-50 px-2 py-1 -ml-2 rounded-lg transition-colors cursor-pointer"
                        >
                          <Calculator size={10} className="text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">Calculadora de Dieta</span>
                        </button>
                        {meal.instructions && (
                          <p className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            {meal.instructions}
                          </p>
                        )}
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            Ingredientes: {meal.ingredients.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(meal.id);
                      }} 
                      className="p-2 text-slate-200 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {meals.length === 0 && !isAdding && (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <ChefHat size={32} />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Nenhuma refeição planejada</p>
          </div>
        )}
      </div>

      <div className="pt-8 pb-12">
        <div className="bg-slate-900 rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 text-emerald-500/20">
            <Sparkles size={120} strokeWidth={1} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="space-y-2">
              <h3 className="text-white text-xl font-black tracking-tighter uppercase">Assistant Shopping List</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">IA Powered Prediction</p>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Gere automaticamente a lista técnica de compras baseada nos pratos planejados acima.
            </p>

            {shoppingList.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/10"
              >
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Itens Necessários</h4>
                  <button onClick={() => setShoppingList([])} className="text-white/40 hover:text-white transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {shoppingList.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <button 
                onClick={handleGenerateList}
                disabled={isGenerating || meals.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-950/20 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {isGenerating ? 'Analisando Dieta...' : 'Gerar Lista de Compras'}
              </button>
            )}
            
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <Clock size={12} />
              <span>Sincronização em tempo real</span>
            </div>
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
