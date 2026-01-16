'use client';

import { AnalysisStatus } from '@/src/types/interaction';

interface ProgressStatusProps {
  status: AnalysisStatus;
  progress: number;
  message: string;
  currentSite?: number;
  totalSites?: number;
}

const statusLabels: Record<AnalysisStatus, string> = {
  idle: '就绪',
  parsing: '解析中',
  'building-grid': '构建空间索引',
  'finding-sites': '检测结合位点',
  'analyzing-hydrophobic': '分析疏水相互作用',
  'analyzing-hbond': '分析氢键',
  'analyzing-waterbridge': '分析水桥',
  complete: '完成',
  error: '错误',
};

export default function ProgressStatus({
  status,
  progress,
  message,
  currentSite,
  totalSites,
}: ProgressStatusProps) {
  if (status === 'idle') {
    return null;
  }

  const isError = status === 'error';
  const isComplete = status === 'complete';

  return (
    <div className={`glass rounded-lg p-4 mb-6 ${isError ? 'border border-red-500/50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          {isError && (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          {isComplete && (
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {!isError && !isComplete && (
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          {/* Status Text */}
          <div>
            <h3 className={`font-semibold ${isError ? 'text-red-400' : isComplete ? 'text-green-400' : 'text-white'}`}>
              {statusLabels[status]}
            </h3>
            <p className="text-sm text-gray-400">{message}</p>
            {currentSite !== undefined && totalSites !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                结合位点 {currentSite} / {totalSites}
              </p>
            )}
          </div>
        </div>

        {/* Progress Percentage */}
        <div className={`text-2xl font-bold ${isError ? 'text-red-400' : isComplete ? 'text-green-400' : 'text-cyan-400'}`}>
          {progress}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isError
              ? 'bg-red-500'
              : isComplete
              ? 'bg-green-500'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
