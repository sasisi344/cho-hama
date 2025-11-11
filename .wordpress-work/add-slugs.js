import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// タイトルから英字slugを生成
function generateSlug(title) {
  if (!title || typeof title !== 'string') {
    return '';
  }
  
  // タイトルからポイント名を抽出（～以降を削除）
  let baseTitle = title.replace(/～.*$/, '').trim();
  
  // 日本語をローマ字に変換する簡易的なマッピング
  const romajiMap = {
    'はまゆう': 'hamayu',
    '大橋': 'ohashi',
    '内山': 'uchiyama',
    '海岸': 'kaigan',
    '女河浦': 'megaura',
    '海水浴場': 'kaisuiyokujo',
    '新居町': 'arai',
    '中之郷': 'nakano',
    '村櫛': 'murakushi',
    '漁港': 'gyoko',
    'ガーデンパーク': 'gardenpark',
    '松見ヶ浦': 'matsumigaura',
    '湖上': 'kojo',
    '干潟': 'higata',
    'サイトフィッシング': 'sitefishing',
    '湖南': 'konan',
    '高校': 'koko',
    '周辺': 'shuhen',
    '鷲津': 'washizu',
    '湾': 'wan',
    'ホトニクス': 'hotonics',
    'マイマイ': 'maimai',
    '伊目': 'ime',
    '佐久米': 'sakume',
    '庄内': 'shonai',
    '湖': 'ko',
    '気賀': 'kiga',
    '寸座': 'sunza',
    '瀬戸': 'seto',
    '水道': 'suido',
    '猪鼻湖': 'inohana',
    '三ヶ日': 'mikkabi',
    '舘山寺': 'tatesanji',
    '内浦湾': 'uchiurawan',
    '都田川': 'tsudagawa',
    '河口': 'kawaguchi',
    'サクラマル': 'sakuramaru',
    '弁天島': 'bentennjima',
    'ボートレース': 'boatrace',
    '浜名湖': 'hamanako',
    '競艇場': 'kyoteijo',
    '中之島': 'nakanojima',
    '渚園': 'nagisaen',
    '乙女園': 'otomeen',
    'うなぎ観音': 'unagikannon',
    '今切口': 'imagireguchi',
    '舞阪': 'maisaka',
    '堤': 'tei',
    '弁天島': 'bentennjima',
    '海浜公園': 'kaihinkoen',
    '新居': 'arai',
    '海釣公園': 'umizurikoen',
    'パークビレッジ': 'parkvillage',
    '砂揚場': 'sunaageba',
    '浜名港': 'hamanako',
    '網干場': 'amiboshijo',
    '舞阪港': 'maisakako',
    '10月': 'october',
    '11月': 'november',
    '12月': 'december',
    '1月': 'january',
    '2月': 'february',
    '3月': 'march',
    '4月': 'april',
    '5月': 'may',
    '6月': 'june',
    '7月': 'july',
    '8月': 'august',
    '9月': 'september',
    'おすすめ': 'recommended',
    '釣り': 'fishing',
    'ポイント': 'point',
    '選': 'selection',
    'カレイ': 'flounder',
    'ハゼ': 'goby',
    'ボート': 'boat',
    '投げ': 'nagashi',
    '入門': 'guide',
    'カワハギ': 'filefish',
    'ヘダイ': 'bream',
    '五目': 'gomoku',
    'アジ': 'aji',
    'サビキ': 'sabiki',
    'シーバス': 'seabass',
    'キビレ': 'kibire',
    '落ち': 'ochi',
    '夜': 'night',
    '電気ウキ': 'denkiuki',
    '完全': 'complete',
    'ガイド': 'guide',
    '初心者': 'beginner',
    '必見': 'mustsee',
    '冬': 'winter',
    '方法': 'method',
    'ルール': 'rule',
    'マナー': 'manner',
    'メバル': 'mebaru',
    'キス': 'kisu',
    'ベスト': 'best',
    '秋': 'autumn',
    '春': 'spring',
    '夏': 'summer',
    '家族': 'family',
    '安心': 'safe',
    '車': 'car',
    '横付け': 'yokotsuke',
    '設備': 'facility',
    '充実': 'equipped',
    'スズキ': 'suzuki',
    'クロダイ': 'kurodai',
    'タコ': 'tako',
    '攻略': 'strategy',
    'コウイカ': 'kouika',
    'エギング': 'eging',
    'ワインド': 'wind',
    '釣法': 'method',
    '使い分け': 'usage',
    '最前線': 'frontline',
    '深場': 'fukaba',
    '数釣り': 'kazuri',
    'テクニック': 'technique',
    '大型': 'large',
    '基本': 'basic',
    'ランカー': 'ranker',
    'ルアー': 'lure',
    '仕留める': 'shirumeru',
    'サイズアップ': 'sizeup',
    '美味しい': 'delicious',
    'ゲット': 'get',
    '開幕': 'opening',
    '晩秋': 'banshu',
    '奥': 'oku',
    'エリア': 'area',
    '30種類': '30species',
    'エサ': 'esa',
    'vs': 'vs',
    '最強': 'strongest',
    'カサゴ': 'kasago',
    '仕掛け': 'shikake',
    '時期': 'season',
    'タックル': 'tackle',
    '解説': 'explanation',
    '楽しむ': 'enjoy',
    '醍醐味': 'enjoyment',
    '評価': 'evaluation',
    '高い': 'high',
    '最適': 'optimal',
    'シーズン': 'season',
    'サヨリ': 'sayori',
    '徹底': 'thorough',
    'タチウオ': 'tachiuo',
    'ヒラメ': 'hirame',
    'メジナ': 'mejina',
    '引き味': 'hikimi',
    'いい': 'good',
    'ターゲット': 'target',
    '使われる': 'used',
    '紹介': 'introduction',
    '合わせた': 'matched',
    'アジング': 'ajing',
    '水温': 'suion',
    'チェック': 'check',
    '有能': 'useful',
    'ウェブサイト': 'website',
    '全域': 'zeniki',
    '水深': 'suishin',
    'ネット': 'net',
    '知る': 'know',
    '周辺': 'shuhen',
    '釣具店': 'tsuriguten',
    'エリア別': 'areabetsu',
    'まとめ': 'summary',
    '混雑': 'konzatsu',
    '避けれる': 'sakereru',
    '穴場': 'anaba',
    'ライブカメラ': 'livecamera',
    '海況': 'kaikyo',
    '今月': 'komgetsu',
    '何': 'nani',
    '釣れる': 'tsureru',
    'カレンダー': 'calendar',
    '公開': 'public',
    'ガイド': 'guide',
    '向け': 'muke',
    'おすすめ': 'recommended',
  };
  
  // ローマ字マッピングを適用
  let slug = baseTitle;
  for (const [japanese, romaji] of Object.entries(romajiMap)) {
    slug = slug.replace(new RegExp(japanese, 'g'), romaji);
  }
  
  // 英数字とハイフン以外を削除し、小文字に変換
  slug = slug
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 英数字、スペース、ハイフン以外を削除
    .replace(/\s+/g, '-') // スペースをハイフンに
    .replace(/-+/g, '-') // 連続するハイフンを1つに
    .replace(/^-+|-+$/g, ''); // 先頭と末尾のハイフンを削除
  
  return slug || 'untitled';
}

