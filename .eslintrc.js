module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    project: ["tsconfig.json"],
  },
  rules: {
    // 除外ルール
    "@typescript-eslint/no-empty-function": "off",
    // 追加ルール
    "@typescript-eslint/no-floating-promises": "error",
    // prettier 設定
    "prettier/prettier": ["error"],
  },
  ignorePatterns: ["**/*.js"],
}
