import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// 記事から[ad]を削除
function removeAdMarkers(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // [ad]を削除（大文字小文字を区別しない、複数行にまたがる可能性も考慮）
    let fixedContent = content;
    const adPattern = /\[ad\]/gi;
    const matches = fixedContent.match(adPattern);
    
    if (matches && matches.length > 0) {
      fixedContent = fixedContent.replace(adPattern, '');
      // 連続する空行を1つに
      fixedContent = fixedContent.replace(/\n{3,}/g, '\n\n');
      
      // フロントマターを生成
      const frontmatterLines = Object.entries(data)
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
        removedCount: matches.length,
      };
    }
    
    return {
      success: true,
      skipped: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ディレクトリを再帰的に処理
function processDirectory(directory, relativePath = '') {
  let removedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const result = processDirectory(filePath, path.join(relativePath, file));
      removedCount += result.removedCount;
      skippedCount += result.skippedCount;
      errorCount += result.errorCount;
    } else if (file.endsWith('.md')) {
      const result = removeAdMarkers(filePath);
      if (result.success) {
        const displayPath = path.join(relativePath, file);
        if (result.skipped) {
          skippedCount++;
        } else {
          console.log(`✓ ${displayPath} ([ad]を${result.removedCount}箇所削除)`);
          removedCount++;
        }
      } else {
        console.error(`✗ ${filePath}: ${result.error}`);
        errorCount++;
      }
    }
  });
  
  return { removedCount, skippedCount, errorCount };
}

console.log('記事から[ad]を削除中...\n');

const { removedCount, skippedCount, errorCount } = processDirectory(postsDir);

console.log(`\n✅ 完了！`);
console.log(`   [ad]削除: ${removedCount}件`);
console.log(`   スキップ: ${skippedCount}件`);
console.log(`   エラー: ${errorCount}件`);

