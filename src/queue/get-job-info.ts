import * as Bull from 'bull';

export function getJobInfo(job: Bull.Job, increment = false) {
	const age = Date.now() - job.timestamp;
	const ageMinutes = Math.floor(age / 1000 / 60);

	// onActiveとかonCompletedのattemptsMadeがなぜか0始まりなのでインクリメントする
	const currentAttempts = job.attemptsMade + (increment ? 1 : 0);
	const maxAttempts = job.opts ? job.opts.attempts : 0;

	return `id=${job.id} attempts=${currentAttempts}/${maxAttempts} age=${ageMinutes}m`;
}
