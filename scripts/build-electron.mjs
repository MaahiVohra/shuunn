import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildConfig = {
  entryPoints: {
    'main/main': 'src/main/main.ts',
    'preload/preload': 'src/preload/preload.ts'
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: 'dist-electron',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  outExtension: { '.js': '.mjs' }
};

if (isWatch) {
  const ctx = await esbuild.context(buildConfig);
  await ctx.watch();
  console.log('[esbuild] Watching main & preload for changes...');
} else {
  await esbuild.build(buildConfig);
  console.log('[esbuild] Main & preload built successfully into dist-electron/');
}
