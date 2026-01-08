'use client';

import { useEffect, useState } from 'react';

const INTRO_STORAGE_KEY = 'biotender_intro_seen';

export default function IntroOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 检查是否已看过
    const hasSeen = localStorage.getItem(INTRO_STORAGE_KEY);
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 3 秒自动进入（禁用 reduced-motion 时）
    if (!isReducedMotion) {
      const timer = setTimeout(() => {
        handleEnter();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      }}
    >
      <div className="text-center px-6 max-w-3xl">
        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
          BioTender
        </h1>
        <p className="text-xl md:text-2xl text-cyan-300 mb-8">
          AI × Biology 知识导航
        </p>
        <p className="text-gray-300 mb-10 leading-relaxed">
          探索人工智能与生命科学的交叉领域，从蛋白设计到虚拟细胞，
          从分子对接到生物安全。汇集前沿研究、工具与洞察，助您把握生物智能的未来。
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {['Protein Design', 'Virtual Cell', 'Docking', 'Agents', 'Safety'].map((tag) => (
            <span
              key={tag}
              className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-300 text-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={handleEnter}
          className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          进入 BioTender
        </button>
      </div>
    </div>
  );
}

export function resetIntro() {
  localStorage.removeItem(INTRO_STORAGE_KEY);
}
