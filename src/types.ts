export type BotSettings = {
  symbol: string;
  timeframe: string;
  riskPercentage: number;
  takeProfit: number;
  stopLoss: number;
  trailingStop: boolean;
};

export type AppStatus = {
  botStatus: 'running' | 'stopped' | 'offline' | 'error';
  settings: BotSettings;
  hasKeys: boolean;
  useTestnet: boolean;
  balance: number;
  lastError?: string;
  reconnectAttempts?: number;
};

export type ChartDataPoint = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  support?: number | null;
  resistance?: number | null;
  ema20?: number | null;
  ema50?: number | null;
  rsi?: number | null;
  macd?: number | null;
  signal?: number | null;
};

export type Trade = {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  timestamp: number;
  pnl?: number;
  status: 'open' | 'closed';
};
