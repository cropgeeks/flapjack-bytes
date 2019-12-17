import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/flapjack-bytes.js',
  output: {
    file: 'build/flapjack-bytes.js',
    format: 'umd',
    name: 'GenotypeRenderer',
  },

  plugins: [
    json(),
    nodeResolve({ jsnext: true, preferBuiltins: true, browser: true }),
    babel({
      exclude: 'node_modules/**',
    }),
    commonjs(),
  ],
};
