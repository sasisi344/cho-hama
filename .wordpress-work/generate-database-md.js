import fs from 'fs';
import path from 'path';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const databaseFile = path.join(scriptDir, 'cho-hamanako-database.json');
const outputFile = path.join(scriptDir, 'cho-hamanako-database.md');

// データベースを読み込む
const database = JSON.parse(fs.readFileSync(databaseFile, 'utf8'));

let markdown = `# 浜名湖釣り記事 共通項データベース

生成日時: ${new Date().toLocaleString('ja-JP')}

## 📊 統計情報

| 項目 | 数 |
|------|-----|
| 記事数 | ${database.metadata.totalArticles} 件 |
| ポイント数 | ${database.metadata.totalPoints} 箇所 |
| 魚種数 | ${database.metadata.totalFishSpecies} 種類 |
| 釣り方数 | ${database.metadata.totalFishingMethods} 種類 |

---

## 📍 ポイント一覧

`;

// ポイントをエリア別に分類
const pointsByArea = {
  '表浜名湖': [],
  '中浜名湖': [],
  '奥浜名湖': [],
  '不明': [],
};

Object.keys(database.points).forEach(pointName => {
  const point = database.points[pointName];
  const area = point.area || '不明';
  if (pointsByArea[area]) {
    pointsByArea[area].push(point);
  } else {
    pointsByArea['不明'].push(point);
  }
});

// エリア別にポイントを表示
Object.keys(pointsByArea).forEach(area => {
  const points = pointsByArea[area].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  if (points.length === 0) return;
  
  markdown += `### ${area} (${points.length}箇所)\n\n`;
  
  points.forEach(point => {
    markdown += `#### ${point.name}\n\n`;
    markdown += `- **魚種**: ${point.fishSpecies.length}種類 - ${point.fishSpecies.join(', ')}\n`;
    markdown += `- **釣り方**: ${point.fishingMethods.length}種類 - ${point.fishingMethods.join(', ')}\n`;
    markdown += `- **記事件数**: ${point.articles.length}件\n`;
    markdown += `\n`;
  });
});

markdown += `---\n\n`;

// 魚種一覧
markdown += `## 🐟 魚種一覧\n\n`;

const fishList = Object.keys(database.fishSpecies).sort((a, b) => 
  database.fishSpecies[b].points.length - database.fishSpecies[a].points.length
);

fishList.forEach(fish => {
  const fishData = database.fishSpecies[fish];
  markdown += `### ${fish}\n\n`;
  markdown += `- **ポイント数**: ${fishData.points.length}箇所\n`;
  markdown += `- **釣り方**: ${fishData.fishingMethods.length}種類 - ${fishData.fishingMethods.join(', ')}\n`;
  markdown += `- **おすすめポイント**: ${fishData.points.slice(0, 10).join(', ')}${fishData.points.length > 10 ? ` ...他${fishData.points.length - 10}箇所` : ''}\n`;
  markdown += `\n`;
});

markdown += `---\n\n`;

// 釣り方一覧
markdown += `## 🎣 釣り方一覧\n\n`;

const methodList = Object.keys(database.fishingMethods).sort((a, b) => 
  database.fishingMethods[b].points.length - database.fishingMethods[a].points.length
);

methodList.forEach(method => {
  const methodData = database.fishingMethods[method];
  markdown += `### ${method}\n\n`;
  markdown += `- **ポイント数**: ${methodData.points.length}箇所\n`;
  markdown += `- **魚種数**: ${methodData.fishSpecies.length}種類\n`;
  markdown += `- **対象魚種**: ${methodData.fishSpecies.slice(0, 10).join(', ')}${methodData.fishSpecies.length > 10 ? ` ...他${methodData.fishSpecies.length - 10}種類` : ''}\n`;
  markdown += `- **おすすめポイント**: ${methodData.points.slice(0, 10).join(', ')}${methodData.points.length > 10 ? ` ...他${methodData.points.length - 10}箇所` : ''}\n`;
  markdown += `\n`;
});

markdown += `---\n\n`;

// エリア別データ
markdown += `## 🗺️ エリア別データ\n\n`;

Object.keys(database.areas).forEach(area => {
  const areaData = database.areas[area];
  if (areaData.points.length === 0) return;
  
  markdown += `### ${area}\n\n`;
  markdown += `- **ポイント数**: ${areaData.points.length}箇所\n`;
  markdown += `- **魚種数**: ${areaData.fish.length}種類\n`;
  markdown += `- **釣り方数**: ${areaData.methods.length}種類\n`;
  markdown += `- **ポイント**: ${areaData.points.slice(0, 15).join(', ')}${areaData.points.length > 15 ? ` ...他${areaData.points.length - 15}箇所` : ''}\n`;
  markdown += `- **魚種**: ${areaData.fish.join(', ')}\n`;
  markdown += `- **釣り方**: ${areaData.methods.join(', ')}\n`;
  markdown += `\n`;
});

markdown += `---\n\n`;

// 季節別データ
markdown += `## 🌸 季節別データ\n\n`;

const seasons = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

Object.keys(seasons).forEach(seasonKey => {
  const seasonName = seasons[seasonKey];
  const seasonData = database.seasons[seasonKey];
  
  markdown += `### ${seasonName}\n\n`;
  markdown += `- **ポイント数**: ${seasonData.points.length}箇所\n`;
  markdown += `- **魚種数**: ${seasonData.fish.length}種類\n`;
  markdown += `- **釣り方数**: ${seasonData.methods.length}種類\n`;
  markdown += `- **魚種**: ${seasonData.fish.join(', ')}\n`;
  markdown += `- **釣り方**: ${seasonData.methods.join(', ')}\n`;
  markdown += `\n`;
});

markdown += `---\n\n`;

// ポイントと魚種・釣り方のマトリックス（主要ポイントのみ）
markdown += `## 📋 主要ポイント詳細マトリックス\n\n`;

const majorPoints = Object.keys(database.points)
  .filter(name => database.points[name].fishSpecies.length >= 5)
  .sort((a, b) => database.points[b].fishSpecies.length - database.points[a].fishSpecies.length)
  .slice(0, 20);

majorPoints.forEach(pointName => {
  const point = database.points[pointName];
  markdown += `### ${pointName} (${point.area || '不明'})\n\n`;
  
  // 季節別の情報
  markdown += `#### 季節別の釣れる魚・釣り方\n\n`;
  ['spring', 'summer', 'autumn', 'winter'].forEach(seasonKey => {
    const seasonName = seasons[seasonKey];
    const seasonData = point.seasons[seasonKey];
    if (seasonData.fish.length > 0 || seasonData.methods.length > 0) {
      markdown += `- **${seasonName}**: `;
      if (seasonData.fish.length > 0) {
        markdown += `魚種: ${seasonData.fish.join(', ')}`;
      }
      if (seasonData.methods.length > 0) {
        markdown += ` / 釣り方: ${seasonData.methods.join(', ')}`;
      }
      markdown += `\n`;
    }
  });
  
  markdown += `\n`;
});

// ファイルに保存
fs.writeFileSync(outputFile, markdown, 'utf8');
console.log(`Markdownファイルを作成しました: ${outputFile}`);

