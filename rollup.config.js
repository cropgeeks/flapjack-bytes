import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/flapjack-bites.js',
    dest: 'build/flapjack-bites.js',
    format: 'umd',
    moduleName: 'GenotypeRenderer',

    plugins: [
        nodeResolve(),

        babel({
            exclude: 'node_modules/**',
          }),
    ]
};