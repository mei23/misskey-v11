export function safeForSql(text: string): boolean {
	// eslint-disable-next-line no-control-regex
	return !/[\0\x08\x09\x1a\n\r"'\\\%]/g.test(text);
}
