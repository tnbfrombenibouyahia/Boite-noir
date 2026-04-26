import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ProcessedData } from '../utils/parser';

export function DayStatistics({ dailyPerformance }: { dailyPerformance: ProcessedData['dailyPerformance'] }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const data = dailyPerformance.map(d => ({
    name: days[d.day],
    profit: d.profit,
    trades: d.trades
  }));

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-medium text-zinc-100 mb-6">Profit by Day of Week</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="name" stroke="#52525b" fontSize={12} />
            <YAxis stroke="#52525b" fontSize={12} tickFormatter={(val) => `$${val}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
              cursor={{ fill: '#27272a', opacity: 0.4 }}
              formatter={(value: number, name: string) => [
                name === 'profit' ? `$${value.toFixed(2)}` : value, 
                name === 'profit' ? 'Profit' : 'Trades'
              ]}
            />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
