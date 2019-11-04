import * as Bull from 'bull';

export function getJobInfo(job: Bull.Job) {
	const age = Date.now() - job.timestamp;
	const ageMinutes = Math.floor(age / 1000 / 60);

	const currentAttempts = job.attemptsMade + 1;
	const maxAttempts = job.opts ? job.opts.attempts : 0;

	return `id=${job.id}(${currentAttempts}/${maxAttempts}, ${ageMinutes}m)`;
}
