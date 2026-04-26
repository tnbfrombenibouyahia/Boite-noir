import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedData } from '../utils/parser';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from './Dashboard';
import { Activity, TrendingUp, Target, AlertCircle, Scale } from 'lucide-react';

interface PortfolioViewProps {
  files: { id: string; name: string; analysis: ProcessedData }[];
}

export function PortfolioView({ files }: PortfolioViewProps) {
  const [weights, setWeights] = useState<Record<string, number>>({});

  const [optimizeKpi, setOptimizeKpi] = useState<string>('totalNetProfit');
  const [minWeight, setMinWeight] = useState<number>(0);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Initialize weights evenly when files change
  useEffect(() => {
    setWeights(prev => {
      const newWeights = { ...prev };
      const evenWeight = files.length > 0 ? 100 / files.length : 0;
      let needsUpdate = false;
      
      files.forEach(f => {
        if (newWeights[f.id] === undefined) {
          newWeights[f.id] = evenWeight;
          needsUpdate = true;
        }
      });

      // Clean up removed files
      Object.keys(newWeights).forEach(id => {
        if (!files.find(f => f.id === id)) {
          delete newWeights[id];
          needsUpdate = true;
        }
      });

      return needsUpdate ? newWeights : prev;
    });
  }, [files]);

  const handleWeightChange = (id: string, value: number) => {
    const newValue = Math.min(100, Math.max(0, value));
    
    setWeights(prev => {
      const newWeights = { ...prev, [id]: newValue };
      const otherIds = Object.keys(prev).filter(k => k !== id);
      
      if (otherIds.length === 0) return newWeights;

      if (newValue === 100) {
        otherIds.forEach(k => newWeights[k] = 0);
        return newWeights;
      }

      const totalOthers = otherIds.reduce((sum, k) => sum + (prev[k] || 0), 0);
      const remainingWeight = 100 - newValue;

      otherIds.forEach(k => {
        if (totalOthers === 0) {
          newWeights[k] = remainingWeight / otherIds.length;
        } else {
          const proportion = (prev[k] || 0) / totalOthers;
          newWeights[k] = remainingWeight * proportion;
        }
      });

      return newWeights;
    });
  };

  const autoBalance = () => {
    const even = 100 / files.length;
    const newWeights: Record<string, number> = {};
    files.forEach(f => newWeights[f.id] = even);
    setWeights(newWeights);
  };

  const totalWeight = (Object.values(weights) as number[]).reduce((sum, w) => sum + w, 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1; // Allow small float precision issues

  const calculateMetrics = (currentWeights: Record<string, number>) => {
    let totalNetProfit = 0;
    let totalTrades = 0;
    let totalWinningTrades = 0;
    let totalLosingTrades = 0;
    let totalGrossProfit = 0;
    let totalGrossLoss = 0;
    let weightedSharpeRatio = 0;
    let weightedRecoveryFactor = 0;

    const allTrades: { time: string; profit: number; strategy: string }[] = [];

    files.forEach(f => {
      const weight = (currentWeights[f.id] || 0) / 100;
      
      const weightedNetProfit = f.analysis.metrics.totalNetProfit * weight;
      totalNetProfit += weightedNetProfit;
      totalTrades += f.analysis.metrics.totalTrades;
      
      weightedSharpeRatio += (f.analysis.metrics.sharpeRatio || 0) * weight;
      weightedRecoveryFactor += (f.analysis.metrics.recoveryFactor || 0) * weight;
      
      const winning = f.analysis.finalTrades.filter(t => t.Profit_Net > 0.01);
      const losing = f.analysis.finalTrades.filter(t => t.Profit_Net < -0.01);
      
      totalWinningTrades += winning.length;
      totalLosingTrades += losing.length;
      totalGrossProfit += winning.reduce((sum, t) => sum + t.Profit_Net, 0) * weight;
      totalGrossLoss += Math.abs(losing.reduce((sum, t) => sum + t.Profit_Net, 0)) * weight;

      f.analysis.finalTrades.forEach(t => {
        allTrades.push({
          time: t.EventTime,
          profit: t.Profit_Net * weight,
          strategy: f.name
        });
      });
    });

    // Sort all trades chronologically
    allTrades.sort((a, b) => a.time.localeCompare(b.time));

    // Build equity curve
    let currentBalance = 100000; // Arbitrary starting balance for portfolio visualization
    const combinedEquityCurve = allTrades.map(t => {
      currentBalance += t.profit;
      return {
        time: t.time,
        balance: currentBalance,
      };
    });

    const winRate = totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0;
    const strikeRate = (totalWinningTrades + totalLosingTrades) > 0 ? (totalWinningTrades / (totalWinningTrades + totalLosingTrades)) * 100 : 0;
    const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? Infinity : 0;
    const statisticalEdge = totalTrades > 0 ? totalNetProfit / totalTrades : 0;

    const avgWin = totalWinningTrades > 0 ? totalGrossProfit / totalWinningTrades : 0;
    const avgLoss = totalLosingTrades > 0 ? totalGrossLoss / totalLosingTrades : 0;

    const grossLossRate = totalTrades > 0 ? (totalLosingTrades / totalTrades) * 100 : 0;

    let maxConsecutiveLosses = 0;
    let currentStreak = 0;
    allTrades.forEach(t => {
      if (t.profit < 0) {
        currentStreak++;
        if (currentStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    return {
      aggregatedMetrics: {
        totalNetProfit,
        totalTrades,
        winRate,
        strikeRate,
        profitFactor,
        statisticalEdge,
        weightedSharpeRatio,
        weightedRecoveryFactor,
        grossLossRate,
        maxConsecutiveLosses
      },
      combinedEquityCurve
    };
  };

  const runOptimizer = () => {
    if (files.length === 0) return;
    setIsOptimizing(true);

    // Simple Monte Carlo Optimizer
    setTimeout(() => {
      let bestWeights = { ...weights };
      let bestScore = -Infinity;
      const iterations = 5000;

      for (let i = 0; i < iterations; i++) {
        const testWeights: Record<string, number> = {};
        let remaining = 100 - (minWeight * files.length);
        
        if (remaining < 0) {
          // Impossible constraint, just use minWeight for all (will exceed 100 but what can we do)
          files.forEach(f => testWeights[f.id] = minWeight);
        } else {
          // Generate random distribution for the remaining weight
          const randoms = files.map(() => Math.random());
          const sumRandoms = randoms.reduce((a, b) => a + b, 0);
          
          files.forEach((f, idx) => {
            const extraWeight = (randoms[idx] / sumRandoms) * remaining;
            testWeights[f.id] = minWeight + extraWeight;
          });
        }

        const metrics = calculateMetrics(testWeights).aggregatedMetrics;
        let score = 0;

        switch (optimizeKpi) {
          case 'totalNetProfit': score = metrics.totalNetProfit; break;
          case 'winRate': score = metrics.winRate; break;
          case 'strikeRate': score = metrics.strikeRate; break;
          case 'profitFactor': score = metrics.profitFactor === Infinity ? 999999 : metrics.profitFactor; break;
          case 'weightedSharpeRatio': score = metrics.weightedSharpeRatio; break;
          case 'weightedRecoveryFactor': score = metrics.weightedRecoveryFactor; break;
        }

        if (score > bestScore) {
          bestScore = score;
          bestWeights = testWeights;
        }
      }

      // Round weights to 1 decimal place and adjust the last one to ensure exactly 100%
      const roundedWeights: Record<string, number> = {};
      let currentSum = 0;
      files.forEach((f, idx) => {
        if (idx === files.length - 1) {
          roundedWeights[f.id] = Number((100 - currentSum).toFixed(1));
        } else {
          const w = Number(bestWeights[f.id].toFixed(1));
          roundedWeights[f.id] = w;
          currentSum += w;
        }
      });

      setWeights(roundedWeights);
      setIsOptimizing(false);
    }, 100); // Small delay to allow UI to show loading state
  };

  const { aggregatedMetrics, combinedEquityCurve } = useMemo(() => calculateMetrics(weights), [files, weights]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Portfolio Overview</h2>
          <p className="text-zinc-400 text-sm">Aggregated performance across {files.length} strategies.</p>
        </div>
        {!isWeightValid && (
          <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Total weight must be 100% (Current: {totalWeight.toFixed(1)}%)</span>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-zinc-100">Strategy Allocation</h3>
          <button 
            onClick={autoBalance}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
          >
            <Scale className="w-4 h-4" />
            Auto-Balance
          </button>
        </div>
        <div className="space-y-4">
          {files.map(f => (
            <div key={f.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="font-medium text-zinc-200 truncate">{f.name}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-4 w-full sm:w-64">
                  <input 
                    type="range" 
                    min="0" 
                    max="100"
                    step="1"
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    value={weights[f.id] !== undefined ? Number(weights[f.id].toFixed(0)) : 0}
                    onChange={(e) => handleWeightChange(f.id, Number(e.target.value))}
                  />
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-200 outline-none focus:border-blue-500/50 text-right"
                      value={weights[f.id] !== undefined ? Number(weights[f.id].toFixed(0)) : 0}
                      onChange={(e) => handleWeightChange(f.id, Number(e.target.value))}
                    />
                    <span className="text-zinc-500 text-sm">%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-zinc-500">Trades</p>
                    <p className="text-sm text-zinc-300 font-mono">{f.analysis.metrics.totalTrades}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-zinc-500">Strike Rate</p>
                    <p className="text-sm text-zinc-300 font-mono">{f.analysis.metrics.strikeRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-right w-24">
                    <p className="text-xs text-zinc-500">Raw Profit</p>
                    <p className={cn("text-sm font-mono font-medium", f.analysis.metrics.totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                      ${f.analysis.metrics.totalNetProfit.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium text-sm">Weighted Net Profit</h3>
            <div className="p-2 bg-zinc-800/50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="mb-1">
            <span className={cn("text-3xl font-semibold tracking-tight", aggregatedMetrics.totalNetProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
              ${aggregatedMetrics.totalNetProfit.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium text-sm">Combined Win Rate</h3>
            <div className="p-2 bg-zinc-800/50 rounded-lg">
              <Target className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="mb-1">
            <span className="text-3xl font-semibold text-zinc-100 tracking-tight">
              {aggregatedMetrics.winRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium text-sm">Combined Strike Rate</h3>
            <div className="p-2 bg-zinc-800/50 rounded-lg">
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <div className="mb-1">
            <span className="text-3xl font-semibold text-emerald-400 tracking-tight">
              {aggregatedMetrics.strikeRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-zinc-400 font-medium text-sm">Total Trades</h3>
            <div className="p-2 bg-zinc-800/50 rounded-lg">
              <Activity className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="mb-1">
            <span className="text-3xl font-semibold text-zinc-100 tracking-tight">
              {aggregatedMetrics.totalTrades}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Weighted Profit Factor</p>
          <p className="text-2xl font-mono mt-1 text-zinc-100">
            {aggregatedMetrics.profitFactor === Infinity ? '∞' : aggregatedMetrics.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Weighted Sharpe Ratio</p>
          <p className="text-2xl font-mono mt-1 text-zinc-100">
            {aggregatedMetrics.weightedSharpeRatio.toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Weighted Recovery Factor</p>
          <p className="text-2xl font-mono mt-1 text-zinc-100">
            {aggregatedMetrics.weightedRecoveryFactor.toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Loss Rate</p>
          <p className="text-2xl font-mono mt-1 text-red-400">
            {aggregatedMetrics.grossLossRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-sm text-zinc-500 font-medium">Max Cons. Losses</p>
          <p className="text-2xl font-mono mt-1 text-red-400">
            {aggregatedMetrics.maxConsecutiveLosses}
          </p>
        </div>
      </div>

      {/* Portfolio Equity Curve */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-medium text-zinc-100 mb-6">Combined Portfolio Equity Curve</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedEquityCurve} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Portfolio Balance']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line 
                type="stepAfter" 
                dataKey="balance" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Portfolio Optimizer */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-zinc-100">Portfolio Optimizer</h3>
            <p className="text-sm text-zinc-400 mt-1">Find the best strategy allocation based on your target KPI.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Target KPI to Maximize</label>
            <select 
              value={optimizeKpi}
              onChange={(e) => setOptimizeKpi(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:border-blue-500/50 outline-none"
            >
              <option value="totalNetProfit">Weighted Net Profit</option>
              <option value="winRate">Combined Win Rate</option>
              <option value="strikeRate">Combined Strike Rate</option>
              <option value="profitFactor">Weighted Profit Factor</option>
              <option value="weightedSharpeRatio">Weighted Sharpe Ratio</option>
              <option value="weightedRecoveryFactor">Weighted Recovery Factor</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Minimum Weight per Asset (%)</label>
            <div className="relative">
              <input 
                type="number" 
                min="0" 
                max={100 / (files.length || 1)}
                value={minWeight}
                onChange={(e) => setMinWeight(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:border-blue-500/50 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
            </div>
          </div>

          <button 
            onClick={runOptimizer}
            disabled={isOptimizing || (minWeight * files.length > 100)}
            className={cn(
              "w-full py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
              isOptimizing || (minWeight * files.length > 100)
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            )}
          >
            {isOptimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                Optimizing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Run Optimizer
              </>
            )}
          </button>
        </div>
        
        {minWeight * files.length > 100 && (
          <p className="text-red-400 text-sm mt-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Invalid constraint: Minimum weight ({minWeight}%) × {files.length} assets = {minWeight * files.length}% (exceeds 100%).
          </p>
        )}
      </div>
    </div>
  );
}

