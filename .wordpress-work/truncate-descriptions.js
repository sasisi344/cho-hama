import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scriptDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const postsDir = path.join(scriptDir, '..', 'src', 'content', 'posts');

// descriptionを200文字以内に切り詰める
function truncateDescription(text, maxLength = 200) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    // 200文字を超える場合、単語の途中で切らないようにする
    const truncated = text.substring(0, maxLength);
    // 最後の単語が途中で切れている場合は、その単語の前で切る
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) { // 最後の30%以内にスペースがある場合
        const result = truncated.substring(0, lastSpace) + '...';
        // 念のため、結果が200文字以内であることを確認
        return result.length <= maxLength ? result : truncated.substring(0, maxLength - 3) + '...';
    }
    return truncated.substring(0, maxLength - 3) + '...';
}

// 記事を処理してdescriptionを200文字以内に修正
function truncateDescriptionInFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContent);
        
        // descriptionが存在し、200文字を超えている場合のみ修正
        if (data.description && typeof data.description === 'string' && data.description.length > 200) {
            const originalLength = data.description.length;
            const truncatedDescription = truncateDescription(data.description, 200);
            
            // フロントマターを更新
            const updatedData = {
                ...data,
                description: truncatedDescription,
            };
            
            // 新しいフロントマターを生成
            const frontmatterLines = Object.entries(updatedData)
                .map(([key, value]) => {
                    if (Array.isArray(value)) {
                        return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
                    } else if (typeof value === 'string') {
                        // 文字列内の改行や特殊文字をエスケープ
                        const escapedValue = value.replace(/"/g, '\\"');
                        return `${key}: "${escapedValue}"`;
                    } else if (value === null) {
                        return `${key}: null`;
                    } else {
                        return `${key}: ${value}`;
                    }
                });
            
            const newContent = `---\n${frontmatterLines.join('\n')}\n---\n\n${content}`;
            
            // ファイルを書き込み
            fs.writeFileSync(filePath, newContent, 'utf8');
            
            return {
                success: true,
                originalLength: originalLength,
                newLength: truncatedDescription.length,
                truncated: truncatedDescription,
            };
        }
        
        return {
            success: true,
            skipped: true,
            reason: data.description ? '200文字以内' : 'descriptionが存在しない',
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
    let truncatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            const result = processDirectory(filePath, path.join(relativePath, file));
            truncatedCount += result.truncatedCount;
            skippedCount += result.skippedCount;
            errorCount += result.errorCount;
        } else if (file.endsWith('.md')) {
            const result = truncateDescriptionInFile(filePath);
            if (result.success) {
                const displayPath = path.join(relativePath, file);
                if (result.skipped) {
                    console.log(`⊘ ${displayPath} (${result.reason})`);
                    skippedCount++;
                } else {
                    console.log(`✓ ${displayPath}`);
                    console.log(`  元の長さ: ${result.originalLength}文字 → ${result.newLength}文字`);
                    console.log(`  内容: ${result.truncated.substring(0, 100)}...`);
                    truncatedCount++;
                }
            } else {
                console.error(`✗ ${filePath}: ${result.error}`);
                errorCount++;
            }
        }
    });
    
    return { truncatedCount, skippedCount, errorCount };
}

console.log('記事のdescriptionを200文字以内に修正します...\n');

const { truncatedCount, skippedCount, errorCount } = processDirectory(postsDir);

console.log(`\n✅ 完了！\n   修正: ${truncatedCount}件\n   スキップ: ${skippedCount}件\n   エラー: ${errorCount}件`);

