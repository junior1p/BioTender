/**
 * DEG File Parser and Utilities
 * Handles CSV/TSV parsing and column normalization for differential expression data
 */

export interface DEGRow {
  gene: string;
  log2FC: number;
  pvalue: number;
  padj?: number;
  [key: string]: string | number | undefined;
}

export interface ParsedDEGData {
  rows: DEGRow[];
  totalRows: number;
  validRows: number;
  filteredRows: number;
  uniqueGenes: number;
  hasPadj: boolean;
  columns: {
    gene: string;
    log2FC: string;
    pvalue: string;
    padj?: string;
  };
}

export interface ColumnMapping {
  gene: string | null;
  log2FC: string | null;
  pvalue: string | null;
  padj: string | null;
}

// Column name aliases (case-insensitive matching)
const GENE_ALIASES = [
  'gene', 'gene_name', 'symbol', 'Gene', 'GeneName', 'gene_symbol',
  'gene name', 'genename', 'Gene Name'
];
const LOG2FC_ALIASES = [
  'log2FC', 'log2FoldChange', 'logFC', 'avg_log2FC', 'log2foldchange', 'log2fc',
  'log2_fold_change', 'log2FoldChange', 'log2fc', 'log_fold_change',
  'log2fc', 'lfc', 'LFC', 'log2foldchange', 'log_2_fc', 'log2FC',
  'foldchange', 'fold_change', 'logfc'
];
const PVALUE_ALIASES = [
  'pvalue', 'p_value', 'P.Value', 'p_val', 'pval', 'PValue', 'p.value',
  'p-value', 'p value', 'Pval', 'PVALUE', 'p_value_adj', 'p.val'
];
const PADJ_ALIASES = [
  'padj', 'FDR', 'qvalue', 'adj.P.Val', 'p_val_adj', 'qval', 'padjusted',
  'adj_p_val', 'adj_pvalue', 'adj.pval', 'padj', 'BH', 'fdr',
  'q-value', 'q value', 'qval', 'padjust', 'adj_p'
];

/**
 * Detect delimiter (comma or tab)
 */
function detectDelimiter(content: string): ',' | '\t' {
  const lines = content.split('\n').slice(0, 10);
  let commaCount = 0;
  let tabCount = 0;

  for (const line of lines) {
    commaCount += (line.match(/,/g) || []).length;
    tabCount += (line.match(/\t/g) || []).length;
  }

  return commaCount >= tabCount ? ',' : '\t';
}

/**
 * Parse CSV/TSV content
 */
export function parseDelimitedFile(content: string): string[][] {
  const delimiter = detectDelimiter(content);
  const lines = content.trim().split('\n');

  // Simple CSV/TSV parser (handles quoted values)
  const rows: string[][] = [];

  for (const line of lines) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current || values.length > 0) {
      values.push(current.trim());
    }

    if (values.length > 0) {
      rows.push(values);
    }
  }

  return rows;
}

/**
 * Normalize a column name for comparison (case-insensitive, remove spaces/dots)
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s._-]/g, '')  // Remove spaces, dots, underscores, hyphens
    .trim();
}

/**
 * Identify column mapping from header
 */
export function identifyColumns(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));

  const findColumn = (aliases: string[]): string | null => {
    for (const alias of aliases) {
      const normalizedAlias = normalizeColumnName(alias);
      const idx = normalizedHeaders.findIndex(h => h === normalizedAlias);
      if (idx !== -1) return headers[idx];
    }
    return null;
  };

  return {
    gene: findColumn(GENE_ALIASES),
    log2FC: findColumn(LOG2FC_ALIASES),
    pvalue: findColumn(PVALUE_ALIASES),
    padj: findColumn(PADJ_ALIASES),
  };
}

/**
 * Normalize parsed data to DEGRow format
 */
export function normalizeDEGData(
  parsedRows: string[][],
  columnMapping: ColumnMapping
): { valid: DEGRow[]; filtered: number } {
  const valid: DEGRow[] = [];
  let filtered = 0;

  // Find column indices
  const headerRow = parsedRows[0];
  const geneIdx = columnMapping.gene ? headerRow.indexOf(columnMapping.gene) : -1;
  const log2FCIdx = columnMapping.log2FC ? headerRow.indexOf(columnMapping.log2FC) : -1;
  const pvalueIdx = columnMapping.pvalue ? headerRow.indexOf(columnMapping.pvalue) : -1;
  const padjIdx = columnMapping.padj ? headerRow.indexOf(columnMapping.padj) : -1;

  // Skip header row
  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];

    // Check for required columns
    if (geneIdx === -1 || log2FCIdx === -1 || pvalueIdx === -1) {
      filtered++;
      continue;
    }

    const gene = row[geneIdx]?.trim();
    const log2FC = parseFloat(row[log2FCIdx]);
    const pvalue = parseFloat(row[pvalueIdx]);
    const padj = padjIdx !== -1 ? parseFloat(row[padjIdx]) : undefined;

    // Validate required fields
    if (!gene || isNaN(log2FC) || isNaN(pvalue)) {
      filtered++;
      continue;
    }

    // Handle pvalue = 0 (use small value to avoid Infinity)
    const safePvalue = pvalue === 0 ? 1e-300 : pvalue;
    const safePadj = padj !== undefined && !isNaN(padj) ? (padj === 0 ? 1e-300 : padj) : undefined;

    valid.push({
      gene,
      log2FC,
      pvalue: safePvalue,
      padj: safePadj,
    });
  }

  return { valid, filtered };
}

/**
 * Main parser function
 */
export function parseDEGFile(content: string): ParsedDEGData | { error: string } {
  try {
    const parsedRows = parseDelimitedFile(content);

    if (parsedRows.length < 2) {
      return { error: '文件为空或格式不正确' };
    }

    const headers = parsedRows[0];
    const columnMapping = identifyColumns(headers);

    // Validate required columns
    if (!columnMapping.gene) {
      return { error: '未找到基因列（支持的字段名：gene, gene_name, symbol, Gene, GeneName）' };
    }
    if (!columnMapping.log2FC) {
      return { error: '未找到 log2FC 列（支持的字段名：log2FC, log2FoldChange, logFC, avg_log2FC）' };
    }
    if (!columnMapping.pvalue) {
      return { error: '未找到 pvalue 列（支持的字段名：pvalue, p_value, P.Value, p_val）' };
    }

    const { valid, filtered } = normalizeDEGData(parsedRows, columnMapping);
    const uniqueGenes = new Set(valid.map(r => r.gene)).size;

    return {
      rows: valid,
      totalRows: parsedRows.length - 1, // Exclude header
      validRows: valid.length,
      filteredRows: filtered,
      uniqueGenes,
      hasPadj: columnMapping.padj !== null,
      columns: {
        gene: columnMapping.gene,
        log2FC: columnMapping.log2FC,
        pvalue: columnMapping.pvalue,
        padj: columnMapping.padj ?? undefined,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if gene is unannotated/predicted
 */
export function isUnannotatedGene(gene: string, species: 'human' | 'mouse'): boolean {
  if (species === 'mouse') {
    return /^Gm\d+/.test(gene) || /Rik$/i.test(gene) || /^LOC/i.test(gene);
  } else {
    return /^LOC/i.test(gene) || /^LINC/i.test(gene) || /^AC\d+/i.test(gene) || /^AL\d+/i.test(gene);
  }
}
