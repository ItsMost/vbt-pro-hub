import { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  Key, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  HelpCircle, 
  UploadCloud, 
  AlertTriangle,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useAthletes } from '../context/AthleteContext';
import { testSupabaseConnection } from '../utils/supabaseClient';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SETUP_SQL = `-- 1. Create vbt_athletes Table
create table if not exists public.vbt_athletes (
  id text primary key,
  name text not null,
  name_ar text default '',
  sport_event text default '',
  body_weight_kg numeric default 75,
  notes text default '',
  avatar_initials text default 'AT',
  color_accent text default 'cyan',
  manual_1rm_map jsonb default '{}'::jsonb,
  tests jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Automatic updated_at trigger
create or replace function public.handle_vbt_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_vbt_athletes_updated_at on public.vbt_athletes;
create trigger set_vbt_athletes_updated_at
  before update on public.vbt_athletes
  for each row
  execute function public.handle_vbt_updated_at();

-- 3. Enable RLS and public access with anon key
alter table public.vbt_athletes enable row level security;
drop policy if exists "Allow public access for all operations on vbt_athletes" on public.vbt_athletes;
create policy "Allow public access for all operations on vbt_athletes"
  on public.vbt_athletes for all using (true) with check (true);

-- 4. Enable Realtime Sync for Mobile & PC
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'vbt_athletes'
  ) then
    alter publication supabase_realtime add table public.vbt_athletes;
  end if;
end;
$$;`;

