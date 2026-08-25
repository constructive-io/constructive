import { Logger, withLogsSuppressed } from '../src';

describe('withLogsSuppressed', () => {
  it('suppresses only the scoped async execution chain', async () => {
    const write = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    const logger = new Logger('test');

    await withLogsSuppressed(async () => {
      logger.info('hidden');
      await Promise.resolve();
      logger.info('also hidden');
    });

    logger.info('visible');

    expect(write).toHaveBeenCalledTimes(1);
    expect(String(write.mock.calls[0][0])).toContain('visible');
    write.mockRestore();
  });
});
