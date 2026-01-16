'use client';

import { useState } from 'react';
import Link from 'next/link';
import IntroOverlay from '@/components/IntroOverlay';
import categories from '../data/categories.json';
import links from '../data/links.json';
import categorySlugs from '../data/category-slugs.json';

// 随机获取 8 条推荐
function getRandomLinks(count: number) {
  const shuffled = [...links].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const categoryEntries = Object.entries(categories);
  const totalItems = links.length;
  const randomLinks = getRandomLinks(8);
  const slugs = categorySlugs as Record<string, string>;

  // 搜索过滤
  const searchResults = links.filter((link) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return (
      link.title.toLowerCase().includes(query) ||
      link.category.toLowerCase().includes(query) ||
      link.url.toLowerCase().includes(query)
    );
  });

  // 诊断输出
  console.log('\n=== 首页分类卡片诊断 ===');
  console.log(`分类总数: ${categoryEntries.length}`);
  console.log(`category-slugs 总数: ${Object.keys(categorySlugs).length}`);
  console.log(`首页渲染的分类卡片 href 列表:`);
  categoryEntries.forEach(([name]) => {
    const slug = slugs[name];
    console.log(`  ${name} -> /c/${slug}`);
  });
  console.log('=======================\n');

  return (
    <>
      <IntroOverlay />

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
              <Link href="/tools" className="text-gray-300 hover:text-cyan-300 transition-colors">
                Tools
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Hero 区 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            BioTender
          </h1>
          <p className="text-xl text-cyan-300 mb-2">
            AI × Biology 知识导航
          </p>
          <p className="text-gray-400">
            共 {totalItems} 条资源，涵盖 {categoryEntries.length} 个分类
          </p>
        </div>

        {/* 搜索框 */}
        <div className="mb-12">
          <input
            type="text"
            placeholder="搜索资源..."
            className="w-full max-w-2xl mx-auto block px-6 py-4 glass rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-lg"
            id="global-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* 搜索结果 */}
          {searchQuery.trim() && (
            <div className="max-w-2xl mx-auto mt-4 glass rounded-lg max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="divide-y divide-cyan-500/10">
                  {searchResults.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 hover:bg-slate-800/50 transition-colors"
                    >
                      <h3 className="text-white font-medium mb-1">{link.title}</h3>
                      <p className="text-sm text-cyan-400 mb-1">{link.category}</p>
                      <p className="text-xs text-gray-400 truncate">{link.url}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400">
                  未找到匹配的资源
                </div>
              )}
            </div>
          )}
        </div>

        {/* 分类卡片网格 */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">分类浏览</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categoryEntries.map(([name, items]) => {
              const slug = slugs[name];
              return (
                <Link
                  key={name}
                  href={`/c/${slug}`}
                  className="glass rounded-lg p-6 hover:shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group"
                >
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {name}
                  </h3>
                  <p className="text-gray-400 text-sm mt-2">
                    {items.length} 条资源
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 随机推荐 */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">随机推荐</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {randomLinks.map((link, idx) => (
              <div
                key={idx}
                className="glass rounded-lg p-4 hover:border-cyan-500/40 transition-all duration-300"
              >
                <h3 className="text-white font-medium mb-2 line-clamp-2">
                  {link.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                    {link.category}
                  </span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
                  >
                    打开链接 →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
