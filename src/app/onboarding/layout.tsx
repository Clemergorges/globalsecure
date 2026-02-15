
'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

const steps = [
  { id: 'personal', title: 'Dados Pessoais', path: '/onboarding/personal' },
  { id: 'address', title: 'Endereço', path: '/onboarding/address' },
  { id: 'document', title: 'Documento', path: '/onboarding/document' },
  { id: 'status', title: 'Análise', path: '/onboarding/status' },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex(step => pathname.includes(step.id));

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-black">
              GS
            </div>
            <span className="font-bold text-lg">GlobalSecureSend</span>
          </div>
          <div className="text-sm text-slate-400">
            Abertura de Conta
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto py-4 px-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px]">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border transition-all
                    ${isCompleted ? 'bg-green-500 border-green-500 text-black' : 
                      isCurrent ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500' : 
                      'bg-transparent border-slate-700 text-slate-700'}
                  `}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : 
                     isCurrent ? <span className="text-sm font-bold">{index + 1}</span> :
                     <span className="text-sm font-bold">{index + 1}</span>}
                  </div>
                  <span className={`text-sm font-medium ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className="w-12 h-[1px] bg-white/10 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start pt-12 px-4 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
