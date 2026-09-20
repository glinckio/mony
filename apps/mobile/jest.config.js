module.exports = {
  preset: "jest-expo",
  // pnpm's nested `.pnpm/<pkg>/node_modules/...` store layout defeats jest-expo's
  // default transformIgnorePatterns regex (it only accounts for a flat node_modules
  // tree), so react-native's own Flow-typed internals end up un-transformed and throw
  // a syntax error. Transforming everything is the reliable fix in a pnpm monorepo.
  transformIgnorePatterns: [],
  collectCoverageFrom: ["src/**/*.{ts,tsx}"],
  coverageDirectory: "coverage",
};
