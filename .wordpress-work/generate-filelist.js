import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, 'old-chohama');

// ディレクトリツリーを生成する関数
function generateTree(dirPath, basePath, prefix = '', isLast = true) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(item => !item.name.startsWith('.'))
    .sort((a, b) => {
      // ディレクトリを先に、その後ファイル
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, 'ja');
    });

  let output = '';
  const connector = isLast ? '└── ' : '├── ';
  const nextPrefix = isLast ? '    ' : '│   ';

  items.forEach((item, index) => {
    const isLastItem = index === items.length - 1;
    const itemPath = path.join(dirPath, item.name);
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');

    if (item.isDirectory()) {
      output += `${prefix}${connector}${item.name}/\n`;
      output += generateTree(itemPath, basePath, prefix + nextPrefix, isLastItem);
    } else {
      output += `${prefix}${connector}${item.name}\n`;
    }
  });

  return output;
}

// ファイルリストを生成する関数
function generateFileList(dirPath, basePath, depth = 0) {
  let output = '';
  const items = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(item => !item.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name, 'ja');
    });

  items.forEach(item => {
    const itemPath = path.join(dirPath, item.name);
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
    
    if (item.isDirectory()) {
      output += `\n## 📁 ${item.name}/\n\n`;
      output += generateFileList(itemPath, basePath, depth + 1);
    } else {
      output += `- ${item.name}\n`;
    }
  });

  return output;
}

// 統計情報を生成する関数
function generateStats(baseDir) {
  const stats = {};
  
  function countFiles(dirPath) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(item => !item.name.startsWith('.'));
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        const relativePath = path.relative(baseDir, itemPath).replace(/\\/g, '/');
        stats[relativePath] = { type: 'directory', count: 0, files: [] };
        const subStats = countFiles(itemPath);
        stats[relativePath].count = subStats.total;
        stats[relativePath].files = subStats.files;
      } else {
        const relativePath = path.relative(baseDir, itemPath).replace(/\\/g, '/');
        const dir = path.dirname(relativePath).replace(/\\/g, '/');
        if (!stats[dir]) {
          stats[dir] = { type: 'directory', count: 0, files: [] };
        }
        stats[dir].count++;
        stats[dir].files.push(item.name);
      }
    });
    
    return {
      total: items.filter(item => !item.isDirectory()).length,
      files: items.filter(item => !item.isDirectory()).map(item => item.name)
    };
  }
  
  countFiles(baseDir);
  return stats;
}

// メイン処理
try {
  const stats = generateStats(baseDir);
  const tree = generateTree(baseDir, baseDir);
  
  let markdown = `# old-chohama フォルダ構成とファイルリスト\n\n`;
  markdown += `生成日時: ${new Date().toLocaleString('ja-JP')}\n\n`;
  
  markdown += `## 📊 統計情報\n\n`;
  markdown += `| フォルダ | ファイル数 |\n`;
  markdown += `|---------|----------|\n`;
  
  Object.entries(stats)
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .forEach(([dir, data]) => {
      if (dir !== '.') {
        const dirName = dir.split('/').pop();
        markdown += `| \`${dirName}/\` | ${data.count} 件 |\n`;
      }
    });
  
  markdown += `\n## 📂 フォルダ構成\n\n\`\`\`\n`;
  markdown += `old-chohama/\n`;
  markdown += tree;
  markdown += `\`\`\`\n\n`;
  
  markdown += `## 📄 ファイルリスト（フォルダ別）\n\n`;
  
  // 各フォルダのファイルリストを生成
  Object.entries(stats)
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .forEach(([dir, data]) => {
      if (dir !== '.' && data.files.length > 0) {
        const dirName = dir.split('/').pop();
        markdown += `### 📁 ${dirName}/ (${data.count}件)\n\n`;
        data.files
          .sort((a, b) => a.localeCompare(b, 'ja'))
          .forEach(file => {
            markdown += `- ${file}\n`;
          });
        markdown += `\n`;
      }
    });
  
  // ファイルを書き込み
  const outputPath = path.join(__dirname, 'filelist.md');
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  
  console.log(`filelist.mdを作成しました: ${outputPath}`);
  console.log(`\n統計情報:`);
  Object.entries(stats)
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .forEach(([dir, data]) => {
      if (dir !== '.') {
        const dirName = dir.split('/').pop();
        console.log(`  ${dirName}/: ${data.count} 件`);
      }
    });
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

