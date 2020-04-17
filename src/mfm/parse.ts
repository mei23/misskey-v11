import { mfmLanguage } from './language';
import { MfmForest } from './prelude';
import { normalize } from './normalize';

export function parse(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.root.tryParse(source));
}

export function parsePlain(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.plain.tryParse(source));
}

export function parsePlainX(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.plainX.tryParse(source));
}
