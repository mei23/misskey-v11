export function sanitizeUrl(str: string | null | undefined): string | null | undefined {
	if (str == null) return str;
	try {
		const u = new URL(str);
		if (u.protocol === 'https:') return str;
		if (u.protocol === 'http:') return str;
	} catch {
		return null;
	}
	return null;
}
