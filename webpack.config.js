var webpack = require('webpack')

module.exports = {

  entry: './index.js',

  output: {
    path: 'public',
    filename: 'bundle.js',
    publicPath: 'http://localhost:8080/',
  },

  devServer: {
    '/get': {
      targer: 'localhost:' + process.env.LEANCLOUD_APP_PORT,
      secure: false
    }
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
  ] : []),
}
