import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.join(__dirname, 'old-chohama', 'season-post');
const baseOutputDir = path.join(__dirname, 'old-chohama');

// 分類フォルダの定義
const categories = {
  monthly: path.join(baseOutputDir, 'monthly'),
  'fish-species': path.join(baseOutputDir, 'fish-species'),
  'fishing-methods': path.join(baseOutputDir, 'fishing-methods'),
  'beginner-guide': path.join(baseOutputDir, 'beginner-guide'),
  information: path.join(baseOutputDir, 'information'),
  seasonal: path.join(baseOutputDir, 'seasonal'),
};

// フォルダを作成
Object.values(categories).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 分類ルール
function categorizeArticle(filename, title, tags, category) {
  const titleLower = title.toLowerCase();
  const tagsLower = tags.toLowerCase();
  const filenameLower = filename.toLowerCase();

  // 月別の記事（1月、2月...12月の「おすすめの釣りポイント○選」）
  if (/^\d+月の/.test(title) && /おすすめの釣りポイント/.test(title)) {
    return 'monthly';
  }

  // 季節別の記事（春、夏、秋、冬）
  if (/【(春|夏|秋|冬)の/.test(title) || /^(春|夏|秋|冬)の/.test(title)) {
    return 'seasonal';
  }

  // 初心者向けガイド
  if (/初心者/.test(title) || /初心者/.test(tagsLower) || /入門/.test(title)) {
    return 'beginner-guide';
  }

  // 情報・ガイド系
  const infoKeywords = [
    'ルール', 'マナー', 'エサ', '釣具店', '海況', '水温', 'カレンダー',
    'ライブカメラ', '水深', '30種類', '車横付け', '穴場', '雷', '安全',
    'ウェーディングポイント', '豆知識', 'まとめ'
  ];
  if (infoKeywords.some(keyword => title.includes(keyword) || tagsLower.includes(keyword))) {
    return 'information';
  }

  // 釣り方別の記事（魚種が含まれていても、釣り方が主テーマの場合は釣り方別）
  const methodKeywords = [
    'ボート釣り', '夜釣り', '電気ウキ', 'エギング', 'ワインド', 'アジング'
  ];
  const isMethodMain = methodKeywords.some(keyword => 
    title.includes(keyword) && (
      title.indexOf(keyword) < title.indexOf('釣り') || 
      !title.includes('釣り') ||
      /攻略|ガイド|方法|テクニック/.test(title)
    )
  );

  // 魚種別の記事
  const fishKeywords = [
    'カレイ', 'ハゼ', 'キビレ', 'シーバス', 'スズキ', 'タコ', 'カワハギ',
    'サヨリ', 'メジナ', 'カサゴ', 'ヒラメ', 'タチウオ', 'アジ', 'メバル',
    'クロダイ', 'キス', 'コウイカ', 'マゴチ', 'ヘダイ'
  ];
  const hasFish = fishKeywords.some(keyword => title.includes(keyword));

  // 釣り方が主テーマの場合は釣り方別に分類
  if (isMethodMain) {
    return 'fishing-methods';
  }

  // 魚種が含まれている場合は魚種別に分類
  if (hasFish) {
    return 'fish-species';
  }

  // 釣り方別の記事（その他）
  const otherMethodKeywords = [
    '投げ釣り', 'サビキ釣り', 'ウェーディング', 'ルアー', 'エサvsルアー'
  ];
  if (otherMethodKeywords.some(keyword => title.includes(keyword) || tagsLower.includes(keyword))) {
    return 'fishing-methods';
  }

  // categoryフィールドを確認
  if (category === '釣り方') {
    // 魚種が含まれていれば魚種別、そうでなければ釣り方別
    if (hasFish && !isMethodMain) {
      return 'fish-species';
    }
    return 'fishing-methods';
  }

  if (category === 'まとめ') {
    return 'information';
  }

  // デフォルトは情報系
  return 'information';
}

// メイン処理
try {
  const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.md'));
  
  console.log(`合計 ${files.length} 件の記事を分類します...`);
  
  const categoryCounts = {
    monthly: 0,
    'fish-species': 0,
    'fishing-methods': 0,
    'beginner-guide': 0,
    information: 0,
    seasonal: 0,
  };
  
  files.forEach(filename => {
    const filePath = path.join(sourceDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // タイトルを取得
    const titleMatch = content.match(/^title:\s*(.+?)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // タグを取得
    const tagsMatch = content.match(/^tags:\s*\[(.*?)\]/m);
    const tags = tagsMatch ? tagsMatch[1] : '';
    
    // カテゴリを取得
    const categoryMatch = content.match(/^category:\s*(.+?)$/m);
    const category = categoryMatch ? categoryMatch[1].trim() : '';
    
    // 分類を決定
    const targetCategory = categorizeArticle(filename, title, tags, category);
    
    // ファイルを移動
    const targetDir = categories[targetCategory];
    const targetPath = path.join(targetDir, filename);
    
    fs.copyFileSync(filePath, targetPath);
    categoryCounts[targetCategory]++;
    
    console.log(`${filename} → ${targetCategory}`);
  });
  
  console.log('\n分類完了！');
  console.log('カテゴリ別の記事数:');
  Object.entries(categoryCounts).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} 件`);
  });
  console.log(`\n合計: ${files.length} 件の記事を分類しました。`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

