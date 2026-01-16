'use client';

import { useState } from 'react';
import Link from 'next/link';
import links from '../../data/links.json';
import categorySlugs from '../../data/category-slugs.json';

export default function AllPage() {
  const slugs = categorySlugs as Record<string, string>;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLinks = links.filter((link) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      link.title.toLowerCase().includes(query) ||
      link.category.toLowerCase().includes(query)
    );
  });

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
              <Link href="/all" className="text-cyan-300 border-b-2 border-cyan-300 pb-1">
                All
              </Link>
              <Link href="/tools" className="text-gray-300 hover:text-cyan-300 transition-colors">
                Tools
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* 标题区 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            全部资源
          </h1>
          <p className="text-gray-400">
            共 {links.length} 条资源
          </p>
        </div>

        {/* 搜索框 */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="搜索全部资源..."
            className="w-full px-6 py-4 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-lg"
            id="all-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 资源列表 */}
        <div className="space-y-4" id="all-items-list">
          {filteredLinks.map((link, idx) => (
            <div
              key={idx}
              className="glass rounded-lg p-6 hover:border-cyan-500/40 transition-all duration-300 all-item-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {link.title}
                  </h3>
                  <Link
                    href={`/c/${slugs[link.category]}`}
                    className="inline-block text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded mb-2 hover:bg-cyan-500/20 transition-colors"
                  >
                    {link.category}
                  </Link>
                  <p className="text-sm text-gray-400 truncate">
                    {link.url}
                  </p>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium whitespace-nowrap"
                >
                  打开链接
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 无搜索结果提示 */}
        {filteredLinks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">未找到匹配的资源</p>
          </div>
        )}
      </main>
    </>
  );
}
