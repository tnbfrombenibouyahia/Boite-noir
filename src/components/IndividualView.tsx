import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedData, processTrades } from '../utils/parser';
import { EquityCurve } from './EquityCurve';
import { KeyMetrics } from './KeyMetrics';
import { DayStatistics } from './DayStatistics';
import { DurationStatistics } from './DurationStatistics';
import { PerformanceHeatmap } from './PerformanceHeatmap';
import { MaeMfeAnalysis } from './MaeMfeAnalysis';
import { TradeLedger } from './TradeLedger';
import { PropFirmSimulator } from './PropFirmSimulator';
import { Calculator } from 'lucide-react';

interface IndividualViewProps {
  analysis: ProcessedData;
  fileId: string;
}

export function IndividualView({ analysis, fileId }: IndividualViewProps) {
  const [originalRisk, setOriginalRisk] = useState<number>(1.0);
  const [simulatedRisk, setSimulatedRisk] = useState<number>(1.0);

  // Load saved risk parameters on mount or when fileId changes
  useEffect(() => {
    const savedOriginal = localStorage.getItem(`risk_original_${fileId}`);
    const savedSimulated = localStorage.getItem(`risk_simulated_${fileId}`);
    
    if (savedOriginal) setOriginalRisk(Number(savedOriginal));
    else setOriginalRisk(1.0);
    
    if (savedSimulated) setSimulatedRisk(Number(savedSimulated));
    else setSimulatedRisk(1.0);
  }, [fileId]);

  // Save risk parameters when they change
  useEffect(() => {
    localStorage.setItem(`risk_original_${fileId}`, originalRisk.toString());
    localStorage.setItem(`risk_simulated_${fileId}`, simulatedRisk.toString());
  }, [originalRisk, simulatedRisk, fileId]);

  const scaledAnalysis = useMemo(() => {
    if (originalRisk === simulatedRisk || originalRisk <= 0) {
      return analysis;
    }

    const ratio = simulatedRisk / originalRisk;
    
    const firstTrade = analysis.finalTrades[0];
    const initialBalance = firstTrade ? firstTrade.Equity_Open : 10000;
    
    let dailyLossPct = 0.05; // Default 5%
    if (firstTrade && firstTrade.Daily_Limit && firstTrade.Daily_Limit > 0) {
       const inferredPct = 1 - (firstTrade.Daily_Limit / initialBalance);
       if (inferredPct > 0 && inferredPct < 1) {
           dailyLossPct = inferredPct;
       }
    }
    
    const maxLossPct = 0.10; // Default 10%

    let currentBalance = initialBalance;
    let currentDay = firstTrade && firstTrade.OpenTime ? firstTrade.OpenTime.split(' ')[0] : '';
    let dailyStartBalance = initialBalance;

    const scaledTrades = analysis.finalTrades.map(t => {
      const tradeDay = t.OpenTime ? t.OpenTime.split(' ')[0] : '';
      if (tradeDay !== currentDay) {
        currentDay = tradeDay;
        // Some prop firms use the higher of starting balance or initial balance for daily loss,
        // but standard is just start of day balance.
        dailyStartBalance = currentBalance;
      }

      const tradeReturnPct = t.Equity_Open > 0 ? t.Profit_Net / t.Equity_Open : 0;
      const maeReturnPct = t.Equity_Open > 0 ? t.MAE_$ / t.Equity_Open : 0;
      const mfeReturnPct = t.Equity_Open > 0 ? t.MFE_$ / t.Equity_Open : 0;

      const simulatedReturnPct = tradeReturnPct * ratio;
      const simulatedProfit = currentBalance * simulatedReturnPct;
      const simulatedMae = currentBalance * maeReturnPct * ratio;
      const simulatedMfe = currentBalance * mfeReturnPct * ratio;

      const newDailyLimit = dailyStartBalance * (1 - dailyLossPct);
      const newMaxLossLimit = initialBalance * (1 - maxLossPct);

      const floatingEquity = currentBalance + simulatedMae;
      const isViolation = floatingEquity <= newDailyLimit || floatingEquity <= newMaxLossLimit;

      const newTrade = {
        ...t,
        Equity_Open: currentBalance,
        Profit_Net: simulatedProfit,
        MAE_$: simulatedMae,
        MFE_$: simulatedMfe,
        Daily_Limit: newDailyLimit,
        Violation: isViolation
      };

      currentBalance += simulatedProfit;
      return newTrade;
    });

    return processTrades(scaledTrades);
  }, [analysis, originalRisk, simulatedRisk]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <KeyMetrics metrics={scaledAnalysis.metrics} />
      
      {/* Full width Equity Curve */}
      <EquityCurve data={scaledAnalysis.equityCurve} />

      {/* MAE / MFE Analysis */}
      <MaeMfeAnalysis trades={scaledAnalysis.finalTrades} />
      
      {/* Day Stats & Duration Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DayStatistics dailyPerformance={scaledAnalysis.dailyPerformance} />
        <DurationStatistics durationPerformance={scaledAnalysis.durationPerformance} />
      </div>

      <PerformanceHeatmap 
        monthlyHeatmap={scaledAnalysis.monthlyHeatmap} 
        weeklyHeatmap={scaledAnalysis.weeklyHeatmap} 
      />
      
      <PropFirmSimulator 
        analysis={scaledAnalysis} 
        originalRisk={originalRisk}
        simulatedRisk={simulatedRisk}
        onOriginalRiskChange={setOriginalRisk}
        onSimulatedRiskChange={setSimulatedRisk}
      />
      
      <TradeLedger trades={scaledAnalysis.finalTrades} />
    </div>
  );
}



