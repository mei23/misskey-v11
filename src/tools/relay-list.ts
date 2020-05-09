import { listRelay } from '../services/relay';

async function main(): Promise<any> {
	const relays = await listRelay();
	console.log(JSON.stringify(relays, null, 2));
}

//const args = process.argv.slice(2);

main().then(() => {
	//console.log('OK');
}).catch(e => {
	console.warn(e);
}).finally(() => {
	console.log('Ctrl+C to exit');
});
