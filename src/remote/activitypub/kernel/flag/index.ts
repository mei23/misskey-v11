import User, { IRemoteUser } from '../../../../models/user';
import config from '../../../../config';
import { IFlag, ApObject, getApIds } from '../../type';
//import { apLogger } from '../../logger';
import AbuseUserReport from '../../../../models/abuse-user-report';

//const logger = apLogger;

export default async (actor: IRemoteUser, activity: IFlag): Promise<string> => {
	const objects = activity.object as ApObject;

	const uris = getApIds(objects);

	const userIds = uris.filter(uri => uri.startsWith(config.url + '/users/')).map(uri => uri.split('/').pop());
	const users = await User.find({
		_id: { $in: userIds }
	});
	if (users.length < 1) return `skip`;

	await AbuseUserReport.insert({
		createdAt: new Date(),
		userId: users[0]._id,
		reporterId: actor._id,
		comment: `${activity.content}\n${JSON.stringify(uris, null, 2)}`
	});

	return `ok`;
};
