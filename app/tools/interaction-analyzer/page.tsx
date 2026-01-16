'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import AnalysisControls from '@/components/interaction-analyzer/AnalysisControls';
import ProgressStatus from '@/components/interaction-analyzer/ProgressStatus';
import InteractionTables from '@/components/interaction-analyzer/InteractionTables';
import {
  AnalysisParams,
  AnalysisResult,
  AnalysisStatus,
  ProgressUpdate,
  WorkerRequest,
  WorkerResponse,
} from '@/src/types/interaction';

const defaultParams: AnalysisParams = {
  bindingSiteDistance: 7.5,
  hydrophobicMaxDist: 4.0,
  hbondMaxDist: 3.5,
  saltBridgeMaxDist: 5.5,
  waterBridgeMaxDist: 4.1,
  piStackingMaxDist: 6.0,
  piCationMaxDist: 6.0,
  halogenBondMaxDist: 4.0,
};

export default function InteractionAnalyzerPage() {
  const [params, setParams] = useState<AnalysisParams>(defaultParams);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [currentSite, setCurrentSite] = useState<number | undefined>();
  const [totalSites, setTotalSites] = useState<number | undefined>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  const handleAnalyze = useCallback(async (file: File) => {
    // Reset state
    setStatus('parsing');
    setProgress(0);
    setMessage('Initializing...');
    setError(null);
    setResult(null);

    try {
      // Read file
      const pdbContent = await file.text();

      // Create worker
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      // Get basePath from config (default: /BioTender)
      const basePath = '/BioTender';
      const workerUrl = `${basePath}/workers/interactionWorker.js`;
      workerRef.current = new Worker(workerUrl, { type: 'classic' });

      // Set up message handler
      workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { type, data, error: workerError } = e.data;

        if (type === 'progress') {
          const progressData = data as ProgressUpdate;
          setStatus(progressData.status);
          setProgress(progressData.progress);
          setMessage(progressData.message);
          setCurrentSite(progressData.currentSite);
          setTotalSites(progressData.totalSites);
        } else if (type === 'result') {
          const analysisResult = data as AnalysisResult;
          setResult(analysisResult);
          setStatus('complete');
          setProgress(100);
          setMessage('Analysis complete');

          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        } else if (type === 'error') {
          const errorMsg = workerError || 'Unknown error';
          const stack = (data as any)?.stack;
          const fullError = stack ? `${errorMsg}\n\nStack:\n${stack}` : errorMsg;
          setError(fullError);
          setStatus('error');
          setProgress(0);

          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }
      };

      workerRef.current.onerror = (err) => {
        console.error('Worker error:', err);
        const errorMsg = err.message ? `Worker error: ${err.message}` : 'Worker error: Failed to load worker script';
        setError(errorMsg);
        setStatus('error');
        setProgress(0);

        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
      };

      workerRef.current.onmessageerror = (err) => {
        console.error('Worker message error:', err);
        setError('Worker message error: ' + (err as any).message);
        setStatus('error');
        setProgress(0);
      };

      // Send analysis request
      const request: WorkerRequest = {
        type: 'analyze',
        pdbContent,
        filename: file.name,
        params,
      };

      workerRef.current.postMessage(request);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      setProgress(0);
    }
  }, [params]);

  const handleParamsChange = useCallback((newParams: AnalysisParams) => {
    setParams(newParams);
  }, []);

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-cyan-300">
              BioTender
            </Link>
            <div className="flex gap-6">
              <Link href="/" className="text-gray-300 hover:text-cyan-300 transition-colors">
                Home
              </Link>
              <Link href="/all" className="text-gray-300 hover:text-cyan-300 transition-colors">
                All
              </Link>
              <Link
                href="/tools/interaction-visualizer"
                className="text-gray-300 hover:text-cyan-300 transition-colors"
              >
                Visualizer
              </Link>
              <Link
                href="/tools/interaction-analyzer"
                className="text-cyan-300 hover:text-cyan-200 transition-colors font-medium"
              >
                Analyzer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1800px] mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              分子互作分析工具
            </h1>
            <p className="text-gray-400">
              纯前端分析 PDB 文件中的分子相互作用（疏水、氢键、水桥等）
            </p>
          </div>

          {/* Analysis Controls */}
          <AnalysisControls
            params={params}
            onParamsChange={handleParamsChange}
            onAnalyze={handleAnalyze}
            isAnalyzing={status !== 'idle' && status !== 'complete' && status !== 'error'}
          />

          {/* Progress Status */}
          <ProgressStatus
            status={status}
            progress={progress}
            message={message}
            currentSite={currentSite}
            totalSites={totalSites}
          />

          {/* Error Display */}
          {error && (
            <div className="glass rounded-lg p-4 mb-6 border border-red-500/50 bg-red-500/10">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-400 mb-1">分析错误</h3>
                  <p className="text-gray-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {result && (
            <div className="glass rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">分析结果摘要</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">总原子数</p>
                  <p className="text-2xl font-bold text-white">{result.stats.totalAtoms}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">配体原子</p>
                  <p className="text-2xl font-bold text-cyan-400">{result.stats.ligandAtoms}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">结合位点</p>
                  <p className="text-2xl font-bold text-green-400">{result.stats.totalSites}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">疏水作用</p>
                  <p className="text-2xl font-bold text-blue-400">{result.stats.totalHydrophobic}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">氢键</p>
                  <p className="text-2xl font-bold text-purple-400">{result.stats.totalHbond}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">分析时间</p>
                  <p className="text-2xl font-bold text-yellow-400">{result.stats.analysisTime}ms</p>
                </div>
              </div>
            </div>
          )}

          {/* Interaction Tables */}
          {result && <InteractionTables siteInteractions={result.interactions} />}

          {/* Usage Instructions */}
          {!result && (
            <div className="glass rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">使用说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">上传文件</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>支持 .pdb 格式文件</li>
                    <li>文件应包含蛋白质和配体结构</li>
                    <li>配体应标记为 HETATM 记录</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">检测的相互作用</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>疏水相互作用 (Hydrophobic)</li>
                    <li>氢键 (Hydrogen Bonds)</li>
                    <li>水桥 (Water Bridges)</li>
                    <li>更多类型即将推出...</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">性能说明</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>使用 Web Worker 并行处理</li>
                    <li>空间网格索引加速计算</li>
                    <li>推荐文件大小 &lt;5MB</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
