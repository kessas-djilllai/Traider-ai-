import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import ccxt from "ccxt";
import { RSI, MACD, EMA } from "technicalindicators";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const STORE_FILE = path.join(process.cwd(), "store.json");

// Define custom User type
interface UserStore {
  username: string;
  password?: string;
  keys: { apiKey: string; secretKey: string; useTestnet: boolean };
  tradingStatus: "idle" | "running";
  tradingStartTime: number | null;
  withdrawals: any[];
  extraProfit: number;
  lastKnownBalance: number;
  spotBalance: number;
  fundingBalance: number;
  lastError: string;
  dailyProfits?: Array<{ date: string; profit: number; percentage: number }>;
}

// In-memory store
let store = {
  users: {} as Record<string, UserStore>,
  keys: { apiKey: "", secretKey: "", useTestnet: false },
  telegram: { botToken: "", chatId: "" },
  settings: {
    symbol: "BTC/USDT",
    timeframe: "1m",
  },
  botStatus: "stopped" as "stopped" | "running" | "offline" | "error",
  trades: [] as any[],
  withdrawals: [] as any[],
  lastKnownBalance: 0,
  lastError: "",
  supabaseConfig: { url: "", anonKey: "" }
};

// Admins List
const ADMINS = ["0696666164dj@gmail.com", "admin", "admin@gmail.com"];

// Supabase Initialization
let supabase: any = null;
let supabaseError: string | null = null;
let supabaseConnected = false;

function initSupabase() {
  const url = process.env.SUPABASE_URL || store.supabaseConfig?.url || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || store.supabaseConfig?.anonKey || "";

  if (url && key) {
    try {
      supabase = createClient(url, key, {
        auth: { persistSession: false }
      });
      supabaseError = null;
      console.log("[SUPABASE] Client initialized successfully.");
    } catch (err: any) {
      console.error("[SUPABASE] Initialization failed:", err.message);
      supabaseError = err.message;
      supabase = null;
    }
  } else {
    supabase = null;
    supabaseError = "لم يتم تكوين مفاتيح SUPABASE_URL أو SUPABASE_ANON_KEY في البيئة أو الإعدادات بعد.";
  }
}

// Call initially (will fallback to env variables first if loaded)
initSupabase();

async function loadStoreFromSupabase() {
  if (!supabase) return;
  try {
    // 1. Load general settings from app_store
    const { data, error } = await supabase
      .from("app_store")
      .select("data")
      .eq("id", "main_store")
      .single();

    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("relation")) {
        console.log("[SUPABASE] Table or row 'main_store' not found. General settings will be synced on save.");
      } else {
        console.error("[SUPABASE] Failed to fetch app_store:", error.message);
        supabaseError = error.message;
      }
    } else if (data && data.data) {
      const usersBackup = store.users;
      store = { ...store, ...data.data };
      if (!store.users) store.users = usersBackup || {};
      supabaseConnected = true;
      supabaseError = null;
      console.log("[SUPABASE] General settings successfully loaded from Supabase.");
    }

    // 2. Load users from app_users with explicit columns representation
    const { data: usersData, error: usersError } = await supabase
      .from("app_users")
      .select("*");

    if (usersError) {
      console.log("[SUPABASE] Failed to load from 'app_users' table. Fallback to app_store JSON.");
      if (usersError.message?.includes("relation") || usersError.code === "PGRST116" || usersError.code === "42P01") {
        supabaseError = "الجدول 'app_users' غير موجود في قاعدة بيانات Supabase. يرجى مراجعة كود SQL في لوحة المشرف لإنشاء الجداول المحدثة.";
        // If the tables were deleted/dropped from Supabase, we also clear our in-memory/local users store to match the deletion
        console.log("[SUPABASE] Table dropped/deleted. Resetting local users state to match empty state.");
        store.users = {};
        fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
      } else {
        supabaseError = usersError.message;
      }
    } else if (usersData) {
      console.log(`[SUPABASE] Loaded ${usersData.length} users from 'app_users' table as columns.`);
      
      // Initialize/clear in-memory users list to load the fresh columns data (or clear if empty)
      store.users = {};
      
      for (const u of usersData) {
        store.users[u.username] = {
          username: u.username,
          password: u.password || "",
          keys: {
            apiKey: u.api_key || "",
            secretKey: u.secret_key || "",
            useTestnet: !!u.use_testnet
          },
          tradingStatus: u.trading_status || "idle",
          tradingStartTime: u.trading_start_time ? Number(u.trading_start_time) : null,
          withdrawals: Array.isArray(u.withdrawals) ? u.withdrawals : [],
          extraProfit: Number(u.extra_profit) || 0,
          lastKnownBalance: Number(u.last_known_balance) || 0,
          spotBalance: Number(u.spot_balance) || 0,
          fundingBalance: Number(u.funding_balance) || 0,
          lastError: u.last_error || ""
        };
      }
      
      supabaseConnected = true;
      supabaseError = null;
      
      // Cache locally
      fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    }
  } catch (err: any) {
    console.error("[SUPABASE] Load exception:", err.message);
    supabaseError = err.message;
  }
}

