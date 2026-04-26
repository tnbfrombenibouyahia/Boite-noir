import React from 'react';
import { LayoutDashboard, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { cn } from './Dashboard';

interface SidebarProps {
  files: { id: string; name: string }[];
  activeView: string;
  onSelectView: (id: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (id: string) => void;
}

export function Sidebar({ files, activeView, onSelectView, onFileUpload, onRemoveFile }: SidebarProps) {
  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800/50 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-emerald-500" />
          QuantAudit
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        {files.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Overview</h2>
            <button
              onClick={() => onSelectView('portfolio')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeView === 'portfolio' 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Portfolio Analysis
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Strategies</h2>
            <label className="cursor-pointer p-1 hover:bg-zinc-800 rounded-md transition-colors" title="Import CSV">
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <input type="file" accept=".csv" className="hidden" onChange={onFileUpload} />
            </label>
          </div>
          
          <div className="space-y-1">
            {files.length === 0 ? (
              <div className="px-3 py-4 text-center border border-dashed border-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500">No strategies imported</p>
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="group flex items-center relative">
                  <button
                    onClick={() => onSelectView(file.id)}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate",
                      activeView === file.id 
                        ? "bg-zinc-800/80 text-zinc-100" 
                        : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveFile(file.id); }}
                    className="absolute right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 rounded-md transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
