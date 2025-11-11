import { getCategoryList } from "./content-utils";
import { getCategoryDisplayName } from "./category-utils";
import { type CollectionEntry, getCollection } from "astro:content";
import type { NavBarLink } from "../types/config";

// 月別の記事を取得する関数
async function getMonthlyPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const monthlyMap: Record<string, number> = {};
	
	allBlogPosts.forEach((post: CollectionEntry<"posts">) => {
		if (post.data.category === 'season-post' || post.data.category === 'まとめ') {
			const title = post.data.title || '';
			// タイトルから月を抽出（例：「10月の浜名湖でおすすめの釣りポイント11選」）
			const monthMatch = title.match(/(\d{1,2})月/);
			if (monthMatch) {
				const month = parseInt(monthMatch[1], 10);
				if (month >= 1 && month <= 12) {
					const monthKey = `${month}月`;
					monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
				}
			}
		}
	});

	return monthlyMap;
}

// カテゴリからネストしたメニューを生成する関数
export async function generateCategoryMenu(): Promise<NavBarLink[]> {
	const categories = await getCategoryList();
	const monthlyPosts = await getMonthlyPosts();

	const menuItems: NavBarLink[] = [];

	// ポイント紹介（表中奥浜名湖）
	const pointCategories = categories.filter(c => 
		['naka-hamanako', 'omote-hamanako', 'oku-hamanako'].includes(c.name)
	).sort((a, b) => {
		// 表、中、奥の順にソート
		const order = ['omote-hamanako', 'naka-hamanako', 'oku-hamanako'];
		return order.indexOf(a.name) - order.indexOf(b.name);
	});

	if (pointCategories.length > 0) {
		const pointChildren: NavBarLink[] = pointCategories.map(c => ({
			name: getCategoryDisplayName(c.name) || c.name,
			url: c.url,
			external: false,
		}));

		menuItems.push({
			name: 'ポイント紹介',
			url: '/archive/?category=omote-hamanako',
			external: false,
			children: pointChildren,
		});
	}

	// 季節記事（月別にネスト）
	const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
	const monthChildren: NavBarLink[] = monthNames
		.filter(month => monthlyPosts[month] && monthlyPosts[month] > 0)
		.map(month => ({
			name: month,
			url: `/archive/?category=season-post&month=${encodeURIComponent(month)}`,
			external: false,
		}));

	if (monthChildren.length > 0) {
		menuItems.push({
			name: '季節記事',
			url: '/archive/?category=season-post',
			external: false,
			children: monthChildren,
		});
	}

	// まとめ
	const summaryCategory = categories.find(c => c.name === 'まとめ');
	if (summaryCategory) {
		menuItems.push({
			name: getCategoryDisplayName(summaryCategory.name) || summaryCategory.name,
			url: summaryCategory.url,
			external: false,
		});
	}

	return menuItems;
}

