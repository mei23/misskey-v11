import { secureRndstr } from '../../../misc/secure-rndstr';

export default () => `!${secureRndstr(32, true)}`;
