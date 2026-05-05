import React, { useState } from 'react';
import { 
  KeyRound, Mail, LogIn, Loader2, Users, 
  ShieldCheck, ArrowRight, Sparkles 
} from 'lucide-react';
import { useAuth } from '@/src/hooks/useAuth';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/src/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function LoginView() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    
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
        if (signUpError) throw signUpError;
        
        toast.success('Pendaftaran berhasil! Silakan login.');
        setIsSignUp(false);
      } catch (err: any) {
        toast.error(err.message || 'Gagal mendaftar.');
      } finally {
        setBusy(false);
      }
    } else {
      try {
        const { error: loginError } = await login(email, password);
        if (loginError) throw loginError;
        toast.success('Otentikasi Berhasil');
      } catch (err: any) {
        toast.error(err.message || 'Email atau password salah.');
        setBusy(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full -mr-64 -mt-64 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full -ml-64 -mb-64 blur-3xl" />
      
      <div className="w-full max-w-[900px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10">
        {/* Left Side: Illustration / Info */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative">
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-black">S</div>
                <span className="font-black tracking-tighter text-xl uppercase">Setrika.OS</span>
             </div>
             <h2 className="text-4xl font-bold tracking-tight mt-12 leading-tight">
               Manage laundry <br/>
               <span className="text-blue-400">efficiency</span> at scale.
             </h2>
             <p className="text-slate-400 text-sm max-w-xs !leading-relaxed">
               The preferred choice for modern garment care facilities. Robust POS, real-time pipeline, and automated reporting.
             </p>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                   <ShieldCheck className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-xs">
                   <p className="font-bold">Enterprise Security</p>
                   <p className="text-slate-500">Encrypted data transmission</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                   <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-xs">
                   <p className="font-bold">Automated Workflow</p>
                   <p className="text-slate-500">Intelligent lifecycle sorting</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div 
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                  {isSignUp ? 'Register Terminal Access' : 'Authorize Core Access'}
                </h1>
                <p className="text-slate-500 text-sm">
                  {isSignUp 
                    ? 'Enter professional credentials for the new operator.' 
                    : 'Enter assigned credentials to access the POS terminal.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        id="fullName" 
                        required 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Operator Name" 
                        className="pl-10 h-11 border-slate-200 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Network ID (Email)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@setrika.os" 
                      className="pl-10 h-11 border-slate-200 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="pass" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Access Key (Password)</Label>
                    {!isSignUp && <button type="button" className="text-[10px] font-bold text-blue-600 uppercase">Forgot Key?</button>}
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      id="pass" 
                      type="password" 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="pl-10 h-11 border-slate-200 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <Button 
                  disabled={busy} 
                  type="submit" 
                  className="w-full h-11 bg-slate-900 hover:bg-black text-sm font-bold uppercase tracking-widest shadow-xl shadow-slate-200"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'Registry Access' : 'Authenticate')}
                </Button>

                <div className="pt-2 text-center">
                  <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                  >
                    {isSignUp ? 'Existing Operator? Sign In' : 'Request Registry Access'}
                    <ArrowRight className="inline w-3 h-3 ml-2" />
                  </button>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