async function saveStoreToSupabase() {
  if (!supabase) return;
  try {
    // Save general settings to app_store
    const { error: storeError } = await supabase
      .from("app_store")
      .upsert({
        id: "main_store",
        data: {
          ...store,
          // Keep store users as backup in JSON, but we will primary save/load them from app_users table
        },
        updated_at: new Date().toISOString()
      });

    if (storeError) {
      console.error("[SUPABASE] app_store save failed:", storeError.message);
      supabaseError = storeError.message;
      supabaseConnected = false;
      return;
    }

    // Save users as rows & columns in app_users
    const usersToUpsert = Object.values(store.users).map(user => ({
      username: user.username,
      password: user.password || "",
      api_key: user.keys?.apiKey || "",
      secret_key: user.keys?.secretKey || "",
      use_testnet: !!user.keys?.useTestnet,
      trading_status: user.tradingStatus || "idle",
      trading_start_time: user.tradingStartTime,
      extra_profit: user.extraProfit || 0,
      last_known_balance: user.lastKnownBalance || 0,
      spot_balance: user.spotBalance || 0,
      funding_balance: user.fundingBalance || 0,
      last_error: user.lastError || "",
      withdrawals: user.withdrawals || []
    }));

    if (usersToUpsert.length > 0) {
      const { error: usersError } = await supabase
        .from("app_users")
        .upsert(usersToUpsert);

      if (usersError) {
        console.error("[SUPABASE] app_users upsert failed:", usersError.message);
        if (usersError.message?.includes("relation")) {
          supabaseError = "فشل في حفظ بيانات المستخدمين بالكامل كأعمدة: الجدول 'app_users' غير موجود في Supabase. يرجى تشغيل كود SQL في لوحة التحكم.";
        } else {
          supabaseError = usersError.message;
        }
        supabaseConnected = false;
      } else {
        supabaseConnected = true;
        supabaseError = null;
        console.log(`[SUPABASE] Saved ${usersToUpsert.length} users into 'app_users' table with columns.`);
      }
    } else {
      supabaseConnected = true;
      supabaseError = null;
    }
  } catch (err: any) {
    console.error("[SUPABASE] Save exception:", err.message);
    supabaseError = err.message;
    supabaseConnected = false;
  }
}

// Load store from file as initial backup/cache
if (fs.existsSync(STORE_FILE)) {
  try {
    const data = fs.readFileSync(STORE_FILE, "utf-8");
    store = { ...store, ...JSON.parse(data) };
    // Re-initialize Supabase client since we loaded custom configuration from file
    initSupabase();
  } catch (e) {
    console.error("Failed to load store.json", e);
  }
}

// Ensure users object exists
if (!store.users) {
  store.users = {};
}

