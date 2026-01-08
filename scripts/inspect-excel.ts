import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Excel 文件路径
const excelPath = path.resolve('E:\\营销号', '网站类别.xlsx');

console.log('Reading Excel file:', excelPath);

// 读取工作簿
const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets['Sheet1'];

// 转换为二维数组（包括表头）
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

console.log('\n=== Excel 数据结构分析 ===\n');
console.log('总行数:', data.length);
console.log('总列数:', data.length > 0 ? data[0].length : 0);

console.log('\n=== 前 5 行数据 ===\n');
for (let i = 0; i < Math.min(5, data.length); i++) {
  console.log(`Row ${i}:`, JSON.stringify(data[i], null, 2));
}

console.log('\n=== 表头列名 ===\n');
const headers = data[0];
for (let i = 0; i < headers.length; i++) {
  console.log(`列 ${i}: "${headers[i]}"`);
}

console.log('\n=== 识别分类列（不以 Unnamed: 开头）===');
const categoryColumns: number[] = [];
for (let i = 1; i < headers.length; i++) {
  const header = headers[i];
  if (header && !String(header).startsWith('Unnamed:')) {
    categoryColumns.push(i);
    console.log(`列 ${i}: "${header}"`);
  }
}

console.log('\n=== 验证列分组规则 ===');
categoryColumns.forEach((colIdx) => {
  const categoryCol = headers[colIdx];
  const urlCol = headers[colIdx + 1];
  const emptyCol = headers[colIdx + 2];
  console.log(`分类列 ${colIdx}: "${categoryCol}"`);
  console.log(`  → URL列 ${colIdx + 1}: "${urlCol}"`);
  console.log(`  → 空列 ${colIdx + 2}: "${emptyCol}"`);
});

console.log('\n=== 完整数据 ===');
for (let i = 0; i < data.length; i++) {
  console.log(`\nRow ${i}:`);
  for (let j = 0; j < data[i].length; j++) {
    console.log(`  [${j}]: "${data[i][j]}"`);
  }
}
