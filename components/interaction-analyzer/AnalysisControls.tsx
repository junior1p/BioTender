'use client';

import { useState } from 'react';
import { AnalysisParams } from '@/src/types/interaction';

interface AnalysisControlsProps {
  params: AnalysisParams;
  onParamsChange: (params: AnalysisParams) => void;
  onAnalyze: (file: File) => void;
  isAnalyzing: boolean;
}

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

export default function AnalysisControls({
  params,
  onParamsChange,
  onAnalyze,
  isAnalyzing,
}: AnalysisControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };

  const handleParamChange = (key: keyof AnalysisParams, value: number) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="glass rounded-lg p-6 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        {/* File Upload */}
        <div className="flex-1 min-w-[300px]">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            上传 PDB 文件
          </label>
          <input
            type="file"
            accept=".pdb"
            onChange={handleFileChange}
            disabled={isAnalyzing}
            className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-400">
              已选择: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* Analyze Button */}
        <div>
          <button
            onClick={handleAnalyze}
            disabled={!selectedFile || isAnalyzing}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium disabled:bg-slate-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? '分析中...' : '分析'}
          </button>
        </div>

        {/* Advanced Toggle */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
          >
            {showAdvanced ? '隐藏' : '高级'}参数
          </button>
        </div>
      </div>

      {/* Advanced Parameters */}
      {showAdvanced && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">高级参数</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Binding Site Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                结合位点距离 (Å)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="20"
                value={params.bindingSiteDistance}
                onChange={(e) => handleParamChange('bindingSiteDistance', parseFloat(e.target.value) || 7.5)}
                disabled={isAnalyzing}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
              />
            </div>

            {/* Hydrophobic Max Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                疏水最大距离 (Å)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.hydrophobicMaxDist}
                onChange={(e) => handleParamChange('hydrophobicMaxDist', parseFloat(e.target.value) || 4.0)}
                disabled={isAnalyzing}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
              />
            </div>

            {/* H-bond Max Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                氢键最大距离 (Å)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.hbondMaxDist}
                onChange={(e) => handleParamChange('hbondMaxDist', parseFloat(e.target.value) || 3.5)}
                disabled={isAnalyzing}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
              />
            </div>

            {/* Water Bridge Max Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                水桥最大距离 (Å)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.waterBridgeMaxDist}
                onChange={(e) => handleParamChange('waterBridgeMaxDist', parseFloat(e.target.value) || 4.1)}
                disabled={isAnalyzing}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
              />
            </div>

            {/* Salt Bridge Max Distance (Placeholder) */}
            <div className="opacity-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                盐桥最大距离 (Å) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.saltBridgeMaxDist}
                disabled
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">* 即将推出</p>
            </div>

            {/* Pi-Stacking Max Distance (Placeholder) */}
            <div className="opacity-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                π-π 堆积最大距离 (Å) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.piStackingMaxDist}
                disabled
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">* 即将推出</p>
            </div>

            {/* Pi-Cation Max Distance (Placeholder) */}
            <div className="opacity-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                π-阳离子最大距离 (Å) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.piCationMaxDist}
                disabled
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">* 即将推出</p>
            </div>

            {/* Halogen Bond Max Distance (Placeholder) */}
            <div className="opacity-50">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                卤键最大距离 (Å) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={params.halogenBondMaxDist}
                disabled
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">* 即将推出</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
