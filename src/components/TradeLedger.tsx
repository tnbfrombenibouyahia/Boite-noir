import React from 'react';
import { ProcessedData } from '../utils/parser';
import { cn } from './Dashboard';

export function TradeLedger({ trades }: { trades: ProcessedData['finalTrades'] }) {
  // Sort by OpenTime descending
  const sortedTrades = [...trades].sort((a, b) => new Date(b.OpenTime).getTime() - new Date(a.OpenTime).getTime());

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 overflow-hidden flex flex-col h-[600px]">
      <h3 className="text-lg font-medium text-zinc-100 mb-6 shrink-0">Trade Ledger</h3>
      <div className="overflow-auto flex-1 -mx-6 px-6">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <th className="px-4 py-3 font-medium">Open Time</th>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium text-right">Lots</th>
              <th className="px-4 py-3 font-medium text-right">Net Profit</th>
              <th className="px-4 py-3 font-medium text-right">Duration (m)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sortedTrades.map((trade) => (
              <tr key={trade.Ticket} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-4 py-3 font-mono text-zinc-400">{trade.Ticket}</td>
                <td className="px-4 py-3 text-zinc-300">{trade.OpenTime}</td>
                <td className="px-4 py-3 text-zinc-300">{trade.Symbol}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-zinc-800 text-zinc-300">
                    {trade.Action}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-zinc-300">{trade.Lots}</td>
                <td className={cn("px-4 py-3 text-right font-mono", trade.Profit_Net >= 0 ? "text-emerald-400" : "text-red-400")}>
                  ${trade.Profit_Net.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-zinc-400">{trade.Dur_Min}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
