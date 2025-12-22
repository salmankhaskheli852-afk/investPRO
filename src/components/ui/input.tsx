
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  prefix?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, prefix, ...props }, ref) => {
    const hasIcon = React.isValidElement(icon);

    return (
      <div className={cn(
        "flex h-12 w-full items-center rounded-md border border-input bg-transparent px-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm",
        className
      )}>
        {hasIcon && (
          <div className="pointer-events-none flex items-center pr-3">
            {icon}
          </div>
        )}
        {prefix && (
          <span className="pointer-events-none text-foreground pr-2">{prefix}</span>
        )}
        <input
          type={type}
          className="h-full w-full bg-transparent py-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          ref={ref}
          {...props}
        />
      </div>
    );
  }
)
Input.displayName = "Input"

export { Input }
