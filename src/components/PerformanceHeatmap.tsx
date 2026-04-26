import React, { useState } from 'react';
import { ProcessedData } from '../utils/parser';
import { cn } from './Dashboard';

interface PerformanceHeatmapProps {
  monthlyHeatmap: ProcessedData['monthlyHeatmap'];
  weeklyHeatmap: ProcessedData['weeklyHeatmap'];
}

export function PerformanceHeatmap({ monthlyHeatmap, weeklyHeatmap }: PerformanceHeatmapProps) {
  const [view, setView] = useState<'monthly' | 'weekly'>('monthly');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Monthly Data Processing
  const monthlyYears = Array.from(new Set(monthlyHeatmap.map(d => d.year))).sort((a, b) => b - a);
  const maxMonthlyProfit = Math.max(...monthlyHeatmap.map(d => Math.abs(d.profit)), 1);

  // Weekly Data Processing
  const weeklyYears = Array.from(new Set(weeklyHeatmap.map(d => d.year))).sort((a, b) => b - a);
  const maxWeeklyProfit = Math.max(...weeklyHeatmap.map(d => Math.abs(d.profit)), 1);

  const getColor = (profit: number, maxProfit: number) => {
    if (profit === 0) return 'bg-zinc-800/50';
    
    if (profit > 0) {
      return `bg-emerald-500`;
    } else {
      return `bg-red-500`;
    }
  };

  const getOpacity = (profit: number, maxProfit: number) => {
      if (profit === 0) return 1;
      return 0.2 + (Math.min(Math.abs(profit) / maxProfit, 1) * 0.8);
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-zinc-100">Performance Heatmap</h3>
        <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setView('monthly')}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              view === 'monthly' ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setView('weekly')}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              view === 'weekly' ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            Weekly
          </button>
        </div>
      </div>

      <div className="min-w-max">
        {view === 'monthly' && (
          <div className="space-y-4">
            <div className="flex mb-2">
              <div className="w-16"></div>
              {months.map(m => (
                <div key={m} className="flex-1 text-center text-xs text-zinc-500">{m}</div>
              ))}
            </div>
            {monthlyYears.map(year => (
              <div key={year} className="flex items-center mb-1">
                <div className="w-16 text-xs text-zinc-400 font-medium">{year}</div>
                {Array.from({ length: 12 }, (_, m) => {
                  const dataPoint = monthlyHeatmap.find(d => d.year === year && d.month === m);
                  const profit = dataPoint?.profit || 0;
                  return (
                    <div 
                      key={m} 
                      className="flex-1 aspect-square max-h-12 m-0.5 rounded-sm relative group"
                    >
                      <div 
                          className={`absolute inset-0 rounded-sm ${getColor(profit, maxMonthlyProfit)}`}
                          style={{ opacity: getOpacity(profit, maxMonthlyProfit) }}
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                        ${profit.toFixed(2)} ({dataPoint?.trades || 0} trades)
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {view === 'weekly' && (
          <div className="space-y-8">
            {weeklyYears.map(year => {
              // Find max week for this year to size the grid
              const yearData = weeklyHeatmap.filter(d => d.year === year);
              const maxWeek = Math.max(...yearData.map(d => d.week), 52);
              const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

              return (
                <div key={year}>
                  <h4 className="text-sm font-medium text-zinc-400 mb-2">{year}</h4>
                  <div className="flex">
                    <div className="flex flex-col justify-between pr-2 py-1">
                      {days.map((day, i) => (
                        <div key={day} className="text-[10px] text-zinc-500 h-3 leading-3">
                          {i % 2 === 0 ? day : ''}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-1 gap-[2px]">
                      {weeks.map(w => (
                        <div key={w} className="flex flex-col gap-[2px] flex-1">
                          {Array.from({ length: 7 }, (_, d) => {
                            const dataPoint = yearData.find(dt => dt.week === w && d === dt.day);
                            const profit = dataPoint?.profit || 0;
                            return (
                              <div 
                                key={d} 
                                className="w-full aspect-square rounded-[2px] relative group"
                              >
                                <div 
                                    className={`absolute inset-0 rounded-[2px] ${getColor(profit, maxWeeklyProfit)}`}
                                    style={{ opacity: getOpacity(profit, maxWeeklyProfit) }}
                                />
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                                  Week {w}, {days[d]}: ${profit.toFixed(2)} ({dataPoint?.trades || 0} trades)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

