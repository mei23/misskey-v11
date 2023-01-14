import * as os from 'os';
import * as sysUtils from 'systeminformation';
const checkDiskSpace = require('check-disk-space').default;
import * as Deque from 'double-ended-queue';
import Xev from 'xev';
import * as osUtils from 'os-utils';

const ev = new Xev();

const interval = 1000;

type DiskUsage = {
	available: number;
	free: number;
	total: number;
};

/**
 * Report server stats regularly
 */
export default function() {
	const log = new Deque<any>();

	ev.on('requestServerStatsLog', x => {
		ev.emit(`serverStatsLog:${x.id}`, log.toArray().slice(0, x.length || 50));
	});

	async function tick() {
		const cpu = await cpuUsage();
		const usedmem = await usedMem();
		const totalmem = await totalMem();

		const _disk = await checkDiskSpace(os.platform() == 'win32' ? 'c:' : '/') as { diskPath: string; free: number; size: number; };
		const disk: DiskUsage = {
			available: _disk.free,
			free: _disk.free,
			total: _disk.size,
		};

		const stats = {
			cpu_usage: cpu,
			mem: {
				total: totalmem,
				used: usedmem
			},
			disk,
			os_uptime: os.uptime(),
			process_uptime: process.uptime()
		};
		ev.emit('serverStats', stats);
		log.unshift(stats);
		if (log.length > 200) log.pop();
	}

	tick();

	setInterval(tick, interval);
}

// CPU STAT
function cpuUsage() {
	return new Promise((res, rej) => {
		osUtils.cpuUsage((cpuUsage: number) => {
			res(cpuUsage);
		});
	});
}

// MEMORY(excl buffer + cache) STAT
async function usedMem() {
	const data = await sysUtils.mem();
	return data.active;
}

// TOTAL MEMORY STAT
async function totalMem() {
	const data = await sysUtils.mem();
	return data.total;
}
