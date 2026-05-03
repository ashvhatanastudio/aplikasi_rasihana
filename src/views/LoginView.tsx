import React, { useState } from 'react';
import { KeyRound, Mail, LogIn, Loader2, Users } from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

export default function LoginView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    
    if (isSignUp) {
      try {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (signUpError) {
          setError(signUpError.message);
          setBusy(false);
        } else {
          setError('Registrasi berhasil! Silakan cek email atau coba login.');
          setIsSignUp(false);
          setBusy(false);
        }
      } catch (err: any) {
        setError(err.message || 'Gagal mendaftar. Periksa konfigurasi Supabase.');
        setBusy(false);
      }
    } else {
      try {
        const { error: loginError } = await login(email, password);
        if (loginError) {
          setError(loginError.message);
          setBusy(false);
        }
      } catch (err: any) {
        if (err.message === 'Failed to fetch') {
          setError('Koneksi ke Supabase Gagal. Pastikan VITE_SUPABASE_URL sudah benar di panel Secrets.');
        } else {
          setError(err.message || 'Terjadi kesalahan sistem.');
        }
        setBusy(false);
      }
    }
  };

  const isMissingEnv = !import.meta.env.VITE_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white w-full max-w-sm rounded border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {isMissingEnv && (
          <div className="bg-amber-50 p-4 border-b border-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
            ⚠️ Konfigurasi Diperlukan: Harap masukkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di menu Secrets.
          </div>
        )}
        <div className="p-6 text-center bg-slate-50 border-b border-slate-200">
          <div className="mx-auto w-10 h-10 bg-blue-600 rounded flex items-center justify-center mb-3 shadow-md">
            <LogIn className="text-white w-5 h-5" />
          </div>
          <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
            {isSignUp ? 'Create New Profile' : 'Security Access Required'}
          </h1>
          <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-widest">Core Banking Engine V.2.0.4</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className={cn(
              "p-3 text-[10px] rounded border font-bold uppercase tracking-wide",
              error.includes('berhasil') ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
            )}>
              {error}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-blue-600 focus:bg-white outline-none transition-all bg-slate-50"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity Protocol (Email)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-blue-600 focus:bg-white outline-none transition-all bg-slate-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Cipher (Password)</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-blue-600 focus:bg-white outline-none transition-all bg-slate-50"
              />
            </div>
          </div>

          <button
            disabled={busy}
            type="submit"
            className="w-full bg-slate-900 text-white py-2.5 rounded text-[11px] font-bold uppercase tracking-widest flex items-center justify-center shadow-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-all"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : (isSignUp ? 'Registry New User' : 'Authenticate')}
          </button>

          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
          >
            {isSignUp ? 'Back to Authentication' : 'Request New Access (Register)'}
          </button>
        </form>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">
            Protocol Enforcement Active
          </p>
        </div>
      </div>
    </div>
  );
}
