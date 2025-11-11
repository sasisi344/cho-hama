import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// エリア名のマッピング
const areaMap = {
  'omote-hamanako': '表浜名湖',
  'naka-hamanako': '中浜名湖',
  'oku-hamanako': '奥浜名湖',
};

// 月別記事の判定
function isMonthlyArticle(title) {
  return /^\d{1,2}月の浜名湖でおすすめの釣りポイント\d+選$/.test(title);
}

// ポイント紹介記事の冒頭部分をチェック・修正
function fixPointArticleIntro(content, title, category) {
  const areaName = areaMap[category] || '';
  const pointName = title.replace(/～.*$/, '').trim();
  
  // 必須要素をチェック
  const hasGreeting = content.includes('『釣！浜名湖』をご覧いただきありがとうございます！');
  const hasDescription = content.includes('記事内容は、ポイントの詳細からはじまり、季節ごとに釣れやすい魚と方法などをまとめています。');
  const hasIntroduction = content.includes('本記事') && (content.includes('について紹介します') || content.includes('を解説しています'));
  const hasAreaName = areaName && content.includes(`${areaName}エリア`);
  
  let fixedContent = content;
  let changes = [];
  
  // 冒頭部分を修正
  if (!hasGreeting || !hasDescription || !hasIntroduction || !hasAreaName) {
    // 冒頭部分を抽出
    const lines = fixedContent.split('\n');
    let introEndIndex = 0;
    
    // 基本情報セクションの開始位置を探す
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^## .*の基本情報$/)) {
        introEndIndex = i;
        break;
      }
    }
    
    // 冒頭部分を再構築
    const introLines = [];
    
    // 挨拶
    if (!hasGreeting) {
      introLines.push('『釣！浜名湖』をご覧いただきありがとうございます！');
      changes.push('冒頭の挨拶を追加');
    } else {
      introLines.push(lines.find(l => l.includes('『釣！浜名湖』')) || '『釣！浜名湖』をご覧いただきありがとうございます！');
    }
    
    introLines.push('');
    
    // 記事内容の説明
    if (!hasDescription) {
      introLines.push('記事内容は、ポイントの詳細からはじまり、季節ごとに釣れやすい魚と方法などをまとめています。');
      changes.push('記事内容の説明を追加');
    } else {
      const descLine = lines.find(l => l.includes('記事内容は、ポイントの詳細からはじまり'));
      if (descLine) introLines.push(descLine);
    }
    
    // 本記事の紹介
    let introLine = '';
    if (!hasIntroduction) {
      introLine = `本記事は「**${pointName}**」について紹介します！`;
      changes.push('本記事の紹介を追加');
    } else {
      const introMatch = lines.find(l => l.includes('本記事') && (l.includes('について紹介します') || l.includes('を解説しています')));
      if (introMatch) {
        introLine = introMatch;
        // エリア名が含まれていない場合は追加
        if (!hasAreaName && areaName) {
          introLine = introLine.replace(/本記事は「\*\*([^*]+)\*\*」/, `本記事は「**${pointName}**」について、${areaName}エリアの`);
          changes.push('エリア名を追加');
        }
      } else {
        introLine = `本記事は「**${pointName}**」について紹介します！`;
        changes.push('本記事の紹介を追加');
      }
    }
    
    if (introLine) {
      introLines.push(introLine);
    }
    
    // エリア名の明記
    if (!hasAreaName && areaName) {
      introLines.push('');
      introLines.push(`${areaName}エリアの${pointName}は、`);
      changes.push('エリア名の明記を追加');
    }
    
    introLines.push('');
    
    // 既存の冒頭部分の残りを取得（挨拶や説明以外の部分）
    const existingIntro = lines.slice(0, introEndIndex).filter(line => {
      return !line.includes('『釣！浜名湖』') &&
             !line.includes('記事内容は、ポイントの詳細からはじまり') &&
             !line.includes('本記事') &&
             !line.match(/^## .*の基本情報$/);
    });
    
    // 新しい冒頭部分を構築
    const newIntro = [...introLines, ...existingIntro].join('\n');
    const restContent = lines.slice(introEndIndex).join('\n');
    fixedContent = newIntro + '\n' + restContent;
  }
  
  return { content: fixedContent, changes };
}

// 月別記事のフロントマターをチェック・修正
function fixMonthlyArticleFrontmatter(data, title) {
  const changes = [];
  const fixedData = { ...data };
  
  // categoryを「まとめ」に修正
  if (fixedData.category === 'season-post') {
    fixedData.category = 'まとめ';
    changes.push('categoryを「まとめ」に修正');
  }
  
  return { data: fixedData, changes };
}

// 記事を処理
function processArticle(filePath, relativePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    const category = data.category || '';
    const title = data.title || '';
    let allChanges = [];
    let fixedData = { ...data };
    let fixedContent = content;
    
    // ポイント紹介記事の場合
    if (category === 'omote-hamanako' || category === 'naka-hamanako' || category === 'oku-hamanako') {
      const result = fixPointArticleIntro(content, title, category);
      fixedContent = result.content;
      allChanges.push(...result.changes);
    }
    
    // 月別記事の場合
    if (isMonthlyArticle(title) && category === 'season-post') {
      const result = fixMonthlyArticleFrontmatter(fixedData, title);
      fixedData = result.data;
      allChanges.push(...result.changes);
    }
    
    // 変更がある場合のみファイルを更新
    if (allChanges.length > 0) {
      // フロントマターを生成
      const frontmatterLines = Object.entries(fixedData)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
          }
          if (typeof value === 'string') {
            if (key === 'published' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return `${key}: ${value}`;
            }
            const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
            return `${key}: "${escaped}"`;
          }
          if (typeof value === 'boolean') {
            return `${key}: ${value}`;
          }
          if (value === null || value === undefined) {
            return `${key}: ""`;
          }
          return `${key}: ${value}`;
        });
      
      const newContent = `---\n${frontmatterLines.join('\n')}\n---\n\n${fixedContent}`;
      fs.writeFileSync(filePath, newContent, 'utf8');
      
      return {
        success: true,
        changes: allChanges,
        file: relativePath,
      };
    }
    
    return {
      success: true,
      skipped: true,
      file: relativePath,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      file: relativePath,
    };
  }
}

// ディレクトリを再帰的に処理
function processDirectory(directory, relativePath = '') {
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const result = processDirectory(filePath, path.join(relativePath, file));
      updatedCount += result.updatedCount;
      skippedCount += result.skippedCount;
      errorCount += result.errorCount;
    } else if (file.endsWith('.md')) {
      const result = processArticle(filePath, path.join(relativePath, file));
      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          console.log(`✓ ${result.file}`);
          if (result.changes && result.changes.length > 0) {
            result.changes.forEach(change => {
              console.log(`  - ${change}`);
            });
          }
          updatedCount++;
        }
      } else {
        console.error(`✗ ${result.file}: ${result.error}`);
        errorCount++;
      }
    }
  });
  
  return { updatedCount, skippedCount, errorCount };
}

console.log('ライティングルールに準拠するように記事を修正中...\n');

const { updatedCount, skippedCount, errorCount } = processDirectory(postsDir);

console.log(`\n✅ 完了！`);
console.log(`   修正: ${updatedCount}件`);
console.log(`   スキップ: ${skippedCount}件`);
console.log(`   エラー: ${errorCount}件`);

