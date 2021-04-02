const path = require('path')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

const prod = process.env.NODE_ENV !== 'development'

module.exports = {
  mode: prod ? 'production' : 'development',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'bundle.js',
    publicPath: 'http://localhost:8080/',
  },
  devtool: 'source-map',
  devServer: {
    port: 8080,
    contentBase: 'public',
    historyApiFallback: true,
    proxy: {
      '/get': {
        targer: 'localhost:' + process.env.LEANCLOUD_APP_PORT,
        secure: false,
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/i,
        include: __dirname + '/modules',
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: prod ? '[hash:base64]' : '[path][name]__[local]',
              },
            },
          },
        ],
      },
      {
        test: /\.scss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
            },
          },
          'postcss-loader',
          'sass-loader',
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'production'),
      },
    }),
    new MiniCssExtractPlugin({ filename: 'app.css' }),
  ],
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
}
