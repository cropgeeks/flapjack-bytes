import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/flapjack-bytes.js',
  output: {
    file: 'build/flapjack-bytes.js',
    format: 'umd',
    name: 'GenotypeRenderer',
  },

  plugins: [
    nodeResolve(),

    babel({
      exclude: 'node_modules/**',
    }),
    commonjs(),
  ],
};
