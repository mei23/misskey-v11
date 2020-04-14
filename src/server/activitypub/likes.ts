import { ObjectID } from 'mongodb';
import * as Router from 'koa-router';
import config from '../../config';
import $ from 'cafy';
import ID, { transform } from '../../misc/cafy-id';
import { renderLike } from '../../remote/activitypub/renderer/like';
import { renderActivity } from '../../remote/activitypub/renderer';
import renderOrderedCollection from '../../remote/activitypub/renderer/ordered-collection';
import renderOrderedCollectionPage from '../../remote/activitypub/renderer/ordered-collection-page';
import { setResponseType } from '../activitypub';

import Note from '../../models/note';
import { countIf } from '../../prelude/array';
import * as url from '../../prelude/url';
import NoteReaction from '../../models/note-reaction';

export default async (ctx: Router.IRouterContext) => {
	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		return;
	}

	// Get 'sinceId' parameter
	const [sinceId, sinceIdErr] = $.optional.type(ID).get(ctx.request.query.since_id);

	// Get 'untilId' parameter
	const [untilId, untilIdErr] = $.optional.type(ID).get(ctx.request.query.until_id);

	// Get 'page' parameter
	const pageErr = !$.optional.str.or(['true', 'false']).ok(ctx.request.query.page);
	const page: boolean = ctx.request.query.page === 'true';

	// Validate parameters
	if (sinceIdErr || untilIdErr || pageErr || countIf(x => x != null, [sinceId, untilId]) > 1) {
		ctx.status = 400;
		return;
	}

	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		return;
	}

	const note = await Note.findOne({
		_id: new ObjectID(ctx.params.note),
		deletedAt: { $exists: false },
		visibility: { $in: ['public', 'home'] },
		localOnly: { $ne: true },
		copyOnce: { $ne: true }
	});

	const limit = 20;
	const partOf = `${config.url}/notes/${note._id}/likes`;

	if (page) {
		const query = {
			noteId: note._id
		} as any;

		const sort = {
			_id: -1
		};

		if (sinceId) {
			sort._id = 1;
			query._id = {
				$gt: transform(sinceId)
			};
		} else if (untilId) {
			query._id = {
				$lt: transform(untilId)
			};
		}

		const reactions = await NoteReaction.find(query, {
			limit,
			sort
		});

		if (sinceId) reactions.reverse();

		const activities = await Promise.all(reactions.map(reaction => renderLike(reaction, note)));
		const rendered = renderOrderedCollectionPage(
			// id
			`${partOf}?${url.query({
				page: 'true',
				since_id: sinceId,
				until_id: untilId
			})}`,
			// totalItems
			reactions.length,
			// items
			activities,
			// partOf
			partOf,
			// prev page
			reactions.length ? `${partOf}?${url.query({
				page: 'true',
				since_id: `${reactions[0]._id}`
			})}` : null,
			// next page
			reactions.length ? `${partOf}?${url.query({
				page: 'true',
				until_id: `${reactions[reactions.length - 1]._id}`
			})}` : null
		);

		ctx.body = renderActivity(rendered);
		ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
		setResponseType(ctx);
	} else {
		// index page
		const totalItems = note.reactionCounts ? Object.values(note.reactionCounts).reduce((a, c) => a + c, 0) : 0;

		const rendered = renderOrderedCollection(
			partOf,	// id
			totalItems,	// totalItems
			`${partOf}?page=true`,	// first page
			`${partOf}?page=true&since_id=000000000000000000000000`	// last page
		);

		ctx.body = renderActivity(rendered);
		ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
		setResponseType(ctx);
	}
};
