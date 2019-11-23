import define from '../../define';
import { createExportBlockingJob } from '../../../../queue';

export const meta = {
	secure: true,
	requireCredential: true,
};

export default define(meta, async (ps, user) => {
	createExportBlockingJob(user);

	return;
});
