'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import FileUploader from '@/components/deg-interpreter/FileUploader';
import VolcanoPlot from '@/components/deg-interpreter/VolcanoPlot';
import {
  parseDEGFile,
  isUnannotatedGene,
  DEGRow,
  ParsedDEGData,
} from '@/src/utils/degParser';

// Import TF data
import mouseTFs from '@/src/data/mouseTFs.json';
import humanTFs from '@/src/data/humanTFs.json';

const mouseTFSet = new Set(mouseTFs.map((tf: string) => tf.toUpperCase()));
const humanTFSet = new Set(humanTFs.map((tf: string) => tf.toUpperCase()));

type Species = 'human' | 'mouse';

export default function DEGInterpreterPage() {
  const [data, setData] = useState<DEGRow[] | null>(null);
  const [parsedInfo, setParsedInfo] = useState<ParsedDEGData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parameters
  const [species, setSpecies] = useState<Species>('mouse');
  const [log2FCThreshold, setLog2FCThreshold] = useState(1.0);
  const [pThreshold, setPThreshold] = useState(0.05);
  const [topN, setTopN] = useState(20);

  const handleFileLoad = useCallback((content: string, fileName: string) => {
    setError(null);
    const result = parseDEGFile(content);

    if ('error' in result) {
      setError(result.error);
      setData(null);
      setParsedInfo(null);
    } else {
      setData(result.rows);
      setParsedInfo(result);
    }
  }, []);

  // Filter significant genes
  const significantGenes = useMemo(() => {
    if (!data) return { up: [], down: [], total: 0 };

    const up: DEGRow[] = [];
    const down: DEGRow[] = [];

    for (const row of data) {
      const pValue = parsedInfo?.hasPadj && row.padj !== undefined ? row.padj : row.pvalue;
      if (Math.abs(row.log2FC) >= log2FCThreshold && pValue < pThreshold) {
        if (row.log2FC > 0) {
          up.push(row);
        } else {
          down.push(row);
        }
      }
    }

    return { up, down, total: up.length + down.length };
  }, [data, log2FCThreshold, pThreshold, parsedInfo]);

  // Top N genes
  const topGenes = useMemo(() => {
    const tfSet = species === 'mouse' ? mouseTFSet : humanTFSet;

    // Sort up genes: by p-value (asc), then by log2FC (desc)
    const upSorted = [...significantGenes.up].sort((a, b) => {
      const pA = parsedInfo?.hasPadj && a.padj !== undefined ? a.padj : a.pvalue;
      const pB = parsedInfo?.hasPadj && b.padj !== undefined ? b.padj : b.pvalue;
      if (pA !== pB) return pA - pB;
      return b.log2FC - a.log2FC;
    });

    // Sort down genes: by p-value (asc), then by log2FC (asc)
    const downSorted = [...significantGenes.down].sort((a, b) => {
      const pA = parsedInfo?.hasPadj && a.padj !== undefined ? a.padj : a.pvalue;
      const pB = parsedInfo?.hasPadj && b.padj !== undefined ? b.padj : b.pvalue;
      if (pA !== pB) return pA - pB;
      return a.log2FC - b.log2FC;
    });

    const topUp = upSorted.slice(0, topN).map((gene) => ({
      ...gene,
      isTF: tfSet.has(gene.gene.toUpperCase()),
      isUnannotated: isUnannotatedGene(gene.gene, species),
    }));

    const topDown = downSorted.slice(0, topN).map((gene) => ({
      ...gene,
      isTF: tfSet.has(gene.gene.toUpperCase()),
      isUnannotated: isUnannotatedGene(gene.gene, species),
    }));

    return { up: topUp, down: topDown };
  }, [significantGenes, topN, species, parsedInfo]);

  // Export functions
  const exportSignificantCSV = () => {
    if (!data || significantGenes.total === 0) return;

    const headers = ['gene', 'log2FC', 'pvalue', ...(parsedInfo?.hasPadj ? ['padj'] : [])];
    const rows = [
      headers.join(','),
      ...significantGenes.up.map((g) =>
        [g.gene, g.log2FC, g.pvalue, ...(parsedInfo?.hasPadj && g.padj !== undefined ? [g.padj] : [])].join(',')
      ),
      ...significantGenes.down.map((g) =>
        [g.gene, g.log2FC, g.pvalue, ...(parsedInfo?.hasPadj && g.padj !== undefined ? [g.padj] : [])].join(',')
      ),
    ];

    downloadCSV(rows.join('\n'), 'significant_genes.csv');
  };

  const exportTopGenesCSV = () => {
    const allTopGenes = [...topGenes.up, ...topGenes.down];
    if (allTopGenes.length === 0) return;

    const headers = ['gene', 'log2FC', 'pvalue', ...(parsedInfo?.hasPadj ? ['padj'] : []), 'isTF', 'isUnannotated'];
    const rows = [
      headers.join(','),
      ...allTopGenes.map((g) =>
        [
          g.gene,
          g.log2FC,
          g.pvalue,
          ...(parsedInfo?.hasPadj && g.padj !== undefined ? [g.padj] : []),
          g.isTF ? 'Yes' : 'No',
          g.isUnannotated ? 'Yes' : 'No',
        ].join(',')
      ),
    ];

    downloadCSV(rows.join('\n'), 'top_genes.csv');
  };

  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              DEG Interpreter（差异表达基因结果解释器）
            </h1>
            <p className="text-gray-400">
              上传 DEG 分析结果表格（CSV/TSV），自动生成 QC 报告、火山图和 Top 基因列表
            </p>
          </div>

          {/* File Upload */}
          <FileUploader onFileLoad={handleFileLoad} />

          {/* Error Display */}
          {error && (
            <div className="glass rounded-lg p-6 mb-6 border border-red-500/50 bg-red-500/10">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">解析错误</h3>
                  <p className="text-gray-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {data && parsedInfo && (
            <>
              {/* Parameters */}
              <div className="glass rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">参数设置</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Species */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">物种</label>
                    <select
                      value={species}
                      onChange={(e) => setSpecies(e.target.value as Species)}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="mouse">Mouse（小鼠）</option>
                      <option value="human">Human（人类）</option>
                    </select>
                  </div>

                  {/* log2FC Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      log2FC 阈值（绝对值）
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={log2FCThreshold}
                      onChange={(e) => setLog2FCThreshold(parseFloat(e.target.value) || 1)}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>

                  {/* p-value Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {parsedInfo.hasPadj ? 'padj' : 'p-value'} 阈值
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pThreshold}
                      onChange={(e) => setPThreshold(parseFloat(e.target.value) || 0.05)}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>

                  {/* Top N */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Top N 基因</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={topN}
                      onChange={(e) => setTopN(parseInt(e.target.value) || 20)}
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* QC Summary */}
              <div className="glass rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">QC Summary（数据质量概览）</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">总行数</p>
                    <p className="text-2xl font-bold text-white">{parsedInfo.totalRows}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">有效行数</p>
                    <p className="text-2xl font-bold text-green-400">{parsedInfo.validRows}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">唯一基因数</p>
                    <p className="text-2xl font-bold text-cyan-400">{parsedInfo.uniqueGenes}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">过滤行数</p>
                    <p className="text-2xl font-bold text-yellow-400">{parsedInfo.filteredRows}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  <p>• 检测到 padj 列: {parsedInfo.hasPadj ? '是' : '否'}</p>
                  <p>• 识别的列: gene={parsedInfo.columns.gene}, log2FC={parsedInfo.columns.log2FC}, pvalue={parsedInfo.columns.pvalue}</p>
                  {parsedInfo.columns.padj && <p>• padj 列: {parsedInfo.columns.padj}</p>}
                </div>
              </div>

              {/* Volcano Plot */}
              <VolcanoPlot
                data={data}
                log2FCThreshold={log2FCThreshold}
                pThreshold={pThreshold}
                usePadj={parsedInfo.hasPadj}
              />

              {/* Summary Sentence */}
              <div className="glass rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">分析摘要</h2>
                <p className="text-gray-300">
                  在阈值 |log2FC| ≥ {log2FCThreshold} 且 {parsedInfo.hasPadj ? 'padj' : 'p-value'}{' '}
                  &lt; {pThreshold} 下，共鉴定出 <span className="font-bold text-cyan-400">{significantGenes.total}</span> 个显著差异表达基因，
                  其中上调 <span className="font-bold text-red-400">{significantGenes.up.length}</span> 个，
                  下调 <span className="font-bold text-blue-400">{significantGenes.down.length}</span> 个。
                </p>
              </div>

              {/* Top Genes Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Upregulated */}
                <div className="glass rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Top {topN} Upregulated Genes（上调基因）
                  </h3>
                  {topGenes.up.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Gene</th>
                            <th className="text-right py-2 px-3 text-gray-400 font-medium">log2FC</th>
                            <th className="text-right py-2 px-3 text-gray-400 font-medium">{parsedInfo.hasPadj ? 'padj' : 'pvalue'}</th>
                            <th className="text-center py-2 px-3 text-gray-400 font-medium">TF?</th>
                            <th className="text-center py-2 px-3 text-gray-400 font-medium">未注释?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topGenes.up.map((gene, idx) => (
                            <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                              <td className="py-2 px-3 text-white font-medium">{gene.gene}</td>
                              <td className="py-2 px-3 text-right text-red-400">{gene.log2FC.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-gray-300">
                                {(parsedInfo?.hasPadj && gene.padj !== undefined ? gene.padj : gene.pvalue).toExponential(2)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {gene.isTF ? (
                                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">TF</span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {gene.isUnannotated ? (
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Yes</span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">无显著上调基因</p>
                  )}
                </div>

                {/* Downregulated */}
                <div className="glass rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Top {topN} Downregulated Genes（下调基因）
                  </h3>
                  {topGenes.down.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-700">
                            <th className="text-left py-2 px-3 text-gray-400 font-medium">Gene</th>
                            <th className="text-right py-2 px-3 text-gray-400 font-medium">log2FC</th>
                            <th className="text-right py-2 px-3 text-gray-400 font-medium">{parsedInfo.hasPadj ? 'padj' : 'pvalue'}</th>
                            <th className="text-center py-2 px-3 text-gray-400 font-medium">TF?</th>
                            <th className="text-center py-2 px-3 text-gray-400 font-medium">未注释?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topGenes.down.map((gene, idx) => (
                            <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                              <td className="py-2 px-3 text-white font-medium">{gene.gene}</td>
                              <td className="py-2 px-3 text-right text-blue-400">{gene.log2FC.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-gray-300">
                                {(parsedInfo?.hasPadj && gene.padj !== undefined ? gene.padj : gene.pvalue).toExponential(2)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {gene.isTF ? (
                                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">TF</span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {gene.isUnannotated ? (
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Yes</span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">无显著下调基因</p>
                  )}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="glass rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">导出结果</h2>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={exportSignificantCSV}
                    disabled={significantGenes.total === 0}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    导出显著基因表 CSV
                  </button>
                  <button
                    onClick={exportTopGenesCSV}
                    disabled={topGenes.up.length === 0 && topGenes.down.length === 0}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    导出 Top 基因表 CSV
                  </button>
                </div>
                <p className="mt-4 text-sm text-gray-400">
                  注：TF 标注基于内置转录因子列表，可能不完整。未注释基因预测基于物种特异性规则。
                </p>
              </div>
            </>
          )}

          {/* Usage Instructions */}
          {!data && (
            <div className="glass rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">使用说明</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-300">
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">文件格式要求</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>支持 CSV/TSV 格式（自动识别分隔符）</li>
                    <li>必须包含列：gene（基因名）、log2FC（对数 fold change）</li>
                    <li>必须包含列：pvalue（p 值）或 padj（校正 p 值）</li>
                    <li>列名支持多种别名（如 log2FC/log2FoldChange/logFC 等）</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">功能特性</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>自动过滤缺失值和无效数据</li>
                    <li>交互式火山图（hover 查看详情）</li>
                    <li>TF 标注和未注释基因预测</li>
                    <li>导出显著基因表和 Top 基因表</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">支持的列名别名</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>基因：gene, gene_name, symbol, Gene, GeneName</li>
                    <li>log2FC：log2FC, log2FoldChange, logFC, avg_log2FC</li>
                    <li>p值：pvalue, p_value, P.Value, p_val</li>
                    <li>校正 p 值：padj, FDR, qvalue, adj.P.Val</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-300 mb-2">性能说明</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>纯前端处理，数据不上传服务器</li>
                    <li>推荐文件大小 &lt;50MB</li>
                    <li>大文件处理可能需要几秒钟</li>
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
