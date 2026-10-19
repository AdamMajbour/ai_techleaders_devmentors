// Side-effect module: import it before anything that reads process.env at load time.
import { loadEnv } from './env';

loadEnv();
