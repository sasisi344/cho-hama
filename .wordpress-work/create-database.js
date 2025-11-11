import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// スクリプトの場所を基準にパスを設定
const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const baseDir = path.join(scriptDir, 'old-chohama');
const outputFile = path.join(scriptDir, 'cho-hamanako-database.json');

// データベース構造
const database = {
  points: {}, // ポイント名をキーにしたオブジェクト
  fishingMethods: {}, // 釣り方をキーにしたオブジェクト
  fishSpecies: {}, // 魚種をキーにしたオブジェクト
  seasons: { // 季節ごとのデータ
    spring: { points: [], fish: [], methods: [] },
    summer: { points: [], fish: [], methods: [] },
    autumn: { points: [], fish: [], methods: [] },
    winter: { points: [], fish: [], methods: [] },
  },
  areas: { // エリアごとのデータ
    '表浜名湖': { points: [], fish: [], methods: [] },
    '中浜名湖': { points: [], fish: [], methods: [] },
    '奥浜名湖': { points: [], fish: [], methods: [] },
  },
  metadata: {
    createdAt: new Date().toISOString(),
    totalArticles: 0,
    totalPoints: 0,
    totalFishSpecies: 0,
    totalFishingMethods: 0,
  }
};

// 魚種の正規化マッピング
const fishNormalizeMap = {
  'シーバス': 'シーバス',
  'スズキ': 'シーバス',
  'キビレ': 'キビレ',
  'チヌ': 'キビレ',
  'クロダイ': 'クロダイ',
  'メジナ': 'メジナ',
  'メバル': 'メバル',
  'カサゴ': 'カサゴ',
  'カレイ': 'カレイ',
  'ハゼ': 'ハゼ',
  'キス': 'キス',
  'アジ': 'アジ',
  'イワシ': 'イワシ',
  'タコ': 'タコ',
  'マゴチ': 'マゴチ',
  'コウイカ': 'コウイカ',
  'カワハギ': 'カワハギ',
  'サヨリ': 'サヨリ',
  'ヘダイ': 'ヘダイ',
  'ギマ': 'ギマ',
  'カマス': 'カマス',
  'タチウオ': 'タチウオ',
  'ヒラメ': 'ヒラメ',
  'アナゴ': 'アナゴ',
  'サバ': 'サバ',
  '青物': '青物',
  'ブリ': '青物',
  'カンパチ': '青物',
  'アオリイカ': 'アオリイカ',
};

// 釣り方の正規化マッピング
const methodNormalizeMap = {
  '投げ釣り': '投げ釣り',
  '前打ち': '前打ち',
  'ウキフカセ': 'ウキフカセ',
  'フカセ釣り': 'ウキフカセ',
  'ヘチ釣り': 'ヘチ釣り',
  '穴釣り': '穴釣り',
  'ルアー釣り': 'ルアー釣り',
  'ルアー': 'ルアー釣り',
  'サビキ釣り': 'サビキ釣り',
  'エギング': 'エギング',
  'タコエギ': 'エギング',
  '電気ウキ': '電気ウキ',
  '電気ウキ釣り': '電気ウキ',
  'ウェーディング': 'ウェーディング',
  'メバリング': 'メバリング',
  'サーフルアー': 'サーフルアー',
  'ショアジギング': 'ショアジギング',
  'ワインド釣法': 'ワインド釣法',
  'ボトムワインド': 'ワインド釣法',
  'ダンゴ釣り': 'ダンゴ釣り',
  'ウキ釣り': 'ウキ釣り',
  'ブッコミ': 'ブッコミ',
};

// 季節の判定
function getSeason(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('春') || lowerText.includes('3月') || lowerText.includes('4月') || lowerText.includes('5月')) {
    return 'spring';
  }
  if (lowerText.includes('夏') || lowerText.includes('6月') || lowerText.includes('7月') || lowerText.includes('8月')) {
    return 'summer';
  }
  if (lowerText.includes('秋') || lowerText.includes('9月') || lowerText.includes('10月') || lowerText.includes('11月')) {
    return 'autumn';
  }
  if (lowerText.includes('冬') || lowerText.includes('12月') || lowerText.includes('1月') || lowerText.includes('2月')) {
    return 'winter';
  }
  return null;
}

// 魚種を抽出
function extractFishSpecies(text) {
  const fishList = [];
  const fishPatterns = Object.keys(fishNormalizeMap);
  
  fishPatterns.forEach(fish => {
    if (text.includes(fish)) {
      const normalized = fishNormalizeMap[fish];
      if (!fishList.includes(normalized)) {
        fishList.push(normalized);
      }
    }
  });
  
  return fishList;
}

