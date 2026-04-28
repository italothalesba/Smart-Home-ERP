import { auth, googleProvider, db } from './lib/firebase';
import { cn } from './lib/utils';
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
  Sparkles,
  Smartphone,
  QrCode,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
// --- Types ---
import { UserProfile, Finance, Product, FinanceType } from './types';

// --- Hooks ---
import { useFirestore } from './hooks/useFirestore';

// --- Views ---
import { FinanceView } from './components/Views/FinanceView';
import { PantryView } from './components/Views/PantryView';
import { VisionView } from './components/Views/VisionView';
import { MealView } from './components/Views/MealView';

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
        "flex flex-col items-center justify-center gap-1 p-2 relative group cursor-pointer transition-all active:scale-90",
        active ? "text-emerald-600" : "text-slate-400"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
        active ? "bg-emerald-100 shadow-inner" : "bg-transparent"
      )}>
        <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest transition-all",
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="absolute -top-1 w-1 items-center justify-center"
        >
           <div className="w-12 h-1 bg-emerald-600 rounded-full" />
        </motion.div>
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
  onNavigate,
  geminiStatus
}: { 
  user: UserProfile, 
  onLogout: () => void, 
  onNavigate: (tab: any) => void,
  geminiStatus: { success: boolean; message: string } | null
}) {
  const { data: finances } = useFirestore<Finance>('finances');
  const { data: products } = useFirestore<Product>('products');
  const [seeding, setSeeding] = useState(false);
  const [showShare, setShowShare] = useState(false);

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
    const value = f.type === FinanceType.PARCELADO && f.totalInstallments 
      ? f.value / f.totalInstallments 
      : f.value;
    return acc + (Math.round(value * 100) / 100);
  }, 0);

  const lowStockItems = products.filter(p => p.quantity <= (p.minStock || 0));
  const budget = user?.budget || 1300;
  const consumedPercent = (totalMonthlyImpact / budget) * 100;

  const publicUrl = process.env.APP_URL || window.location.href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="space-y-8">
      {/* Dynamic Header for Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Operational Pulse</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Visão Geral <span className="text-slate-400">/ Resumo</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setShowShare(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm group active:scale-95"
          >
            <Smartphone size={14} />
            Acesso Mobile
          </button>
          <button 
            onClick={onLogout}
            className="p-3 bg-slate-100 text-slate-400 rounded-xl cursor-pointer lg:hidden active:scale-95"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Main Budget Card - Spans 2 columns on lg */}
        <Card className="lg:col-span-2 relative overflow-hidden group border-none bg-emerald-600 text-white min-h-[220px]">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex justify-between items-start mb-auto">
              <span className="px-3 py-1 bg-white/20 text-white text-[10px] font-black rounded-full uppercase tracking-wider backdrop-blur-md">Status Financeiro</span>
              {geminiStatus && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                   <div className={cn("w-1.5 h-1.5 rounded-full", geminiStatus.success ? "bg-white animate-pulse" : "bg-red-300")} />
                   <span className="text-[9px] font-bold uppercase tracking-widest">AI Engine {geminiStatus.success ? "Ready" : "Offline"}</span>
                </div>
              )}
            </div>
            
            <div className="mb-8 mt-6">
              <p className="text-[11px] font-bold text-emerald-100 uppercase tracking-widest mb-1 opacity-80">Orçamento Mensal Disponível</p>
              <p className="text-5xl font-black text-white tracking-tighter">R$ {budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>

            <div className="space-y-3 mt-auto">
              <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(consumedPercent, 100)}%` }}
                  className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.1em]">
                <span className="text-white">Consumido: R$ {(Math.round(totalMonthlyImpact * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-emerald-100 italic">Restante: R$ {(Math.round((budget - totalMonthlyImpact) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* AI Insight Card */}
        <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col justify-between border-t border-slate-800 min-h-[220px]">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px]" />
          
          <div>
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <Sparkles size={20} className="text-white" />
            </div>
            <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Neural Analytics</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
              "{lowStockItems.length > 0 ? `Identifiquei uma variação crítica no seu estoque: ${lowStockItems.length} itens essenciais precisam ser repostos.` : 'Seu ecossistema está equilibrado. Recomendo escanear novos recibos para manter os dados atualizados.'}"
            </p>
          </div>

          <button 
            onClick={() => onNavigate('ai')}
            className="w-full mt-8 py-4 bg-emerald-500 active:scale-95 text-white text-[10px] font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            Acessar Scanner AI
          </button>
        </div>

        {/* Secondary Cards Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Financeiro" subtitle="Próximos Vencimentos" className="flex flex-col">
            <div className="space-y-3 flex-1">
              {finances.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Nenhum Registro</p>
                </div>
              ) : (
                finances.slice(0, 3).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-50 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-[9px]">
                        {f.type[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{f.description}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                          {f.type === FinanceType.FIXA ? `Todo dia ${f.dueDate}` : new Date(f.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-black text-slate-900 text-xs italic shrink-0">
                      R$ {(() => {
                        const val = f.type === FinanceType.PARCELADO ? f.value / (f.totalInstallments || 1) : f.value;
                        return (Math.round(val * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                      })()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => onNavigate('finance')}
              className="w-full mt-4 py-3 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer"
            >
              Ver Todas Contas
            </button>
          </Card>

          <Card title="Estoque Crítico" subtitle="Reposição Imediata" className="flex flex-col">
            <div className="space-y-3 flex-1">
              {lowStockItems.length === 0 ? (
                <div className="py-8 text-center bg-emerald-50 rounded-2xl border border-dashed border-emerald-100">
                   <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Estoque OK</p>
                </div>
              ) : (
                lowStockItems.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3.5 bg-red-50/50 rounded-2xl border border-red-50 group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                        <AlertCircle size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                        <p className="text-[9px] text-red-500 uppercase font-black tracking-widest mt-0.5">
                          Abaixo do mínimo
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                       <p className="text-xs font-black text-red-600">{p.quantity}{p.unit}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button 
              onClick={() => onNavigate('market')}
              className="w-full mt-4 py-3 bg-slate-50 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer"
            >
              Gerenciar Despensa
            </button>
          </Card>

          <Card title="Inventário" subtitle="Atividade Recente" className="flex flex-col">
            <div className="space-y-2 flex-1">
              {products.slice(-5).reverse().map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-50 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-[8px] uppercase font-bold text-slate-400 tracking-tighter">{p.category}</p>
                    <p className="text-[11px] font-bold text-slate-900 truncate">{p.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-black text-emerald-600">{p.quantity}{p.unit}</span>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="text-xs text-slate-400 italic text-center py-8">Nenhum produto.</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Itens</p>
               <p className="text-sm font-black text-slate-900">{products.length}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShare && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-xs p-8 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowShare(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="text-center space-y-6">
                <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                  <Smartphone size={32} />
                </div>
                
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Acesso Mobile</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Escaneie para celular</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <img 
                    src={qrUrl}
                    alt="QR Code"
                    className="w-full aspect-square rounded-lg shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(publicUrl);
                      alert('Link copiado!');
                    }}
                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer"
                  >
                    <Copy size={14} />
                    Copiar Link
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { testGeminiConnection } from './lib/gemini';

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dash' | 'market' | 'finance' | 'ai' | 'meals'>('dash');
  const [loading, setLoading] = useState(true);
  const [geminiStatus, setGeminiStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Run Gemini test
        const status = await testGeminiConnection();
        setGeminiStatus(status);
        if (!status.success) {
          console.error("Gemini Failure:", status.message);
        } else {
          console.log("Gemini Success:", status.message);
        }
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

  if (!profile) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.1),transparent_70%)]" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-12 relative z-10"
        >
          <div className="space-y-6">
            <div className="w-24 h-24 bg-emerald-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-emerald-200 rotate-3 transform">
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
            className="w-full bg-white text-slate-900 font-black py-5 px-6 rounded-[24px] shadow-sm border border-slate-200 transition-all flex items-center justify-center gap-4 text-lg active:scale-95 uppercase tracking-widest"
          >
            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
            LOGIN VIA GOOGLE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row relative overflow-hidden font-sans safe-pt">
      {/* Sidebar - Desktop */}
      <nav className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 p-8 fixed h-full z-50">
        <div className="mb-12">
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase leading-none">
            Smart Home<br/><span className="text-emerald-600">ERP</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-1">Master Blueprint v1.0</p>
        </div>

        <div className="flex-1 space-y-2">
          <SidebarNavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} />
          <SidebarNavItem icon={ShoppingBag} label="Estoque / Feira" active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
          <SidebarNavItem icon={ChefHat} label="Planejamento" active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} />
          <SidebarNavItem icon={CreditCard} label="Financeiro" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <SidebarNavItem icon={Camera} label="Vision AI" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
        </div>

        <div className="mt-auto pt-8 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-500 border border-emerald-400 overflow-hidden shadow-sm flex-shrink-0">
               <div className="w-full h-full bg-gradient-to-br from-slate-400 to-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-slate-900 uppercase truncate">{profile.displayName}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">Premium User</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 relative min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12 pb-40 lg:pb-12">
          <AnimatePresence mode="wait">
            {activeTab === 'dash' && (
              <motion.div 
                key="dash"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardView 
                  user={profile!} 
                  onLogout={logout} 
                  onNavigate={setActiveTab} 
                  geminiStatus={geminiStatus}
                />
              </motion.div>
            )}

            {activeTab === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <PantryView />
              </motion.div>
            )}

            {activeTab === 'meals' && (
              <motion.div 
                key="meals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <MealView />
              </motion.div>
            )}

            {activeTab === 'finance' && (
              <motion.div 
                key="finance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <FinanceView />
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div 
                key="ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <VisionView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Nav - Mobile ONLY */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-3 flex justify-between items-end pb-[env(safe-area-inset-bottom,16px)] pt-2 z-50 h-[88px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <NavItem icon={LayoutDashboard} label="Resumo" active={activeTab === 'dash'} onClick={() => setActiveTab('dash')} />
        <NavItem icon={ShoppingBag} label="Estoque" active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
        
        <div className="flex flex-col items-center justify-end pb-2">
          <button 
            onClick={() => setActiveTab('ai')}
            className={cn(
              "w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 duration-500",
              activeTab === 'ai' 
                ? "bg-slate-900 rotate-0 shadow-slate-200" 
                : "bg-emerald-600 shadow-emerald-200 rotate-6"
            )}
          >
            <Camera size={32} strokeWidth={2.5} />
          </button>
          <span className="text-[7px] font-black uppercase text-slate-400 mt-2 tracking-tighter">Neural Scan</span>
        </div>

        <NavItem icon={ChefHat} label="Dieta" active={activeTab === 'meals'} onClick={() => setActiveTab('meals')} />
        <NavItem icon={CreditCard} label="Contas" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
      </nav>
    </div>
  );
}

function SidebarNavItem({ 
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
        "w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest cursor-pointer",
        active 
          ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100" 
          : "text-slate-400"
      )}
    >
      <Icon size={18} />
      {label}
      {active && <div className="ml-auto w-1.5 h-1.5 bg-emerald-600 rounded-full shadow-lg shadow-emerald-300" />}
    </button>
  );
}
