import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { pinyin } from 'pinyin-pro';

// Excel 文件路径：优先使用环境变量，否则使用默认路径
const defaultExcelPath = path.resolve(process.cwd(), 'data-src/网站类别.xlsx');
const excelPath = process.env.EXCEL_PATH ? path.resolve(process.cwd(), process.env.EXCEL_PATH) : defaultExcelPath;

// 输出目录
const outputDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 打印使用的 Excel 路径
console.log('=== 数据构建脚本 ===');
console.log(`EXCEL_PATH: ${excelPath}`);
console.log(`输出目录: ${outputDir}\n`);

// 生成安全的 slug（只包含字母数字和连字符）
function generateSlug(text: string): string {
  // 使用 pinyin-pro 转换为拼音
  const result = pinyin(text, {
    pattern: 'pinyin',
    toneType: 'none',
    type: 'array'
  });

  // 如果拼音转换成功且结果有效
  if (Array.isArray(result) && result.length > 0 && result[0]) {
    // 过滤出只包含字母的项，合并，转小写，用连字符连接
    const slug = result
      .map((p: string) => p.toLowerCase())
      .filter((p: string) => /^[a-z]+$/.test(p))
      .join('-');
    return slug;
  }

  // fallback: 使用 hash
  const hash = text.split('').reduce((acc: number, char: string) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  return `cat-${Math.abs(hash).toString(16)}`;
}

// 判断是否是有效的 URL
function isValidUrl(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

// 判断是否是有效的标题
function isValidTitle(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.trim().length > 0;
}

// 检查 Excel 文件是否存在
if (!fs.existsSync(excelPath)) {
  console.error(`❌ 错误: Excel 文件不存在: ${excelPath}`);
  console.error(`\n解决方案:`);
  console.error(`1. 确保 data-src/网站类别.xlsx 文件存在于仓库根目录`);
  console.error(`2. 或者设置环境变量: EXCEL_PATH=path/to/your/file.xlsx`);
  process.exit(1);
}

console.log(`Reading Excel file: ${excelPath}`);

// 读取工作簿
const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets['Sheet1'];

// 转换为二维数组（包括表头）
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];

const headers = data[0];
const rows = data.slice(1);

// 识别分类列（不以 Unnamed: 开头，排除第 1 列"分类"）
const categoryColumns: number[] = [];
for (let i = 1; i < headers.length; i++) {
  const header = headers[i];
  if (header && !String(header).startsWith('Unnamed:')) {
    categoryColumns.push(i);
  }
}

console.log(`\n识别到 ${categoryColumns.length} 个分类:`);

// 解析数据
const categories: Record<string, Array<{ title: string; url: string }>> = {};
const categorySlugs: Record<string, string> = {};
const links: Array<{ category: string; slug: string; title: string; url: string }> = [];
let totalItems = 0;
let skippedItems = 0;
const urlSet = new Set<string>();

// 按分类解析
categoryColumns.forEach((colIdx) => {
  const categoryName = headers[colIdx];
  const urlColIdx = colIdx + 1;

  console.log(`\n分类: ${categoryName}`);

  categories[categoryName] = [];
  const seenUrls = new Set<string>();

  // 逐行读取
  rows.forEach((row) => {
    const title = row[colIdx];
    const url = row[urlColIdx];

    // 检查是否有效
    if (!isValidTitle(title) || !isValidUrl(url)) {
      if (title || url) {
        skippedItems++;
      }
      return;
    }

    // 同一分类内按 URL 去重
    if (seenUrls.has(url)) {
      skippedItems++;
      return;
    }
    seenUrls.add(url);

    // 添加到分类
    categories[categoryName].push({
      title: title.trim(),
      url: url.trim()
    });

    totalItems++;
  });

  // 生成 slug
  const slug = generateSlug(categoryName);
  categorySlugs[categoryName] = slug;

  console.log(`  条目数: ${categories[categoryName].length}`);
  console.log(`  slug: ${slug}`);
});

// 构建全量 links 数组
Object.entries(categories).forEach(([categoryName, items]) => {
  const slug = categorySlugs[categoryName];
  items.forEach((item) => {
    links.push({
      category: categoryName,
      slug: slug,
      title: item.title,
      url: item.url
    });
  });
});

// 写入文件
console.log('\n=== 写入数据文件 ===');

// /data/categories.json
const categoriesPath = path.join(outputDir, 'categories.json');
fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2), 'utf-8');
console.log(`✓ ${categoriesPath}`);

// /data/category-slugs.json
const slugsPath = path.join(outputDir, 'category-slugs.json');
fs.writeFileSync(slugsPath, JSON.stringify(categorySlugs, null, 2), 'utf-8');
console.log(`✓ ${slugsPath}`);

// /data/links.json
const linksPath = path.join(outputDir, 'links.json');
fs.writeFileSync(linksPath, JSON.stringify(links, null, 2), 'utf-8');
console.log(`✓ ${linksPath}`);

// 输出统计报告
console.log('\n=== 数据解析报告 ===');
console.log(`识别到分类数: ${Object.keys(categories).length}`);
Object.entries(categories).forEach(([category, items]) => {
  console.log(`  ${category}: ${items.length} 条`);
});
console.log(`\n总条目数: ${totalItems}`);
console.log(`被跳过的无效条目数: ${skippedItems}`);
console.log('\n✅ 数据文件生成完成!');