// 釣り方を抽出
function extractFishingMethods(text) {
  const methodList = [];
  const methodPatterns = Object.keys(methodNormalizeMap);
  
  methodPatterns.forEach(method => {
    if (text.includes(method)) {
      const normalized = methodNormalizeMap[method];
      if (!methodList.includes(normalized)) {
        methodList.push(normalized);
      }
    }
  });
  
  return methodList;
}

// ポイント名を抽出
function extractPointName(title, content) {
  // タイトルからポイント名を抽出
  let pointName = title.replace(/～.*/, '').replace(/～.*/, '').trim();
  
  // 基本情報セクションからも抽出を試みる
  const basicInfoMatch = content.match(/ポイント名[：:]\s*([^\n]+)/);
  if (basicInfoMatch) {
    pointName = basicInfoMatch[1].trim();
  }
  
  return pointName;
}

// エリアを抽出
function extractArea(content, category) {
  if (category === '表浜名湖') return '表浜名湖';
  if (category === '中浜名湖') return '中浜名湖';
  if (category === '奥浜名湖') return '奥浜名湖';
  
  // コンテンツからも抽出を試みる
  if (content.includes('表浜名湖')) return '表浜名湖';
  if (content.includes('中浜名湖')) return '中浜名湖';
  if (content.includes('奥浜名湖')) return '奥浜名湖';
  
  return null;
}

// 記事を処理
function processArticle(filePath, relativePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    const title = data.title || '';
    const category = data.category || '';
    const tags = Array.isArray(data.tags) ? data.tags : [];
    
    // ポイント名を抽出
    const pointName = extractPointName(title, content);
    
    // エリアを抽出
    const area = extractArea(content, category);
    
    // 魚種を抽出
    const fishSpecies = extractFishSpecies(content);
    
    // 釣り方を抽出
    const fishingMethods = extractFishingMethods(content);
    
    // 季節を判定
    const season = getSeason(content + ' ' + title);
    
    // ポイントデータベースに追加
    if (pointName && !database.points[pointName]) {
      database.points[pointName] = {
        name: pointName,
        area: area,
        fishSpecies: [],
        fishingMethods: [],
        seasons: {
          spring: { fish: [], methods: [] },
          summer: { fish: [], methods: [] },
          autumn: { fish: [], methods: [] },
          winter: { fish: [], methods: [] },
        },
        articles: [],
      };
    }
    
    if (pointName && database.points[pointName]) {
      // 魚種を追加
      fishSpecies.forEach(fish => {
        if (!database.points[pointName].fishSpecies.includes(fish)) {
          database.points[pointName].fishSpecies.push(fish);
        }
      });
      
      // 釣り方を追加
      fishingMethods.forEach(method => {
        if (!database.points[pointName].fishingMethods.includes(method)) {
          database.points[pointName].fishingMethods.push(method);
        }
      });
      
      // 季節別データを追加
      if (season) {
        fishSpecies.forEach(fish => {
          if (!database.points[pointName].seasons[season].fish.includes(fish)) {
            database.points[pointName].seasons[season].fish.push(fish);
          }
        });
        
        fishingMethods.forEach(method => {
          if (!database.points[pointName].seasons[season].methods.includes(method)) {
            database.points[pointName].seasons[season].methods.push(method);
          }
        });
      }
      
      // 記事情報を追加
      database.points[pointName].articles.push({
        title: title,
        path: relativePath,
        category: category,
        tags: tags,
      });
    }
    
    // 魚種データベースに追加
    fishSpecies.forEach(fish => {
      if (!database.fishSpecies[fish]) {
        database.fishSpecies[fish] = {
          name: fish,
          points: [],
          fishingMethods: [],
          seasons: {
            spring: [],
            summer: [],
            autumn: [],
            winter: [],
          },
        };
      }
      
      if (pointName && !database.fishSpecies[fish].points.includes(pointName)) {
        database.fishSpecies[fish].points.push(pointName);
      }
      
      fishingMethods.forEach(method => {
        if (!database.fishSpecies[fish].fishingMethods.includes(method)) {
          database.fishSpecies[fish].fishingMethods.push(method);
        }
      });
      
      if (season) {
        if (!database.fishSpecies[fish].seasons[season].includes(pointName)) {
          database.fishSpecies[fish].seasons[season].push(pointName);
        }
      }
    });
    
    // 釣り方データベースに追加
    fishingMethods.forEach(method => {
      if (!database.fishingMethods[method]) {
        database.fishingMethods[method] = {
          name: method,
          points: [],
          fishSpecies: [],
          seasons: {
            spring: [],
            summer: [],
            autumn: [],
            winter: [],
          },
        };
      }
      
      if (pointName && !database.fishingMethods[method].points.includes(pointName)) {
        database.fishingMethods[method].points.push(pointName);
      }
      
      fishSpecies.forEach(fish => {
        if (!database.fishingMethods[method].fishSpecies.includes(fish)) {
          database.fishingMethods[method].fishSpecies.push(fish);
        }
      });
      
      if (season) {
        if (!database.fishingMethods[method].seasons[season].includes(pointName)) {
          database.fishingMethods[method].seasons[season].push(pointName);
        }
      }
    });
    
    // エリアデータベースに追加
    if (area) {
      if (pointName && !database.areas[area].points.includes(pointName)) {
        database.areas[area].points.push(pointName);
      }
      
      fishSpecies.forEach(fish => {
        if (!database.areas[area].fish.includes(fish)) {
          database.areas[area].fish.push(fish);
        }
      });
      
      fishingMethods.forEach(method => {
        if (!database.areas[area].methods.includes(method)) {
          database.areas[area].methods.push(method);
        }
      });
    }
    
    // 季節データベースに追加
    if (season) {
      if (pointName && !database.seasons[season].points.includes(pointName)) {
        database.seasons[season].points.push(pointName);
      }
      
      fishSpecies.forEach(fish => {
        if (!database.seasons[season].fish.includes(fish)) {
          database.seasons[season].fish.push(fish);
        }
      });
      
      fishingMethods.forEach(method => {
        if (!database.seasons[season].methods.includes(method)) {
          database.seasons[season].methods.push(method);
        }
      });
    }
    
    database.metadata.totalArticles++;
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// ディレクトリを再帰的に処理
function processDirectory(dirPath, relativePath = '') {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath, path.join(relativePath, file));
    } else if (file.endsWith('.md')) {
      processArticle(filePath, path.join(relativePath, file));
    }
  });
}

