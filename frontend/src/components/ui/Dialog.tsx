"use client";
import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// A lightweight Dialog component mocking shadcn/ui API for prototyping

const DialogContext = createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({ 
  children, 
  open, 
  onOpenChange 
}: { 
  children: React.ReactNode, 
  open?: boolean, 
  onOpenChange?: (open: boolean) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const actualOpen = isControlled ? open : isOpen;
  const actualOnOpenChange = isControlled ? onOpenChange : setIsOpen;

  return (
    <DialogContext.Provider value={{ open: actualOpen, onOpenChange: actualOnOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) {
  const { onOpenChange } = useContext(DialogContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: any) => {
        if ((children.props as any).onClick) (children.props as any).onClick(e);
        onOpenChange(true);
      }
    } as any);
  }
  return <div onClick={() => onOpenChange(true)} className="inline-block">{children}</div>;
}

export function DialogContent({ 
  children, 
  className, 
  isDark 
}: { 
  children: React.ReactNode, 
  className?: string, 
  isDark?: boolean 
}) {
  const { open, onOpenChange } = useContext(DialogContext);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn(
        "relative z-50 w-full max-w-2xl shadow-xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col",
        isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900",
        className
      )}>
        <button 
          onClick={() => onOpenChange(false)}
          className={cn(
            "absolute right-4 top-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100",
            isDark ? "text-slate-400" : "text-slate-500"
          )}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="overflow-y-auto p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