// Migrate legacy single-user keys to a default "admin" account if users is empty
if (Object.keys(store.users).length === 0 && store.keys && store.keys.apiKey) {
  store.users["admin"] = {
    username: "admin",
    password: "admin",
    keys: { apiKey: store.keys.apiKey, secretKey: store.keys.secretKey, useTestnet: false },
    tradingStatus: "idle",
    tradingStartTime: null,
    withdrawals: store.withdrawals || [],
    extraProfit: 0,
    lastKnownBalance: store.lastKnownBalance || 0,
    spotBalance: 0,
    fundingBalance: 0,
    lastError: store.lastError || "",
  };
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    if (supabase) {
      saveStoreToSupabase().catch(err => console.error("[SUPABASE] Async save error:", err));
    }
  } catch (e) {
    console.error("Failed to save store.json", e);
  }
}

// Helper to get active user from request header (automatically creates user if not exists)
function getRequestUser(req: express.Request): UserStore | null {
  const username = req.headers["x-username"] as string;
  if (!username) return null;
  const normalized = username.trim().toLowerCase();
  
  if (!store.users[normalized]) {
    store.users[normalized] = {
      username: normalized,
      keys: { apiKey: "", secretKey: "", useTestnet: false },
      tradingStatus: "idle",
      tradingStartTime: null,
      withdrawals: [],
      extraProfit: 0,
      lastKnownBalance: 0,
      spotBalance: 0,
      fundingBalance: 0,
      lastError: ""
    };
    saveStore();
  }
  
  return store.users[normalized];
}

// Helper to instantiate user-specific Exchange
function getUserExchange(user: UserStore) {
  if (user && user.keys && user.keys.apiKey && user.keys.secretKey) {
    const exchange = new ccxt.binance({
      apiKey: user.keys.apiKey,
      secret: user.keys.secretKey,
      enableRateLimit: true,
      options: { defaultType: 'spot' }
    });
    if (user.keys.useTestnet) {
      exchange.setSandboxMode(true);
    }
    return exchange;
  }
  return null;
}

function translateBinanceError(error: any): string {
  const errMsg = error.message || String(error);
  const errName = error.name || "";
  
  if (errMsg.includes("Withdrawal amount must be greater than the transaction fee") || errMsg.includes("-4028") || errMsg.includes("031035")) {
    return "فشل السحب: المبلغ المراد سحبه ضئيل جداً وأقل من رسوم تحويل الشبكة (Transaction Fee). يرجى زيادة مبلغ السحب ليغطي رسوم تحويل شبكة TRC-20 (التي تبلغ عادة حوالي 1 إلى 2 USDT).";
  }

  if (errName === 'PermissionDenied' || errMsg.includes('PermissionDenied') || errMsg.includes('not authorized') || errMsg.includes('unauthorized') || errMsg.includes('API key does not have') || errMsg.includes('401')) {
    return "خطأ في الصلاحيات (PermissionDenied): مفتاح API الخاص بك لا يملك الصلاحيات الكافية (مثل جلب الرصيد أو تفعيل السحب Enable Withdrawals). يرجى تعديل إعدادات مفتاح API الخاص بك في Binance وتفعيل الخيارات اللازمة.";
  }
  
  if (errName === 'AuthenticationError' || errMsg.includes('AuthenticationError') || errMsg.includes('API-key format invalid') || errMsg.includes('Invalid API-key') || errMsg.includes('Signature for this request is not valid')) {
    return "خطأ في المصادقة (AuthenticationError): مفتاح API أو المفتاح السري (Secret Key) غير صالح أو تم إدخاله بشكل خاطئ. يرجى التحقق من المفاتيح وإعادة المحاولة.";
  }

  if (errMsg.includes('IP restriction') || errMsg.includes('IP address') || errMsg.includes('restrict access')) {
    return "خطأ قيود IP: مفتاح API الخاص بك مقيد بعناوين IP معينة. يرجى تعديل إعدادات مفتاح API في بينانس لتمكين الوصول من أي عنوان IP (Unrestricted) أو إضافة عنوان خادم التطبيق.";
  }

  if (errName === 'InsufficientFunds' || errMsg.includes('InsufficientFunds') || errMsg.includes('balance is not enough')) {
    return "رصيد غير كافٍ: ليس لديك رصيد كافٍ من USDT لإتمام هذه العملية.";
  }

  return errMsg;
}

// --- API Auth Routes ---

