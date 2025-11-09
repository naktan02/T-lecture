module.exports = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || 'mysql://user:password@host:port/database',
};
