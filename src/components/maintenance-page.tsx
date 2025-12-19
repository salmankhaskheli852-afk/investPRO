
'use client';

import { Wrench } from 'lucide-react';
import React from 'react';

interface MaintenancePageProps {
  message: string;
}

export function MaintenancePage({ message }: MaintenancePageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
        <div className="bg-card p-8 sm:p-12 rounded-lg shadow-2xl flex flex-col items-center gap-6">
          <Wrench className="w-16 h-16 text-primary animate-pulse" />
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold font-headline text-foreground">Under Maintenance</h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
