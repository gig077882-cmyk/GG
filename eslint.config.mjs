import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";

const browserGlobals = {
  document: "readonly",
  window: "readonly",
  navigator: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  location: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  fetch: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  WebSocket: "readonly",
  RTCPeerConnection: "readonly",
  RTCSessionDescription: "readonly",
  RTCIceCandidate: "readonly",
  MediaStream: "readonly",
  AudioContext: "readonly",
  AudioWorkletNode: "readonly",
  FileReader: "readonly",
  Blob: "readonly",
  HTMLElement: "readonly",
  Element: "readonly",
  Event: "readonly",
  PointerEvent: "readonly",
  KeyboardEvent: "readonly",
  MessageEvent: "readonly",
  ErrorEvent: "readonly",
  CloseEvent: "readonly",
  FormData: "readonly",
  Notification: "readonly",
  performance: "readonly",
  screen: "readonly"
};

export default [
  js.configs.recommended,
  jsdoc.configs["flat/recommended"],
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: browserGlobals
    },
    plugins: {
      jsdoc
    },
    rules: {
      "jsdoc/require-jsdoc": [
        "warn",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: true
          }
        }
      ],
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns-description": "off",
      "jsdoc/require-description": "off",
      "jsdoc/no-defaults": "off",
      "jsdoc/no-undefined-types": "off",
      "jsdoc/reject-function-type": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-empty": ["error", { "allowEmptyCatch": true }]
    }
  },
  {
    files: ["server.js", "src/server/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly"
      }
    }
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: browserGlobals
    }
  },
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "data/**"]
  }
];
