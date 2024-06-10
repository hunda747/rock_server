const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  // client: 'postgresql',
  client: 'mysql2',
  connection: {
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
  // pool: {
  //   min: 10,
  //   max: 50,
  //   acquireTimeoutMillis: 10000,  // 30 seconds to acquire a connection
  //   idleTimeoutMillis: 10000  // 30 seconds before an idle connection is closed
  // }
};