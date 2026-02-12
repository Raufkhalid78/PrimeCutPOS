
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Finance from './components/Finance';
import Customers from './components/Customers';
import Settings from './components/Settings';
import Inventory from './components/Inventory';
import StaffManagement from './components/StaffManagement';
import Login from './components/Login';
import { View, Sale, Expense, Service, Product, Staff, Customer, ShopSettings } from './types';
import { INITIAL_SERVICES, INITIAL_PRODUCTS, INITIAL_STAFF, INITIAL_EXPENSES, INITIAL_CUSTOMERS, DEFAULT_SETTINGS } from './constants';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('trimtime_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.expiry) {
           if (Date.now() < parsed.expiry) return parsed.user;
           return null;
        }
        return parsed.user || parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Initialize state empty, will load from Supabase
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Profile Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
    email: '',
    password: ''
  });
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('trimtime_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // --- SUPABASE FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
        const results = await Promise.all([
            supabase.from('services').select('*'),
            supabase.from('products').select('*'),
            supabase.from('staff').select('*'),
            supabase.from('expenses').select('*'),
            supabase.from('customers').select('*'),
            supabase.from('sales').select('*'),
            supabase.from('settings').select('*').single()
        ]);

        if (results[0].data) setServices(results[0].data);
        else setServices(INITIAL_SERVICES); 

        if (results[1].data) setProducts(results[1].data);
        else setProducts(INITIAL_PRODUCTS);

        if (results[2].data && results[2].data.length > 0) setStaff(results[2].data);
        else setStaff(INITIAL_STAFF);

        if (results[3].data) setExpenses(results[3].data);
        else setExpenses(INITIAL_EXPENSES);

        if (results[4].data) {
          // Map created_at to createdAt
          const mappedCustomers = results[4].data.map((c: any) => ({
             ...c,
             createdAt: c.created_at
          }));
          setCustomers(mappedCustomers);
        } else {
          setCustomers(INITIAL_CUSTOMERS);
        }

        if (results[5].data) {
            const mappedSales = results[5].data.map((s: any) => ({
                ...s,
                items: typeof s.items === 'string' ? JSON.parse(s.items) : s.items
            }));
            setSales(mappedSales);
        }

        if (results[6].data && results[6].data.data) {
            setSettings(results[6].data.data);
        }
    } catch (error) {
        console.error("Error fetching data from Supabase:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PERSISTENCE HANDLERS ---

  const smartUpdateServices = async (updatedList: Service[]) => {
      const idsInNewList = new Set(updatedList.map(i => i.id));
      const deletedIds = services.filter(s => !idsInNewList.has(s.id)).map(s => s.id);
      
      setServices(updatedList);
      
      if (deletedIds.length > 0) {
          await supabase.from('services').delete().in('id', deletedIds);
      }
      if (updatedList.length > 0) {
          await supabase.from('services').upsert(updatedList);
      }
  };

  const smartUpdateProducts = async (updatedList: Product[]) => {
      const idsInNewList = new Set(updatedList.map(i => i.id));
      const deletedIds = products.filter(p => !idsInNewList.has(p.id)).map(p => p.id);
      
      setProducts(updatedList);
      
      if (deletedIds.length > 0) {
          await supabase.from('products').delete().in('id', deletedIds);
      }
      if (updatedList.length > 0) {
          await supabase.from('products').upsert(updatedList);
      }
  };

  const smartUpdateStaff = async (updatedList: Staff[]) => {
      const idsInNewList = new Set(updatedList.map(i => i.id));
      const deletedIds = staff.filter(s => !idsInNewList.has(s.id)).map(s => s.id);

      setStaff(updatedList);

      // Sync with currentUser if the logged-in user is updated
      if (currentUser) {
        const updatedSelf = updatedList.find(s => s.id === currentUser.id);
        if (updatedSelf) {
            // Update state
            setCurrentUser(updatedSelf);
            // Update session storage
            const savedSession = localStorage.getItem('trimtime_session');
            if (savedSession) {
                try {
                    const parsed = JSON.parse(savedSession);
                    localStorage.setItem('trimtime_session', JSON.stringify({ ...parsed, user: updatedSelf }));
                } catch (e) {
                    console.error("Error updating session storage", e);
                }
            }
        }
      }

      if (deletedIds.length > 0) {
          await supabase.from('staff').delete().in('id', deletedIds);
      }
      if (updatedList.length > 0) {
          await supabase.from('staff').upsert(updatedList);
      }
  };

  // Customers: Update, Delete, Insert
  const smartUpdateCustomers = async (updatedList: Customer[]) => {
      const idsInNewList = new Set(updatedList.map(i => i.id));
      const deletedIds = customers.filter(c => !idsInNewList.has(c.id)).map(c => c.id);

      setCustomers(updatedList);

      if (deletedIds.length > 0) {
          await supabase.from('customers').delete().in('id', deletedIds);
      }
      
      // Map back to snake_case for DB
      const recordsToUpsert = updatedList.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          created_at: c.createdAt
      }));
      
      if (recordsToUpsert.length > 0) {
          await supabase.from('customers').upsert(recordsToUpsert);
      }
  };

  const handleCompleteSale = async (newSale: Sale) => {
      const updatedSales = [...sales, newSale];
      setSales(updatedSales);
      
      const { error } = await supabase.from('sales').insert({
          id: newSale.id,
          timestamp: newSale.timestamp,
          items: newSale.items, 
          staff_id: newSale.staffId,
          customer_id: newSale.customerId,
          total: newSale.total,
          tax: newSale.tax,
          discount: newSale.discount,
          discount_code: newSale.discountCode,
          payment_method: newSale.paymentMethod,
          tax_type: newSale.taxType
      });
      
      if (error) console.error("Error saving sale:", error);
      
      // Update product stock
      newSale.items.forEach(async (item) => {
          if (item.type === 'product') {
              const product = products.find(p => p.id === item.id);
              if (product) {
                  const newStock = product.stock - item.quantity;
                  setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
                  await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
              }
          }
      });
  };

  // Helper used by POS to quickly add customer without full list
  const handleAddCustomer = (newCustomer: Customer) => {
     smartUpdateCustomers([...customers, newCustomer]);
  };

  const handleAddExpense = async (newExpense: Expense) => {
      setExpenses([...expenses, newExpense]);
      await supabase.from('expenses').insert(newExpense);
  };

  const handleDeleteExpense = async (id: string) => {
      setExpenses(expenses.filter(e => e.id !== id));
      await supabase.from('expenses').delete().eq('id', id);
  };

  const handleUpdateSettings = async (newSettings: ShopSettings) => {
      setSettings(newSettings);
      await supabase.from('settings').upsert({ id: 1, data: newSettings });
  };


  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('trimtime_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Check for session expiry
  useEffect(() => {
    const checkSession = () => {
      const saved = localStorage.getItem('trimtime_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.expiry && Date.now() > parsed.expiry) {
            handleLogout();
          }
        } catch (e) {
          // invalid session
        }
      }
    };
    checkSession();
    const interval = setInterval(checkSession, 60000); 
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (user: Staff, rememberMe: boolean) => {
    const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const expiry = Date.now() + sessionDuration;
    localStorage.setItem('trimtime_session', JSON.stringify({ user, expiry }));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('trimtime_session');
    setCurrentUser(null);
    setCurrentView(View.DASHBOARD);
  };

  const openProfile = () => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email || '',
        password: currentUser.password || ''
      });
      setIsProfileOpen(true);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedUser: Staff = {
      ...currentUser,
      name: profileForm.name,
      username: profileForm.username,
      email: profileForm.email,
      password: profileForm.password
    };

    const updatedStaffList = staff.map(s => s.id === currentUser.id ? updatedUser : s);
    setStaff(updatedStaffList);
    setCurrentUser(updatedUser);

    await supabase.from('staff').update({
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        password: updatedUser.password
    }).eq('id', currentUser.id);

    const savedSession = localStorage.getItem('trimtime_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem('trimtime_session', JSON.stringify({ ...parsed, user: updatedUser }));
    }

    setIsProfileOpen(false);
    alert('Profile updated successfully.');
  };

  const updateLanguage = (lang: string) => {
    document.documentElement.lang = lang;
    document.dir = lang === 'ur' || lang === 'fa' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    updateLanguage(settings.language);
  }, [settings.language]);

  if (loading) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          </div>
      );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} staffList={staff} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">
      <Sidebar 
        currentView={currentView}
        onViewChange={setCurrentView}
        shopName={settings.shopName}
        userRole={currentUser.role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        language={settings.language}
      />

      <main className="flex-1 flex flex-col h-full relative md:pl-64 transition-all duration-300">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-50">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center font-brand text-xl text-slate-950 shadow-lg">
                {settings.shopName.charAt(0)}
             </div>
             <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{settings.shopName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
              )}
            </button>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
            </button>
          </div>
        </div>

        {/* Top Bar (Desktop) */}
        <div className="hidden md:flex justify-between items-center py-6 px-8 no-print">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-brand tracking-tight">
               {currentView === View.DASHBOARD && 'Dashboard'}
               {currentView === View.POS && 'Point of Sale'}
               {currentView === View.INVENTORY && 'Inventory Management'}
               {currentView === View.CUSTOMERS && 'Client Directory'}
               {currentView === View.FINANCE && 'Financial Overview'}
               {currentView === View.STAFF && 'Team Management'}
               {currentView === View.SETTINGS && 'Configuration'}
            </h1>
            <div className="flex items-center gap-4">
               <button 
                onClick={toggleTheme}
                className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors shadow-sm"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
               >
                 {isDarkMode ? (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                 ) : (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                 )}
               </button>

               <div 
                  onClick={openProfile}
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-colors -mr-2"
                  title="Edit Profile"
               >
                 <div className="flex flex-col items-end">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{currentUser.name}</span>
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{currentUser.role}</span>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-black shadow-inner">
                    {currentUser.name.charAt(0)}
                 </div>
               </div>
               <button 
                onClick={handleLogout}
                className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-500 p-2.5 rounded-xl transition-colors"
                title="Logout"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
               </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth" id="main-content">
          <AnimatePresence mode='wait'>
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === View.DASHBOARD && <Dashboard sales={sales} expenses={expenses} currency={settings.currency} language={settings.language} />}
              {currentView === View.POS && (
                <POS 
                  services={services} 
                  products={products} 
                  staff={staff} 
                  customers={customers}
                  settings={settings}
                  currentUser={currentUser}
                  onCompleteSale={handleCompleteSale}
                  onAddCustomer={handleAddCustomer}
                />
              )}
              {currentView === View.FINANCE && (
                <Finance 
                  sales={sales} 
                  expenses={expenses} 
                  staffList={staff}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                  currency={settings.currency}
                  language={settings.language}
                />
              )}
              {currentView === View.CUSTOMERS && (
                <Customers 
                  customers={customers} 
                  sales={sales} 
                  onUpdateCustomers={smartUpdateCustomers}
                  currency={settings.currency}
                  language={settings.language}
                />
              )}
              {currentView === View.INVENTORY && (
                <Inventory 
                  services={services} 
                  products={products} 
                  settings={settings}
                  onUpdateServices={smartUpdateServices}
                  onUpdateProducts={smartUpdateProducts}
                />
              )}
              {currentView === View.STAFF && (
                <StaffManagement 
                  staffList={staff} 
                  onUpdateStaff={smartUpdateStaff} 
                  currentUser={currentUser}
                  language={settings.language}
                />
              )}
              {currentView === View.SETTINGS && (
                <Settings 
                  settings={settings} 
                  onUpdateSettings={handleUpdateSettings} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">My Profile</h3>
                <button onClick={() => setIsProfileOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form onSubmit={updateProfile} className="space-y-5">
                <div className="flex justify-center mb-6">
                   <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl font-black text-slate-500 dark:text-slate-400 uppercase shadow-inner">
                      {currentUser?.name.charAt(0)}
                   </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})} 
                    required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">Email</label>
                  <input 
                    type="email" 
                    value={profileForm.email} 
                    onChange={e => setProfileForm({...profileForm, email: e.target.value})} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">Username (Login ID)</label>
                  <input 
                    type="text" 
                    value={profileForm.username} 
                    onChange={e => setProfileForm({...profileForm, username: e.target.value})} 
                    required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 ml-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showProfilePassword ? "text" : "password"} 
                      value={profileForm.password} 
                      onChange={e => setProfileForm({...profileForm, password: e.target.value})} 
                      required 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl px-5 py-3.5 pr-12 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold dark:text-slate-200" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfilePassword(!showProfilePassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showProfilePassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="submit" className="flex-1 px-4 py-4 bg-slate-950 dark:bg-amber-500 text-white dark:text-slate-950 rounded-2xl font-black text-base hover:bg-slate-800 dark:hover:bg-amber-600 transition-all shadow-xl">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
