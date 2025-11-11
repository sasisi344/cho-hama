import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');
const oldPostsDir = path.join(scriptDir, 'old-chohama');

// 元のファイルから日時を取得する関数
function getOriginalDate(filePath) {
  try {
    // 現在のファイルからタイトルを取得
    const currentContent = fs.readFileSync(filePath, 'utf8');
    const { data: currentData } = matter(currentContent);
    const currentTitle = currentData.title || '';
    
    // src/content/postsからの相対パスを取得
    const relativePath = path.relative(postsDir, filePath);
    const parts = relativePath.split(path.sep);
    
    // エリアフォルダをマッピング
    const areaMap = {
      'omote-hamanako': 'omote-hamanako',
      'naka-hamanako': 'naka-hamanako',
      'oku-hamanako': 'oku-hamanako',
    };
    
    const area = areaMap[parts[0]];
    if (!area) return null;
    
    // 元のファイルディレクトリ
    const oldAreaDir = path.join(oldPostsDir, area);
    if (!fs.existsSync(oldAreaDir)) return null;
    
    // 元のファイルを検索（タイトルでマッチング）
    const oldFiles = fs.readdirSync(oldAreaDir).filter(f => f.endsWith('.md'));
    
    for (const oldFile of oldFiles) {
      const oldFilePath = path.join(oldAreaDir, oldFile);
      try {
        const oldContent = fs.readFileSync(oldFilePath, 'utf8');
        const { data: oldData } = matter(oldContent);
        
        // タイトルが一致するか、またはタイトルの主要部分が一致するか確認
        const oldTitle = oldData.title || '';
        if (oldTitle.includes(currentTitle.replace(/～.*$/, '').trim()) || 
            currentTitle.includes(oldTitle.replace(/～.*$/, '').trim())) {
          if (oldData.published) {
            // 日付を文字列形式に変換
            const dateStr = typeof oldData.published === 'string' 
              ? oldData.published 
              : oldData.published.toISOString().split('T')[0];
            return dateStr;
          }
        }
      } catch (e) {
        // エラーは無視
      }
    }
  } catch (e) {
    // エラーは無視
  }
  
  return null;
}

// 現在の日時を取得（YYYY-MM-DD形式）
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 記事を処理してpublishedを更新
function updatePublishedDate(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // 元のpublished日時を取得（元のファイルから）
    const originalDate = getOriginalDate(filePath);
    
    // 元の日時が取得できない場合は、現在のdateフィールドまたはpublishedを使用
    const dateToUse = originalDate || data.date || data.published;
    
    // publishedを現在の日時に更新
    const newPublished = getCurrentDate();
    
    // フロントマターを更新（元の日時をdateフィールドとして保存）
    const updatedData = {
      ...data,
      published: newPublished,
      date: dateToUse, // 元の日時をdateフィールドとして保存
    };
    
    // 新しいフロントマターを生成
    const frontmatterLines = Object.entries(updatedData)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        if (typeof value === 'string') {
          return `${key}: "${value}"`;
        }
        if (typeof value === 'boolean') {
          return `${key}: ${value}`;
        }
        if (value instanceof Date) {
          return `${key}: ${value.toISOString().split('T')[0]}`;
        }
        return `${key}: ${value}`;
      });
    
    const newContent = `---\n${frontmatterLines.join('\n')}\n---\n\n${content}`;
    
    // ファイルを書き込み
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return {
      success: true,
      oldDate: dateToUse,
      newDate: newPublished,
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
  let errorCount = 0;
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const result = processDirectory(filePath, path.join(relativePath, file));
      updatedCount += result.updatedCount;
      errorCount += result.errorCount;
    } else if (file.endsWith('.md')) {
      const result = updatePublishedDate(filePath);
      if (result.success) {
        const displayPath = path.join(relativePath, file);
        if (result.skipped) {
          console.log(`⊘ ${displayPath} (dateフィールド既存のためスキップ)`);
        } else {
          console.log(`✓ ${displayPath} (date: ${result.oldDate}, published: ${result.newDate})`);
        }
        updatedCount++;
      } else {
        console.error(`✗ ${filePath}: ${result.error}`);
        errorCount++;
      }
    }
  });
  
  return { updatedCount, errorCount };
}

// メイン処理
try {
  const currentDate = getCurrentDate();
  console.log(`記事のpublished日時を更新します...`);
  console.log(`新しいpublished日時: ${currentDate}\n`);
  
  const { updatedCount, errorCount } = processDirectory(postsDir);
  
  console.log(`\n✅ 完了！`);
  console.log(`   更新: ${updatedCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