// 記事を処理してslugを追加
function addSlugToArticle(filePath, relativePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // 既にslugがある場合はスキップ
    if (data.slug && data.slug.trim() !== '') {
      return {
        success: true,
        skipped: true,
        slug: data.slug,
      };
    }
    
    // slugを生成
    const title = data.title || '';
    const slug = generateSlug(title);
    
    if (!slug || slug === 'untitled') {
      return {
        success: false,
        error: 'slugを生成できませんでした',
      };
    }
    
    // フロントマターを更新
    const updatedData = {
      ...data,
      slug: slug,
    };
    
    // 新しいフロントマターを生成
    const frontmatterLines = Object.entries(updatedData)
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
    
    const newContent = `---\n${frontmatterLines.join('\n')}\n---\n\n${content}`;
    
    // ファイルを書き込み
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    return {
      success: true,
      slug: slug,
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
  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      const result = processDirectory(filePath, path.join(relativePath, file));
      addedCount += result.addedCount;
      skippedCount += result.skippedCount;
      errorCount += result.errorCount;
    } else if (file.endsWith('.md')) {
      const result = addSlugToArticle(filePath, path.join(relativePath, file));
      if (result.success) {
        const displayPath = path.join(relativePath, file);
        if (result.skipped) {
          console.log(`⊘ ${displayPath} (slug既存: ${result.slug})`);
          skippedCount++;
        } else {
          console.log(`✓ ${displayPath}`);
          console.log(`  slug: ${result.slug}`);
          addedCount++;
        }
      } else {
        console.error(`✗ ${filePath}: ${result.error}`);
        errorCount++;
      }
    }
  });
  
  return { addedCount, skippedCount, errorCount };
}

console.log('記事にslugを追加中...\n');

const { addedCount, skippedCount, errorCount } = processDirectory(postsDir);

console.log(`\n✅ 完了！`);
console.log(`   追加: ${addedCount}件`);
console.log(`   スキップ: ${skippedCount}件`);
console.log(`   エラー: ${errorCount}件`);

