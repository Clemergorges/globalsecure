'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
           <Link href="/" className="inline-block mb-8">
             <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-white justify-center">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                 <div className="w-4 h-4 bg-white rounded-full opacity-50"></div>
               </div>
               GlobalSecure
             </div>
           </Link>
           
           <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Recuperar Senha</h1>
           <p className="text-slate-400">Digite seu email para receber o link de redefinição.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
           {isSent ? (
             <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                   <Mail className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                   <h3 className="text-white font-bold text-lg mb-2">Email Enviado!</h3>
                   <p className="text-slate-400 text-sm">Verifique sua caixa de entrada (e spam) para instruções de como redefinir sua senha.</p>
                </div>
                <Link href="/login">
                   <Button className="w-full bg-white text-slate-950 hover:bg-slate-200 font-bold h-11">
                      Voltar para Login
                   </Button>
                </Link>
             </div>
           ) : (
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                   <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
                   <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                      <input 
                        id="email"
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-10 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="seu@email.com"
                      />
                   </div>
                </div>
                
                <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all">
                   {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Link'}
                </Button>
             </form>
           )}
        </div>
        
        <div className="text-center">
           <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar para Login
           </Link>
        </div>
      </div>
    </div>
  );
}
