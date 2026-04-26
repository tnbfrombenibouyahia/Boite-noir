import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { ProcessedData } from '../utils/parser';

export function MaeMfeAnalysis({ trades }: { trades: ProcessedData['finalTrades'] }) {
  const data = trades.map(t => ({
    ticket: t.Ticket,
    mae: Math.abs(t.MAE_$),
    mfe: t.MFE_$,
    profit: t.Profit_Net,
    isWin: t.Profit_Net >= 0
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* MAE Chart */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-zinc-100 mb-6">MAE vs Net Profit</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" dataKey="mae" name="MAE" stroke="#52525b" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <YAxis type="number" dataKey="profit" name="Profit" stroke="#52525b" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === 'mae' ? 'MAE' : 'Profit']}
                labelFormatter={() => ''}
              />
              <ReferenceLine y={0} stroke="#52525b" />
              <Scatter data={data} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isWin ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          Shows how much heat (drawdown) a trade took before closing. Ideally, winning trades (green) should cluster near the left (low MAE).
        </p>
      </div>

      {/* MFE Chart */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-zinc-100 mb-6">MFE vs Net Profit</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis type="number" dataKey="mfe" name="MFE" stroke="#52525b" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <YAxis type="number" dataKey="profit" name="Profit" stroke="#52525b" fontSize={12} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === 'mfe' ? 'MFE' : 'Profit']}
                labelFormatter={() => ''}
              />
              <ReferenceLine y={0} stroke="#52525b" />
              <Scatter data={data} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isWin ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          Shows the maximum profit available vs actual realized profit. If MFE is high but profit is low/negative, you are leaving money on the table.
        </p>
      </div>
    </div>
  );
}
