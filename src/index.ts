/**
 * Misskey Entry Point!
 */

Error.stackTraceLimit = Infinity;

require('events').EventEmitter.defaultMaxListeners = 128;
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || `${Math.min(Math.max(4, require('os').cpus().length), 1024)}`;

import boot from './boot';

export default function() {
	return boot();
}
