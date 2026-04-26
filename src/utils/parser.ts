import Papa from 'papaparse';
import { parse, getDay, getHours, getYear, getMonth, getWeek } from 'date-fns';

export interface TradeEvent {
  Seq: number;
  Ticket: number;
  Symbol: string;
  Action: string;
  Lots: number;
  OpenTime: string;
  EventTime: string;
  Dur_Min: number;
  Price: number;
  SL_Init: number;
  Profit_Net: number;
  Equity_Open: number;
  MFE_$: number;
  MAE_$: number;
  Daily_Peak_$: number;
  Daily_Limit: number;
  Violation: boolean;
}

export function parseCSV(csvString: string): TradeEvent[] {
  const result = Papa.parse(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  return result.data as TradeEvent[];
}

export function processTrades(events: TradeEvent[]) {
  const tradesMap = new Map<number, TradeEvent>();
  
  let violationEvent: TradeEvent | null = null;

  events.forEach(event => {
    if (event.Violation === true && !violationEvent) {
      violationEvent = event;
    }
    
    // The last event for a ticket will overwrite, giving us the final state of the trade
    tradesMap.set(event.Ticket, event); 
  });

  const finalTrades = Array.from(tradesMap.values());
  const sortedFinalTrades = [...finalTrades].sort((a, b) => a.EventTime.localeCompare(b.EventTime));

  const initialBalance = events.length > 0 ? events[0].Equity_Open : 10000;
  const maxLossLimit = initialBalance * 0.9; // Standard 10% max loss

  const equityCurve = sortedFinalTrades.map(t => ({
      time: t.EventTime,
      balance: t.Equity_Open + t.Profit_Net,
      floatingEquity: t.Equity_Open + t.MAE_$,
      dailyLimit: t.Daily_Limit,
      maxLossLimit: maxLossLimit
  }));

  let peakEquity = 0;
  let maxDrawdown = 0;

  equityCurve.forEach(point => {
      if (point.balance > peakEquity) {
          peakEquity = point.balance;
      }
      const drawdown = peakEquity - point.balance;
      if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
      }
  });

  const totalNetProfit = finalTrades.reduce((sum, t) => sum + t.Profit_Net, 0);
  const totalTrades = finalTrades.length;
  
  const winningTrades = finalTrades.filter(t => t.Profit_Net > 0.01);
  const losingTrades = finalTrades.filter(t => t.Profit_Net < -0.01);
  
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.Profit_Net, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.Profit_Net, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const nominalWinRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const realStrikeRate = (winningTrades.length + losingTrades.length) > 0 ? (winningTrades.length / (winningTrades.length + losingTrades.length)) * 100 : 0;

  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

  // 3. Loss Rate
  const grossLossRate = totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0;

  // 4. Max Consecutive Losses
  let maxConsecutiveLosses = 0;
  let currentStreak = 0;
  finalTrades.forEach(t => {
      if (t.Profit_Net < 0) {
          currentStreak++;
          if (currentStreak > maxConsecutiveLosses) maxConsecutiveLosses = currentStreak;
      } else {
          currentStreak = 0;
      }
  });

  const maeEfficiencyRatios = winningTrades.map(t => t.MAE_$ !== 0 ? t.Profit_Net / Math.abs(t.MAE_$) : t.Profit_Net);
  const avgMaeEfficiency = maeEfficiencyRatios.length > 0 
    ? maeEfficiencyRatios.reduce((a, b) => a + b, 0) / maeEfficiencyRatios.length 
    : 0;

  const recoveryFactor = maxDrawdown > 0 ? totalNetProfit / maxDrawdown : 0;
  const statisticalEdge = totalTrades > 0 ? totalNetProfit / totalTrades : 0;

  // Daily Returns for Sharpe Ratio
  const dailyReturnsMap = new Map<string, number>();
  finalTrades.forEach(t => {
    const dateStr = t.EventTime.split(' ')[0]; // Assuming YYYY.MM.DD
    const current = dailyReturnsMap.get(dateStr) || 0;
    dailyReturnsMap.set(dateStr, current + t.Profit_Net);
  });
  
  const dailyReturns = Array.from(dailyReturnsMap.values());
  const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  
  const variance = dailyReturns.length > 1 
    ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) / (dailyReturns.length - 1)
    : 0;
  
  const stdDev = Math.sqrt(variance);
  
  // Assuming 252 trading days in a year. 
  // We use a simplified Sharpe Ratio (Risk Free Rate = 0)
  const sharpeRatio = stdDev > 0 ? (avgDailyReturn / stdDev) * Math.sqrt(252) : 0;

  const hourlyPerformance = new Array(24).fill(0).map((_, i) => ({ hour: i, profit: 0, trades: 0 }));
  const dailyPerformance = new Array(7).fill(0).map((_, i) => ({ day: i, profit: 0, trades: 0 }));
  
  const monthlyHeatmapMap = new Map<string, { year: number, month: number, profit: number, trades: number }>();
  const weeklyHeatmapMap = new Map<string, { year: number, week: number, day: number, profit: number, trades: number }>();

  finalTrades.forEach(t => {
      // Parse date "YYYY.MM.DD HH:mm"
      try {
        const date = parse(t.OpenTime, 'yyyy.MM.dd HH:mm', new Date());
        const year = getYear(date);
        const month = getMonth(date); // 0-11
        const week = getWeek(date); // 1-53
        const day = getDay(date); // 0-6
        const hour = getHours(date);

        if (!isNaN(hour) && !isNaN(day)) {
            hourlyPerformance[hour].profit += t.Profit_Net;
            hourlyPerformance[hour].trades += 1;

            dailyPerformance[day].profit += t.Profit_Net;
            dailyPerformance[day].trades += 1;

            // Monthly
            const mKey = `${year}-${month}`;
            if (!monthlyHeatmapMap.has(mKey)) {
                monthlyHeatmapMap.set(mKey, { year, month, profit: 0, trades: 0 });
            }
            const mData = monthlyHeatmapMap.get(mKey)!;
            mData.profit += t.Profit_Net;
            mData.trades += 1;

            // Weekly
            const wKey = `${year}-${week}-${day}`;
            if (!weeklyHeatmapMap.has(wKey)) {
                weeklyHeatmapMap.set(wKey, { year, week, day, profit: 0, trades: 0 });
            }
            const wData = weeklyHeatmapMap.get(wKey)!;
            wData.profit += t.Profit_Net;
            wData.trades += 1;
        }
      } catch (e) {
          // Fallback if date parsing fails
      }
  });

  const durationPerformance = {
      short: { profit: 0, trades: 0 }, // < 60 mins
      medium: { profit: 0, trades: 0 }, // 60 - 240 mins
      long: { profit: 0, trades: 0 } // > 240 mins
  };

  finalTrades.forEach(t => {
      if (t.Dur_Min < 60) {
          durationPerformance.short.profit += t.Profit_Net;
          durationPerformance.short.trades += 1;
      } else if (t.Dur_Min <= 240) {
          durationPerformance.medium.profit += t.Profit_Net;
          durationPerformance.medium.trades += 1;
      } else {
          durationPerformance.long.profit += t.Profit_Net;
          durationPerformance.long.trades += 1;
      }
  });

  return {
    finalTrades,
    equityCurve,
    metrics: {
      totalNetProfit,
      maxDrawdown,
      recoveryFactor,
      statisticalEdge,
      avgMaeEfficiency,
      totalTrades,
      profitFactor,
      violationEvent,
      sharpeRatio,
      winRate: nominalWinRate,
      strikeRate: realStrikeRate,
      grossLossRate,
      maxConsecutiveLosses
    },
    hourlyPerformance,
    dailyPerformance,
    monthlyHeatmap: Array.from(monthlyHeatmapMap.values()),
    weeklyHeatmap: Array.from(weeklyHeatmapMap.values()),
    durationPerformance
  };
}

export type ProcessedData = ReturnType<typeof processTrades>;


