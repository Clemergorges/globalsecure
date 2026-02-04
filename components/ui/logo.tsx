import React from 'react';

export function Logo({ className = "w-10 h-10", showText = true, textClassName = "text-xl" }: { className?: string, showText?: boolean, textClassName?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`${className} relative rounded-xl flex items-center justify-center text-white shadow-xl overflow-hidden group border border-white/10`}>
        
        {/* Base Gradient (Mantendo a identidade Cyan/Blue) */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-900"></div>
        
        {/* Sunset Glow Effects (Traços de Pôr do Sol) */}
        {/* Horizonte Dourado na parte inferior */}
        <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-amber-500/60 via-orange-500/30 to-transparent mix-blend-overlay"></div>
        
        {/* Sol Poente (Brilho no canto) */}
        <div className="absolute -bottom-2 -right-2 w-2/3 h-2/3 bg-gradient-to-br from-amber-400 to-orange-600 blur-xl opacity-60 rounded-full group-hover:opacity-80 transition-opacity duration-500"></div>
        
        {/* Reflexo no topo (Céu) */}
        <div className="absolute -top-4 -left-4 w-2/3 h-2/3 bg-cyan-300 blur-xl opacity-30 rounded-full"></div>

        {/* Glass Effect Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* GSS Typography */}
        <div className="relative z-10 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
            <span className="font-black text-white tracking-tighter drop-shadow-md select-none" 
                  style={{ 
                    fontSize: '40%', 
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
              GT
            </span>
        </div>
        
        {/* Decorative Lines (Abstract Horizon) */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 100 100">
           <line x1="-10" y1="80" x2="110" y2="60" stroke="white" strokeWidth="1" />
           <line x1="-10" y1="90" x2="110" y2="70" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>
      
      {showText && (
        <span className={`font-bold text-gray-900 tracking-tight ${textClassName}`}>
          GlobalTransfer
        </span>
      )}
    </div>
  );
}
