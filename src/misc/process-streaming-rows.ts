import { SelectQueryBuilder } from 'typeorm';
import { ReadStream } from 'typeorm/platform/PlatformTools';

export async function processStreamingRows<T> (query: SelectQueryBuilder<T>, callback: (row: Record<string, unknown>) => Promise<void>) {
	return new Promise(async (res, rej) => {
		// query and get stream
		let stream: ReadStream;
		try {
			stream = await query.stream();
		} catch (e) {
			return rej(e);
		}

		stream
			.on('data', async (data: any) => {	// Buffer | string のはずだけどobjectが返ってくる
				try {
					await callback(data);
				} catch (e) {
					rej(e);
				}
			})
			.on('end', () => res('end'))
			.on('error', err => rej(err));
	});
}
