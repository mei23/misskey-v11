export function parseVisibility(v: string) {
	const m = v.match(/^local-(.+)/);
	const n = v.match(/^once-(.+)/);
	if (m) {
		return {
			localOnly: true,
			copyOnce: false,
			visibility: m[1],
		};
	} else if (n) {
		return {
			localOnly: false,
			copyOnce: true,
			visibility: n[1],
		};
	} else {
		return {
			localOnly: false,
			copyOnce: false,
			visibility: v,
		};
	}
}
