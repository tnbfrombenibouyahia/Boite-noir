import React from 'react';
import { Target, TrendingUp, Activity } from 'lucide-react';
import { ProcessedData } from '../utils/parser';
import { cn } from './Dashboard';

export function KeyMetrics({ metrics }: { metrics: ProcessedData['metrics'] }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="MAE Efficiency Ratio" 
          value={metrics.avgMaeEfficiency.toFixed(2)} 
          subtitle="Profit_Net / MAE_$"
          description={metrics.avgMaeEfficiency > 1 ? "Excellent sniper entries. Low adverse excursion." : "Entries are premature. High heat taken before profit."}
          icon={<Target className="w-4 h-4 text-emerald-500" />}
        />
        <MetricCard 
          title="Recovery Factor" 
          value={metrics.recoveryFactor.toFixed(2)} 
          subtitle="Total Net Profit / Max Drawdown"
          description={metrics.recoveryFactor > 3 ? "Robust recovery. Strategy bounces back quickly." : "Poor recovery. Drawdowns take too long to erase."}
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
        />
        <MetricCard 
          title="Statistical Edge" 
          value={`$${metrics.statisticalEdge.toFixed(2)}`} 
          subtitle="Avg Profit per Ticket"
          description={metrics.statisticalEdge > 5 ? "Strong edge. Overcomes friction easily." : "Weak edge. Vulnerable to commissions and slippage."}
          icon={<Activity className="w-4 h-4 text-purple-500" />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Total Net Profit</p>
          <p className={cn("text-2xl font-mono mt-1", metrics.totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
            ${metrics.totalNetProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Max Drawdown</p>
          <p className="text-2xl font-mono mt-1 text-red-400">
            ${metrics.maxDrawdown.toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Win Rate (Gross)</p>
          <p className="text-2xl font-mono mt-1 text-zinc-100">
            {metrics.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Strike Rate (Real)</p>
          <p className="text-2xl font-mono mt-1 text-emerald-400">
            {metrics.strikeRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Loss Rate</p>
          <p className="text-2xl font-mono mt-1 text-red-400">
            {metrics.grossLossRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Profit Factor</p>
          <p className="text-2xl font-mono mt-1 text-zinc-100">
            {metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Max Cons. Losses</p>
          <p className="text-2xl font-mono mt-1 text-red-400">
            {metrics.maxConsecutiveLosses}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Total Trades</p>
          <p className="text-2xl font-mono mt-1 text-zinc-100">
            {metrics.totalTrades}
          </p>
        </div>
      </div>
    </>
  );
}

function MetricCard({ title, value, subtitle, description, icon }: { title: string, value: string, subtitle: string, description: string, icon: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-400 font-medium text-sm">{title}</h3>
        <div className="p-2 bg-zinc-800/50 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="mb-1">
        <span className="text-3xl font-semibold text-zinc-100 tracking-tight">{value}</span>
      </div>
      <p className="text-xs text-zinc-500 font-mono mb-4">{subtitle}</p>
      <div className="mt-auto pt-4 border-t border-zinc-800/50">
        <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
