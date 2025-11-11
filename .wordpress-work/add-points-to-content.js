import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const sourceBaseDir = path.join(scriptDir, '..', '.wordpress-work', 'old-chohama');
const targetBaseDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// エリア別のフォルダマッピング
const areaFolders = {
  '表浜名湖': 'omote-hamanako',
  '中浜名湖': 'naka-hamanako',
  '奥浜名湖': 'oku-hamanako',
};

// ファイル名をスラッグに変換
function slugify(text) {
  return text
    .replace(/～.*$/, '') // ～以降を削除
    .replace(/[（）()]/g, '') // 括弧を削除
    .replace(/\s+/g, '-') // スペースをハイフンに
    .toLowerCase();
}

// 記事を処理してコピー
function processArticle(sourcePath, targetDir, area) {
  try {
    const fileContent = fs.readFileSync(sourcePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // ファイル名を生成
    const title = data.title || path.basename(sourcePath, '.md');
    const slug = slugify(title);
    const fileName = `${slug}.md`;
    const targetPath = path.join(targetDir, fileName);
    
    // フロントマターを更新
    const frontmatter = {
      ...data,
      category: areaFolders[area] || data.category || '',
      lang: data.lang || 'ja',
    };
    
    // 新しいフロントマターを生成
    const newContent = `---\n${Object.entries(frontmatter)
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
      })
      .join('\n')}\n---\n\n${content}`;
    
    // ファイルを書き込み
    fs.writeFileSync(targetPath, newContent, 'utf8');
    console.log(`✓ ${fileName}`);
    
    return true;
  } catch (error) {
    console.error(`✗ Error processing ${sourcePath}:`, error.message);
    return false;
  }
}

// メイン処理
try {
  console.log('ポイント記事をsrc/content/postsに追加中...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  // 各エリアのフォルダを処理
  Object.keys(areaFolders).forEach(area => {
    const sourceDir = path.join(sourceBaseDir, areaFolders[area]);
    const targetDir = path.join(targetBaseDir, areaFolders[area]);
    
    if (!fs.existsSync(sourceDir)) {
      console.log(`⚠ ${sourceDir} が見つかりません`);
      return;
    }
    
    // ターゲットディレクトリを作成
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`📁 ${targetDir} を作成しました`);
    }
    
    // ファイルを処理
    const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.md'));
    console.log(`\n📂 ${area} (${files.length}件):`);
    
    files.forEach(file => {
      const sourcePath = path.join(sourceDir, file);
      if (processArticle(sourcePath, targetDir, area)) {
        successCount++;
      } else {
        errorCount++;
      }
    });
  });
  
  console.log(`\n✅ 完了！`);
  console.log(`   成功: ${successCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

