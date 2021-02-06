export function normalizeTag(tag: string): string {
	return tag.normalize('NFKC').toLowerCase();
}
