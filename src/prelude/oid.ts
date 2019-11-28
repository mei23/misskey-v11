
export function oidEquals(x: any, y: any): boolean {
	if (x == null && y == null) return true;
	return `${x}` === `${y}`;
}

export function oidIncludes(array: any[], target: any): boolean {
	return (array || []).some(x => oidEquals(x, target));
}
