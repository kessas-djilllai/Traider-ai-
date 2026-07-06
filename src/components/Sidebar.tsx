import React from 'react';
import { Bot, LineChart, Settings, History, Wallet, Shield, MessageSquare, Send } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LineChart },
    { id: 'keys', label: 'إعدادات API', icon: Shield },
    { id: 'settings', label: 'إعدادات البوت', icon: Settings },
    { id: 'history', label: 'سجل الصفقات', icon: History },
    { id: 'telegram', label: 'رسائل القناة', icon: MessageSquare },
    { id: 'withdraw', label: 'سحب الرصيد', icon: Send },
    { id: 'pnl', label: 'الأرباح والخسائر', icon: Wallet },
  ];

  return (
    <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 flex items-center justify-end gap-3">
        <h1 className="text-xl font-bold text-white tracking-tight">AI Trader</h1>
        <Bot className="w-8 h-8 text-blue-500" />
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={cn(
                "w-full flex items-center justify-end gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-blue-600/10 text-blue-500 font-medium" 
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              )}
            >
              <span>{item.label}</span>
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </nav>

      <div className="p-4 m-4 rounded-xl bg-gray-800/50 border border-gray-700/50 text-right">
        <p className="text-xs text-gray-400 mb-1">حالة النظام</p>
        <div className="flex items-center justify-end gap-2 text-sm text-green-400">
          <span>متصل بـ Binance</span>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
