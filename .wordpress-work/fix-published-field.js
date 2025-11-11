import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// 記事を処理してpublishedフィールドの引用符を削除
function fixPublishedField(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // publishedフィールドが文字列の場合、引用符を削除
    let updated = false;
    const updatedData = { ...data };
    
    if (data.published) {
      // 文字列の場合、引用符を削除
      if (typeof data.published === 'string') {
        // 日付形式の文字列（YYYY-MM-DD）を確認
        if (data.published.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // そのまま使用（引用符なし）
          updatedData.published = data.published;
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
          // publishedフィールドの場合は引用符なし
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
        if (value === null) {
          return `${key}: null`;
        }
        return `${key}: ${value}`;
      });
    
    const newContent = `---\n${frontmatterLines.join('\n')}\n---\n\n${content}`;
    
    // ファイルを書き込み
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return {
      success: true,
      published: updatedData.published,
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
          console.log(`✓ ${displayPath} (published: ${result.published})`);
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

// メイン処理
try {
  console.log('publishedフィールドの引用符を削除中...\n');
  
  const { updatedCount, skippedCount, errorCount } = processDirectory(postsDir);
  
  console.log(`\n✅ 完了！`);
  console.log(`   更新: ${updatedCount}件`);
  console.log(`   スキップ: ${skippedCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

