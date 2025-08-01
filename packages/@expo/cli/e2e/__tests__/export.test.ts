/* eslint-env jest */
import JsonFile from '@expo/json-file';
import fs from 'fs/promises';
import { sync as globSync } from 'glob';
import path from 'path';

import {
  projectRoot,
  getLoadedModulesAsync,
  setupTestProjectWithOptionsAsync,
  findProjectFiles,
} from './utils';
import { executeExpoAsync } from '../utils/expo';

const originalForceColor = process.env.FORCE_COLOR;
const originalCI = process.env.CI;

beforeAll(async () => {
  await fs.mkdir(projectRoot, { recursive: true });
  process.env.FORCE_COLOR = '0';
  process.env.CI = '1';
  process.env._EXPO_E2E_USE_PATH_ALIASES = '1';
});

afterAll(() => {
  process.env.FORCE_COLOR = originalForceColor;
  process.env.CI = originalCI;
  delete process.env._EXPO_E2E_USE_PATH_ALIASES;
});

const MD5_REGEX = /(?<md5>[0-9a-fA-F]{32})/;
// Starts and ends with the same regex as `MD5_REGEX`, can contain no extra characters.
const EXACT_MD5_REGEX = new RegExp(`^${MD5_REGEX.source}$`);

const ASSETS_MD5_PATH = new RegExp(`assets/${MD5_REGEX.source}$`);

it('loads expected modules by default', async () => {
  const modules = await getLoadedModulesAsync(`require('../../build/src/export').expoExport`);
  expect(modules).toStrictEqual([
    '@expo/cli/build/src/export/index.js',
    '@expo/cli/build/src/log.js',
    '@expo/cli/build/src/utils/args.js',
    '@expo/cli/build/src/utils/errors.js',
  ]);
});

it('runs `npx expo export --help`', async () => {
  const results = await executeExpoAsync(projectRoot, ['export', '--help']);
  expect(results.stdout).toMatchInlineSnapshot(`
    "
      Info
        Export the static files of the app for hosting it on a web server

      Usage
        $ npx expo export <dir>

      Options
        <dir>                      Directory of the Expo project. Default: Current working directory
        --output-dir <dir>         The directory to export the static files to. Default: dist
        --dev                      Configure static files for developing locally using a non-https server
        --no-minify                Prevent minifying source
        --no-bytecode              Prevent generating Hermes bytecode
        --max-workers <number>     Maximum number of tasks to allow the bundler to spawn
        --dump-assetmap            Emit an asset map for further processing
        --no-ssg                   Skip exporting static HTML files for web routes
        -p, --platform <platform>  Options: android, ios, web, all. Default: all
        -s, --source-maps          Emit JavaScript source maps
        -c, --clear                Clear the bundler cache
        -h, --help                 Usage info
    "
  `);
});

