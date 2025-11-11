import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postsDir = path.join(__dirname, '../src/content/posts');
const languages = ['ja', 'en', 'pt'];

// 言語フォルダを作成
languages.forEach(lang => {
    const langDir = path.join(postsDir, lang);
    if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
    }
});

// 既存の記事を読み込んで移動
async function movePostsByLang() {
    const categories = fs.readdirSync(postsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !languages.includes(dirent.name))
        .map(dirent => dirent.name);

    console.log('Found categories:', categories);

    for (const category of categories) {
        const categoryPath = path.join(postsDir, category);
        const files = fs.readdirSync(categoryPath)
            .filter(file => file.endsWith('.md'));

        console.log(`\nProcessing category: ${category}`);
        console.log(`Found ${files.length} files`);

        for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const { data } = matter(content);

            const lang = data.lang || 'ja';
            const slug = data.slug || path.basename(file, '.md');

            // 言語フォルダ内のカテゴリフォルダを作成
            const targetCategoryDir = path.join(postsDir, lang, category);
            if (!fs.existsSync(targetCategoryDir)) {
                fs.mkdirSync(targetCategoryDir, { recursive: true });
            }

            // 新しいファイル名（slugを使用）
            const newFileName = `${slug}.md`;
            const targetPath = path.join(targetCategoryDir, newFileName);

            // ファイルを移動
            fs.writeFileSync(targetPath, content, 'utf-8');
            console.log(`  Moved: ${file} -> ${lang}/${category}/${newFileName}`);

            // 元のファイルを削除（バックアップとして残す場合はコメントアウト）
            // fs.unlinkSync(filePath);
        }
    }

    console.log('\n✅ Migration completed!');
    console.log('⚠️  Original files are still in place. Please review and delete them manually.');
}

movePostsByLang().catch(console.error);

