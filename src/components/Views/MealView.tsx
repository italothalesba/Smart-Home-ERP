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
  ArrowRight
} from 'lucide-react';
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
  'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'
];

export function MealView() {
  const { data: meals, add, remove } = useFirestore<Meal>('meals');
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  const [form, setForm] = useState({
    day: 'Segunda',
    type: MealType.ALMOCO,
    title: '',
    ingredients: ''
  });

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      day: form.day,
      type: form.type,
      title: form.title,
      ingredients: form.ingredients.split(',').map(i => i.trim()).filter(i => i),
    });
    setIsAdding(false);
    setForm({ day: 'Segunda', type: MealType.ALMOCO, title: '', ingredients: '' });
  };

  const handleGenerateList = async () => {
    if (meals.length === 0) return;
    setIsGenerating(true);
    const mealTitles = meals.map(m => `${m.day}: ${m.title}`);
    const list = await generateShoppingList(mealTitles);
    setShoppingList(list);
    setIsGenerating(false);
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
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Tipo</label>
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
            <textarea 
              placeholder="Separe por vírgula"
              value={form.ingredients}
              onChange={e => setForm({...form, ingredients: e.target.value})}
              className="w-full px-5 py-3 border border-slate-100 bg-slate-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
            />
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors">
            Salvar Planejamento
          </button>
        </motion.form>
      )}

      <div className="space-y-8">
        {WEEK_DAYS.map(day => {
          const dayMeals = meals.filter(m => m.day === day);
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
                  <div key={meal.id} className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ChefHat size={24} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">
                            {MEAL_TYPE_LABELS[meal.type]}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{meal.title}</h4>
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            Ingredientes: {meal.ingredients.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => remove(meal.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors">
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
    </div>
  );
}
