import { MetadataRoute } from 'next';
import categorySlugs from '../data/category-slugs.json';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://junior1p.github.io/BioTender';

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/all`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // 分类页面
  const categoryPages: MetadataRoute.Sitemap = Object.entries(categorySlugs).map(
    ([name, slug]) => ({
      url: `${baseUrl}/c/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })
  );

  return [...staticPages, ...categoryPages];
}
