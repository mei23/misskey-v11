import * as S3 from 'aws-sdk/clients/s3';
import { DriveConfig } from '../../config/types';
import config from '../../config';
import { HttpsProxyAgent } from 'https-proxy-agent';
import * as agentkeepalive from 'agentkeepalive';

const httpsAgent = config.proxy
	? new HttpsProxyAgent(config.proxy)
	: new agentkeepalive.HttpsAgent({
			freeSocketTimeout: 30 * 1000
		});

export function getS3(drive: DriveConfig) {
	const conf = {
		endpoint: drive.config.endPoint || undefined,
		accessKeyId: drive.config.accessKey,
		secretAccessKey: drive.config.secretKey,
		region: drive.config.region || undefined,
		sslEnabled: drive.config.useSSL,
		s3ForcePathStyle: !!drive.config.endPoint,
		httpOptions: {
		}
	} as S3.ClientConfiguration;

	if (drive.config.useSSL) {
		conf.httpOptions.agent = httpsAgent;
	}

	const s3 = new S3(conf);

	return s3;
}
