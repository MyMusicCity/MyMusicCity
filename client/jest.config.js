module.exports = {
  displayName: "client",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[tj]sx?$": "<rootDir>/../wrapper.js"
  },
  moduleFileExtensions: ["js", "jsx", "json"],
  moduleNameMapper: {
    "^react$": "<rootDir>/node_modules/react",
    "^react-dom$": "<rootDir>/node_modules/react-dom",
    "^react/jsx-runtime$": "<rootDir>/node_modules/react/jsx-runtime"
  }
};