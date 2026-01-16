'use client';

import { useState } from 'react';
import { SiteInteractions } from '@/src/types/interaction';

interface InteractionTablesProps {
  siteInteractions: SiteInteractions[];
}

interface InteractionTableProps {
  title: string;
  interactions: any[];
  emptyMessage: string;
  colorClass: string;
}

function InteractionTable({ title, interactions, emptyMessage, colorClass }: InteractionTableProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (interactions.length === 0) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left px-4 py-2 bg-slate-800/50 rounded-lg flex items-center justify-between hover:bg-slate-700/50 transition-colors"
        >
          <span className={`font-semibold ${colorClass}`}>{title}</span>
          <span className="text-xs text-gray-500">0 条记录</span>
        </button>
      </div>
    );
  }

  const firstInteraction = interactions[0];
  const columns = Object.keys(firstInteraction).filter(
    key => key !== 'index' && typeof firstInteraction[key] !== 'object'
  );

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-4 py-2 bg-slate-800/50 rounded-lg flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <span className={`font-semibold ${colorClass}`}>{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{interactions.length} 条记录</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/70">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-gray-300 font-medium border-b border-slate-700 whitespace-nowrap"
                  >
                    {col.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interactions.map((interaction, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-800/30 transition-colors border-b border-slate-700/30"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                      {interaction[col]?.toString() ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InteractionTables({ siteInteractions }: InteractionTablesProps) {
  const [expandedSites, setExpandedSites] = useState<Set<number>>(new Set());

  const toggleSite = (siteId: number) => {
    const newExpanded = new Set(expandedSites);
    if (newExpanded.has(siteId)) {
      newExpanded.delete(siteId);
    } else {
      newExpanded.add(siteId);
    }
    setExpandedSites(newExpanded);
  };

  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-4">相互作用结果</h2>

      {siteInteractions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>暂无相互作用数据</p>
        </div>
      ) : (
        <div className="space-y-4">
          {siteInteractions.map((site) => {
            const isExpanded = expandedSites.has(site.siteId);
            const totalInteractions =
              site.hydrophobic.length +
              site.hbond.length +
              site.waterbridge.length +
              site.saltbridge.length +
              site.pistacking.length +
              site.pication.length +
              site.halogenbond.length;

            return (
              <div key={site.siteId} className="border border-slate-700 rounded-lg overflow-hidden">
                {/* Site Header */}
                <button
                  onClick={() => toggleSite(site.siteId)}
                  className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      结合位点 {site.siteId}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {site.ligand.resn} (Chain {site.ligand.chain}, Res {site.ligand.resi}) - {totalInteractions}{' '}
                      条相互作用
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Site Interactions */}
                {isExpanded && (
                  <div className="p-4 space-y-2">
                    <InteractionTable
                      title="Hydrophobic (疏水相互作用)"
                      interactions={site.hydrophobic}
                      emptyMessage="无疏水相互作用"
                      colorClass="text-green-400"
                    />
                    <InteractionTable
                      title="H-bond (氢键)"
                      interactions={site.hbond}
                      emptyMessage="无氢键"
                      colorClass="text-blue-400"
                    />
                    <InteractionTable
                      title="Water Bridge (水桥)"
                      interactions={site.waterbridge}
                      emptyMessage="无水桥"
                      colorClass="text-cyan-400"
                    />
                    {site.saltbridge.length > 0 && (
                      <InteractionTable
                        title="Salt Bridge (盐桥)"
                        interactions={site.saltbridge}
                        emptyMessage="无盐桥"
                        colorClass="text-purple-400"
                      />
                    )}
                    {site.pistacking.length > 0 && (
                      <InteractionTable
                        title="Pi-Stacking (π-π 堆积)"
                        interactions={site.pistacking}
                        emptyMessage="无π-π堆积"
                        colorClass="text-pink-400"
                      />
                    )}
                    {site.pication.length > 0 && (
                      <InteractionTable
                        title="Pi-Cation (π-阳离子)"
                        interactions={site.pication}
                        emptyMessage="无π-阳离子相互作用"
                        colorClass="text-orange-400"
                      />
                    )}
                    {site.halogenbond.length > 0 && (
                      <InteractionTable
                        title="Halogen Bond (卤键)"
                        interactions={site.halogenbond}
                        emptyMessage="无卤键"
                        colorClass="text-yellow-400"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
