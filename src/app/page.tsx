
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to investPro!</h1>
      <p className="mt-4 text-lg text-gray-600">
        Get started by exploring the application.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/user">Go to User Panel</Link>
        </Button>
         <Button asChild variant="secondary">
          <Link href="/admin">Go to Admin Panel</Link>
        </Button>
      </div>
    </main>
  );
}