// メイン処理
try {
  console.log('記事を分析中...');
  processDirectory(baseDir);
  
  // 統計情報を更新
  database.metadata.totalPoints = Object.keys(database.points).length;
  database.metadata.totalFishSpecies = Object.keys(database.fishSpecies).length;
  database.metadata.totalFishingMethods = Object.keys(database.fishingMethods).length;
  
  // ソート処理
  Object.keys(database.points).forEach(pointName => {
    database.points[pointName].fishSpecies.sort();
    database.points[pointName].fishingMethods.sort();
  });
  
  Object.keys(database.fishSpecies).forEach(fish => {
    database.fishSpecies[fish].points.sort();
    database.fishSpecies[fish].fishingMethods.sort();
  });
  
  Object.keys(database.fishingMethods).forEach(method => {
    database.fishingMethods[method].points.sort();
    database.fishingMethods[method].fishSpecies.sort();
  });
  
  // JSONファイルに保存
  fs.writeFileSync(outputFile, JSON.stringify(database, null, 2), 'utf8');
  
  console.log('\nデータベース作成完了！');
  console.log(`出力ファイル: ${outputFile}`);
  console.log(`\n統計情報:`);
  console.log(`  記事数: ${database.metadata.totalArticles}`);
  console.log(`  ポイント数: ${database.metadata.totalPoints}`);
  console.log(`  魚種数: ${database.metadata.totalFishSpecies}`);
  console.log(`  釣り方数: ${database.metadata.totalFishingMethods}`);
  
  // ポイント一覧を表示
  console.log(`\nポイント一覧 (${database.metadata.totalPoints}件):`);
  Object.keys(database.points).sort().forEach(pointName => {
    const point = database.points[pointName];
    console.log(`  - ${pointName} (${point.area || '不明'}) - 魚種: ${point.fishSpecies.length}種類, 釣り方: ${point.fishingMethods.length}種類`);
  });
  
  // 魚種一覧を表示
  console.log(`\n魚種一覧 (${database.metadata.totalFishSpecies}件):`);
  Object.keys(database.fishSpecies).sort().forEach(fish => {
    const fishData = database.fishSpecies[fish];
    console.log(`  - ${fish} - ポイント: ${fishData.points.length}箇所, 釣り方: ${fishData.fishingMethods.length}種類`);
  });
  
  // 釣り方一覧を表示
  console.log(`\n釣り方一覧 (${database.metadata.totalFishingMethods}件):`);
  Object.keys(database.fishingMethods).sort().forEach(method => {
    const methodData = database.fishingMethods[method];
    console.log(`  - ${method} - ポイント: ${methodData.points.length}箇所, 魚種: ${methodData.fishSpecies.length}種類`);
  });
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

