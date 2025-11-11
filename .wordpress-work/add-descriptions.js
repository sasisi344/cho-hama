import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// 記事内容からdescriptionを生成（300文字以内）
function generateDescription(content, title) {
  // ポイント名を取得
  const pointName = title.replace(/～.*$/, '').trim();
  
  // 不要な記号やマークダウン記法を削除
  let text = content
    .replace(/^#+\s+/gm, '') // 見出し記号を削除
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // リンクをテキストに変換
    .replace(/\*\*([^\*]+)\*\*/g, '$1') // 太字を削除
    .replace(/\*([^\*]+)\*/g, '$1') // 斜体を削除
    .replace(/`([^`]+)`/g, '$1') // コードブロックを削除
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // 画像を削除
    .replace(/\n+/g, ' ') // 改行をスペースに
    .replace(/\s+/g, ' ') // 連続するスペースを1つに
    .trim();
  
  // 定型文を削除
  const skipPatterns = [
    /『釣！浜名湖』をご覧いただきありがとうございます！/g,
    /記事内容は、ポイントの詳細からはじまり、季節ごとに釣れやすい魚と方法などをまとめています。/g,
    /本記事は[「『].*?[」』].*?紹介.*?。/g,
    /本記事では[「『].*?[」』].*?解説.*?。/g,
    /記事のポイント/g,
    /^\-/gm, // リスト項目の開始
    /\*\*ポイント名\*\*[：:]/g,
    /\*\*所在地\*\*[：:]/g,
    /\*\*アクセス方法\*\*[：:]/g,
    /基本情報/g,
    /ポイントの特徴/g,
    /シーズンごとに釣れやすい魚/g,
    /エサとルアーでおすすめのタックル/g,
    /周辺情報/g,
  ];
  
  // スキップパターンを削除
  skipPatterns.forEach(pattern => {
    text = text.replace(pattern, '').trim();
  });
  
  // ポイント名で始まる文を探す
  const pointNamePattern = new RegExp(`(${pointName.replace(/[()（）]/g, '')}[^。！？]{20,}?[。！？])`, 'g');
  const matches = text.match(pointNamePattern);
  
  let description = '';
  
  if (matches && matches.length > 0) {
    // ポイント名を含む文から開始（最初のマッチを使用）
    let candidate = matches[0].trim();
    
    // 定型文を削除
    candidate = candidate
      .replace(/本記事は[^。]*。/g, '')
      .replace(/本記事では[^。]*。/g, '')
      .replace(/記事のポイント/g, '')
      .replace(/ポイント紹介は当然のこと/g, '')
      .replace(/どんな魚が釣れるのか/g, '')
      .replace(/おすすめのシーズン/g, '')
      .trim();
    
    if (candidate.length > 20) {
      description = candidate;
    }
  }
  
  // マッチしない場合、ポイント名を含む最初の有効な文を探す
  if (!description || description.length < 20) {
    const sentences = text.split(/[。！？]/).filter(s => {
      const trimmed = s.trim();
      return trimmed.length > 20 && 
        (trimmed.includes(pointName) || trimmed.length > 40) &&
        !trimmed.includes('基本情報') &&
        !trimmed.includes('アクセス') &&
        !trimmed.includes('駐車場') &&
        !trimmed.includes('トイレ') &&
        !trimmed.includes('ポイント名') &&
        !trimmed.includes('所在地') &&
        !trimmed.includes('釣具店') &&
        !trimmed.includes('コンビニ') &&
        !trimmed.match(/^[\-\*]/) &&
        !trimmed.includes('本記事は') &&
        !trimmed.includes('本記事では') &&
        !trimmed.includes('記事のポイント') &&
        !trimmed.includes('ポイント紹介は当然のこと');
    });
    
    if (sentences.length > 0) {
      description = sentences[0].trim();
    }
  }
  
  // 追加の文を追加（300文字以内）
  if (description) {
    const remainingText = text.substring(text.indexOf(description) + description.length);
    const additionalSentences = remainingText.split(/[。！？]/).filter(s => 
      s.trim().length > 15 && 
      !s.includes('基本情報') && 
      !s.includes('アクセス') &&
      !s.includes('駐車場') &&
      !s.includes('トイレ') &&
      !s.includes('ポイント名') &&
      !s.includes('所在地') &&
      !s.includes('釣具店') &&
      !s.includes('コンビニ')
    );
    
    for (const sentence of additionalSentences.slice(0, 2)) {
      const candidate = `${description}${sentence.trim()}。`;
      if (candidate.length <= 300) {
        description = candidate;
      } else {
        break;
      }
    }
  }
  
  // まだ空の場合は、最初の有効な文を取得
  if (!description || description.length < 20) {
    const sentences = text.split(/[。！？]/).filter(s => 
      s.trim().length > 20 && 
      !s.includes('基本情報') && 
      !s.includes('アクセス') &&
      !s.includes('駐車場') &&
      !s.includes('トイレ') &&
      !s.includes('釣具店') &&
      !s.includes('コンビニ') &&
      !s.includes('ポイント名') &&
      !s.includes('所在地') &&
      !s.match(/^[\-\*]/) // リスト項目を除外
    );
    
    if (sentences.length > 0) {
      description = sentences[0].trim();
      
      // ポイント名を追加
      if (!description.includes(pointName)) {
        description = `${pointName}は${description}`;
      }
      
      // 追加の文を追加
      for (const sentence of sentences.slice(1, 3)) {
        const candidate = `${description}${sentence.trim()}。`;
        if (candidate.length <= 300) {
          description = candidate;
        } else {
          break;
        }
      }
    }
  }
  
  // 300文字を超える場合は切り詰め
  if (description.length > 300) {
    description = description.substring(0, 297) + '...';
  }
  
  // 最後に句点がない場合は追加
  if (description && !description.match(/[。！？…]$/)) {
    description += '。';
  }
  
  // ポイント名が含まれていない場合は追加
  if (description && !description.includes(pointName)) {
    description = `${pointName}は${description}`;
    
    // 300文字を超える場合は調整
    if (description.length > 300) {
      description = description.substring(0, 297) + '...';
    }
  }
  
  return description || `${pointName}の釣りポイント紹介。`; // 生成できない場合は簡潔な説明を返す
}

// 記事を処理してdescriptionを追加
function updateDescription(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    
    // 既にdescriptionがある場合はスキップ（空でない場合）
    // ただし、空文字列や空白のみの場合は更新する
    // また、定型文が含まれている場合は更新する
    const hasTemplateText = data.description && (
      data.description.includes('季節ごとに釣れやすい魚と方法などをまとめています') ||
      data.description.includes('本記事は') ||
      data.description.includes('本記事では')
    );
    
    if (data.description && data.description.trim().length > 10 && !hasTemplateText) {
      return {
        success: true,
        skipped: true,
        description: data.description,
      };
    }
    
    // descriptionを生成
    const description = generateDescription(content, data.title || '');
    
    // フロントマターを更新
    const updatedData = {
      ...data,
      description: description,
    };
    
    // 新しいフロントマターを生成
    const frontmatterLines = Object.entries(updatedData)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        if (typeof value === 'string') {
          // 文字列内の改行や特殊文字をエスケープ
          const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          return `${key}: "${escaped}"`;
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
      description: description,
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
      const result = updateDescription(filePath);
      if (result.success) {
        const displayPath = path.join(relativePath, file);
        if (result.skipped) {
          console.log(`⊘ ${displayPath} (description既存のためスキップ)`);
          skippedCount++;
        } else {
          const descPreview = result.description.length > 50 
            ? result.description.substring(0, 50) + '...'
            : result.description;
          console.log(`✓ ${displayPath}`);
          console.log(`  ${descPreview}`);
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
  console.log('記事のdescriptionを生成中...\n');
  
  const { updatedCount, skippedCount, errorCount } = processDirectory(postsDir);
  
  console.log(`\n✅ 完了！`);
  console.log(`   追加: ${updatedCount}件`);
  console.log(`   スキップ: ${skippedCount}件`);
  console.log(`   エラー: ${errorCount}件`);
  
} catch (error) {
  console.error('エラーが発生しました:', error);
  process.exit(1);
}

