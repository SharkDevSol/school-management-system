const { Pool } = require('pg');

// Use DATABASE_URL if available (for cloud providers like Neon, Render)
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      user: process.env.DB_USER || 'neondb_owner',
      host: process.env.DB_HOST || 'ep-aged-mud-agloneqd-pooler.c-2.eu-central-1.aws.neon.tech',
      database: process.env.DB_NAME || 'neondb',
      password: process.env.DB_PASSWORD || 'npg_IQPtdE4hN7Kx',
      port: process.env.DB_PORT || 5432,
      ssl: {
        rejectUnauthorized: false
      }
    };

const pool = new Pool(connectionConfig);

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

module.exports = pool;
