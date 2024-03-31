export function sanitizeUrl(str: unknown): string | null | undefined {
	if (str == null) return str;
	if (typeof str !== 'string') return null;

	try {
		const u = new URL(str);
		if (u.protocol === 'https:') return str;
		if (u.protocol === 'http:') return str;
	} catch {
		return null;
	}
	return null;
}
