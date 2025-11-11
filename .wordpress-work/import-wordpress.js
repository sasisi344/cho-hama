import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// カテゴリマッピング
const categoryMap = {
  '表浜名湖': 'omote-hamanako',
  '中浜名湖': 'naka-hamanako',
  '奥浜名湖': 'oku-hamanako',
};

// XMLファイルのパス
const xmlPath = path.join(__dirname, 'old-post', 'WordPress.2025-11-11.xml');
const outputBaseDir = path.join(__dirname, 'old-chohama');

// 出力ディレクトリの作成
const outputDirs = {
  'omote-hamanako': path.join(outputBaseDir, 'omote-hamanako'),
  'naka-hamanako': path.join(outputBaseDir, 'naka-hamanako'),
  'oku-hamanako': path.join(outputBaseDir, 'oku-hamanako'),
  'season-post': path.join(outputBaseDir, 'season-post'),
};

// ディレクトリを作成
Object.values(outputDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// HTMLをMarkdownに簡易変換（基本的なタグのみ）
function htmlToMarkdown(html) {
  if (!html) return '';
  
  let markdown = html
    // WordPressブロックコメントを削除
    .replace(/<!--\s*wp:[^>]*-->/g, '')
    .replace(/<!--\s*\/wp:[^>]*-->/g, '')
    // 見出し
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gis, (match, level, content) => {
      const hashes = '#'.repeat(parseInt(level));
      return `${hashes} ${content.trim()}\n\n`;
    })
    // 段落
    .replace(/<p[^>]*>(.*?)<\/p>/gis, (match, content) => {
      return `${content.trim()}\n\n`;
    })
    // リスト
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n');
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let index = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gis, () => `${index++}. $1\n`);
    })
    // 強調
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
    // リンク
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis, '[$2]($1)')
    // 画像
    .replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gis, '![$2]($1)')
    .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gis, '![]($1)')
    // 改行
    .replace(/<br[^>]*>/gi, '\n')
    // HTMLタグを削除
    .replace(/<[^>]+>/g, '')
    // HTMLエンティティをデコード
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    // 余分な空白を削除
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return markdown;
}

// ファイル名を安全な形式に変換
function sanitizeFilename(title) {
  return title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

// 日付をフォーマット
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// XMLを解析
function parseXML(xmlContent) {
  const posts = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xmlContent)) !== null) {
    const itemContent = match[1];
    
    // タイトルを取得
    const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    if (!titleMatch) continue;
    const title = titleMatch[1];
    
    // 公開日を取得
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
    const pubDate = pubDateMatch ? pubDateMatch[1] : '';
    
    // wp:post_dateを取得（より正確な日付）
    const postDateMatch = itemContent.match(/<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/);
    const postDate = postDateMatch ? postDateMatch[1] : pubDate;
    
    // コンテンツを取得
    const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    if (!contentMatch) continue;
    const content = contentMatch[1];
    
    // カテゴリを取得（domain="category"のもの）
    const categoryMatches = itemContent.matchAll(/<category domain="category"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g);
    const categories = Array.from(categoryMatches, m => m[1]);
    
    // タグを取得（domain="post_tag"のもの）
    const tagMatches = itemContent.matchAll(/<category domain="post_tag"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g);
    const tags = Array.from(tagMatches, m => m[1]);
    
    // ステータスを確認（公開済みのみ）
    const statusMatch = itemContent.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/);
    const status = statusMatch ? statusMatch[1] : '';
    if (status !== 'publish') continue;
    
    posts.push({
      title,
      content,
      date: postDate,
      categories,
      tags,
    });
  }
  
  return posts;
}

// メイン処理
try {
  console.log('XMLファイルを読み込んでいます...');
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
  
  console.log('XMLを解析しています...');
  const posts = parseXML(xmlContent);
  
  console.log(`合計 ${posts.length} 件の記事が見つかりました。`);
  
  let processedCount = 0;
  const categoryCounts = {
    'omote-hamanako': 0,
    'naka-hamanako': 0,
    'oku-hamanako': 0,
    'season-post': 0,
  };
  
  posts.forEach((post, index) => {
    // カテゴリを決定
    let targetCategory = 'season-post';
    for (const category of post.categories) {
      if (categoryMap[category]) {
        targetCategory = categoryMap[category];
        break;
      }
    }
    
    // ファイル名を生成
    const filename = sanitizeFilename(post.title) + '.md';
    const outputPath = path.join(outputDirs[targetCategory], filename);
    
    // 日付をフォーマット
    const publishedDate = formatDate(post.date);
    
    // Markdownコンテンツを生成
    const markdownContent = `---
title: ${post.title}
published: ${publishedDate}
description: ""
image: ""
tags: [${post.tags.map(t => `"${t}"`).join(', ')}]
category: ${post.categories[0] || '未分類'}
draft: false
lang: ja
---

${htmlToMarkdown(post.content)}
`;
    
    // ファイルを書き込み
    fs.writeFileSync(outputPath, markdownContent, 'utf-8');
    processedCount++;
    categoryCounts[targetCategory]++;
    
    if (processedCount % 10 === 0) {
      console.log(`処理中: ${processedCount}/${posts.length} 件...`);
    }
  });
  
  console.log('\n処理完了！');
  console.log('カテゴリ別の記事数:');
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} 件`);
  });
  console.log(`\n合計: ${processedCount} 件の記事をMarkdownファイルとして作成しました。`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

