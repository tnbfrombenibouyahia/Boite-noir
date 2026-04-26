import React, { useState, useMemo } from 'react';
import { ProcessedData } from '../utils/parser';
import { Settings2, Play, Trophy, Skull, Clock, Target, AlertCircle } from 'lucide-react';
import { cn } from './Dashboard';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RiskAnalysis } from './RiskAnalysis';

interface PropFirmSimulatorProps {
  analysis: ProcessedData;
  originalRisk: number;
  simulatedRisk: number;
  onOriginalRiskChange: (val: number) => void;
  onSimulatedRiskChange: (val: number) => void;
}

interface SimulationConfig {
  numSimulations: number;
  phases: 1 | 2;
  phase1Target: number; // %
  phase2Target: number; // %
  dailyLossLimit: number; // %
  maxLossLimit: number; // %
  initialBalance: number;
  tradesPerDay: number;
}

// Helper function to simulate a single phase using Monte Carlo resampling of trades
const simulatePhase = (originalTrades: any[], startBalance: number, targetPct: number, dailyLossPct: number, maxLossPct: number, riskMultiplier: number, tradesPerDay: number) => {
  let currentEquity = startBalance;
  let dailyEquityStart = startBalance;
  let daysElapsed = 0;
  let failureReason: string | null = null;
  
  const targetBalance = startBalance * (1 + targetPct / 100);
  const maxLossLevel = startBalance * (1 - maxLossPct / 100);
  
  const maxDaysAllowed = 5000; 

  while (currentEquity < targetBalance && !failureReason) {
    daysElapsed++;
    let dailyLoss = 0;

    for (let i = 0; i < tradesPerDay; i++) {
      const randomTrade = originalTrades[Math.floor(Math.random() * originalTrades.length)];
      
      const tradeReturnPct = (randomTrade.Equity_Open > 0 ? randomTrade.Profit_Net / randomTrade.Equity_Open : 0) * riskMultiplier;
      const maeReturnPct = (randomTrade.Equity_Open > 0 ? randomTrade.MAE_$ / randomTrade.Equity_Open : 0) * riskMultiplier;
      
      const simulatedAmount = currentEquity * tradeReturnPct;
      const simulatedMae = currentEquity * maeReturnPct;
      
      const floatingEquity = currentEquity + simulatedMae;
      const dailyLossLevel = dailyEquityStart * (1 - dailyLossPct / 100);
      
      if (floatingEquity <= dailyLossLevel) {
        failureReason = 'daily';
        break;
      }
      
      if (floatingEquity <= maxLossLevel) {
        failureReason = 'max';
        break;
      }
      
      currentEquity += simulatedAmount;
      dailyLoss += simulatedAmount;
      
      if (currentEquity <= dailyLossLevel) {
        failureReason = 'daily';
        break;
      }
      if (currentEquity <= maxLossLevel) {
        failureReason = 'max';
        break;
      }
    }
    
    dailyEquityStart = currentEquity;
    
    if (daysElapsed > maxDaysAllowed) {
      failureReason = 'time';
      break;
    }
  }
  
  return { passed: !failureReason, breachType: failureReason, daysElapsed };
};

