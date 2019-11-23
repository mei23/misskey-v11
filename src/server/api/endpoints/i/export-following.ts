import define from '../../define';
import { createExportFollowingJob } from '../../../../queue';

export const meta = {
	secure: true,
	requireCredential: true,
};

export default define(meta, async (ps, user) => {
	createExportFollowingJob(user);

	return;
});
