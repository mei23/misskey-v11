import { parseFragment, DefaultTreeDocumentFragment } from 'parse5';
import { URL } from 'url';

export function fromHtml(html: string, mentionHrefs?: string[], hashtagHrefs?: string[]): string {
	if (html == null) return null;

	const dom = parseFragment(html) as DefaultTreeDocumentFragment;

	let text = '';

	for (const n of dom.childNodes) {
		analyze(n);
	}

	return text.trim();

	function getText(node: any): string {
		if (node.nodeName == '#text') return node.value;

		if (node.childNodes) {
			return node.childNodes.map((n: any) => getText(n)).join('');
		}

		return '';
	}

	function analyze(node: any) {
		switch (node.nodeName) {
			case '#text':
				text += node.value;
				break;

			case 'br':
				text += '\n';
				break;

			case 'a':
				const txt = getText(node);
				const href = node.attrs.find((x: any) => x.name == 'href');

				// ハッシュタグ
				if (hashtagHrefs && href && hashtagHrefs.includes(href.value)) {
					text += txt;
				// メンション
				} else if (mentionHrefs && href && mentionHrefs.includes(href.value)) {
					const part = txt.split('@');

					if (part.length == 2) {
						//#region ホスト名部分が省略されているので復元する
						const acct = `${txt}@${(new URL(href.value)).hostname}`;
						text += acct;
						//#endregion
					} else if (part.length == 3) {
						text += txt;
					}
				// その他
				} else {
					text += (href && txt === href.value) ? `<${txt}>` : `[${txt}](${href.value})`;
				}
				break;

			case 'p':
				text += '\n\n';
				if (node.childNodes) {
					for (const n of node.childNodes) {
						analyze(n);
					}
				}
				break;

			default:
				if (node.childNodes) {
					for (const n of node.childNodes) {
						analyze(n);
					}
				}
				break;
		}
	}
}
