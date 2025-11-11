import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const sourceBaseDir = path.join(scriptDir, 'old-chohama');
const targetBaseDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// ファイル名をスラッグに変換
function slugify(text) {
  if (!text || typeof text !== 'string') {
    return 'untitled';
  }
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF-]+/g, '') // 日本語文字も許可
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 記事を処理してコピー
function processArticle(sourcePath, targetDir) {
  try {
    const fileContent = fs.readFileSync(sourcePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // ファイル名を生成
    const title = data.title || path.basename(sourcePath, '.md');
    const slug = slugify(title);
    const fileName = `${slug}.md`;
    const targetPath = path.join(targetDir, fileName);
    
    // 既にファイルが存在する場合はスキップ
    if (fs.existsSync(targetPath)) {
      console.log(`⊘ ${fileName} (既に存在)`);
      return { success: true, skipped: true };
    }
    
    // フロントマターを更新
    const frontmatter = {
      ...data,
      category: 'season-post',
      lang: data.lang || 'ja',
    };
    
    // 新しいフロントマターを生成
    const frontmatterLines = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        if (typeof value === 'string') {
          // publishedフィールドの場合は引用符なし（YYYY-MM-DD形式）
          if (key === 'published' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return `${key}: ${value}`;
          }
          // 文字列内の改行や特殊文字をエスケープ
          const escapedValue = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          return `${key}: "${escapedValue}"`;
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
    fs.writeFileSync(targetPath, newContent, 'utf8');
    console.log(`✓ ${fileName}`);
    
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`✗ Error processing ${sourcePath}:`, error.message);
    return { success: false, error: error.message };
  }
}

// メイン処理
try {
  console.log('season-post記事をsrc/content/postsに追加中...\n');
  
  const sourceDir = path.join(sourceBaseDir, 'season-post');
  const targetDir = path.join(targetBaseDir, 'season-post');
  
  if (!fs.existsSync(sourceDir)) {
    console.error(`エラー: ${sourceDir} が見つかりません`);
    process.exit(1);
  }
  
  // ターゲットディレクトリを作成
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`📁 ${targetDir} を作成しました\n`);
  }
  
  // ファイルを処理
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.md'));
  console.log(`📂 season-post (${files.length}件):\n`);
  
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const result = processArticle(sourcePath, targetDir);
    if (result.success) {
      if (result.skipped) {
        skippedCount++;
      } else {
        successCount++;
      }
    } else {
      errorCount++;
    }
  });
  
  console.log(`\n✅ 完了！`);
  console.log(`   追加: ${successCount}件`);
  console.log(`   スキップ: ${skippedCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

