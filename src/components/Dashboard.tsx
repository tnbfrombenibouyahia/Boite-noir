import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { parseCSV, processTrades, ProcessedData } from '../utils/parser';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Sidebar } from './Sidebar';
import { PortfolioView } from './PortfolioView';
import { IndividualView } from './IndividualView';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ImportedFile {
  id: string;
  name: string;
  analysis: ProcessedData;
}

export default function Dashboard() {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [activeView, setActiveView] = useState<string>('portfolio');

  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const analysis = processTrades(parsed);
      
      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace('.csv', ''),
        analysis
      };

      setFiles(prev => [...prev, newFile]);
      setActiveView(newFile.id);
    };
    reader.readAsText(file);
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = '';
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    }
  }, [processFile]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id);
      if (activeView === id) {
        setActiveView(newFiles.length > 0 ? 'portfolio' : '');
      }
      return newFiles;
    });
  }, [activeView]);

  if (files.length === 0) {
    return (
      <div 
        className="min-h-screen bg-zinc-950 flex items-center justify-center p-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={cn(
          "max-w-md w-full border-2 border-dashed rounded-2xl p-8 text-center space-y-6 shadow-2xl transition-all duration-200",
          isDragging 
            ? "bg-zinc-900/80 border-emerald-500 scale-105" 
            : "bg-zinc-900 border-zinc-800"
        )}>
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors duration-200",
            isDragging ? "bg-emerald-500/20" : "bg-zinc-800"
          )}>
            <Upload className={cn(
              "w-8 h-8 transition-colors duration-200",
              isDragging ? "text-emerald-500" : "text-zinc-400"
            )} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">QuantAudit Pro</h1>
            <p className="text-zinc-400 mt-2 text-sm">
              {isDragging 
                ? "Drop your CSV file here..." 
                : "Upload your Prop Firm Black Box CSV to generate a comprehensive risk and performance audit."}
            </p>
          </div>
          <label className={cn(
            "block w-full cursor-pointer font-medium py-3 px-4 rounded-xl transition-colors",
            isDragging 
              ? "bg-emerald-600 text-zinc-950" 
              : "bg-emerald-500 hover:bg-emerald-600 text-zinc-950"
          )}>
            <span>Select CSV File</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>
    );
  }

  const activeFile = files.find(f => f.id === activeView);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30 flex">
      <Sidebar 
        files={files.map(f => ({ id: f.id, name: f.name }))} 
        activeView={activeView} 
        onSelectView={setActiveView}
        onFileUpload={handleFileUpload}
        onRemoveFile={handleRemoveFile}
      />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {activeView === 'portfolio' ? (
            <PortfolioView files={files} />
          ) : activeFile ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-zinc-800/50">
                <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">{activeFile.name}</h2>
              </div>
              <IndividualView analysis={activeFile.analysis} fileId={activeFile.id} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

