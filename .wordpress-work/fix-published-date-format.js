import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// 日付文字列をYYYY-MM-DD形式に変換
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  // 既にYYYY-MM-DD形式の場合
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // GMT形式の文字列をパース
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    // パースエラーは無視
  }
  
  return null;
}

// 記事を処理してpublishedフィールドを修正
function fixPublishedField(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // publishedフィールドを修正
    let updated = false;
    const updatedData = { ...data };
    
    if (data.published) {
      const parsedDate = parseDate(data.published);
      if (parsedDate && parsedDate !== data.published) {
        updatedData.published = parsedDate;
        updated = true;
      } else if (typeof data.published === 'string' && !data.published.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD形式でない場合は変換を試みる
        const parsed = parseDate(data.published);
        if (parsed) {
          updatedData.published = parsed;
          updated = true;
        }
      }
    }
    
    if (!updated) {
      return {
        success: true,
        skipped: true,
      };
    }
    
    // 新しいフロントマターを生成
    const frontmatterLines = Object.entries(updatedData)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        if (typeof value === 'string') {
          // publishedフィールドの場合は引用符なし（YYYY-MM-DD形式）
          if (key === 'published' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return `${key}: ${value}`;
          }
          // その他の文字列は引用符付き
          const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          return `${key}: "${escaped}"`;
        }
        if (typeof value === 'boolean') {
          return `${key}: ${value}`;
        }
        if (value instanceof Date) {
          return `${key}: ${value.toISOString().split('T')[0]}`;
        }
        if (value === null || value === undefined) {
          return `${key}: ""`;
        }
        return `${key}: ${value}`;
      });
    
    const newContent = `---\n${frontmatterLines.join('\n')}\n---\n\n${content}`;
    
    // ファイルを書き込み
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return {
      success: true,
      oldPublished: data.published,
      newPublished: updatedData.published,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ディレクトリを再帰的に処理
function processDirectory(dirPath, relativePath = '') {
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const result = processDirectory(filePath, path.join(relativePath, file));
      updatedCount += result.updatedCount;
      skippedCount += result.skippedCount;
      errorCount += result.errorCount;
    } else if (file.endsWith('.md')) {
      const result = fixPublishedField(filePath);
      if (result.success) {
        const displayPath = path.join(relativePath, file);
        if (result.skipped) {
          skippedCount++;
        } else {
          console.log(`✓ ${displayPath}`);
          console.log(`  ${result.oldPublished} → ${result.newPublished}`);
          updatedCount++;
        }
      } else {
        console.error(`✗ ${filePath}: ${result.error}`);
        errorCount++;
      }
    }
  });
  
  return { updatedCount, skippedCount, errorCount };
}

console.log('publishedフィールドをYYYY-MM-DD形式に修正中...\n');

const { updatedCount, skippedCount, errorCount } = processDirectory(postsDir);

console.log(`\n✅ 完了！`);
console.log(`   更新: ${updatedCount}件`);
console.log(`   スキップ: ${skippedCount}件`);
console.log(`   エラー: ${errorCount}件`);

