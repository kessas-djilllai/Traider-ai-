import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RefreshCcw, TrendingUp, TrendingDown, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { createChart, ColorType, CrosshairMode, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { ChartDataPoint, AppStatus } from '../types';
import { formatNumber, formatCurrency } from '../lib/utils';

interface DashboardProps {
  status: AppStatus | null;
  onToggleBot: () => void;
  onRefresh?: () => void;
}

export function Dashboard({ status, onToggleBot, onRefresh }: DashboardProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/market/data');
        if (!res.ok) {
           throw new Error(`HTTP error! status: ${res.status}`);
        }
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const json = await res.json();
          if (json.success && json.data.length > 0) {
            setData(json.data);
          }
        } else {
          console.error("Received non-JSON response from /api/market/data");
        }
      } catch (error) {
        console.error("Failed to fetch market data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [status?.settings.symbol, status?.settings.timeframe]);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    if (!chartInstanceRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(55, 65, 81, 0.5)' },
          horzLines: { color: 'rgba(55, 65, 81, 0.5)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor: 'rgba(55, 65, 81, 0.5)',
        },
        timeScale: {
          borderColor: 'rgba(55, 65, 81, 0.5)',
          timeVisible: true,
          secondsVisible: false,
        },
        autoSize: true,
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      const supportSeries = chart.addSeries(LineSeries, {
        color: '#22c55e',
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        title: 'Support'
      });

      const resistanceSeries = chart.addSeries(LineSeries, {
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        title: 'Resistance'
      });

      chartInstanceRef.current = { chart, candlestickSeries, supportSeries, resistanceSeries };
    }

    const { candlestickSeries, supportSeries, resistanceSeries } = chartInstanceRef.current;
    
    // Convert timestamp from ms to s for lightweight-charts
    const formattedData = data.map(d => ({
      time: (d.timestamp / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      support: d.support,
      resistance: d.resistance
    }));

    // Filter unique times to avoid lightweight-charts duplicates error
    const uniqueData = formattedData.filter((v, i, a) => a.findIndex(t => t.time === v.time) === i);

    candlestickSeries.setData(uniqueData.map(d => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })));
    supportSeries.setData(uniqueData.filter(d => d.support !== null && d.support !== undefined).map(d => ({ time: d.time, value: d.support })));
    resistanceSeries.setData(uniqueData.filter(d => d.resistance !== null && d.resistance !== undefined).map(d => ({ time: d.time, value: d.resistance })));
    
  }, [data]);

  const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const previousPrice = data.length > 1 ? data[data.length - 2].close : 0;
  const priceChange = latestPrice - previousPrice;
  const isPositive = priceChange >= 0;

  const getStatusDisplay = () => {
    switch (status?.botStatus) {
      case 'running':
        return { text: 'نشط', color: 'text-green-400', buttonColor: 'bg-red-500/10 text-red-500 hover:bg-red-500/20' };
      case 'offline':
        return { text: 'غير متصل (إعادة اتصال...)', color: 'text-amber-500 animate-pulse', buttonColor: 'bg-red-500/10 text-red-500 hover:bg-red-500/20' };
      case 'error':
        return { text: 'خطأ (جاري إعادة التشغيل...)', color: 'text-rose-500 animate-pulse', buttonColor: 'bg-red-500/10 text-red-500 hover:bg-red-500/20' };
      case 'stopped':
      default:
        return { text: 'متوقف', color: 'text-gray-400', buttonColor: 'bg-green-500/10 text-green-500 hover:bg-green-500/20' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Reconnection / Error Banner */}
      {status?.lastError && (status.botStatus === 'offline' || status.botStatus === 'error') && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-500">تم الكشف عن انقطاع في الاتصال أو خطأ فني!</h4>
              <p className="text-amber-400/80 text-sm mt-1">{status.lastError}</p>
              {status.reconnectAttempts !== undefined && status.reconnectAttempts > 0 && (
                <p className="text-xs text-amber-500/60 mt-2 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  محاولة إعادة الاتصال التلقائي الجارية رقم: {status.reconnectAttempts}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={async () => {
              try {
                await fetch('/api/bot/restart', { method: 'POST' });
                if (onRefresh) onRefresh();
              } catch (e) {
                console.error(e);
              }
            }}
            className="bg-amber-500 text-gray-950 font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-400 transition-all flex items-center gap-2 self-start md:self-auto shrink-0 shadow-lg shadow-amber-500/10 active:scale-95"
          >
            <RefreshCcw className="w-4 h-4" />
            إعادة الاتصال يدوياً الآن
          </button>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 md:p-6">
          <p className="text-gray-400 text-sm mb-2">الزوج الحالي</p>
          <h3 className="text-xl md:text-2xl font-bold text-white font-mono">{status?.settings.symbol || '---'}</h3>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 md:p-6 flex flex-col justify-center">
          <p className="text-gray-400 text-sm mb-2 flex items-center gap-1"><Wallet className="w-4 h-4"/> الرصيد (USDT)</p>
          <h3 className="text-xl md:text-2xl font-bold text-white font-mono">{formatCurrency(status?.balance || 0)}</h3>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 md:p-6">
          <p className="text-gray-400 text-sm mb-2">السعر المباشر</p>
          <div className="flex items-center gap-3">
            <h3 className="text-xl md:text-2xl font-bold text-white font-mono">{formatNumber(latestPrice)}</h3>
            {latestPrice > 0 && (
              <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {formatNumber(Math.abs(priceChange))}
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 md:p-6 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-2">حالة البوت</p>
            <h3 className={`text-xl font-bold ${statusDisplay.color}`}>
              {statusDisplay.text}
            </h3>
          </div>
          <button
            onClick={onToggleBot}
            className={`p-4 rounded-xl transition-all ${statusDisplay.buttonColor}`}
          >
            {status?.botStatus === 'running' || status?.botStatus === 'offline' || status?.botStatus === 'error' ? (
              <Square className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4 md:p-6 h-[350px] md:h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-base md:text-lg font-medium text-white">الرسم البياني (شموع + EMA)</h2>
          {loading && <RefreshCcw className="w-4 h-4 md:w-5 md:h-5 text-blue-500 animate-spin" />}
        </div>
        
        <div className="flex-1 w-full relative" dir="ltr">
           <div ref={chartContainerRef} className="absolute inset-0" />
        </div>
      </div>
      
      {/* Technical Indicators Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <IndicatorCard label="RSI (14)" value={data[data.length - 1]?.rsi} type="oscillator" />
         <IndicatorCard label="MACD" value={data[data.length - 1]?.macd} type="neutral" />
         <IndicatorCard label="Signal" value={data[data.length - 1]?.signal} type="neutral" />
         <IndicatorCard label="Volume" value={data[data.length - 1]?.volume} type="volume" />
      </div>
    </div>
  );
}

function IndicatorCard({ label, value, type }: { label: string, value: any, type: string }) {
  if (value === undefined || value === null) return null;
  
  let colorClass = "text-white";
  if (type === 'oscillator') {
    colorClass = value > 70 ? "text-red-400" : value < 30 ? "text-green-400" : "text-gray-300";
  }

  return (
    <div className="bg-gray-800/30 border border-gray-700/30 rounded-xl p-4 text-center">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`text-lg font-mono font-medium ${colorClass}`}>
        {type === 'volume' ? formatNumber(value, 0) : formatNumber(value)}
      </p>
    </div>
  );
}
