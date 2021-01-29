export function normalizeTag(tag?: string | null): string | null | undefined {
	if (tag == null) return tag;
	return tag.normalize('NFKC').toLowerCase();
}
