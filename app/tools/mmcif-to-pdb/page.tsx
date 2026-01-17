'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { convertMMCIFToPDB, readFileContent, ConversionResult } from '@/src/utils/mmcifToPdb';

type ConversionStatus = 'idle' | 'converting' | 'success' | 'error';

export default function MmcifToPdbPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const validExtensions = ['.cif', '.mmcif', '.cif.gz', '.mmcif.gz'];
    const hasValidExtension = validExtensions.some(ext =>
      selectedFile.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      setStatus('error');
      setResult({
        success: false,
        error: '不支持的文件格式。请上传 .cif 或 .mmcif 文件',
      });
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setResult(null);
  };

  const handleConvert = async () => {
    if (!file) return;

    setStatus('converting');
    setResult(null);

    try {
      const content = await readFileContent(file);
      const conversionResult = await convertMMCIFToPDB(content);

      setResult(conversionResult);
      setStatus(conversionResult.success ? 'success' : 'error');
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!result?.pdbContent || !file) return;

    // Generate filename with .pdb extension
    const baseName = file.name.replace(/\.(cif|mmcif)(\.gz)?$/i, '');
    const fileName = `${baseName}.pdb`;

    // Create blob and download
    const blob = new Blob([result.pdbContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setResult(null);
  };

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
              <Link href="/tools" className="text-gray-300 hover:text-cyan-300 transition-colors">
                Tools
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              mmCIF → PDB Converter
            </h1>
            <p className="text-gray-400">
              纯前端将 mmCIF 文件转换为 PDB 格式，支持 .cif/.mmcif 文件（以及 .cif.gz 压缩格式）
            </p>
          </div>

          {/* Upload Area */}
          <div className="glass rounded-lg p-8 mb-6">
            <div
              className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".cif,.mmcif,.cif.gz,.mmcif.gz"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={status === 'converting'}
              />

              <div className="text-5xl mb-4">📁</div>

              {file ? (
                <div>
                  <p className="text-lg font-medium text-white mb-2">
                    已选择文件: {file.name}
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    文件大小: {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    清除文件
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-white mb-2">
                    点击或拖拽文件到此处上传
                  </p>
                  <p className="text-sm text-gray-400">
                    支持 .cif, .mmcif, .cif.gz, .mmcif.gz 格式
                  </p>
                </div>
              )}
            </div>

            {/* Convert Button */}
            {file && status !== 'success' && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleConvert}
                  disabled={status === 'converting'}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-lg"
                >
                  {status === 'converting' ? '转换中...' : 'Convert to PDB'}
                </button>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {status === 'converting' && (
            <div className="glass rounded-lg p-6 mb-6 border border-cyan-500/30">
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <div>
                  <p className="text-lg font-medium text-white">正在转换...</p>
                  <p className="text-sm text-gray-400">请稍候，正在解析 mmCIF 文件</p>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && result && (
            <div className="glass rounded-lg p-6 mb-6 border border-red-500/50 bg-red-500/10">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">转换失败</h3>
                  <p className="text-gray-300">{result.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Result */}
          {status === 'success' && result && result.success && (
            <div className="glass rounded-lg p-6 mb-6 border border-green-500/30">
              <div className="flex items-start gap-4 mb-6">
                <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">转换成功!</h3>
                  <p className="text-gray-300">mmCIF 文件已成功转换为 PDB 格式</p>
                </div>
              </div>

              {/* Stats */}
              {result.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">原子数</p>
                    <p className="text-2xl font-bold text-white">{result.stats.atomCount}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">链数</p>
                    <p className="text-2xl font-bold text-cyan-400">{result.stats.chainCount}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">残基数</p>
                    <p className="text-2xl font-bold text-purple-400">{result.stats.residueCount}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">配体</p>
                    <p className={`text-2xl font-bold ${result.stats.hasLigands ? 'text-green-400' : 'text-gray-400'}`}>
                      {result.stats.hasLigands ? '是' : '否'}
                    </p>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDB
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                >
                  转换另一个文件
                </button>
              </div>
            </div>
          )}

          {/* Usage Instructions */}
          {status === 'idle' && !file && (
            <div className="glass rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">使用说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">支持的格式</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>.cif - CIF 格式结构文件</li>
                    <li>.mmcif - mmCIF 格式结构文件</li>
                    <li>.cif.gz - Gzip 压缩的 CIF 文件</li>
                    <li>.mmcif.gz - Gzip 压缩的 mmCIF 文件</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">转换说明</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>纯前端转换，文件不上传服务器</li>
                    <li>保留所有原子坐标信息</li>
                    <li>自动处理链 ID、残基编号等</li>
                    <li>支持标准 PDB 格式输出</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">限制说明</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>链 ID 超过 1 个字符将被截断</li>
                    <li>原子序号超过 99999 可能显示异常</li>
                    <li>部分高级 mmCIF 特性可能不完全支持</li>
                    <li>建议转换前检查结果文件</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">性能提示</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>大文件转换可能需要几秒钟</li>
                    <li>推荐文件大小 &lt;50MB</li>
                    <li>转换完全在浏览器中进行</li>
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
