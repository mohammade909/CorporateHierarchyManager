import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

dotenv.config();

const pool = new Pool({
  connectionString: 'postgresql://postgres:123456@localhost:5432/newcom'
});

export const db = drizzle(pool, { schema });