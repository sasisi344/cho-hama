import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postsDir = path.join(__dirname, '../src/content/posts');
const languages = ['ja', 'en', 'pt'];

// jaフォルダ内の記事をカテゴリフォルダに戻す
async function movePostsBackToCategories() {
    const jaDir = path.join(postsDir, 'ja');
    
    if (!fs.existsSync(jaDir)) {
        console.log('ja folder does not exist');
        return;
    }
    
    // jaフォルダ内のカテゴリフォルダを取得
    const categories = fs.readdirSync(jaDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    console.log('Found categories:', categories);
    
    for (const category of categories) {
        const categoryPath = path.join(jaDir, category);
        const targetCategoryPath = path.join(postsDir, category);
        
        // カテゴリフォルダが存在しない場合は作成
        if (!fs.existsSync(targetCategoryPath)) {
            fs.mkdirSync(targetCategoryPath, { recursive: true });
        }
        
        const files = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.md'));
        
        console.log(`\nProcessing category: ${category}`);
        console.log(`Found ${files.length} files`);
        
        for (const file of files) {
            const sourcePath = path.join(categoryPath, file);
            const targetPath = path.join(targetCategoryPath, file);
            
            // ファイルを移動
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`  Moved: ja/${category}/${file} -> ${category}/${file}`);
        }
    }
    
    console.log('\n✅ Migration completed!');
    console.log('⚠️  Language folders (ja/en/pt) are still in place. Please delete them manually if not needed.');
}

movePostsBackToCategories().catch(console.error);

