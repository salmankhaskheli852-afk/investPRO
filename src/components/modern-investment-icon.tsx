'use client';

import { cn } from "@/lib/utils";

interface ModernInvestmentIconProps {
  className?: string;
  size?: number;
}

export function ModernInvestmentIcon({ className, size = 24 }: ModernInvestmentIconProps) {
  // Scale the SVG content relative to the container size
  const iconSize = size * 0.55;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-[22%] bg-gradient-to-br from-[#0f172a] to-[#1e293b] shadow-md transition-all duration-300 hover:scale-110 cursor-pointer shrink-0 group",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#10b981" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all"
      >
        {/* Upward Chart */}
        <polyline points="3 16 9 10 13 14 21 6"></polyline>
        <polyline points="17 6 21 6 21 10"></polyline>

        {/* Base Line */}
        <line x1="3" y1="20" x2="21" y2="20"></line>
      </svg>
    </div>
  );
}