export function PropFirmSimulator({ analysis, originalRisk, simulatedRisk, onOriginalRiskChange, onSimulatedRiskChange }: PropFirmSimulatorProps) {
  const [config, setConfig] = useState<SimulationConfig>({
    numSimulations: 1000,
    phases: 2,
    phase1Target: 8,
    phase2Target: 5,
    dailyLossLimit: 5,
    maxLossLimit: 10,
    initialBalance: 100000,
    tradesPerDay: 1
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runSimulation = React.useCallback(() => {
    setIsSimulating(true);
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const trades = analysis.finalTrades;
      if (trades.length === 0) {
        setIsSimulating(false);
        return;
      }

      let phase1Pass = 0;
      let phase2Pass = 0;
      let payoutReached = 0;
      
      let phase1Days = [];
      let phase2Days = [];
      let payoutDays = [];

      let dailyLossBreaches = 0;
      let maxLossBreaches = 0;
      let timeLimitBreaches = 0;

      const riskMultiplier = originalRisk > 0 ? simulatedRisk / originalRisk : 1;

      for (let i = 0; i < config.numSimulations; i++) {
        // Phase 1
        const p1Result = simulatePhase(trades, config.initialBalance, config.phase1Target, config.dailyLossLimit, config.maxLossLimit, riskMultiplier, config.tradesPerDay);
        if (p1Result.passed) {
          phase1Pass++;
          phase1Days.push(p1Result.daysElapsed);
          
          if (config.phases === 2) {
            // Phase 2
            const p2Result = simulatePhase(trades, config.initialBalance, config.phase2Target, config.dailyLossLimit, config.maxLossLimit, riskMultiplier, config.tradesPerDay);
            if (p2Result.passed) {
              phase2Pass++;
              phase2Days.push(p2Result.daysElapsed);
              
              // Funded Phase (Target 2% for first payout as an example)
              const fundedResult = simulatePhase(trades, config.initialBalance, 2, config.dailyLossLimit, config.maxLossLimit, riskMultiplier, config.tradesPerDay);
              if (fundedResult.passed) {
                payoutReached++;
                payoutDays.push(fundedResult.daysElapsed);
              } else {
                if (fundedResult.breachType === 'daily') dailyLossBreaches++;
                if (fundedResult.breachType === 'max') maxLossBreaches++;
                if (fundedResult.breachType === 'time') timeLimitBreaches++;
              }
            } else {
              if (p2Result.breachType === 'daily') dailyLossBreaches++;
              if (p2Result.breachType === 'max') maxLossBreaches++;
              if (p2Result.breachType === 'time') timeLimitBreaches++;
            }
          } else {
            // 1 Phase - go straight to funded
            const fundedResult = simulatePhase(trades, config.initialBalance, 2, config.dailyLossLimit, config.maxLossLimit, riskMultiplier, config.tradesPerDay);
            if (fundedResult.passed) {
              payoutReached++;
              payoutDays.push(fundedResult.daysElapsed);
            } else {
              if (fundedResult.breachType === 'daily') dailyLossBreaches++;
              if (fundedResult.breachType === 'max') maxLossBreaches++;
              if (fundedResult.breachType === 'time') timeLimitBreaches++;
            }
          }
        } else {
          if (p1Result.breachType === 'daily') dailyLossBreaches++;
          if (p1Result.breachType === 'max') maxLossBreaches++;
          if (p1Result.breachType === 'time') timeLimitBreaches++;
        }
      }

      // Calculate Risk of Ruin Curve
      const riskCurve = [];
      for (let r = 0.1; r <= 2.0; r += 0.1) {
        let fails = 0;
        const testRiskMultiplier = originalRisk > 0 ? r / originalRisk : 1;
        for (let i = 0; i < 500; i++) { // 500 sims per point for speed
          const res = simulatePhase(trades, config.initialBalance, config.phase1Target, config.dailyLossLimit, config.maxLossLimit, testRiskMultiplier, config.tradesPerDay);
          if (!res.passed) fails++;
        }
        riskCurve.push({ risk: r, probFailure: (fails / 500) * 100 });
      }

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      setResults({
        phase1Prob: (phase1Pass / config.numSimulations) * 100,
        phase2Prob: config.phases === 2 ? (phase2Pass / phase1Pass) * 100 : null,
        payoutProb: config.phases === 2 ? (payoutReached / phase2Pass) * 100 : (payoutReached / phase1Pass) * 100,
        overallProb: (payoutReached / config.numSimulations) * 100,
        
        avgPhase1Days: avg(phase1Days),
        avgPhase2Days: avg(phase2Days),
        avgPayoutDays: avg(payoutDays),
        
        failDailyLoss: (dailyLossBreaches / config.numSimulations) * 100,
        failMaxLoss: (maxLossBreaches / config.numSimulations) * 100,
        failTimeLimit: (timeLimitBreaches / config.numSimulations) * 100,
        
        riskCurve
      });
      
      setIsSimulating(false);
    }, 100);
  }, [analysis, config, originalRisk, simulatedRisk]);

  // Auto-run simulation when analysis or config changes
  React.useEffect(() => {
    runSimulation();
  }, [runSimulation, originalRisk, simulatedRisk]);

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-zinc-100 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          Monte Carlo Prop Firm Simulator
        </h3>
      </div>

      <div className="mb-6">
        <RiskAnalysis metrics={analysis.metrics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-zinc-400" />
            <h4 className="font-medium text-zinc-200">Challenge Parameters</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Phases</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={config.phases}
                onChange={(e) => setConfig({...config, phases: Number(e.target.value) as 1 | 2})}
              >
                <option value={1}>1 Phase</option>
                <option value={2}>2 Phases</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Simulations</label>
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={config.numSimulations}
                onChange={(e) => setConfig({...config, numSimulations: Number(e.target.value)})}
              >
                <option value={100}>100 runs</option>
                <option value={1000}>1,000 runs</option>
                <option value={5000}>5,000 runs</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Phase 1 Target (%)</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={config.phase1Target}
                onChange={(e) => setConfig({...config, phase1Target: Number(e.target.value)})}
              />
            </div>
            {config.phases === 2 && (
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500">Phase 2 Target (%)</label>
                <input 
                  type="number" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                  value={config.phase2Target}
                  onChange={(e) => setConfig({...config, phase2Target: Number(e.target.value)})}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Daily Loss Limit (%)</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={config.dailyLossLimit}
                onChange={(e) => setConfig({...config, dailyLossLimit: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Max Loss Limit (%)</label>
              <input 
                type="number" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={config.maxLossLimit}
                onChange={(e) => setConfig({...config, maxLossLimit: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Original Risk (%)</label>
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={originalRisk}
                onChange={(e) => onOriginalRiskChange(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Simulated Risk (%)</label>
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
                value={simulatedRisk}
                onChange={(e) => onSimulatedRiskChange(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Trades per Day</label>
            <input 
              type="number" 
              min="1"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500/50"
              value={config.tradesPerDay}
              onChange={(e) => setConfig({...config, tradesPerDay: Number(e.target.value)})}
            />
          </div>

          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSimulating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            {isSimulating ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          {!results ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800/50 rounded-xl p-8">
              <Target className="w-12 h-12 mb-3 opacity-20" />
              <p>Configure parameters and run simulation to see probabilities.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              
              {/* Main Probability */}
              <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-6 flex items-center justify-between">
                <div>
                  <h4 className="text-zinc-400 font-medium mb-1">Overall Probability of First Payout</h4>
                  <p className="text-sm text-zinc-500">Based on {config.numSimulations.toLocaleString()} random permutations of your trades.</p>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-4xl font-bold tracking-tight",
                    results.overallProb > 50 ? "text-emerald-400" : results.overallProb > 20 ? "text-amber-400" : "text-red-400"
                  )}>
                    {results.overallProb.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Funnel */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 h-1 bg-blue-500/30 w-full">
                    <div className="h-full bg-blue-500" style={{ width: `${results.phase1Prob}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500 mb-1">Pass Phase 1</p>
                  <p className="text-xl font-semibold text-zinc-200">{results.phase1Prob.toFixed(1)}%</p>
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Avg {Math.round(results.avgPhase1Days)} days
                  </p>
                </div>

                {config.phases === 2 && (
                  <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 h-1 bg-blue-500/30 w-full">
                      <div className="h-full bg-blue-500" style={{ width: `${results.phase2Prob}%` }} />
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">Pass Phase 2</p>
                    <p className="text-xl font-semibold text-zinc-200">{results.phase2Prob.toFixed(1)}%</p>
                    <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Avg {Math.round(results.avgPhase2Days)} days
                    </p>
                  </div>
                )}

                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 h-1 bg-emerald-500/30 w-full">
                    <div className="h-full bg-emerald-500" style={{ width: `${results.payoutProb}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500 mb-1">Reach 1st Payout</p>
                  <p className="text-xl font-semibold text-emerald-400">{results.payoutProb.toFixed(1)}%</p>
                  <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Avg {Math.round(results.avgPayoutDays)} days
                  </p>
                </div>
              </div>

              {/* Failure Reasons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                  <h4 className="text-zinc-400 font-medium mb-4 text-sm">Failure Reasons</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Daily Loss', value: results.failDailyLoss },
                            { name: 'Max Drawdown', value: results.failMaxLoss },
                            { name: 'Time Limit', value: results.failTimeLimit }
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#ef4444" />
                          <Cell fill="#f97316" />
                          <Cell fill="#eab308" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Probability']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs text-zinc-400">Daily Loss</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-xs text-zinc-400">Max DD</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-xs text-zinc-400">Time Limit</span></div>
                  </div>
                </div>

                <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4">
                  <h4 className="text-zinc-400 font-medium mb-4 text-sm">Risk of Ruin Curve</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results.riskCurve}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="risk" 
                          stroke="#52525b" 
                          fontSize={12} 
                          tickFormatter={(val) => `${val}%`} 
                        />
                        <YAxis 
                          stroke="#52525b" 
                          fontSize={12} 
                          tickFormatter={(val) => `${val}%`} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Failure Prob']}
                          labelFormatter={(label) => `Risk: ${label}%`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="probFailure" 
                          stroke="#ef4444" 
                          strokeWidth={2} 
                          dot={false} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {analysis.metrics.maxConsecutiveLosses > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-amber-500 font-medium text-sm mb-1">Max Consecutive Losses Warning</h4>
                    <p className="text-sm text-amber-500/80 leading-relaxed">
                      Your historical data shows a maximum of <strong>{analysis.metrics.maxConsecutiveLosses} consecutive losses</strong>. 
                      If this exact sequence occurs while risking <strong>{simulatedRisk}%</strong> per trade, you would experience a <strong>{(analysis.metrics.maxConsecutiveLosses * simulatedRisk).toFixed(1)}% drawdown</strong>.
                      {analysis.metrics.maxConsecutiveLosses * simulatedRisk >= config.maxLossLimit && (
                        <span className="block mt-1 text-red-400 font-medium">
                          This guarantees a 100% failure rate on the Max Drawdown rule if this sequence repeats. Consider lowering your risk.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
