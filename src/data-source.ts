import 'dotenv/config';
import { DataSource } from 'typeorm';

// Used only by the TypeORM CLI (migration:generate / migration:run /
// migration:revert) — NOT loaded by the running app. Nest's own
// TypeOrmModule.forRoot() in app.module.ts is what the app actually
// uses at runtime; this file just needs to describe the same database
// and entities so the CLI can compare them.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
