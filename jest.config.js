module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    ".(ts)": "<rootDir>/node_modules/ts-jest/preprocessor.js"
  },
  testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  moduleFileExtensions: ["ts", "js"],
  moduleNameMapper: {
    "@abstractions(.*)$": "<rootDir>/src/abstractions/node$1"
  }
};
