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

数据来源：`E:\营销号\网站类别.xlsx`

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
npm start
```

## 更新 Excel 数据

1. 编辑 `E:\营销号\网站类别.xlsx`
2. 运行 `npm run build-data` 重新生成数据
3. 刷新页面即可看到更新

## 部署到 Vercel

### 方式一：通过 Vercel CLI

```bash
npm install -g vercel
vercel
```

### 方式二：通过 Vercel Dashboard

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. Vercel 会自动检测 Next.js 并构建部署

**注意**：部署前需要修改以下文件中的域名：

- `app/sitemap.ts` - 修改 `baseUrl`
- `app/robots.ts` - 修改 `sitemap` URL

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
├── scripts/               # 构建脚本
│   ├── build-data.ts     # 数据构建脚本
│   └── inspect-excel.ts  # Excel 检查脚本
└── public/               # 静态资源
```

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: TailwindCSS 4
- **数据解析**: xlsx
- **拼音转换**: pinyin-pro

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
