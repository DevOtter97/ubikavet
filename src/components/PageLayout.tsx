import type { ReactNode } from 'react';

export function PageLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`max-w-md md:max-w-2xl lg:max-w-4xl mx-auto min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] ${className}`}>
      {children}
    </div>
  );
}
