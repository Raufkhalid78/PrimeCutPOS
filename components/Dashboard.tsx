
import React from 'react';
import { Sale, Expense, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';

interface DashboardProps {
  sales: Sale[];
  expenses: Expense[];
  currency: string;
  language: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, expenses, currency, language }) => {
  const t = TRANSLATIONS[language];
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => ({
    date: date.split('-').slice(1).join('/'),
    revenue: sales
      .filter(s => s.timestamp.startsWith(date))
      .reduce((acc, s) => acc + s.total, 0)
  }));

  const stats = [
    { label: t.revenue, value: `${currency}${totalRevenue.toLocaleString()}`, icon: '💰', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30' },
    { label: t.expenses, value: `${currency}${totalExpenses.toLocaleString()}`, icon: '💸', color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30' },
    { label: t.netProfit, value: `${currency}${netProfit.toLocaleString()}`, icon: '📈', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30' },
    { label: t.avgTicket, value: `${currency}${averageTicket.toFixed(2)}`, icon: '🎟️', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-[1600px] mx-auto"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h2 variants={item} className="text-4xl font-extrabold text-slate-900 dark:text-white font-brand tracking-tight">
            {t.performanceInsights}
          </motion.h2>
          <motion.p variants={item} className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {t.welcomeBack}
          </motion.p>
        </div>
        <motion.div variants={item} className="bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <span className="text-slate-300 dark:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-sm tracking-tight">{new Date().toLocaleDateString(language === 'en' ? 'en-US' : language === 'ur' ? 'ur-PK' : 'fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </motion.div>
      </header>

      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            key={idx} 
            variants={item}
            whileHover={{ y: -5, scale: 1.02 }}
            className={`bg-white dark:bg-slate-900 p-7 rounded-[2rem] shadow-sm border ${stat.border} flex flex-col gap-4 relative overflow-hidden group`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${stat.color} transition-transform group-hover:rotate-12`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
            </div>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] rotate-12 transition-transform group-hover:scale-125`}>
               {stat.icon}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={item} className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
              {t.revenueTrends}
            </h3>
            <div className="flex gap-2">
               <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">
                 <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t.last7Days}
               </span>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f8fafc" className="dark:opacity-5" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', backgroundColor: '#0f172a', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px', color: '#fff'}}
                  itemStyle={{color: '#f59e0b'}}
                  cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#f59e0b" 
                  strokeWidth={4} 
                  dot={{fill: '#f59e0b', strokeWidth: 3, r: 5, stroke: '#fff'}} 
                  activeDot={{r: 8, strokeWidth: 0}} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">{t.recentTransactions}</h3>
          <div className="space-y-5 flex-1 overflow-y-auto max-h-[320px] pr-2 scrollbar-hide">
            {sales.slice(-6).reverse().map((sale) => (
              <div key={sale.id} className="flex items-center justify-between group transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${sale.paymentMethod === 'card' ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40'}`}>
                    {sale.paymentMethod === 'card' ? '💳' : '💵'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">#{sale.id.slice(-4)}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900 dark:text-white">{currency}{sale.total.toFixed(2)}</p>
                  <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest">{sale.paymentMethod}</p>
                </div>
              </div>
            ))}
            {sales.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700 py-10">
                    <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p className="text-sm italic font-medium">{t.waitingForSale}</p>
                </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