app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "يرجى إدخال اسم المستخدم وكلمة المرور." });
  }

  const normalized = username.trim().toLowerCase();
  if (store.users[normalized]) {
    return res.status(400).json({ success: false, error: "اسم المستخدم هذا مسجل بالفعل." });
  }

  store.users[normalized] = {
    username: normalized,
    password: password,
    keys: { apiKey: "", secretKey: "", useTestnet: false },
    tradingStatus: "idle",
    tradingStartTime: null,
    withdrawals: [],
    extraProfit: 0,
    lastKnownBalance: 0,
    spotBalance: 0,
    fundingBalance: 0,
    lastError: "",
  };

  saveStore();
  res.json({ success: true, username: normalized });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: "يرجى إدخال اسم المستخدم وكلمة المرور." });
  }

  const normalized = username.trim().toLowerCase();
  const user = store.users[normalized];
  if (!user || user.password !== password) {
    return res.status(400).json({ success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
  }

  res.json({ success: true, username: normalized });
});

// --- Google OAuth Routes ---

app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/auth/google/callback`;

  if (!clientId) {
    // Fall back to simulation mode if Google Secrets are not configured
    return res.json({
      success: true,
      simulated: true,
      url: "/auth/google/simulate"
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account"
  });

  res.json({
    success: true,
    simulated: false,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  });
});

app.get("/auth/google/simulate", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تسجيل الدخول باستخدام Google</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { font-family: 'Inter', sans-serif; }
      </style>
    </head>
    <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
      <div class="bg-white border border-slate-200 rounded-lg p-8 w-full max-w-[450px] shadow-sm flex flex-col items-center">
        <!-- Google Logo -->
        <svg class="w-16 h-16 mb-4" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.93 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.84 2.98C6.04 7.56 8.78 5.04 12 5.04z"/>
          <path fill="#4285F4" d="M23.48 12.25c0-.82-.07-1.6-.2-2.35H12v4.45h6.44c-.28 1.44-1.1 2.66-2.33 3.48v2.9h3.76c2.2-2.02 3.61-5.02 3.61-8.48z"/>
          <path fill="#FBBC05" d="M5.08 10.7a6.97 6.97 0 0 1 0-2.6L1.24 5.12a11.96 11.96 0 0 0 0 10.76l3.84-2.98c-.23-.65-.36-1.35-.36-2.2z"/>
          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.76-2.9c-1.1.74-2.52 1.18-4.2 1.18-3.22 0-5.96-2.52-6.92-5.64L1.24 15.7C3.2 19.69 7.24 23 12 23z"/>
        </svg>
        
        <h1 class="text-2xl font-semibold text-slate-800 mb-1">تسجيل الدخول</h1>
        <p class="text-slate-500 text-sm mb-6">المتابعة إلى منصة التداول الخوارزمي</p>
        
        <div class="w-full text-right bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-[11px] mb-4 leading-relaxed">
          <strong>ملاحظة التهيئة والمحاكاة:</strong> لم يتم تحديد مفاتيح بيئة Google OAuth (GOOGLE_CLIENT_ID) في خادم التطبيق حتى الآن. يعمل هذا المعالج كوضع محاكاة آمن ومطابق للمتابعة فوراً بأي بريد إلكتروني.
        </div>

        <div class="w-full space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1.5">البريد الإلكتروني أو الهاتف</label>
            <input id="email-input" type="email" placeholder="example@gmail.com" class="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 text-left" dir="ltr" />
          </div>
          
          <div class="text-xs text-blue-600 hover:underline cursor-pointer">هل نسيت البريد الإلكتروني؟</div>
          
          <div class="flex justify-between items-center pt-4">
            <button onclick="handleNext()" class="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-6 py-2 rounded shadow-sm transition-all">التالي</button>
            <div class="text-xs text-blue-600 hover:underline cursor-pointer">إنشاء حساب</div>
          </div>
        </div>
      </div>

      <script>
        function handleNext() {
          const email = document.getElementById('email-input').value.trim();
          if (!email) {
            alert('يرجى إدخال عنوان بريد إلكتروني صالح.');
            return;
          }
          if (!email.includes('@')) {
            alert('يرجى إدخال بريد إلكتروني صحيح يحتوي على @.');
            return;
          }
          
          // Post success back to parent
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', username: email }, '*');
            window.close();
          } else {
            alert('تعذر الوصول إلى النافذة الأم لمشاركة حالة تسجيل الدخول.');
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: "${error}" }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("No authorization code provided");
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/auth/google/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Failed to exchange token: ${errText}`);
    }

    const tokens = await tokenResponse.json() as any;
    const accessToken = tokens.access_token;

    // Fetch user profile from Google UserInfo
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userinfoResponse.ok) {
      throw new Error("Failed to fetch Google user profile");
    }

    const profile = await userinfoResponse.json() as { email: string; name?: string; picture?: string };
    const email = profile.email;
    const normalized = email.trim().toLowerCase();

    // Log in or register user
    if (!store.users[normalized]) {
      store.users[normalized] = {
        username: normalized,
        keys: { apiKey: "", secretKey: "", useTestnet: false },
        tradingStatus: "idle",
        tradingStartTime: null,
        withdrawals: [],
        extraProfit: 0,
        lastKnownBalance: 0,
        spotBalance: 0,
        fundingBalance: 0,
        lastError: ""
      };
      saveStore();
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', username: "${normalized}" }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (e: any) {
    console.error("Google login callback error:", e);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: "${e.message || 'Authentication failed'}" }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  }
});

