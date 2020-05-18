import * as program from 'commander';
import config from './config';

program
	.version(config.version)
	.option('--no-daemons', 'Disable daemon processes (for debbuging)')
	.option('--disable-clustering', 'Disable clustering')
	.option('--quiet', 'Suppress all logs')
	.option('--verbose', 'Enable all logs')
	.option('--with-log-time', 'Include timestamp for each logs')
	.option('--slow', 'Delay all requests (for debbuging)')
	.option('--color', 'This option is a dummy for some external program\'s (e.g. forever) issue.')
	.parse(process.argv);

if (process.env.MK_DISABLE_CLUSTERING) program.disableClustering = true;

export { program };
