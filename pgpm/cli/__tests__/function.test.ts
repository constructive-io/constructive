import { existsSync } from 'fs';
import * as path from 'path';
import { Inquirerer } from 'inquirerer';
import { commands } from '../src/commands';
import { setupTests, TestFixture, withInitDefaults } from '../test-utils';

const beforeEachSetup = setupTests();

describe('cmds:init function', () => {
    let fixture: TestFixture;
    let mockRepoPath: string;

    beforeAll(() => {
        fixture = new TestFixture();
        mockRepoPath = path.join(fixture.tempDir, 'mock-repo');
        const fs = require('fs');

        // Create mock repo structure
        fs.mkdirSync(path.join(mockRepoPath, 'default/function-template/src'), { recursive: true });
        fs.mkdirSync(path.join(mockRepoPath, 'default/function-template/__tests__'), { recursive: true });
        fs.mkdirSync(path.join(mockRepoPath, 'default/handler/src'), { recursive: true });

        // .boilerplates.json
        fs.writeFileSync(path.join(mockRepoPath, '.boilerplates.json'), JSON.stringify({ dir: 'default' }));

        // function-template files
        fs.writeFileSync(path.join(mockRepoPath, 'default/function-template/.boilerplate.json'), JSON.stringify({ type: 'function' }));
        fs.writeFileSync(path.join(mockRepoPath, 'default/function-template/package.json'), JSON.stringify({
            name: '@constructive-io/____functionName____',
            description: '____functionDesc____',
            author: '____author____'
        }));
        fs.writeFileSync(path.join(mockRepoPath, 'default/function-template/tsconfig.json'), '{}');
        fs.writeFileSync(path.join(mockRepoPath, 'default/function-template/Makefile'), 'IMAGE_NAME=____functionName____');

        // handler files
        fs.writeFileSync(path.join(mockRepoPath, 'default/handler/.boilerplate.json'), JSON.stringify({ type: 'handler' }));
        fs.writeFileSync(path.join(mockRepoPath, 'default/handler/src/index.ts'), 'export default async () => ({ status: "ok" });');
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
            repo: mockRepoPath // Use mock repo created in temp dir
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
