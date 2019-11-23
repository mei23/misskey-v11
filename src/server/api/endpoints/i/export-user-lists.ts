import define from '../../define';
import { createExportUserListsJob } from '../../../../queue';

export const meta = {
	secure: true,
	requireCredential: true,
};

export default define(meta, async (ps, user) => {
	createExportUserListsJob(user);

	return;
});
