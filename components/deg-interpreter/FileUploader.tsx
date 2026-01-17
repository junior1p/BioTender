'use client';

import { useCallback, useState } from 'react';

interface FileUploaderProps {
  onFileLoad: (content: string, fileName: string) => void;
  acceptedFormats?: string[];
}

export default function FileUploader({ onFileLoad, acceptedFormats = ['.csv', '.tsv', '.txt'] }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    setError(null);

    // Check file size
    if (file.size > 50 * 1024 * 1024) {
      setError('文件过大（>50MB），处理可能较慢，请耐心等待');
      // Continue anyway
    }

    try {
      const content = await file.text();
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('文件为空或格式不正确');
        return;
      }

      setFileName(file.name);
      setRowCount(lines.length - 1); // Exclude header
      onFileLoad(content, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件读取失败');
    }
  };

  const handleClear = () => {
    setFileName(null);
    setRowCount(null);
    setError(null);
  };

  return (
    <div className="glass rounded-lg p-6">
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
          accept={acceptedFormats.join(',')}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="text-5xl mb-4">📁</div>

        {fileName ? (
          <div>
            <p className="text-lg font-medium text-white mb-2">
              已加载: {fileName}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              共 {rowCount} 行数据
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
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
              支持 CSV/TSV 格式（自动识别分隔符）
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
