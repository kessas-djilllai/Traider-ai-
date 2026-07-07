import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, Calendar, DollarSign, Activity } from 'lucide-react';

interface DailyProfit {
  date: string;
  profit: number;
  percentage: number;
}

interface DailyProfitsChartProps {
  data?: DailyProfit[];
}

export function DailyProfitsChart({ data = [] }: DailyProfitsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card glass-card-hover rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
        <Activity className="w-8 h-8 text-slate-300" />
        <div>
          <h3 className="text-xs font-black text-slate-500">لا توجد بيانات أرباح تاريخية</h3>
          <p className="text-[10px] text-slate-400 mt-1">سيتم عرض الأرباح اليومية هنا بعد اكتمال أول دورة تداول ناجحة</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-100 text-right space-y-1">
          <p className="text-[10px] text-slate-500 font-bold mb-2">{label}</p>
          <p className="text-xs font-black text-emerald-600">
            {payload[0].value} USDT
          </p>
          <p className="text-[10px] font-bold text-slate-600">
            العائد: {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card glass-card-hover rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
      <div className="flex items-center gap-2.5 border-b border-white/50 pb-4">
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 border border-white/80 shadow-sm backdrop-blur-sm">
          <TrendingUp className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-0.5 text-right">
          <h3 className="text-xs font-black text-slate-800">الأرباح اليومية التاريخية</h3>
          <p className="text-[9px] text-slate-500 font-bold">نمو العوائد وتاريخ الإغلاق اليومي للصفقات</p>
        </div>
      </div>

      <div className="h-[240px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.5 }} />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.profit > 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto border border-white/50 rounded-xl bg-white/30 backdrop-blur-sm">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-white/50 text-slate-500 bg-white/20">
              <th className="py-2.5 px-4 font-black">التاريخ</th>
              <th className="py-2.5 px-4 font-black">العائد المئوي</th>
              <th className="py-2.5 px-4 font-black">الربح الصافي (USDT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {data.slice().reverse().map((day, idx) => (
              <tr key={idx} className="hover:bg-white/40 transition-colors">
                <td className="py-2.5 px-4 font-bold text-slate-700 flex items-center gap-1.5 justify-end">
                  {day.date}
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-emerald-600" dir="ltr">
                  +{day.percentage}%
                </td>
                <td className="py-2.5 px-4 font-mono font-black text-emerald-600" dir="ltr">
                  +{day.profit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
