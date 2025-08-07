import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const external = ['react'];

const createConfig = (input, outputName) => ({
  input: `src/${input}.ts`,
  external,
  output: [
    {
      file: `dist/${outputName}.cjs`,
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: `dist/${outputName}.js`,
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationMap: true,
      outDir: 'dist',
      exclude: ['**/*.test.*', '**/*.spec.*'],
    }),
  ],
});

export default [
  createConfig('index', 'index'),
  createConfig('react', 'react'),
];
