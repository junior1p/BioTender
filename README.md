# BioTender - AI × Biology 知识导航站

一个基于 Next.js 构建的静态知识导航网站，专注于人工智能与生命科学的交叉领域。

## 功能特性

- 15 个分类，845+ 条精选资源
- 暗色科技风格，玻璃拟态 UI 设计
- 分子网络风格动态背景
- 首次访问时的开场动画
- 全站搜索与分类筛选
- 响应式设计，移动端适配
- SEO 优化，包含 sitemap.xml
- GitHub Actions 自动部署

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建数据

从 Excel 文件生成网站数据：

```bash
npm run build-data
```

数据来源：`data-src/网站类别.xlsx`

生成的文件：
- `/data/categories.json` - 分类数据
- `/data/category-slugs.json` - 分类 slug 映射
- `/data/links.json` - 全量链接数据

### 3. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看网站。

### 4. 构建生产版本

```bash
npm run build
```

静态文件会输出到 `out/` 目录。

## 更新数据

### 方式一：更新 Excel 源文件

1. 替换 `data-src/网站类别.xlsx` 文件
2. 运行 `npm run build-data` 重新生成数据
3. 提交并推送到 GitHub，Actions 会自动部署

### 方式二：使用环境变量（自定义 Excel 路径）

```bash
EXCEL_PATH=path/to/your/file.xlsx npm run build-data
```

## 部署到 GitHub Pages

项目已配置 GitHub Actions 自动部署：

1. 推送代码到 `main` 分支
2. GitHub Actions 自动运行构建
3. 部署完成后访问：https://junior1p.github.io/BioTender/

### 开启 GitHub Pages

首次部署需要手动开启：

1. 访问仓库设置：https://github.com/junior1p/BioTender/settings/pages
2. 在 "Source" 下拉菜单中选择 **"GitHub Actions"**
3. 保存设置

### 查看部署状态

访问 Actions 页面查看部署日志：
https://github.com/junior1p/BioTender/actions

## 项目结构

```
biotender/
├── app/                    # Next.js App Router
│   ├── c/[slug]/          # 分类页（动态路由）
│   ├── all/               # 全量索引页
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── sitemap.ts         # Sitemap 生成
│   └── robots.ts          # Robots.txt
├── components/            # React 组件
│   ├── BioAIBg.tsx       # 动态背景组件
│   └── IntroOverlay.tsx  # 开场动画组件
├── data/                  # 生成的数据文件
│   ├── categories.json
│   ├── category-slugs.json
│   └── links.json
├── data-src/              # 数据源文件
│   └── 网站类别.xlsx      # Excel 源文件
├── scripts/               # 构建脚本
│   ├── build-data.ts     # 数据构建脚本
│   └── inspect-excel.ts  # Excel 检查脚本
├── .github/
│   └── workflows/
│       └── deploy.yml    # GitHub Actions 配置
└── public/               # 静态资源
```

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: TailwindCSS 4
- **数据解析**: xlsx
- **拼音转换**: pinyin-pro
- **部署**: GitHub Pages

## 数据解析规则

Excel 文件结构为"按列分组"：

1. 第 1 列为"分类"，全为空，忽略
2. 每个分类占 3 列：[分类标题] [URL] [空列]
3. 识别不以 `Unnamed:` 开头的列作为分类
4. 逐行读取，提取 title 和 url
5. 同一分类内按 URL 去重

## 本地存储

Intro 动画使用 localStorage 记录访问状态：
- Key: `biotender_intro_seen`
- 存在即不再显示

## 许可证

MIT
