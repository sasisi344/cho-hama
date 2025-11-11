import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils.ts";

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		const dateA = new Date(a.data.published).getTime();
		const dateB = new Date(b.data.published).getTime();
		return dateB - dateA; // 新しい順
	});
	return sorted;
}

// slugを取得するヘルパー関数
function getPostSlug(post: CollectionEntry<"posts">): string {
	return post.data.slug || post.slug;
}

// カテゴリーを含む完全なslugを取得するヘルパー関数
function getPostSlugWithCategory(post: CollectionEntry<"posts">): string {
	const slug = getPostSlug(post);
	const category = post.data.category || '';
	if (category) {
		return `${category}/${slug}`;
	}
	return slug;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		const prevSlug = getPostSlugWithCategory(sorted[i - 1]);
		sorted[i].data.nextSlug = prevSlug;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		const nextSlug = getPostSlugWithCategory(sorted[i + 1]);
		sorted[i].data.prevSlug = nextSlug;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}
export type PostForList = {
	slug: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		slug: getPostSlug(post),
		data: post.data,
	}));

	return sortedPostsList;
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap = new Map<string, number>();
	allBlogPosts.forEach((post) => {
		post.data.tags.forEach((tag) => {
			countMap.set(tag, (countMap.get(tag) || 0) + 1);
		});
	});

	// sort tags
	const sortedTags = Array.from(countMap.entries())
		.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
		.map(([name, count]) => ({ name, count }));

	return sortedTags;
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	
	const countMap = new Map<string, number>();
	const uncategorizedKey = i18n(I18nKey.uncategorized);
	
	allBlogPosts.forEach((post) => {
		const categoryName = post.data.category?.trim() || uncategorizedKey;
		countMap.set(categoryName, (countMap.get(categoryName) || 0) + 1);
	});

	const sortedCategories = Array.from(countMap.entries())
		.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
		.map(([name, count]) => ({
			name,
			count,
			url: getCategoryUrl(name === uncategorizedKey ? null : name),
		}));

	return sortedCategories;
}
