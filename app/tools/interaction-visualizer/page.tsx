'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 动态导入 iframe 组件，避免 SSR 问题
const MolStarIframe = dynamic(
  () => import('@/components/tools/MolStarIframe').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export default function InteractionVisualizerPage() {
  const viewerRef = useRef<any>(null);
  const [pdbId, setPdbId] = useState('1IVO'); // 默认 PDB ID

  const handleLoadPdbId = async () => {
    if (!pdbId.trim() || !viewerRef.current) return;

    try {
      await viewerRef.current.loadFromPdbId(pdbId.trim());
    } catch (error) {
      console.error('Failed to load PDB:', error);
      alert(`加载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewerRef.current) return;

    try {
      await viewerRef.current.loadStructure(file);
    } catch (error) {
      console.error('Failed to load file:', error);
      alert(`加载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <>
      {/* 导航栏 */}
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
                className="text-cyan-300 hover:text-cyan-200 transition-colors font-medium"
              >
                Tools
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        {/* 页面标题和控制栏 */}
        <div className="max-w-[1800px] mx-auto mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            分子交互可视化工具
          </h1>
          <p className="text-gray-400 mb-6">
            使用 Mol* 官方查看器加载和可视化蛋白质结构（支持 PDB/mmCIF 格式）
          </p>

          {/* 快速控制栏 */}
          <div className="glass rounded-lg p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* PDB ID 输入 */}
              <div className="flex gap-2 items-center flex-1 min-w-[300px]">
                <input
                  type="text"
                  value={pdbId}
                  onChange={(e) => setPdbId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadPdbId()}
                  placeholder="输入 PDB ID (如 1IVO)"
                  className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  onClick={handleLoadPdbId}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
                >
                  加载 PDB
                </button>
              </div>

              {/* 文件上传 */}
              <div className="flex gap-2 items-center">
                <label className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium cursor-pointer">
                  上传文件
                  <input
                    type="file"
                    accept=".pdb,.cif,.mmcif,.bcif"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 示例链接 */}
              <div className="flex gap-2 items-center">
                <span className="text-gray-400 text-sm">示例:</span>
                <button
                  onClick={() => { setPdbId('1IVO'); setTimeout(() => handleLoadPdbId(), 0); }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded text-sm transition-colors"
                >
                  1IVO
                </button>
                <button
                  onClick={() => { setPdbId('7BV2'); setTimeout(() => handleLoadPdbId(), 0); }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded text-sm transition-colors"
                >
                  7BV2
                </button>
                <button
                  onClick={() => { setPdbId('1CRN'); setTimeout(() => handleLoadPdbId(), 0); }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded text-sm transition-colors"
                >
                  1CRN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mol* Viewer - iframe 嵌入官方完整 UI */}
        <div className="max-w-[1800px] mx-auto">
          <div className="glass rounded-lg overflow-hidden">
            <div className="p-3 border-b border-slate-700/50 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-white">Mol* 3D 结构查看器（官方完整 UI）</h2>
              <p className="text-sm text-gray-400">iframe 嵌入 | 白底界面 | 官方全套面板</p>
            </div>
            <div className="relative" style={{ height: 'calc(100vh - 300px)', minHeight: '600px' }}>
              <MolStarIframe ref={viewerRef} />
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="max-w-[1800px] mx-auto mt-8">
          <div className="glass rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">使用说明</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-gray-300">
              <div>
                <h4 className="font-medium text-cyan-300 mb-2">加载数据</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>输入 PDB ID（如 1IVO）从 RCSB 加载</li>
                  <li>点击示例按钮快速加载测试结构</li>
                  <li>上传本地 .pdb/.cif/.mmcif/.bcif 文件</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-cyan-300 mb-2">视图控制</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>鼠标左键拖拽旋转视角</li>
                  <li>鼠标右键拖拽平移</li>
                  <li>滚轮缩放</li>
                  <li>使用 Mol* 右侧工具面板切换显示模式</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-cyan-300 mb-2">Debug 面板</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>点击右下角"🔧 Debug 面板"查看详情</li>
                  <li>查看加载日志和错误信息</li>
                  <li>检查 viewer 初始化状态</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
