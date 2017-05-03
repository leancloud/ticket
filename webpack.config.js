var webpack = require('webpack')

module.exports = {

  entry: './index.js',

  output: {
    path: 'public',
    filename: 'bundle.js',
    publicPath: '/'
  },

  module: {
    loaders: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader?presets[]=es2015&presets[]=react' }
    ]
  },

  plugins: (process.env.NODE_ENV === 'production' ? [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin()
  ] : []).concat([
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        LEANCLOUD_APP_ID: process.env.LEANCLOUD_APP_ID,
        LEANCLOUD_APP_KEY: process.env.LEANCLOUD_APP_KEY,
        NODE_ENV: process.env.NODE_ENV,
      })
    }),
  ]),
}
