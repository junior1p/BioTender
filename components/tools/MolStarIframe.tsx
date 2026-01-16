'use client';

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

// 暴露给父组件的方法
export interface MolStarIframeRef {
  loadStructure: (file: File) => Promise<void>;
  loadFromPdbId: (pdbId: string) => Promise<void>;
}

interface MolStarIframeProps {
  className?: string;
}

const MolStarIframe = forwardRef<MolStarIframeRef, MolStarIframeProps>(
  ({ className = '' }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [basePath, setBasePath] = useState('/BioTender');

    const [debugInfo, setDebugInfo] = useState({
      lastLoadSource: 'None',
      lastError: null as string | null,
      structureLoaded: false,
      logMessages: [] as string[],
    });

    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setDebugInfo(prev => ({
        ...prev,
        logMessages: [...prev.logMessages, `[${timestamp}] ${message}`].slice(-20),
      }));
      console.log(`[MolStarIframe] ${message}`);
    };

    // 获取 basePath（从 next.config.ts 读取或从当前 URL 推断）
    useEffect(() => {
      // 从当前页面 URL 推断 basePath
      const path = window.location.pathname;
      if (path.startsWith('/BioTender')) {
        setBasePath('/BioTender');
      } else {
        setBasePath('');
      }
      addLog(`检测到 basePath: ${basePath || '(无前缀)'}`);
    }, []);

    // 处理来自 iframe 的消息
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        // 忽略来自其他源的消息
        if (event.origin !== window.location.origin && event.origin !== '') {
          return;
        }

        const { type, error, fileName, pdbId } = event.data || {};

        switch (type) {
          case 'molstar-ready':
            setIsReady(true);
            addLog('Mol* Viewer 初始化成功');
            break;
          case 'molstar-error':
            addLog(`错误: ${error}`);
            setDebugInfo(prev => ({ ...prev, lastError: error }));
            break;
          case 'molstar-structure-loaded':
            addLog(`结构加载成功: ${fileName || pdbId}`);
            setDebugInfo(prev => ({
              ...prev,
              lastLoadSource: fileName || `PDB: ${pdbId}`,
              structureLoaded: true,
              lastError: null,
            }));
            break;
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 发送消息到 iframe
    const postMessage = (type: string, data?: any) => {
      if (!iframeRef.current || !iframeRef.current.contentWindow) {
        addLog('错误: iframe 未就绪');
        return false;
      }
      iframeRef.current.contentWindow.postMessage({ type, data }, '*');
      return true;
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      loadStructure: async (file: File) => {
        if (!isReady) {
          addLog('错误: Viewer 未初始化，请稍候');
          throw new Error('Viewer not ready');
        }

        addLog(`开始加载文件: ${file.name} (${file.size} bytes)`);

        try {
          // 读取文件内容
          const data = await file.arrayBuffer();
          const fileData = new Uint8Array(data);

          // 判断文件格式
          const isCif = file.name.endsWith('.cif') || file.name.endsWith('.mmcif') || file.name.endsWith('.bcif');
          const format = isCif ? 'mmcif' : 'pdb';

          addLog(`文件读取完成 (${data.byteLength} bytes), 格式: ${format}`);

          // 发送到 iframe（转换为普通数组以便 postMessage 序列化）
          const success = postMessage('load-structure', {
            fileData: Array.from(fileData),
            fileName: file.name,
            format: format,
          });

          if (!success) {
            throw new Error('iframe 未就绪');
          }

          addLog('已发送加载指令到 iframe');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          addLog(`文件读取失败: ${errorMsg}`);
          setDebugInfo(prev => ({ ...prev, lastError: errorMsg }));
          throw error;
        }
      },

      loadFromPdbId: async (pdbId: string) => {
        if (!isReady) {
          addLog('错误: Viewer 未初始化，请稍候');
          throw new Error('Viewer not ready');
        }

        const upperPdbId = pdbId.toUpperCase().trim();
        addLog(`开始从 RCSB 加载: ${upperPdbId}`);

        const success = postMessage('load-pdb', { pdbId: upperPdbId });
        if (!success) {
          throw new Error('iframe 未就绪');
        }

        addLog(`已发送加载指令到 iframe: ${upperPdbId}`);
      },
    }));

    // iframe src 路径：使用绝对路径以确保在 basePath 下正确访问
    const viewerUrl = `${basePath}/molstar/embedded-custom.html`;

    return (
      <div className={`relative w-full h-full bg-white ${className}`}>
        <iframe
          ref={iframeRef}
          src={viewerUrl}
          className="w-full h-full border-0"
          style={{ minHeight: '600px' }}
          title="Mol* 3D Structure Viewer"
        />

        {/* Debug 面板 */}
        <div className="absolute bottom-4 right-4 z-50">
          <details open className="bg-slate-900/95 text-white rounded-lg shadow-xl border border-cyan-500/30">
            <summary className="px-3 py-2 cursor-pointer text-sm font-medium hover:bg-slate-800/80 rounded-t-lg">
              🔧 Debug 面板
            </summary>
            <div className="p-3 text-xs max-w-md max-h-80 overflow-y-auto">
              <div className="space-y-2">
                <div>
                  <span className="text-cyan-400">basePath:</span>
                  <span className="ml-2 text-white">{basePath}</span>
                </div>
                <div>
                  <span className="text-cyan-400">iframe src:</span>
                  <span className="ml-2 text-white break-all">{viewerUrl}</span>
                </div>
                <div>
                  <span className="text-cyan-400">Viewer 状态:</span>
                  <span className={`ml-2 ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>
                    {isReady ? '已就绪' : '初始化中...'}
                  </span>
                </div>
                <div>
                  <span className="text-cyan-400">最后加载来源:</span>
                  <span className="ml-2">{debugInfo.lastLoadSource}</span>
                </div>
                <div>
                  <span className="text-cyan-400">结构已加载:</span>
                  <span className={`ml-2 ${debugInfo.structureLoaded ? 'text-green-400' : 'text-gray-400'}`}>
                    {debugInfo.structureLoaded ? '是' : '否'}
                  </span>
                </div>
                {debugInfo.lastError && (
                  <div>
                    <span className="text-red-400">最后错误:</span>
                    <div className="mt-1 p-2 bg-red-900/30 rounded text-red-300 break-words">
                      {debugInfo.lastError}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-cyan-400">日志:</span>
                  <div className="mt-1 p-2 bg-slate-800 rounded max-h-40 overflow-y-auto font-mono">
                    {debugInfo.logMessages.length === 0 ? (
                      <span className="text-gray-500">无日志</span>
                    ) : (
                      debugInfo.logMessages.map((msg, i) => (
                        <div key={i} className="text-gray-300">{msg}</div>
                      ))
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700">
                  <div className="text-cyan-400 mb-1">自检清单:</div>
                  <ul className="text-gray-300 space-y-1 ml-4">
                    <li>✓ 访问 {viewerUrl} 应显示 Mol* UI</li>
                    <li>✓ Network 中 molstar.js/molstar.css 应为 200</li>
                    <li>✓ 上传 PDB 后日志应显示"结构加载成功"</li>
                  </ul>
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* 加载提示 */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center">
              <div className="text-lg text-gray-600 mb-2">正在加载 Mol* Viewer...</div>
              <div className="text-sm text-gray-400">初始化 3D 引擎中，请稍候</div>
              <div className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
                如果长时间未加载，请检查浏览器 Console 中的错误信息
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MolStarIframe.displayName = 'MolStarIframe';

export default MolStarIframe;
