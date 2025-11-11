// カテゴリーを日本語表記に変換する関数
export function getCategoryDisplayName(category: string | null | undefined): string {
	if (!category) {
		return '';
	}
	
	const categoryMap: Record<string, string> = {
		'naka-hamanako': '中浜名湖',
		'omote-hamanako': '表浜名湖',
		'oku-hamanako': '奥浜名湖',
		'season-post': '季節別記事',
		'まとめ': 'まとめ',
	};
	
	return categoryMap[category] || category;
}

