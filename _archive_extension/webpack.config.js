const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  devtool: "source-map",
  entry: {
    "background/service-worker": "./background/service-worker.ts",
    "content-scripts/netflix": "./content-scripts/netflix.ts",
    "content-scripts/disneyplus": "./content-scripts/disneyplus.ts",
    "content-scripts/cinemaos": "./content-scripts/cinemaos.ts",
    "content-scripts/crunchyroll": "./content-scripts/crunchyroll.ts",
    "content-scripts/mangadex": "./content-scripts/mangadex.ts",
    "content-scripts/webtoon": "./content-scripts/webtoon.ts",
    "content-scripts/universal": "./content-scripts/universal.ts",
    "popup/popup": "./popup/popup.ts",
    "sidepanel/sidepanel": "./sidepanel/sidepanel.ts",
    "pages/profile": "./pages/profile.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            onlyCompileBundledFiles: true,
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.TMDB_API_KEY": JSON.stringify(""),
    }),
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "popup/popup.html", to: "popup/popup.html" },
        { from: "popup/popup.css", to: "popup/popup.css" },
        { from: "sidepanel/sidepanel.html", to: "sidepanel/sidepanel.html" },
        { from: "sidepanel/sidepanel.css", to: "sidepanel/sidepanel.css" },
        { from: "pages/profile.html", to: "pages/profile.html" },
        { from: "pages/profile.css", to: "pages/profile.css" },
        { from: "icons", to: "icons" },
      ],
    }),
  ],
  performance: { hints: false },
};
