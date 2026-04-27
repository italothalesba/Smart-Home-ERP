import { auth, googleProvider, db } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ChefHat, 
  CreditCard, 
  LogOut, 
  Camera,
  AlertCircle,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types ---
import { UserProfile, Finance, Product, FinanceType } from './types';

// --- Hooks ---
import { useFirestore } from './hooks/useFirestore';

// --- Views ---
import { FinanceView } from './components/Views/FinanceView';
import { PantryView } from './components/Views/PantryView';
import { VisionView } from './components/Views/VisionView';
import { MealView } from './components/Views/MealView';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

function NavItem({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-2 transition-all relative group cursor-pointer",
        active ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
        active ? "bg-emerald-50" : "bg-transparent"
      )}>
        <Icon size={24} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-1 w-12 h-1 bg-emerald-600 rounded-full"
        />
      )}
    </button>
  );
}

function Card({ children, className, title, subtitle }: { children: React.ReactNode, className?: string, title?: string, subtitle?: string }) {
  return (
    <div className={cn("bg-white rounded-[24px] p-6 shadow-sm border border-slate-200", className)}>
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h3>
          {subtitle && <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

import { seedUserData } from './lib/seedData';

function DashboardView({ 
  user, 
  onLogout, 
  onNavigate 
}: { 
  user: UserProfile, 
  onLogout: () => void, 
  onNavigate: (tab: any) => void 
}) {
  const { data: finances } = useFirestore<Finance>('finances');
  const { data: products } = useFirestore<Product>('products');
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (confirm('Deseja importar os dados informados anteriormente? Isso preencherá suas finanças, estoque e dieta.')) {
      setSeeding(true);
      try {
        await seedUserData(user.uid);
        alert('Dados importados com sucesso!');
      } catch (err) {
        console.error(err);
      } finally {
        setSeeding(false);
      }
    }
  };

  const totalMonthlyImpact = finances.reduce((acc, f) => {
    if (f.type === FinanceType.PARCELA && f.totalInstallments) {
      return acc + (f.value / f.totalInstallments);
    }
    return acc + f.value;
  }, 0);

  const lowStockItems = products.filter(p => p.quantity <= (p.minStock || 0));
  const budget = user.budget || 1000;
  const consumedPercent = (totalMonthlyImpact / budget) * 100;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center bg-white border-b border-slate-200 -mx-6 -mt-6 px-8 py-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Smart Home <span className="text-emerald-600">ERP</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Olá, {user.displayName?.split(' ')[0]} • v1.0
          </p>
        </div>
        <div className="flex items-center gap-2">
          {products.length === 0 && (
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={12} />
              {seeding ? '...' : 'Importar'}
            </button>
          )}
          <button 
            onClick={onLogout}
            className="p-2 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Status</p>
            <p className="text-xs text-emerald-500 font-semibold uppercase">Sincronizado</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-emerald-500 overflow-hidden shadow-sm">
             <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600" />
          </div>
        </div>
      </header>

      <Card>
        <div className="flex justify-between items-start mb-4">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Orçamento Mensal</span>
        </div>
        <div className="mb-6">
          <p className="text-4xl font-black text-slate-900 tracking-tighter">R$ {budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-slate-400 text-sm font-medium">Saldo total disponível em conta</p>
        </div>
        <div className="space-y-3">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(consumedPercent, 100)}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                consumedPercent > 90 ? "bg-red-500" : consumedPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-500">Consumido: R$ {totalMonthlyImpact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span className="text-emerald-600">Livre: R$ {(budget - totalMonthlyImpact).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </Card>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-[24px] p-4 flex gap-4 items-center">
          <div className="p-2 bg-red-100 text-red-600 rounded-xl">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Alerta de Reposição</h4>
            <p className="text-sm font-bold text-red-600">{lowStockItems.length} itens abaixo do estoque mínimo.</p>
          </div>
        </div>
      )}

      <Card title="Fluxo de Gastos" subtitle="Próximos Vencimentos">
        <div className="space-y-4">
          {finances.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Sem registros financeiros.</p>
          ) : (
            finances.slice(0, 3).map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-xs uppercase">
                    {f.type[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{f.description}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Venc: {new Date(f.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="font-bold text-slate-900 text-sm italic">
                  R$ {(f.type === FinanceType.PARCELA ? f.value / (f.totalInstallments || 1) : f.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Inventário" subtitle="Itens recentes">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {products.slice(-5).map((p) => (
            <div key={p.id} className="flex-shrink-0 bg-slate-50 border border-slate-100 rounded-2xl p-4 min-w-[120px]">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{p.category}</p>
              <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
              <p className="text-lg font-black text-emerald-600 mt-1">{p.quantity}{p.unit}</p>
              <div className="w-full bg-slate-200 h-1 mt-2 rounded-full">
                <div className="bg-emerald-500 h-full w-[70%] rounded-full opacity-50" />
              </div>
            </div>
          ))}
          {products.length === 0 && <p className="text-xs text-slate-400 italic w-full text-center py-4">Nenhum produto cadastrado.</p>}
        </div>
      </Card>

      <div className="bg-slate-900 text-white p-6 rounded-[24px] shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
        <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">Chat IA Insight</h3>
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            "{lowStockItems.length > 0 ? `Detectei que faltam ${lowStockItems.length} itens essenciais. ` : ''} 
            Use o Vision AI para escanear tickets de mercado e otimizar seu estoque automaticamente."
          </p>
          <button 
            onClick={() => onNavigate('ai')}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors uppercase tracking-widest"
          >
            Abrir Scanner
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dash' | 'market' | 'finance' | 'ai' | 'meals'>('dash');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        
        let budget = 1300;
        if (userSnap.exists()) {
          budget = userSnap.data().budget || 1300;
        } else {
          // Initialize user profile in Firestore
          await setDoc(userRef, {
            uid: u.uid,
            displayName: u.displayName,
            email: u.email,
            budget: 1300,
            createdAt: new Date().toISOString()
          });

          // Automatic seed for first time users
          try {
            await seedUserData(u.uid);
            console.log('Seed data applied automatically');
          } catch (err) {
            console.error('Auto-seed error:', err);
          }
        }

        setProfile({
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          budget: budget
        });
      }
      setLoading(false);
    });
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-lg shadow-emerald-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent_70%)]" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-12 relative z-10"
        >
          <div className="space-y-6">
            <div className="w-24 h-24 bg-emerald-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-200 rotate-3 transform hover:rotate-0 transition-transform">
              <LayoutDashboard size={48} className="text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                Smart Home<br/><span className="text-emerald-600">ERP</span>
              </h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] px-8">
                Master Blueprint v1.0
              </p>
              <p className="text-slate-400 font-medium leading-relaxed px-8 text-sm">
                Logística alimentar, gestão financeira e automação inteligente em um único ecossistema autônomo.
              </p>
            </div>
          </div>
          <button
            onClick={login}
            className="w-full bg-white text-slate-900 font-black py-5 px-6 rounded-[24px] shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all flex items-center justify-center gap-4 text-lg active:scale-95 uppercase tracking-widest"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
            LOGIN VIA GOOGLE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col max-w-md mx-auto relative overflow-hidden border-x border-slate-200 shadow-[0_0_50px_rgba(0,0,0,0.1)]">
      <main className="flex-1 overflow-y-auto p-6 pb-28">
        <AnimatePresence mode="wait">
          {activeTab === 'dash' && (
            <motion.div 
              key="dash"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardView 
                user={profile!} 
                onLogout={logout} 
                onNavigate={setActiveTab} 
              />
            </motion.div>
          )}

          {activeTab === 'market' && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PantryView />
            </motion.div>
          )}

          {activeTab === 'meals' && (
            <motion.div 
              key="meals"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <MealView />
            </motion.div>
          )}

          {activeTab === 'finance' && (
            <motion.div 
              key="finance"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <FinanceView />
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <VisionView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200 px-4 py-5 flex justify-between items-center max-w-md mx-auto z-50 rounded-t-[32px] h-24">
        <NavItem icon={LayoutDashboard} label="Dash" active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} />
        <NavItem icon={ShoppingBag} label="Feira" active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
        <div className="relative -top-12">
          <button 
            onClick={() => setActiveTab('ai')}
            className={cn(
              "w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-2xl transition-all",
              activeTab === 'ai' ? "bg-slate-900 scale-110" : "bg-emerald-600 shadow-emerald-200 hover:scale-110 active:scale-95"
            )}
          >
            <Camera size={28} />
          </button>
        </div>
        <NavItem icon={UtensilsCrossed} label="Dieta" active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} />
        <NavItem icon={CreditCard} label="Contas" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
      </nav>
    </div>
  );
}
