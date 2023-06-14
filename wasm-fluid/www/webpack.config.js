const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/bootstrap.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bootstrap.js",
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "Development",
    }),
  ],
  experiments: {
    asyncWebAssembly: true,
  },
};
