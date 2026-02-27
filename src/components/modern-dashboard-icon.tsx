
'use client';

import { cn } from "@/lib/utils";

interface ModernDashboardIconProps {
  className?: string;
  size?: number;
  iconColor?: string;
}

export function ModernDashboardIcon({ className, size = 24, iconColor = "white" }: ModernDashboardIconProps) {
  // Scale the SVG rectangles relative to the container size
  const iconSize = size * 0.6;
  
  return (
    <div 
      className={cn(
        "flex items-center justify-center rounded-[28%] bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-md transition-all duration-300 hover:scale-110 hover:-rotate-3 cursor-pointer shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg 
        width={iconSize} 
        height={iconSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={iconColor} 
        strokeWidth="0"
      >
        <rect x="3" y="3" width="8" height="8" rx="2" fill={iconColor}/>
        <rect x="13" y="3" width="8" height="5" rx="2" fill={iconColor}/>
        <rect x="13" y="10" width="8" height="11" rx="2" fill={iconColor}/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill={iconColor}/>
      </svg>
    </div>
  );
}
