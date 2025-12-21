
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VipAgentPage() {
  const vipLevels = [
    { name: 'VIP0', teamSize: '0' },
    { name: 'VIP1', teamSize: '1-9' },
    { name: 'VIP2', teamSize: '10-29' },
    { name: 'VIP3', teamSize: '30-99' },
    { name: 'VIP4', teamSize: '100-299' },
    { name: 'VIP5', teamSize: '300-599' },
    { name: 'VIP6', teamSize: '600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/user">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold font-headline">VIP Agent</h1>
      </div>

      <Card className="bg-transparent border-none shadow-none">
        <CardContent className="p-0 text-foreground space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2 text-green-600">VIP Level:</h2>
            <ul className="space-y-1">
              {vipLevels.map((level) => (
                <li key={level.name} className="text-lg font-medium text-green-600">
                  {level.name} Team Size ({level.teamSize})
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 text-lg font-medium text-green-600">
            <p>
              <span className="font-bold">VIP2:</span> If the team has more than 10 people, apply for the position of regional manager, pass the test, issue the regional manager certificate, form a team, and receive a monthly salary of 100,000 Rs permanently.
            </p>
            <p>
              <span className="font-bold">VIP6:</span> If the team has more than 600 people, apply for the position of city manager, pass the test, issue the city manager certificate, and receive a monthly salary of 400,000 Rs.
            </p>
          </div>

          <p className="text-lg font-medium text-green-600">
            Enjoy the order share dividends of the Pakistan region, Kazakhstan region, and Canadian headquarters projects
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
