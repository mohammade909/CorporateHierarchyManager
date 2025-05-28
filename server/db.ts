import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// const newurl= 'postgresql://neondb_owner:npg_RUlb5Hs8JVBt@ep-falling-darkness-a8pe6acr-pooler.eastus2.azure.neon.tech/neondb?sslmode=require'
// const dburl = 'postgresql://neondb_owner:npg_iAprDt4Y3OFU@ep-cool-pond-a5ksluwm-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require' 
export const pool = new Pool({ connectionString:''});
export const db = drizzle({ client: pool, schema });
