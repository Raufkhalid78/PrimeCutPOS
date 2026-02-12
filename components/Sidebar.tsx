
import React from 'react';
import { View, UserRole, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  shopName: string;
  userRole: UserRole;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, shopName, userRole, isOpen, onClose, language }) => {
  const t = TRANSLATIONS[language];

  const allItems = [
    { id: View.DASHBOARD, label: t.dashboard, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    ), roles: ['admin', 'employee'] },
    { id: View.POS, label: t.pos, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
    ), roles: ['admin', 'employee'] },
    { id: View.INVENTORY, label: t.catalog, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
    ), roles: ['admin'] },
    { id: View.CUSTOMERS, label: t.customers, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
    ), roles: ['admin', 'employee'] },
    { id: View.STAFF, label: t.staff, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
    ), roles: ['admin'] },
    { id: View.FINANCE, label: t.finance, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    ), roles: ['admin'] },
    { id: View.SETTINGS, label: t.settings, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
    ), roles: ['admin'] },
  ];

  const visibleItems = allItems.filter(item => item.roles.includes(userRole));

  return (
    <motion.div 
      initial={{ x: -260 }}
      animate={{ x: isOpen || window.innerWidth >= 768 ? 0 : -260 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={`w-64 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col text-white no-print shadow-2xl z-[60]`}
    >
      <div className="p-8 border-b border-slate-800/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center font-brand text-2xl text-slate-950 shadow-xl shadow-amber-500/20"
            >
              {shopName.charAt(0)}
            </motion.div>
            <h1 className="text-xl font-extrabold font-brand tracking-tight truncate bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              {shopName}
            </h1>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      
      <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto scrollbar-hide">
        {visibleItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full relative group outline-none"
            >
              <div className={`
                flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 relative z-10
                ${isActive ? 'text-slate-900 font-bold' : 'hover:bg-slate-800/50 text-slate-400 font-medium'}
              `}>
                <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="text-sm tracking-wide">{item.label}</span>
              </div>
              
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/10"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-800/50">
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30">
           <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2 px-1 text-center md:text-left">{t.shopStatus}</p>
           <p className="text-xs font-bold text-emerald-400 flex items-center justify-center md:justify-start gap-2.5">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             {t.terminalLive}
           </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