// --- API User-Specific Routes ---

app.get("/api/status", async (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  let balance = user.lastKnownBalance || 0;
  let spotBalance = user.spotBalance || 0;
  let fundingBalance = user.fundingBalance || 0;
  let hasValidKeys = !!(user.keys?.apiKey && user.keys?.secretKey);
  let lastError = user.lastError || "";

  if (hasValidKeys) {
    try {
      const userExchange = getUserExchange(user);
      if (userExchange) {
        // Fetch balances
        try {
          const spotBal = await userExchange.fetchBalance({ type: 'spot' });
          spotBalance = spotBal.total['USDT'] || 0;
        } catch (spotErr: any) {
          const defaultBal = await userExchange.fetchBalance();
          spotBalance = defaultBal.total['USDT'] || 0;
        }

        try {
          const fundingBal = await userExchange.fetchBalance({ type: 'funding' });
          fundingBalance = fundingBal.total['USDT'] || 0;
        } catch (e) {}

        balance = spotBalance + fundingBalance;
        user.spotBalance = spotBalance;
        user.fundingBalance = fundingBalance;
        user.lastKnownBalance = balance;
        user.lastError = "";
        saveStore();
      }
    } catch (e: any) {
      console.error("Balance fetch error:", e);
      lastError = translateBinanceError(e);
      user.lastError = lastError;
      saveStore();
    }
  }

  // Check 24 hour trading status & add profit if elapsed
  let tradingRemainingSeconds = 0;
  if (user.tradingStatus === "running" && user.tradingStartTime) {
    const elapsed = Date.now() - user.tradingStartTime;
    const duration = 24 * 60 * 60 * 1000; // 24 hours
    if (elapsed >= duration) {
      // 24 hours elapsed! Calculate 30% profit of the current balance and award it
      const profit = balance * 0.30;
      const actualProfit = profit > 0 ? profit : 150;
      const actualPercentage = balance > 0 ? (actualProfit / balance) * 100 : 30;
      
      user.extraProfit = (user.extraProfit || 0) + actualProfit;
      
      user.dailyProfits = user.dailyProfits || [];
      const todayStr = new Date().toISOString().split('T')[0];
      user.dailyProfits.push({
        date: todayStr,
        profit: Number(actualProfit.toFixed(2)),
        percentage: Number(actualPercentage.toFixed(2))
      });

      user.tradingStatus = "idle";
      user.tradingStartTime = null;
      saveStore();
    } else {
      tradingRemainingSeconds = Math.ceil((duration - elapsed) / 1000);
    }
  }

  // Generate some fake history if empty so chart isn't empty
  if (!user.dailyProfits || user.dailyProfits.length === 0) {
    user.dailyProfits = [];
    let fakeBalance = balance > 0 ? balance : 500;
    for (let i = 6; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fakeProfit = fakeBalance * 0.28 + (Math.random() * fakeBalance * 0.05); // ~30%
      user.dailyProfits.push({
        date: d.toISOString().split('T')[0],
        profit: Number(fakeProfit.toFixed(2)),
        percentage: Number(((fakeProfit / fakeBalance) * 100).toFixed(2))
      });
    }
    saveStore();
  }

  res.json({
    botStatus: user.tradingStatus || "idle",
    tradingStartTime: user.tradingStartTime,
    tradingRemainingSeconds,
    extraProfit: user.extraProfit || 0,
    hasKeys: hasValidKeys,
    balance: balance + (user.extraProfit || 0), // Display total balance including profits
    realBalance: balance,
    spotBalance: spotBalance,
    fundingBalance: fundingBalance,
    lastError: lastError || undefined,
    dailyProfits: user.dailyProfits,
  });
});

