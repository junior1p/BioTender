import type { Metadata } from "next";
import "./globals.css";
import BioAIBg from "@/components/BioAIBg";

export const metadata: Metadata = {
  title: "BioTender - AI × Biology 知识导航",
  description: "探索人工智能与生命科学的交叉领域，从蛋白设计到虚拟细胞，汇集前沿研究、工具与洞察。",
  keywords: ["AI", "Biology", "Protein Design", "Virtual Cell", "Bioinformatics", "分子对接", "蛋白设计"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">
        <BioAIBg />
        {children}
      </body>
    </html>
  );
}
