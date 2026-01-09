import { existsSync } from 'fs';
import * as path from 'path';
import { Inquirerer } from 'inquirerer';
import { commands } from '../src/commands';
import { setupTests, TestFixture, withInitDefaults } from '../test-utils';

const beforeEachSetup = setupTests();

describe('cmds:init function', () => {
    let fixture: TestFixture;
    // Use relative path to local boilerplates to verify unpushed changes
    const localBoilerplatesPath = path.resolve(__dirname, '../../../../pgpm-boilerplates');

    beforeAll(() => {
        fixture = new TestFixture();
    });

    afterAll(() => {
        fixture.cleanup();
    });

    const runFunctionInitTest = async (argv: any) => {
        const { mockInput, mockOutput } = beforeEachSetup();
        const prompter = new Inquirerer({
            input: mockInput,
            output: mockOutput,
            noTty: true
        });

        const args = withInitDefaults({
            ...argv,
            repo: localBoilerplatesPath // Override repo to use local path
        });

        await commands(args, prompter, {
            noTty: true,
            input: mockInput,
            output: mockOutput,
            version: '1.0.0',
            minimistOpts: {}
        });

        return args.cwd;
    };

    it('initializes a function with default handler', async () => {
        const functionName = 'my-function';
        const cwd = fixture.tempDir;

        await runFunctionInitTest({
            _: ['init', 'function'],
            cwd,
            functionName,
            // Map other required args if needed by non-interactive mode
            'function-name': functionName,
            functionDesc: 'My test function',
            author: 'Tester'
        });

        const funcDir = path.join(cwd, functionName);

        // Check for base template files
        expect(existsSync(path.join(funcDir, 'package.json'))).toBe(true);
        expect(existsSync(path.join(funcDir, 'tsconfig.json'))).toBe(true);
        expect(existsSync(path.join(funcDir, 'Makefile'))).toBe(true);

        // Check for handler files (merged)
        expect(existsSync(path.join(funcDir, 'src', 'index.ts'))).toBe(true);

        // Verify variable replacement in package.json
        const pkg = require(path.join(funcDir, 'package.json'));
        expect(pkg.name).toBe(`@constructive-io/${functionName}`);
        expect(pkg.author).toBe('Tester');
    });

    it('initializes a function using alias "function" argument', async () => {
        // Logic handled in runFunctionInitTest via _=['init', 'function']
        // This test ensures the alias map in handleInit works
        const functionName = 'aliased-func';
        const cwd = fixture.tempDir;

        await runFunctionInitTest({
            _: ['init', 'function'],
            cwd,
            functionName,
            functionDesc: 'Aliased',
            author: 'Tester'
        });

        const funcDir = path.join(cwd, functionName);
        expect(existsSync(path.join(funcDir, 'package.json'))).toBe(true);
    });
});
