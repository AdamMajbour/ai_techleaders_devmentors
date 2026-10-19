// Entry point for the MikroORM CLI (see "mikro-orm.configPaths" in package.json).
// Import order matters: .env.local must be loaded before the config reads process.env.
import './src/load-env';
import { mikroOrmConfig } from './src/config';

export default mikroOrmConfig;
