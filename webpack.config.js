var webpack = require('webpack')
var ExtractTextPlugin = require('extract-text-webpack-plugin')

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
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader?presets[]=env&presets[]=react' },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('css?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]'),
        include: __dirname + '/modules'
      }
    ]
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      }
    }),
    new ExtractTextPlugin('app.css')
  ].concat(process.env.NODE_ENV !== 'development' ? [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin()
  ] : []),
}
