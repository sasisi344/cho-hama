import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const seasonPostDir = path.join(scriptDir, '..', 'src', 'content', 'posts', 'season-post');

// 文字列の類似度を計算（簡易版：共通文字列の割合）
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // 共通部分の長さを計算
  let commonLength = 0;
  const minLength = Math.min(str1.length, str2.length);
  
  // 文字列の一致度を計算（簡易版）
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let commonWords = 0;
  set1.forEach(word => {
    if (set2.has(word)) commonWords++;
  });
  
  const totalWords = Math.max(set1.size, set2.size);
  const wordSimilarity = totalWords > 0 ? commonWords / totalWords : 0;
  
  // 文字列の部分一致も考慮
  let substringSimilarity = 0;
  const minSubstringLength = Math.min(10, Math.floor(shorter.length * 0.3));
  for (let i = 0; i <= shorter.length - minSubstringLength; i++) {
    const substring = shorter.substring(i, i + minSubstringLength);
    if (longer.includes(substring)) {
      substringSimilarity += minSubstringLength / longer.length;
    }
  }
  
  // 単語類似度と部分文字列類似度の平均
  return (wordSimilarity * 0.7 + Math.min(substringSimilarity, 1) * 0.3);
}

// 内容の類似度を計算
function calculateContentSimilarity(content1, content2) {
  if (!content1 || !content2) return 0;
  
  // 見出しを抽出
  const headings1 = content1.match(/^#{1,3}\s+.+$/gm) || [];
  const headings2 = content2.match(/^#{1,3}\s+.+$/gm) || [];
  
  // 見出しの類似度
  let headingSimilarity = 0;
  if (headings1.length > 0 && headings2.length > 0) {
    const commonHeadings = headings1.filter(h1 => 
      headings2.some(h2 => {
        const h1Clean = h1.replace(/^#+\s+/, '').trim();
        const h2Clean = h2.replace(/^#+\s+/, '').trim();
        return calculateSimilarity(h1Clean, h2Clean) > 0.5;
      })
    ).length;
    headingSimilarity = commonHeadings / Math.max(headings1.length, headings2.length);
  }
  
  // 本文の類似度（最初の500文字を比較）
  const text1 = content1.replace(/^#+\s+.+$/gm, '').replace(/\s+/g, ' ').substring(0, 500);
  const text2 = content2.replace(/^#+\s+.+$/gm, '').replace(/\s+/g, ' ').substring(0, 500);
  const textSimilarity = calculateSimilarity(text1, text2);
  
  // 見出し類似度と本文類似度の重み付き平均
  return headingSimilarity * 0.4 + textSimilarity * 0.6;
}

// 記事を読み込む
function loadArticles() {
  const files = fs.readdirSync(seasonPostDir);
  const articles = [];
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(seasonPostDir, file);
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);
      
      articles.push({
        file,
        title: data.title || '',
        content: content || '',
        description: data.description || '',
      });
    } catch (error) {
      console.error(`Error reading ${file}:`, error.message);
    }
  }
  
  return articles;
}

// 内容の重複セクションを検出
function findCommonSections(content1, content2) {
  const sections1 = content1.split(/\n#{1,3}\s+/).filter(s => s.trim().length > 0);
  const sections2 = content2.split(/\n#{1,3}\s+/).filter(s => s.trim().length > 0);
  
  const commonSections = [];
  
  sections1.forEach((section1, idx1) => {
    const heading1 = section1.split('\n')[0].trim();
    const text1 = section1.substring(heading1.length).trim();
    
    sections2.forEach((section2, idx2) => {
      const heading2 = section2.split('\n')[0].trim();
      const text2 = section2.substring(heading2.length).trim();
      
      const headingSim = calculateSimilarity(heading1, heading2);
      const textSim = calculateSimilarity(text1.substring(0, 500), text2.substring(0, 500));
      
      if (headingSim > 0.5 || textSim > 0.6) {
        commonSections.push({
          heading1,
          heading2,
          headingSimilarity: Math.round(headingSim * 100),
          textSimilarity: Math.round(textSim * 100),
        });
      }
    });
  });
  
  return commonSections;
}

// 類似記事を検出
function findSimilarArticles() {
  const articles = loadArticles();
  const similarPairs = [];
  
  console.log(`\n${articles.length}件の記事を分析中...\n`);
  
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const article1 = articles[i];
      const article2 = articles[j];
      
      // タイトルの類似度
      const titleSimilarity = calculateSimilarity(article1.title, article2.title);
      
      // 内容の類似度
      const contentSimilarity = calculateContentSimilarity(article1.content, article2.content);
      
      // タイトルまたは内容の類似度が高い場合
      if (titleSimilarity > 0.3 || contentSimilarity > 0.3) {
        const commonSections = findCommonSections(article1.content, article2.content);
        
        similarPairs.push({
          article1: {
            file: article1.file,
            title: article1.title,
            contentLength: article1.content.length,
          },
          article2: {
            file: article2.file,
            title: article2.title,
            contentLength: article2.content.length,
          },
          titleSimilarity: Math.round(titleSimilarity * 100),
          contentSimilarity: Math.round(contentSimilarity * 100),
          totalScore: Math.round((titleSimilarity * 0.6 + contentSimilarity * 0.4) * 100),
          commonSections: commonSections.length,
          commonSectionsDetails: commonSections.slice(0, 3), // 最初の3つだけ表示
        });
      }
    }
  }
  
  // スコア順にソート
  similarPairs.sort((a, b) => b.totalScore - a.totalScore);
  
  return similarPairs;
}

// メイン処理
try {
  console.log('季節別記事の類似度を分析しています...');
  
  const similarPairs = findSimilarArticles();
  
  if (similarPairs.length === 0) {
    console.log('類似記事は見つかりませんでした。');
  } else {
    console.log(`\n${similarPairs.length}組の類似記事が見つかりました:\n`);
    console.log('='.repeat(100));
    
    similarPairs.forEach((pair, index) => {
      console.log(`\n【類似ペア ${index + 1}】総合スコア: ${pair.totalScore}%`);
      console.log(`  タイトル類似度: ${pair.titleSimilarity}%`);
      console.log(`  内容類似度: ${pair.contentSimilarity}%`);
      console.log(`  共通セクション数: ${pair.commonSections}個`);
      console.log(`\n  記事1: ${pair.article1.file}`);
      console.log(`    タイトル: ${pair.article1.title}`);
      console.log(`    文字数: ${pair.article1.contentLength}文字`);
      console.log(`\n  記事2: ${pair.article2.file}`);
      console.log(`    タイトル: ${pair.article2.title}`);
      console.log(`    文字数: ${pair.article2.contentLength}文字`);
      
      if (pair.commonSectionsDetails && pair.commonSectionsDetails.length > 0) {
        console.log(`\n  共通セクション例:`);
        pair.commonSectionsDetails.forEach((section, idx) => {
          console.log(`    ${idx + 1}. 「${section.heading1}」 ↔ 「${section.heading2}」`);
          console.log(`       見出し類似度: ${section.headingSimilarity}%, 本文類似度: ${section.textSimilarity}%`);
        });
      }
      
      console.log('\n' + '-'.repeat(100));
    });
    
    // 統計情報
    console.log('\n【統計情報】');
    console.log(`  タイトル類似度が70%以上のペア: ${similarPairs.filter(p => p.titleSimilarity >= 70).length}組`);
    console.log(`  内容類似度が50%以上のペア: ${similarPairs.filter(p => p.contentSimilarity >= 50).length}組`);
    console.log(`  総合スコアが60%以上のペア: ${similarPairs.filter(p => p.totalScore >= 60).length}組`);
  }
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

