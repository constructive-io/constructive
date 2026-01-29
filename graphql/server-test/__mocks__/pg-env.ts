export const getPgEnvOptions = jest.fn(() => ({
  user: 'test',
  password: 'test',
  host: 'localhost',
  port: 5432,
  database: 'test_db',
}));