export function SupabaseSyncModal({ isOpen, onClose }: SupabaseSyncModalProps) {
  const { 
    supabaseConfig, 
    syncStatus, 
    lastSyncedAt, 
    updateSupabaseConfig, 
    disconnectSupabase, 
    uploadLocalToCloud, 
    manualCloudSync, 
    showToast 
  } = useAthletes();

  const [urlInput, setUrlInput] = useState(supabaseConfig.url || '');
  const [keyInput, setKeyInput] = useState(supabaseConfig.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!urlInput.trim() || !keyInput.trim()) {
      setTestResult({ success: false, message: 'يرجى إدخال الرابط والمفتاح أولاً // Please enter URL & Anon Key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(urlInput, keyInput);
    setIsTesting(false);

    if (res.success) {
      setTestResult({ success: true, message: 'الاتصال بقاعدة البيانات ناجح وجاهز للاستخدام! // Connection Successful!' });
    } else {
      setTestResult({ success: false, message: `فشل الاتصال: ${res.error || 'تأكد من صحة الرابط وتشغيل كود الـ SQL'}` });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      showToast('يرجى ملء جميع الحقول // All fields required', 'warning');
      return;
    }

    setIsSaving(true);
    const success = await updateSupabaseConfig(urlInput.trim(), keyInput.trim());
    setIsSaving(false);

    if (success) {
      showToast('تم حفظ إعدادات Supabase وتفعيل المزامنة اللحظية // Cloud Sync Activated', 'success');
      onClose();
    } else {
      showToast('تعذر الاتصال بـ Supabase، يرجى فحص البيانات المكتوبة // Connection Error', 'error');
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('هل تريد قطع الاتصال بـ Supabase والعودة للوضع المحلي فقط؟ // Disconnect Supabase?')) {
      disconnectSupabase();
      setUrlInput('');
      setKeyInput('');
      setTestResult(null);
    }
  };

  const handleUploadLocalData = async () => {
    setIsUploading(true);
    await uploadLocalToCloud();
    setIsUploading(false);
  };

  const handlePullCloudData = async () => {
    setIsPulling(true);
    await manualCloudSync();
    setIsPulling(false);
  };

  const copySqlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopiedSql(true);
      showToast('تم نسخ كود الـ SQL إلى الحافظة! // SQL Copied to clipboard', 'info');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch (err) {
      showToast('تعذر النسخ التلقائي // Copy failed', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700/80 p-6 sm:p-8 bg-[#0b1120] text-slate-100 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  المزامنة السحابية // Supabase Cloud Sync
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  REALTIME
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                مزامنة فورية بين هاتفك المحمول وجهاز الكمبيوتر الخاص بك
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sync Benefits Feature Banner */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-emerald-950/40 border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Monitor className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="font-bold text-slate-200 block">
                مزامنة حية وتلقائية في كلا الاتجاهين
              </span>
              <span className="text-[11px] text-slate-400">
                أي تغيير تسجله على الموبايل في الجيم سيظهر على شاشة الكمبيوتر فوراً والعكس!
              </span>
            </div>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              syncStatus === 'connected' 
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]' 
                : syncStatus === 'syncing'
                ? 'bg-cyan-400 animate-spin'
                : syncStatus === 'error'
                ? 'bg-rose-400'
                : 'bg-amber-400'
            }`} />
            <div>
              <span className="text-xs font-mono font-bold block text-slate-200">
                حالة الاتصال // Status:{' '}
                <span className={
                  syncStatus === 'connected' ? 'text-emerald-400' :
                  syncStatus === 'syncing' ? 'text-cyan-400' :
                  syncStatus === 'error' ? 'text-rose-400' : 'text-amber-400'
                }>
                  {syncStatus === 'connected' && 'متصل بالسحابة (Online & Synced)'}
                  {syncStatus === 'syncing' && 'جاري المزامنة... (Syncing)'}
                  {syncStatus === 'error' && 'خطأ في الاتصال (Connection Error)'}
                  {syncStatus === 'unconfigured' && 'غير متصل - وضع محلي فقط (Local Mode)'}
                  {syncStatus === 'offline' && 'غير متصل بالإنترنت (Offline Mode)'}
                </span>
              </span>
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-500 font-mono">
                  آخر مزامنة: {lastSyncedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {syncStatus === 'connected' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePullCloudData}
                disabled={isPulling}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                <span>تحديث يدوي</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono transition-all"
              >
                قطع الاتصال
              </button>
            </div>
          )}
        </div>

        {/* Cloud Credentials Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Supabase URL */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>رابط المشروع (Supabase Project URL)</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder-slate-600 font-mono text-xs transition-all"
            />
          </div>

          {/* Supabase Anon Key */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span>المفتاح العام (Supabase Anon Public API Key)</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder-slate-600 font-mono text-xs transition-all resize-none"
            />
          </div>

          {/* Test Connection Message */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2.5 ${
              testResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testResult.success ? <CloudCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !urlInput || !keyInput}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-bold transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال (Test)'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSaving || !urlInput || !keyInput}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-glow-lime transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudCheck className="w-4 h-4" />}
                <span>حفظ وتفعيل المزامنة</span>
              </button>
            </div>
          </div>
        </form>

        {/* Data Upload & Seed Section (When Connected) */}
        {syncStatus === 'connected' && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>إدارة وتصدير البيانات السحابية // Cloud Data Sync</span>
            </h4>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  رفع بيانات اللاعبين الحالية إلى السحابة
                </span>
                <span className="text-[11px] text-slate-400 block">
                  انسخ جميع اللاعبين والاختبارات الموجودة على هذا الجهاز إلى قاعدة بيانات Supabase ليراها الموبايل
                </span>
              </div>
              <button
                type="button"
                onClick={handleUploadLocalData}
                disabled={isUploading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                <span>{isUploading ? 'جاري الرفع...' : 'رفع كل اللاعبين للسحابة'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Step-by-Step Quick Setup Guide */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-mono transition-all border border-slate-800"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="font-bold">كيفية إنشاء وتهيئة مشروع Supabase المجاني في دقيقتين؟</span>
            </div>
            <span className="text-cyan-400 font-bold">{showSqlGuide ? 'إخفاء ▲' : 'عرض الدليل ▼'}</span>
          </button>

          {showSqlGuide && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs font-sans text-slate-300 animate-fadeIn">
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  ادخل على موقع <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-mono inline-flex items-center gap-1">supabase.com <ExternalLink className="w-3 h-3" /></a> وأنشئ حساباً مجانياً ثم أنشئ مشروعاً جديداً (New Project).
                </li>
                <li>
                  من القائمة الجانبية في Supabase اضغط على <strong>SQL Editor</strong>، ثم الصق كود الـ SQL التالي واضغط على <strong>Run</strong>:
                </li>
              </ol>

              {/* SQL Code Block with Copy Button */}
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 leading-tight">
                  {SUPABASE_SETUP_SQL}
                </pre>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'تم النسخ!' : 'نسخ كود الـ SQL'}</span>
                </button>
              </div>

              <ol start={3} className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>
                  اذهب إلى <strong>Project Settings</strong> ثم <strong>API</strong>، وانسخ كل من <strong>Project URL</strong> و <strong>anon / public API key</strong> والصقهما في الخانات بالأعلى!
                </li>
              </ol>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
