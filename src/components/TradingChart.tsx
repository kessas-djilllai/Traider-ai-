import React, { useState, useEffect, useRef } from 'react';

interface ChartCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  support?: number | null;
  resistance?: number | null;
  ema20?: number | null;
  rsi?: number | null;
}

interface TradingChartProps {
  botStatus: 'idle' | 'running';
  tradingRemainingSeconds: number;
}

export function TradingChart({ botStatus, tradingRemainingSeconds }: TradingChartProps) {
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [liveChange, setLiveChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width } = entries[0].contentRect;
        setDimensions({ width: Math.max(width, 300), height: 320 });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch initial candles from server
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const res = await fetch('/api/market/data');
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setCandles(json.data);
          const lastCandle = json.data[json.data.length - 1];
          setLivePrice(lastCandle.close);
        }
      } catch (err) {
        console.error("Failed to load market data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // refresh full sequence every 30s
    return () => clearInterval(interval);
  }, []);

  // Simulate sub-second real-time tick updates for the active candle
  useEffect(() => {
    if (candles.length === 0 || livePrice === null) return;

    const tickInterval = setInterval(() => {
      // Create random price variation (micro-tick noise)
      const noise = (Math.random() - 0.495) * 4.5; // slight bias upwards
      setLivePrice((prev) => {
        if (prev === null) return prev;
        const nextPrice = prev + noise;
        
        // Update the last candle in state to simulate real-time rendering
        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return prevCandles;
          const updated = [...prevCandles];
          const lastIdx = updated.length - 1;
          const last = { ...updated[lastIdx] };
          
          last.close = nextPrice;
          if (nextPrice > last.high) last.high = nextPrice;
          if (nextPrice < last.low) last.low = nextPrice;
          updated[lastIdx] = last;
          return updated;
        });

        // Track changes
        const firstPrice = candles[candles.length - 1]?.open || nextPrice;
        setLiveChange(((nextPrice - firstPrice) / firstPrice) * 100);

        return nextPrice;
      });
    }, 450);

    return () => clearInterval(tickInterval);
  }, [candles.length, livePrice === null]);

  if (isLoading || candles.length === 0) {
    return (
      <div className="w-full h-[320px] bg-slate-50 border border-slate-200/85 rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] text-slate-500">جاري تحميل بيانات السوق الحية...</span>
        </div>
      </div>
    );
  }

  // Slice last 45 candles to display in viewport
  const viewCount = Math.min(candles.length, 45);
  const displayCandles = candles.slice(-viewCount);

  // Chart Layout Calculations
  const paddingRight = 60;
  const paddingLeft = 10;
  const paddingTop = 30;
  const paddingBottom = 60; // extra room for RSI panel
  const chartHeight = dimensions.height - paddingTop - paddingBottom;
  const rsiHeight = 40;
  const rsiTop = dimensions.height - paddingBottom + 15;

  const minPrice = Math.min(...displayCandles.map((c) => c.low));
  const maxPrice = Math.max(...displayCandles.map((c) => c.high));
  const priceRange = (maxPrice - minPrice) || 1;

  // Coordinate Conversion Helpers
  const getX = (index: number) => {
    const step = (dimensions.width - paddingRight - paddingLeft) / (viewCount - 1 || 1);
    return paddingLeft + index * step;
  };

  const getY = (price: number) => {
    return paddingTop + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const getRsiY = (rsiVal: number) => {
    // RSI scale from 0 to 100 mapped to rsiHeight
    return rsiTop + rsiHeight - (rsiVal / 100) * rsiHeight;
  };

  // Build EMA overlay line path
  let emaPath = "";
  displayCandles.forEach((c, idx) => {
    if (c.ema20) {
      const x = getX(idx);
      const y = getY(c.ema20);
      if (idx === 0 || emaPath === "") {
        emaPath = `M ${x} ${y}`;
      } else {
        emaPath += ` L ${x} ${y}`;
      }
    }
  });

  // Build RSI overlay line path
  let rsiPath = "";
  displayCandles.forEach((c, idx) => {
    if (c.rsi) {
      const x = getX(idx);
      const y = getRsiY(c.rsi);
      if (idx === 0 || rsiPath === "") {
        rsiPath = `M ${x} ${y}`;
      } else {
        rsiPath += ` L ${x} ${y}`;
      }
    }
  });

  // Locked target line if trading status is running
  const entryPrice = candles[candles.length - Math.min(candles.length, 25)]?.close || livePrice || 0;
  const orderY = getY(entryPrice);

  return (
    <div ref={containerRef} className="w-full space-y-2 select-none">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-900 font-bold text-sm">
            {livePrice ? livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
          </span>
          <span className={`text-[10px] font-bold ${liveChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            BTC / USDT مباشر
          </span>
          {botStatus === 'running' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
              التداول قيد التشغيل
            </span>
          )}
        </div>
      </div>

      <div className="relative bg-slate-50/70 border border-slate-200/80 rounded-2xl overflow-hidden p-1">
        <svg width={dimensions.width} height={dimensions.height} className="overflow-visible">
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const priceVal = minPrice + ratio * priceRange;
            const y = getY(priceVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={dimensions.width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={dimensions.width - paddingRight + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  {priceVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}

          {/* Locked Order Line (If Trading active) */}
          {botStatus === 'running' && (
            <g>
              <line
                x1={paddingLeft}
                y1={orderY}
                x2={dimensions.width - paddingRight}
                y2={orderY}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="6 3"
              />
              <circle cx={paddingLeft + 15} cy={orderY} r="3" fill="#10b981" className="animate-ping" />
              <rect
                x={dimensions.width - paddingRight - 100}
                y={orderY - 14}
                width="95"
                height="12"
                rx="3"
                fill="#10b981"
                opacity="0.9"
              />
              <text
                x={dimensions.width - paddingRight - 52}
                y={orderY - 5}
                fill="#ffffff"
                fontSize="7"
                fontWeight="bold"
                textAnchor="middle"
              >
                صفقة تداول نشطة ومؤمنة
              </text>
            </g>
          )}

          {/* Live Price Line Overlay */}
          {livePrice && (
            <g>
              <line
                x1={paddingLeft}
                y1={getY(livePrice)}
                x2={dimensions.width - paddingRight}
                y2={getY(livePrice)}
                stroke={liveChange >= 0 ? '#10b981' : '#f43f5e'}
                strokeWidth="0.75"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              {/* Highlight active price marker in margin */}
              <rect
                x={dimensions.width - paddingRight + 2}
                y={getY(livePrice) - 7}
                width="54"
                height="14"
                rx="3"
                fill={liveChange >= 0 ? '#10b981' : '#f43f5e'}
              />
              <text
                x={dimensions.width - paddingRight + 29}
                y={getY(livePrice) + 3}
                fill="#ffffff"
                fontSize="8"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {livePrice.toFixed(1)}
              </text>
            </g>
          )}

          {/* Candlesticks Render */}
          {displayCandles.map((candle, idx) => {
            const x = getX(idx);
            const yOpen = getY(candle.open);
            const yClose = getY(candle.close);
            const yHigh = getY(candle.high);
            const yLow = getY(candle.low);

            const isBullish = candle.close >= candle.open;
            const color = isBullish ? '#10b981' : '#f43f5e';
            const bodyWidth = Math.max((dimensions.width - paddingRight - paddingLeft) / viewCount * 0.65, 3.5);

            return (
              <g key={idx}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.25"
                />
                {/* Body */}
                <rect
                  x={x - bodyWidth / 2}
                  y={Math.min(yOpen, yClose)}
                  width={bodyWidth}
                  height={Math.max(Math.abs(yOpen - yClose), 1)}
                  fill={color}
                  rx="1"
                />
              </g>
            );
          })}

          {/* EMA Overlay Line */}
          {emaPath && (
            <path
              d={emaPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              opacity="0.85"
            />
          )}

          {/* --- RSI SUBPANEL RENDER --- */}
          <rect
            x={paddingLeft}
            y={rsiTop}
            width={dimensions.width - paddingRight - paddingLeft}
            height={rsiHeight}
            fill="#f1f5f9"
            fillOpacity="0.8"
            stroke="#e2e8f0"
            strokeWidth="1"
            rx="4"
          />
          {/* Overbought (70) and Oversold (30) boundary indicators */}
          <line
            x1={paddingLeft}
            y1={getRsiY(70)}
            x2={dimensions.width - paddingRight}
            y2={getRsiY(70)}
            stroke="#b91c1c"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.4"
          />
          <line
            x1={paddingLeft}
            y1={getRsiY(30)}
            x2={dimensions.width - paddingRight}
            y2={getRsiY(30)}
            stroke="#047857"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity="0.4"
          />
          <text x={dimensions.width - paddingRight + 6} y={rsiTop + 10} fill="#64748b" fontSize="7" fontFamily="monospace">RSI 14</text>
          {/* RSI path render */}
          {rsiPath && (
            <path
              d={rsiPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.25"
              opacity="0.9"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
