import base from "@mony/config/eslint";

export default [
  ...base,
  {
    rules: {
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  {
    ignores: ["jest.setup.js"],
  },
];
