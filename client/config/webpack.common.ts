import path from "path";
import { Compiler, Configuration, DefinePlugin } from "webpack";
import CopyPlugin from "copy-webpack-plugin";
import Dotenv from "dotenv-webpack";
import { TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin";
import MonacoWebpackPlugin from "monaco-editor-webpack-plugin";
import fs from "fs";

import { brandingAssetPath, KONVEYOR_ENV } from "@konveyor-ui/common";
import { LANGUAGES_BY_FILE_EXTENSION } from "./monacoConstants";
import { execSync } from "child_process";

const pathTo = (relativePath: string) => path.resolve(__dirname, relativePath);
const nodeModules = (pkg: string) => pathTo(`../../node_modules/${pkg}`);
const brandingPath = brandingAssetPath();
const manifestPath = path.resolve(brandingPath, "manifest.json");
const buildVersionFilePath = path.resolve(
  __dirname,
  "../public/build-version.json"
);

const BG_IMAGES_DIRNAME = "images";

const getGitCommitHash = (): string => {
  try {
    // Check if the .git folder exists and run the git command to get the commit hash
    const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
    return commitHash;
  } catch (error) {
    // If git command fails, fallback to a default value (could be empty or something else)
    console.warn("Git commit hash not available. Using fallback value.");
    return "unknown";
  }
};

const getCurrentTimestamp = (): string => new Date().getDate.toString();

const config: Configuration = {
  entry: {
    app: [pathTo("../src/index.tsx")],
  },

  output: {
    path: pathTo("../dist"),
    publicPath: "auto",
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
          },
        },
      },

      // Ref: https://github.com/patternfly/patternfly-react-seed/blob/main/webpack.common.js
      {
        test: /\.(svg|ttf|eot|woff|woff2)$/,
        type: "asset/resource",
        // only process modules with this loader
        // if they live under a 'fonts' or 'pficon' directory
        include: [
          nodeModules("patternfly/dist/fonts"),
          nodeModules("@patternfly/react-core/dist/styles/assets/fonts"),
          nodeModules("@patternfly/react-core/dist/styles/assets/pficon"),
          nodeModules("@patternfly/patternfly/assets/fonts"),
          nodeModules("@patternfly/patternfly/assets/pficon"),
        ],
      },
      {
        test: /\.svg$/,
        type: "asset/inline",
        include: (input) => input.indexOf("background-filter.svg") > 1,
        use: [
          {
            options: {
              limit: 5000,
              outputPath: "svgs",
              name: "[name].[ext]",
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        // only process SVG modules with this loader if they live under a 'bgimages' directory
        // this is primarily useful when applying a CSS background using an SVG
        include: (input) => input.indexOf(BG_IMAGES_DIRNAME) > -1,
        type: "asset/inline",
      },
      {
        test: /\.svg$/,
        // only process SVG modules with this loader when they don't live under a 'bgimages',
        // 'fonts', or 'pficon' directory, those are handled with other loaders
        include: (input) =>
          input.indexOf(BG_IMAGES_DIRNAME) === -1 &&
          input.indexOf("fonts") === -1 &&
          input.indexOf("background-filter") === -1 &&
          input.indexOf("pficon") === -1,
        use: {
          loader: "raw-loader",
          options: {},
        },
      },
      {
        test: /\.(jpg|jpeg|png|gif)$/i,
        include: [
          pathTo("../src"),
          nodeModules("patternfly"),
          nodeModules("@patternfly/patternfly/assets/images"),
          nodeModules("@patternfly/react-styles/css/assets/images"),
          nodeModules("@patternfly/react-core/dist/styles/assets/images"),
          nodeModules(
            "@patternfly/react-core/node_modules/@patternfly/react-styles/css/assets/images"
          ),
          nodeModules(
            "@patternfly/react-table/node_modules/@patternfly/react-styles/css/assets/images"
          ),
          nodeModules(
            "@patternfly/react-inline-edit-extension/node_modules/@patternfly/react-styles/css/assets/images"
          ),
        ],
        type: "asset",
        parser: {
          dataUrlCondition: {
            maxSize: 8096,
          },
        },
      },

      // For monaco-editor-webpack-plugin --->
      {
        test: /\.css$/,
        include: [pathTo("../../node_modules/monaco-editor")],
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.ttf$/,
        type: "asset/resource",
      },
      // <--- For monaco-editor-webpack-plugin

      {
        test: /\.(xsd)$/,
        include: [pathTo("../src")],
        use: {
          loader: "raw-loader",
          options: {
            esModule: true,
          },
        },
      },
      {
        test: nodeModules("xmllint/xmllint.js"),
        loader: "exports-loader",
        options: {
          exports: "xmllint",
        },
      },
      {
        test: /\.yaml$/,
        use: "raw-loader",
      },
    ],
  },

  plugins: [
    {
      apply: (compiler: Compiler) => {
        compiler.hooks.done.tap("GenerateBuildVersionFile", () => {
          const newVersionData = {
            version: process.env.VERSION || "99.0.0",
            commitHash: getGitCommitHash() || "unknown",
            buildTime: new Date().toISOString(),
          };

          // Write `build-version.json` in the public directory
          if (!fs.existsSync(buildVersionFilePath)) {
            console.log(
              `Creating new build-version.json file at ${buildVersionFilePath}`
            );
            fs.writeFileSync(
              buildVersionFilePath,
              JSON.stringify(newVersionData, null, 2)
            );
          }
        });
      },
    },
    new Dotenv({
      systemvars: true,
      silent: true,
    }),
    new DefinePlugin({
      version: JSON.stringify(KONVEYOR_ENV.VERSION),
      version_checker: JSON.stringify(KONVEYOR_ENV.VERSION_CHECKER),
    }),
    new CopyPlugin({
      patterns: [
        {
          from: pathTo("../public/locales"),
          to: "./locales/",
        },
        {
          from: pathTo("../public/templates"),
          to: "./templates/",
        },
        {
          from: path.resolve(__dirname, "../public/build-version.json"),
          to: "./",
        },
        {
          from: manifestPath,
          to: ".",
        },
        {
          from: brandingPath,
          to: "./branding/",
        },
      ],
    }),
    new MonacoWebpackPlugin({
      filename: "monaco/[name].worker.js",
      languages: Object.values(LANGUAGES_BY_FILE_EXTENSION),
    }),
  ],

  resolve: {
    alias: {
      "react-dom": "@hot-loader/react-dom",
    },
    extensions: [".js", ".ts", ".tsx", ".jsx"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: pathTo("../tsconfig.json"),
      }),
    ],
    symlinks: false,
    cacheWithContext: false,
    fallback: { crypto: false, fs: false, path: false },
  },

  externals: {
    // required by xmllint (but not really used in the browser)
    ws: "{}",
  },
};

export default config;
