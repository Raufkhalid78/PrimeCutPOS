
import React, { useState } from 'react';
import { Staff, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
  onLogin: (user: Staff, rememberMe: boolean) => void;
  staffList: Staff[];
}

const Login: React.FC<LoginProps> = ({ onLogin, staffList }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  
  // Default to English for login screen, could be enhanced to detect browser language or have a selector
  const language: Language = 'en'; 
  const t = TRANSLATIONS[language];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = staffList.find(s => s.username === username && s.password === password);
    if (user) {
      onLogin(user, rememberMe);
    } else {
      setError(t.invalidLogin);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-12">
          <motion.div 
            whileHover={{ rotate: 12, scale: 1.1 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2.5rem] flex items-center justify-center font-brand text-5xl text-slate-950 mx-auto mb-8 shadow-2xl shadow-amber-500/40"
          >
            T
          </motion.div>
          <h1 className="text-5xl font-extrabold font-brand text-white tracking-tighter mb-3">TrimTime</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">{t.premiumAccess}</p>
        </div>

        <motion.div 
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">{t.terminalIdentity}</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder=""
                className="w-full bg-slate-800/30 border border-slate-700/50 text-white rounded-2xl px-6 py-4 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                required
              />
            </div>

            <div className="space-y-2 relative">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-2">{t.securityKey}</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-800/30 border border-slate-700/50 text-white rounded-2xl px-6 py-4 pr-12 focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pl-2">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-700 bg-slate-800/50 checked:bg-amber-500 checked:border-amber-500 transition-all"
                />
                <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-950 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <label htmlFor="rememberMe" className="text-xs font-bold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-slate-200 transition-colors">
                {t.stayLoggedIn}
              </label>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-black uppercase tracking-wider py-3 px-4 rounded-xl text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-black text-xl py-5 rounded-[1.5rem] shadow-xl shadow-amber-500/10 transition-all hover:shadow-amber-500/30 mt-4"
            >
              {t.enterDashboard}
            </motion.button>
          </form>

          <div className="flex items-center justify-between mt-10">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-4 whitespace-nowrap">{t.authorizedUse}</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>
        </motion.div>
        
        <p className="text-center text-slate-500 text-sm mt-10 font-medium">
          Issues accessing? <span className="text-amber-500 font-bold cursor-pointer hover:underline underline-offset-4 decoration-2">{t.contactAdmin}</span>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
