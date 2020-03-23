import $ from 'cafy';
import define from '../../../define';
import { deliverQueue, inboxQueue } from '../../../../../queue';
import * as Bull from 'bull';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		domain: {
			validator: $.str,
		},

		state: {
			validator: $.str,
		},

		limit: {
			validator: $.optional.num,
			default: 50
		},
	}
};

export default define(meta, async (ps) => {
	const queue =
		ps.domain === 'deliver' ? deliverQueue :
		ps.domain === 'inbox' ? inboxQueue :
		null;

	const jobs = await (queue as Bull.Queue<any>).getJobs([ps.state], 0, ps.limit);

	return jobs.map(job => {
		const data = job.data;
		delete data.content;
		delete data.user;
		return {
			id: job.id,
			data,
			attempts: job.attemptsMade,
			maxAttempts: job.opts ? job.opts.attempts : 0,
			timestamp: job.timestamp,
		};
	});
});