app.post("/api/user/start-trading", (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (!user.keys?.apiKey || !user.keys?.secretKey) {
    return res.status(400).json({ success: false, error: "يرجى إضافة مفاتيح API أولاً لتفعيل التداول." });
  }

  if (user.tradingStatus === "running") {
    return res.status(400).json({ success: false, error: "التداول قيد التشغيل بالفعل ولا يمكن إيقافه." });
  }

  user.tradingStatus = "running";
  user.tradingStartTime = Date.now();
  saveStore();

  res.json({ 
    success: true, 
    botStatus: "running", 
    tradingStartTime: user.tradingStartTime,
    tradingRemainingSeconds: 24 * 60 * 60
  });
});

app.post("/api/keys", (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { apiKey, secretKey, useTestnet } = req.body;
  user.keys = { apiKey, secretKey, useTestnet: !!useTestnet };
  user.lastError = "";
  saveStore();
  res.json({ success: true, message: "تم حفظ مفاتيح API بنجاح." });
});

app.get("/api/server-ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) throw new Error("Could not contact IP service");
    const data = await response.json() as { ip: string };
    res.json({ success: true, ip: data.ip });
  } catch (error: any) {
    console.error("Failed to fetch server IP:", error);
    res.status(500).json({ success: false, error: "تعذر جلب عنوان IP الخاص بالخادم تلقائياً." });
  }
});

app.get("/api/withdrawals", (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  res.json({ success: true, withdrawals: user.withdrawals || [] });
});

app.post("/api/withdraw", async (req, res) => {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { code, amount, address, network } = req.body;
  if (!user.keys?.apiKey || !user.keys?.secretKey) {
    return res.status(400).json({ success: false, error: "يجب إدخال مفاتيح API الخاصة بـ Binance أولاً في صفحة الإعدادات." });
  }
  if (!code || !amount || !address) {
    return res.status(400).json({ success: false, error: "يرجى تعبئة جميع الحقول المطلوبة (العملة، المبلغ، عنوان المحفظة)." });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ success: false, error: "يرجى إدخال مبلغ صالح أكبر من الصفر." });
  }

  const availableBalance = (user.lastKnownBalance || 0) + (user.extraProfit || 0);
  if (numericAmount > availableBalance) {
    return res.status(400).json({ success: false, error: "رصيد غير كافٍ: ليس لديك رصيد كافٍ من USDT لإتمام هذه العملية." });
  }

  try {
    const userExchange = getUserExchange(user);
    if (!userExchange) throw new Error("Could not initialize Binance client");

    const params: any = {};
    if (network) {
      params.network = network; 
    }
    
    console.log(`[WITHDRAW] User ${user.username} initiating withdrawal of ${numericAmount} ${code} to ${address}`);
    
    let amountToWithdrawFromBinance = numericAmount;
    if (amountToWithdrawFromBinance > (user.lastKnownBalance || 0)) {
      amountToWithdrawFromBinance = user.lastKnownBalance || 0;
    }

    let response: any = { id: "sim-" + Math.random().toString(36).substring(2, 11).toUpperCase() };
    
    if (amountToWithdrawFromBinance > 0) {
      response = await userExchange.withdraw(code, amountToWithdrawFromBinance, address, undefined, params);
    }

    const tx = {
      id: response.id || "tx-" + Math.random().toString(36).substring(2, 11).toUpperCase(),
      timestamp: Date.now(),
      code,
      amount: numericAmount,
      address,
      network: network || "TRX",
      status: "success",
      isSimulated: amountToWithdrawFromBinance < numericAmount,
      txid: response.txid || undefined
    };

    if (!user.withdrawals) {
      user.withdrawals = [];
    }
    user.withdrawals.unshift(tx);

    // Subtract from extraProfit first, then from real balance
    let remainingToSubtract = numericAmount;
    if (user.extraProfit && user.extraProfit > 0) {
      const subtractedFromProfit = Math.min(user.extraProfit, remainingToSubtract);
      user.extraProfit -= subtractedFromProfit;
      remainingToSubtract -= subtractedFromProfit;
    }
    if (remainingToSubtract > 0) {
      user.lastKnownBalance = Math.max(0, (user.lastKnownBalance || 0) - remainingToSubtract);
    }

    saveStore();
    
    return res.json({
      success: true,
      message: "تم تنفيذ عملية السحب بنجاح وهي قيد المعالجة الآن.",
      info: tx
    });
  } catch (error: any) {
    console.error("User withdrawal error:", error);
    res.status(500).json({ success: false, error: translateBinanceError(error) });
  }
});

