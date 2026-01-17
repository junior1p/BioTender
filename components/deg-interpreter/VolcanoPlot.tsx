'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-slate-800/50 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-gray-400">加载图表中...</p>
      </div>
    </div>
  ),
});

interface DEGRow {
  gene: string;
  log2FC: number;
  pvalue: number;
  padj?: number;
}

interface VolcanoPlotProps {
  data: DEGRow[];
  log2FCThreshold: number;
  pThreshold: number;
  usePadj: boolean;
}

export default function VolcanoPlot({ data, log2FCThreshold, pThreshold, usePadj }: VolcanoPlotProps) {

  const plotData = useMemo(() => {
    // Calculate significance for each point
    const points = data.map((row) => {
      const pValue = usePadj && row.padj !== undefined ? row.padj : row.pvalue;
      const negLog10P = -Math.log10(pValue);
      const log2FC = row.log2FC;

      let category: 'up' | 'down' | 'not';
      if (Math.abs(log2FC) >= log2FCThreshold && pValue < pThreshold) {
        category = log2FC > 0 ? 'up' : 'down';
      } else {
        category = 'not';
      }

      return {
        x: log2FC,
        y: negLog10P,
        gene: row.gene,
        log2FC,
        pvalue: pValue,
        category,
      };
    });

    // Separate by category
    const up = points.filter((p) => p.category === 'up');
    const down = points.filter((p) => p.category === 'down');
    const not = points.filter((p) => p.category === 'not');

    // Calculate threshold line
    const thresholdY = -Math.log10(pThreshold);

    return {
      traces: [
        {
          x: up.map((p) => p.x),
          y: up.map((p) => p.y),
          text: up.map((p) => `${p.gene}<br>log2FC: ${p.log2FC.toFixed(2)}<br>p: ${p.pvalue.toExponential(2)}`),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: 'Upregulated',
          marker: { color: '#ef4444', size: 4, opacity: 0.6 },
        },
        {
          x: down.map((p) => p.x),
          y: down.map((p) => p.y),
          text: down.map((p) => `${p.gene}<br>log2FC: ${p.log2FC.toFixed(2)}<br>p: ${p.pvalue.toExponential(2)}`),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: 'Downregulated',
          marker: { color: '#3b82f6', size: 4, opacity: 0.6 },
        },
        {
          x: not.map((p) => p.x),
          y: not.map((p) => p.y),
          text: not.map((p) => `${p.gene}<br>log2FC: ${p.log2FC.toFixed(2)}<br>p: ${p.pvalue.toExponential(2)}`),
          mode: 'markers' as const,
          type: 'scatter' as const,
          name: 'Not significant',
          marker: { color: '#6b7280', size: 3, opacity: 0.4 },
        },
      ],
      shapes: [
        // Vertical lines (log2FC thresholds)
        {
          type: 'line' as const,
          x0: log2FCThreshold,
          y0: 0,
          x1: log2FCThreshold,
          y1: thresholdY * 1.2,
          line: { color: '#10b981', width: 2, dash: 'dash' as const },
        },
        {
          type: 'line' as const,
          x0: -log2FCThreshold,
          y0: 0,
          x1: -log2FCThreshold,
          y1: thresholdY * 1.2,
          line: { color: '#10b981', width: 2, dash: 'dash' as const },
        },
        // Horizontal line (p-value threshold)
        {
          type: 'line' as const,
          x0: Math.min(...points.map((p) => p.x)) - 1,
          y0: thresholdY,
          x1: Math.max(...points.map((p) => p.x)) + 1,
          y1: thresholdY,
          line: { color: '#10b981', width: 2, dash: 'dash' as const },
        },
      ],
      annotations: [
        {
          x: log2FCThreshold,
          y: thresholdY * 1.15,
          text: `log2FC = ${log2FCThreshold}`,
          showarrow: false,
          font: { color: '#10b981', size: 10 },
          xanchor: 'left' as const,
        },
        {
          x: -log2FCThreshold,
          y: thresholdY * 1.15,
          text: `log2FC = -${log2FCThreshold}`,
          showarrow: false,
          font: { color: '#10b981', size: 10 },
          xanchor: 'right' as const,
        },
        {
          x: Math.max(...points.map((p) => p.x)) * 0.8,
          y: thresholdY * 1.05,
          text: `p${usePadj ? 'adj' : ''} = ${pThreshold}`,
          showarrow: false,
          font: { color: '#10b981', size: 10 },
        },
      ],
      layout: {
        autosize: true,
        hovermode: 'closest' as const,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#9ca3af' },
        margin: { l: 60, r: 20, t: 40, b: 50 },
        xaxis: {
          title: { text: 'log2 Fold Change' },
          gridcolor: '#374151',
          zerolinecolor: '#6b7280',
        },
        yaxis: {
          title: { text: `-log10(${usePadj ? 'adj ' : ''}p-value)` },
          gridcolor: '#374151',
          zerolinecolor: '#6b7280',
        },
        legend: {
          x: 0.02,
          y: 0.98,
          bgcolor: 'rgba(31, 41, 55, 0.8)',
          bordercolor: '#4b5563',
          borderwidth: 1,
        },
        modebar: {
          bgcolor: 'rgba(31, 41, 55, 0.8)',
          color: '#9ca3af',
          activecolor: '#10b981',
        },
      },
    };
  }, [data, log2FCThreshold, pThreshold, usePadj]);

  return (
    <div className="glass rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">火山图 (Volcano Plot)</h2>
        <span className="text-sm text-gray-400">使用图表右上角的相机图标下载图片</span>
      </div>
      <div className="w-full" style={{ height: '500px' }}>
        <Plot
          data={plotData.traces}
          layout={{
            ...plotData.layout,
            shapes: plotData.shapes,
            annotations: plotData.annotations,
          }}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            toImageButtonOptions: {
              format: 'svg',
              filename: 'volcano_plot',
              height: 800,
              width: 1200,
              scale: 1,
            },
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
}