describe('server', () => {
  let projectRoot: string;

  beforeAll(async () => {
    projectRoot = await setupTestProjectWithOptionsAsync('basic-export', 'with-assets');
  });

  it('runs `npx expo export`', async () => {
    // `npx expo export`
    await executeExpoAsync(projectRoot, ['export', '--source-maps', '--dump-assetmap'], {
      env: {
        NODE_ENV: 'production',
        TEST_BABEL_PRESET_EXPO_MODULE_ID: require.resolve('babel-preset-expo'),
        EXPO_USE_FAST_RESOLVER: 'true',
      },
    });

    const outputDir = path.join(projectRoot, 'dist');
    const metadata = await JsonFile.readAsync(path.resolve(outputDir, 'metadata.json'));

    expect(metadata).toEqual({
      bundler: 'metro',
      fileMetadata: {
        android: {
          assets: [
            {
              ext: 'png',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
            {
              ext: 'png',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
            {
              ext: 'ttf',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
          ],
          bundle: expect.pathMatching(
            new RegExp(`_expo/static/js/android/AppEntry-${MD5_REGEX.source}\\.hbc$`)
          ),
        },
        ios: {
          assets: [
            {
              ext: 'png',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
            {
              ext: 'png',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
            {
              ext: 'ttf',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
          ],
          bundle: expect.pathMatching(
            new RegExp(`_expo/static/js/ios/AppEntry-${MD5_REGEX.source}\\.hbc$`)
          ),
        },
      },
      version: 0,
    });

    const assetmap = await JsonFile.readAsync(path.resolve(outputDir, 'assetmap.json'));
    expect(assetmap).toEqual({
      '2f334f6c7ca5b2a504bdf8acdee104f3': {
        __packager_asset: true,
        fileHashes: [expect.stringMatching(EXACT_MD5_REGEX)],
        fileSystemLocation: expect.pathMatching(/\/.*\/basic-export\/assets$/),
        files: [expect.pathMatching(/\/.*\/basic-export\/assets\/font\.ios\.ttf$/)],
        hash: expect.stringMatching(EXACT_MD5_REGEX),
        httpServerLocation: '/assets/assets',
        name: 'font',
        scales: [1],
        type: 'ttf',
      },

      '3858f62230ac3c915f300c664312c63f': {
        __packager_asset: true,
        fileHashes: [expect.stringMatching(EXACT_MD5_REGEX)],
        fileSystemLocation: expect.pathMatching(/\/.*\/basic-export\/assets$/),
        files: [expect.pathMatching(/\/.*\/basic-export\/assets\/font\.ttf$/)],
        hash: expect.stringMatching(EXACT_MD5_REGEX),
        httpServerLocation: '/assets/assets',
        name: 'font',
        scales: [1],
        type: 'ttf',
      },
      d48d481475a80809fcf9253a765193d1: {
        __packager_asset: true,
        fileHashes: [
          expect.stringMatching(EXACT_MD5_REGEX),
          expect.stringMatching(EXACT_MD5_REGEX),
        ],
        fileSystemLocation: expect.pathMatching(/\/.*\/basic-export\/assets$/),
        files: [
          expect.pathMatching(/\/.*\/basic-export\/assets\/icon\.png$/),
          expect.pathMatching(/\/.*\/basic-export\/assets\/icon@2x\.png$/),
        ],
        hash: expect.stringMatching(EXACT_MD5_REGEX),
        height: 1,
        httpServerLocation: '/assets/assets',
        name: 'icon',
        scales: [1, 2],
        type: 'png',
        width: 1,
      },
    });

    // If this changes then everything else probably changed as well.
    expect(findProjectFiles(outputDir)).toEqual([
      expect.pathMatching(
        new RegExp(`_expo/static/js/android/AppEntry-${MD5_REGEX.source}\\.hbc$`)
      ),
      expect.pathMatching(
        new RegExp(`_expo/static/js/android/AppEntry-${MD5_REGEX.source}\\.hbc\\.map$`)
      ),
      expect.pathMatching(new RegExp(`_expo/static/js/ios/AppEntry-${MD5_REGEX.source}\\.hbc$`)),
      expect.pathMatching(
        new RegExp(`_expo/static/js/ios/AppEntry-${MD5_REGEX.source}\\.hbc\\.map$`)
      ),
      expect.pathMatching(new RegExp(`_expo/static/js/web/AppEntry-${MD5_REGEX.source}\\.js$`)),
      expect.pathMatching(
        new RegExp(`_expo/static/js/web/AppEntry-${MD5_REGEX.source}\\.js\\.map$`)
      ),

      'assetmap.json',
      expect.pathMatching(ASSETS_MD5_PATH),
      expect.pathMatching(ASSETS_MD5_PATH),
      expect.pathMatching(ASSETS_MD5_PATH),
      expect.pathMatching(new RegExp(`assets/assets/font\\.${MD5_REGEX.source}\\.ttf$`)),
      expect.pathMatching(new RegExp(`assets/assets/icon\\.${MD5_REGEX.source}\\.png$`)),
      expect.pathMatching(new RegExp(`assets/assets/icon\\.${MD5_REGEX.source}@2x\\.png$`)),
      expect.pathMatching(ASSETS_MD5_PATH),
      'favicon.ico',
      'index.html',
      'metadata.json',
    ]);
  });

  it('runs `npx expo export --no-bytecode`', async () => {
    // `npx expo export`
    await executeExpoAsync(
      projectRoot,
      ['export', '--source-maps', '--no-bytecode', '--dump-assetmap', '--platform', 'ios'],
      {
        env: {
          NODE_ENV: 'production',
          TEST_BABEL_PRESET_EXPO_MODULE_ID: require.resolve('babel-preset-expo'),
          EXPO_USE_FAST_RESOLVER: 'true',
        },
      }
    );

    const outputDir = path.join(projectRoot, 'dist');
    const metadata = await JsonFile.readAsync(path.resolve(outputDir, 'metadata.json'));

    expect(metadata).toEqual({
      bundler: 'metro',
      fileMetadata: {
        ios: {
          assets: [
            {
              ext: 'png',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
            {
              ext: 'png',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
            {
              ext: 'ttf',
              path: expect.pathMatching(ASSETS_MD5_PATH),
            },
          ],
          bundle: expect.pathMatching(
            new RegExp(`_expo/static/js/ios/AppEntry-${MD5_REGEX.source}\\.js$`)
          ),
        },
      },
      version: 0,
    });

    const assetmap = await JsonFile.readAsync(path.resolve(outputDir, 'assetmap.json'));
    expect(assetmap).toEqual({
      '2f334f6c7ca5b2a504bdf8acdee104f3': {
        __packager_asset: true,
        fileHashes: [expect.stringMatching(EXACT_MD5_REGEX)],
        fileSystemLocation: expect.pathMatching(/\/.*\/basic-export\/assets$/),
        files: [expect.pathMatching(/\/.*\/basic-export\/assets\/font\.ios\.ttf$/)],
        hash: expect.stringMatching(EXACT_MD5_REGEX),
        httpServerLocation: '/assets/assets',
        name: 'font',
        scales: [1],
        type: 'ttf',
      },
      d48d481475a80809fcf9253a765193d1: {
        __packager_asset: true,
        fileHashes: [
          expect.stringMatching(EXACT_MD5_REGEX),
          expect.stringMatching(EXACT_MD5_REGEX),
        ],
        fileSystemLocation: expect.pathMatching(/\/.*\/basic-export\/assets$/),
        files: [
          expect.pathMatching(/\/.*\/basic-export\/assets\/icon\.png$/),
          expect.pathMatching(/\/.*\/basic-export\/assets\/icon@2x\.png$/),
        ],
        hash: expect.stringMatching(EXACT_MD5_REGEX),
        height: 1,
        httpServerLocation: '/assets/assets',
        name: 'icon',
        scales: [1, 2],
        type: 'png',
        width: 1,
      },
    });

    // If this changes then everything else probably changed as well.
    expect(findProjectFiles(outputDir)).toEqual([
      expect.pathMatching(new RegExp(`_expo/static/js/ios/AppEntry-${MD5_REGEX.source}\\.js$`)),
      expect.pathMatching(
        new RegExp(`_expo/static/js/ios/AppEntry-${MD5_REGEX.source}\\.js\\.map$`)
      ),
      'assetmap.json',
      expect.stringMatching(ASSETS_MD5_PATH),
      expect.stringMatching(ASSETS_MD5_PATH),
      expect.stringMatching(ASSETS_MD5_PATH),
      'favicon.ico',
      'metadata.json',
    ]);

    // Check if the bundle is minified
    const bundlePath = globSync('**/*.js', {
      cwd: path.join(outputDir, '_expo'),
      absolute: true,
    })[0];

    const bundle = await fs.readFile(bundlePath, 'utf8');

    expect(bundle).toMatch('__d(');
    // General check. This may need to be tweaked as React Native or other
    // packages change. If it is significantly larger than the threshold,
    // log and diff the `bundle` with the a previous version from a branch
    // where this passes.
    expect(bundle.split('\n').length).toBeLessThan(700);
  });

  // Regression test for: https://github.com/expo/expo/issues/35471
  it('runs `npx expo export --platform=web --dev`', async () => {
    await executeExpoAsync(
      projectRoot,
      ['export', '--source-maps', '--dump-assetmap', '--platform=web', '--dev'],
      {
        env: {
          NODE_ENV: 'production',
          TEST_BABEL_PRESET_EXPO_MODULE_ID: require.resolve('babel-preset-expo'),
          EXPO_USE_FAST_RESOLVER: 'true',
        },
      }
    );

    // Ensure the app entry has the expected export name
    expect(findProjectFiles(path.join(projectRoot, 'dist'))).toEqual([
      expect.pathMatching(new RegExp(`_expo/static/js/web/AppEntry-${MD5_REGEX.source}\\.js$`)),
      expect.pathMatching(
        new RegExp(`_expo/static/js/web/AppEntry-${MD5_REGEX.source}\\.js\\.map$`)
      ),
      'assetmap.json',
      expect.pathMatching(new RegExp(`assets/assets/font\\.${MD5_REGEX.source}\\.ttf$`)),
      expect.pathMatching(new RegExp(`assets/assets/icon\\.${MD5_REGEX.source}\\.png$`)),
      expect.pathMatching(new RegExp(`assets/assets/icon\\.${MD5_REGEX.source}@2x\\.png$`)),
      'favicon.ico',
      'index.html',
      'metadata.json',
    ]);
  });
});