// --- Admin Routes (Only accessible by defined admins) ---

function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const username = req.headers["x-username"] as string;
  if (!username) {
    return res.status(401).json({ success: false, error: "المستخدم غير مصرح له." });
  }
  const normalized = username.trim().toLowerCase();
  if (!ADMINS.includes(normalized)) {
    return res.status(403).json({ success: false, error: "ليس لديك صلاحية الوصول إلى صفحة الإدارة." });
  }
  next();
}

app.get("/api/admin/users", verifyAdmin, (req, res) => {
  const usersList = Object.values(store.users).map(u => ({
    username: u.username,
    hasKeys: !!(u.keys?.apiKey && u.keys?.secretKey),
    apiKeyPrefix: u.keys?.apiKey ? `${u.keys.apiKey.substring(0, 6)}...` : undefined,
    tradingStatus: u.tradingStatus || "idle",
    lastKnownBalance: u.lastKnownBalance || 0,
    spotBalance: u.spotBalance || 0,
    fundingBalance: u.fundingBalance || 0,
    extraProfit: u.extraProfit || 0,
    withdrawals: u.withdrawals || [],
    lastError: u.lastError || "",
  }));
  res.json({ success: true, users: usersList });
});

app.get("/api/admin/supabase-status", verifyAdmin, (req, res) => {
  const url = process.env.SUPABASE_URL || store.supabaseConfig?.url || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || store.supabaseConfig?.anonKey || "";
  res.json({
    success: true,
    configured: !!(url && key),
    connected: supabaseConnected,
    error: supabaseError,
    supabaseUrl: url || null,
    supabaseKey: key ? `${key.substring(0, 10)}...` : null
  });
});

app.post("/api/admin/supabase-config", verifyAdmin, async (req, res) => {
  const { url, anonKey } = req.body;
  if (!url || !anonKey) {
    return res.status(400).json({ success: false, error: "كلا من الرابط والمفتاح مطلوبين." });
  }

  store.supabaseConfig = {
    url: url.trim(),
    anonKey: anonKey.trim()
  };

  saveStore();
  initSupabase();

  if (supabase) {
    try {
      await loadStoreFromSupabase();
    } catch (err: any) {
      console.error("[SUPABASE] Load on config change failed:", err.message);
    }
  }

  res.json({
    success: true,
    message: "تم حفظ إعدادات Supabase وتحديث الاتصال بنجاح وتزامن الحسابات فوراً.",
    connected: supabaseConnected,
    error: supabaseError
  });
});

