import React, { useState, useMemo } from 'react';
import { Meal, MealIngredient, Product } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { 
  X, 
  Plus, 
  Trash2, 
  Calculator, 
  Package, 
  Users,
  Search,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MealDetailsModalProps {
  meal: Meal;
  onClose: () => void;
}

export function MealDetailsModal({ meal, onClose }: MealDetailsModalProps) {
  const { update } = useFirestore<Meal>('meals');
  const { data: products, add: addProduct, update: updateProduct } = useFirestore<Product>('products');
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    amountPerPerson: '',
    unit: ''
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const peopleCount = meal.peopleCount || 3;
  const ingredients = useMemo(() => {
    let list = meal.structuredIngredients || [];
    
    // If no structured ingredients but we have the string list, try to hydrate
    if (list.length === 0 && meal.ingredients.length > 0) {
      list = meal.ingredients.map(name => ({
        name,
        amountPerPerson: 0,
        unit: 'un'
      }));
    }
    return list;
  }, [meal.structuredIngredients, meal.ingredients]);

  const handleAddIngredient = async () => {
    if (!newIngredient.name || !newIngredient.amountPerPerson) return;

    const amount = parseFloat(newIngredient.amountPerPerson);
    if (isNaN(amount)) return;

    const ingredientName = newIngredient.name.trim();
    const ingredientUnit = newIngredient.unit.trim() || 'un';

    // Auto-sync with Products (Pantry)
    let productId = '';
    const existingProduct = products.find(p => p.name.toLowerCase() === ingredientName.toLowerCase());
    
    if (!existingProduct) {
      const docRef = await addProduct({
        name: ingredientName,
        price: 0,
        quantity: amount * peopleCount,
        category: 'Outros',
        unit: ingredientUnit,
        minStock: 0,
        updatedAt: new Date().toISOString()
      });
      if (docRef) productId = docRef.id;
    } else {
      productId = existingProduct.id;
      // User requested: "automaticamente aumentar a quantidade na aba de estoque de acordo com a necessidade"
      const needed = amount * peopleCount;
      if (existingProduct.quantity < needed) {
        await updateProduct(existingProduct.id, { quantity: needed });
      }
    }

    // Update existing or add new to structuredIngredients
    const existingIdx = ingredients.findIndex(i => 
      (i.productId && i.productId === productId) || 
      i.name.toLowerCase() === ingredientName.toLowerCase()
    );
    let updatedIngredients;
    
    if (existingIdx > -1) {
      updatedIngredients = [...ingredients];
      updatedIngredients[existingIdx] = {
        ...updatedIngredients[existingIdx],
        productId,
        amountPerPerson: amount,
        unit: ingredientUnit
      };
    } else {
      updatedIngredients = [...ingredients, {
        productId,
        name: ingredientName,
        amountPerPerson: amount,
        unit: ingredientUnit
      }];
    }
    
    await update(meal.id, { structuredIngredients: updatedIngredients });
    setNewIngredient({ name: '', amountPerPerson: '', unit: '' });
    setShowSuggestions(false);
  };

  const updateIngredientAmount = async (index: number, amount: number) => {
    const updatedIngredients = [...ingredients];
    const ing = updatedIngredients[index];
    updatedIngredients[index] = { ...ing, amountPerPerson: amount };
    
    // Sync with Pantry
    if (ing.productId) {
      const product = products.find(p => p.id === ing.productId);
      if (product) {
        const needed = amount * peopleCount;
        if (product.quantity < needed) {
          await updateProduct(product.id, { quantity: needed });
        }
      }
    }

    await update(meal.id, { structuredIngredients: updatedIngredients });
  };

  const removeIngredient = async (index: number) => {
    const updatedIngredients = ingredients.filter((_, i) => i !== index);
    // Also remove from the simple ingredients list for consistency if needed
    const simpleIngredients = meal.ingredients.filter(name => 
      name.toLowerCase() !== ingredients[index].name.toLowerCase()
    );
    await update(meal.id, { 
      structuredIngredients: updatedIngredients,
      ingredients: simpleIngredients
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(newIngredient.name.toLowerCase()) &&
    newIngredient.name.length > 0
  );

  const selectProduct = (product: Product) => {
    setNewIngredient({
      name: product.name,
      amountPerPerson: '',
      unit: product.unit
    });
    // Store temporarily in a way we can use on submit
    // We could also just add it immediately
    setShowSuggestions(false);
  };

  const [isAddingNewPantryItem, setIsAddingNewPantryItem] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight">{meal.title}</h3>
            <div className="flex items-center gap-2 text-slate-400">
              <Calculator size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Calculadora de Dieta • {peopleCount} Pessoas
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Quick Select from Pantry */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itens da Feira</h4>
              <button 
                onClick={() => setIsAddingNewPantryItem(!isAddingNewPantryItem)}
                className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1 hover:text-emerald-700"
              >
                <Plus size={10} />
                Novo Item na Feira
              </button>
            </div>

            {isAddingNewPantryItem && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-2"
              >
                <input 
                  placeholder="Nome do Produto"
                  value={newIngredient.name}
                  onChange={e => setNewIngredient({...newIngredient, name: e.target.value})}
                  className="flex-1 px-4 py-2 bg-white border border-emerald-100 rounded-xl text-xs font-bold outline-none"
                />
                <button 
                  onClick={async () => {
                    if (!newIngredient.name) return;
                    await addProduct({
                      name: newIngredient.name,
                      price: 0,
                      quantity: 0,
                      category: 'Outros',
                      unit: 'un',
                      minStock: 0,
                      updatedAt: new Date().toISOString()
                    });
                    setIsAddingNewPantryItem(false);
                  }}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Cadastrar
                </button>
              </motion.div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className="shrink-0 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 uppercase hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* New Ingredient Form */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Definir Qtd p/ Pessoa</h4>
            <div className="flex flex-col gap-3 relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    placeholder="Nome (ex: Arroz)"
                    value={newIngredient.name}
                    onChange={e => {
                      setNewIngredient({...newIngredient, name: e.target.value});
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  
                  <AnimatePresence>
                    {showSuggestions && filteredProducts.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-10 max-h-40 overflow-y-auto overflow-x-hidden"
                      >
                        {filteredProducts.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setNewIngredient({
                                ...newIngredient,
                                name: p.name,
                                unit: p.unit
                              });
                              setShowSuggestions(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center justify-between group border-b border-slate-50 last:border-0"
                          >
                            <span className="text-sm font-bold text-slate-700">{p.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{p.unit}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="w-24">
                  <input 
                    type="number"
                    step="0.001"
                    placeholder="Qtd"
                    value={newIngredient.amountPerPerson}
                    onChange={e => setNewIngredient({...newIngredient, amountPerPerson: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-700"
                  />
                </div>
                <div className="w-20">
                  <input 
                    placeholder="Un"
                    value={newIngredient.unit}
                    onChange={e => setNewIngredient({...newIngredient, unit: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <button 
                  onClick={handleAddIngredient}
                  className="bg-emerald-600 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Ingredient List */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Cálculo de Porções</h4>
            <div className="space-y-3">
              {ingredients.map((ing, idx) => {
                const total = ing.amountPerPerson * peopleCount;
                const isSynced = products.some(p => p.name.toLowerCase() === ing.name.toLowerCase());

                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <div className="flex items-center gap-4">
                      <div className="w-16">
                        <input 
                          type="number"
                          step="0.001"
                          value={ing.amountPerPerson}
                          onChange={(e) => updateIngredientAmount(idx, parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 text-center outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[8px] font-bold text-slate-400 uppercase text-center mt-1">{ing.unit} / pessoa</p>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-slate-900">{ing.name}</h5>
                          {isSynced && <CheckCircle2 size={12} className="text-emerald-500" />}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Sincronizado Feira</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Calculator size={12} className="text-emerald-600" />
                          <span className="text-sm font-black text-emerald-700">{total.toFixed(3)}</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">{ing.unit}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sincronizado</p>
                      </div>
                      <button 
                        onClick={() => removeIngredient(idx)}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {ingredients.length === 0 && (
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-3">
                  <Package size={24} className="text-slate-200" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum cálculo definido</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Ajuste de Escala</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-900">Multiplicando para {peopleCount} pessoas</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
