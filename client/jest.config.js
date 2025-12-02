module.exports = {
  displayName: "client",
  testEnvironment: "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  moduleFileExtensions: ["js", "jsx", "json"],
  moduleNameMapper: {
    "^react$": "<rootDir>/node_modules/react",
    "^react-dom$": "<rootDir>/node_modules/react-dom",
    "^react/jsx-runtime$": "<rootDir>/node_modules/react/jsx-runtime",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy"
  }
};