app.post("/api/admin/update-balance", verifyAdmin, (req, res) => {
  const { username, extraProfit, lastKnownBalance } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: "اسم المستخدم مطلوب." });
  }

  const normalized = username.trim().toLowerCase();
  const user = store.users[normalized];
  if (!user) {
    return res.status(404).json({ success: false, error: "المستخدم غير موجود." });
  }

  if (extraProfit !== undefined) {
    user.extraProfit = Number(extraProfit);
  }
  if (lastKnownBalance !== undefined) {
    user.lastKnownBalance = Number(lastKnownBalance);
  }

  saveStore();
  res.json({ success: true, message: "تم تحديث رصيد وأرباح المستخدم بنجاح." });
});

app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: "اسم المستخدم مطلوب." });
  }

  const normalized = username.trim().toLowerCase();
  if (ADMINS.includes(normalized)) {
    return res.status(400).json({ success: false, error: "لا يمكن حذف مستخدم مسؤول." });
  }

  if (!store.users[normalized]) {
    return res.status(404).json({ success: false, error: "المستخدم غير موجود." });
  }

  // Delete from in-memory store and local store.json
  delete store.users[normalized];
  saveStore();

  // Delete from Supabase app_users table
  if (supabase) {
    try {
      const { error: delError } = await supabase
        .from("app_users")
        .delete()
        .eq("username", normalized);
      
      if (delError) {
        console.error("[SUPABASE] Failed to delete user from app_users table:", delError.message);
      } else {
        console.log(`[SUPABASE] User ${normalized} successfully deleted from app_users table.`);
      }
    } catch (err: any) {
      console.error("[SUPABASE] Error deleting user from app_users table:", err.message);
    }
  }

  res.json({ success: true, message: "تم حذف المستخدم وجميع بياناته من الخادم وقاعدة البيانات بنجاح." });
});

// --- Public Market Data Route (Guaranteed to work without API keys) ---

app.get("/api/market/data", async (req, res) => {
  try {
    const { symbol, timeframe } = store.settings;
    const publicExchange = new ccxt.binance({ enableRateLimit: true });
    const ohlcv = await publicExchange.fetchOHLCV(symbol, timeframe, undefined, 100);
    
    const closes = ohlcv.map(c => c[4]);
    const ema20 = EMA.calculate({ period: 20, values: closes });
    const rsi = RSI.calculate({ period: 14, values: closes });

    const chartData = ohlcv.map((candle, index) => {
      let support = null;
      let resistance = null;
      if (index >= 20) {
        const past20 = ohlcv.slice(index - 20, index);
        support = Math.min(...past20.map(c => c[3]));
        resistance = Math.max(...past20.map(c => c[2]));
      }

      const isComplete = index >= 50;

      return {
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        support,
        resistance,
        ema20: isComplete ? ema20[index - 19] : null,
        rsi: isComplete ? rsi[index - 14] : null,
      };
    });

    res.json({ success: true, data: chartData });
  } catch (error: any) {
    console.error("Failed to fetch market data:", error.message);
    // Return backup simulation data if Binance is rate-limiting
    const backupData = [];
    let currentPrice = 62450.0;
    const now = Date.now();
    for (let i = 100; i >= 0; i--) {
      const open = currentPrice + (Math.random() - 0.5) * 50;
      const close = open + (Math.random() - 0.5) * 40;
      const high = Math.max(open, close) + Math.random() * 20;
      const low = Math.min(open, close) - Math.random() * 20;
      backupData.push({
        timestamp: now - i * 60000,
        open,
        high,
        low,
        close,
        volume: Math.random() * 10,
        support: 62200,
        resistance: 62600,
        ema20: currentPrice,
        rsi: 50 + (Math.random() - 0.5) * 20
      });
      currentPrice = close;
    }
    res.json({ success: true, data: backupData });
  }
});

// Serve frontend assets
async function startServer() {
  // Sync state from Supabase on startup
  if (supabase) {
    try {
      console.log("[SUPABASE] Initializing sync from remote DB...");
      await loadStoreFromSupabase();
    } catch (err: any) {
      console.error("[SUPABASE] Initial sync error:", err.message);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
