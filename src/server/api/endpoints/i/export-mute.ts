import define from '../../define';
import { createExportMuteJob } from '../../../../queue';

export const meta = {
	secure: true,
	requireCredential: true,
};

export default define(meta, async (ps, user) => {
	createExportMuteJob(user);

	return;
});
