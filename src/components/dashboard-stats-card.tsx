
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Button } from './ui/button';
import { Edit } from 'lucide-react';

interface DashboardStatsCardProps {
  title: string;
  value: string;
  description: string;
  Icon: LucideIcon;
  className?: string;
  chartData: any[];
  chartKey: string;
  onEdit?: () => void;
}

export function DashboardStatsCard({
  title,
  value,
  description,
  Icon,
  className,
  chartData,
  chartKey,
  onEdit,
}: DashboardStatsCardProps) {
  return (
    <div className={cn("rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500", className)}>
    <Card className={"transition-all hover:shadow-md overflow-hidden relative group h-full rounded-lg"}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="z-10 relative">
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
      {onEdit && (
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      <div className="absolute bottom-0 left-0 w-full h-2/3 opacity-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`color${chartKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey={chartKey} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fillOpacity={1} 
                fill={`url(#color${chartKey})`}
              />
            </AreaChart>
          </ResponsiveContainer>
      </div>
    </Card>
    </div>
  );
}
