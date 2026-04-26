import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ProcessedData } from '../utils/parser';

export function RiskAnalysis({ metrics }: { metrics: ProcessedData['metrics'] }) {
  return (
    <div className="space-y-6">
      {metrics.violationEvent ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start space-x-4">
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-red-500 font-medium text-lg">Account Violation Detected</h3>
            <p className="text-red-400/80 mt-1">
              The strategy breached Prop Firm rules at Ticket #{metrics.violationEvent.Ticket} on {metrics.violationEvent.EventTime}. 
              Equity at breach: ${metrics.violationEvent.Equity_Open.toFixed(2)}.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex items-start space-x-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-1" />
          <div>
            <h3 className="text-emerald-500 font-medium text-lg">No Violations Detected</h3>
            <p className="text-emerald-400/80 mt-1">
              The strategy survived the dataset without breaching Daily Limit or Max Drawdown rules.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
