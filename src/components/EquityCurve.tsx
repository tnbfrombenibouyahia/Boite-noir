import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ReferenceArea } from 'recharts';

export function EquityCurve({ data }: { data: any[] }) {
  const splitIndex = Math.floor(data.length * 0.7);
  const splitTime = data[splitIndex]?.time;
  const firstTime = data[0]?.time;
  const lastTime = data[data.length - 1]?.time;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-medium text-zinc-100 mb-6">Equity Curve (IS/OOS Validation)</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#52525b" 
              fontSize={12} 
              tickFormatter={(val) => val.split(' ')[0]} 
              minTickGap={50} 
            />
            <YAxis 
              stroke="#52525b" 
              fontSize={12} 
              domain={['auto', 'auto']} 
              tickFormatter={(val) => `$${val}`} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
              formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            {splitTime && (
              <>
                <ReferenceLine 
                  x={splitTime} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ position: 'top', value: 'OOS Start', fill: '#ef4444', fontSize: 12 }} 
                />
              </>
            )}

            <Line 
              type="stepAfter" 
              dataKey="maxLossLimit" 
              name="Max Loss Limit (-10%)" 
              stroke="#7f1d1d" 
              strokeWidth={2} 
              dot={false} 
              strokeDasharray="5 5" 
            />
            <Line 
              type="stepAfter" 
              dataKey="dailyLimit" 
              name="Daily Loss Limit" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={false} 
              strokeDasharray="3 3" 
            />
            <Line 
              type="monotone" 
              dataKey="floatingEquity" 
              name="Floating Equity (MAE)" 
              stroke="#f59e0b" 
              strokeWidth={1} 
              dot={false} 
              opacity={0.6} 
            />
            <Line 
              type="stepAfter" 
              dataKey="balance" 
              name="Account Balance" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {splitTime && (
        <div className="flex justify-between items-center mt-6 text-xs font-medium px-4">
          <span className="text-zinc-400">⬅ In-Sample (70%) : Optimisation</span>
          <span className="text-blue-400">Out-of-Sample (30%) : Validation ➡</span>
        </div>
      )}
    </div>
  );
}

