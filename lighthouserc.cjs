module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3000/"],
      startServerCommand: "npm run start -- --hostname 127.0.0.1",
      startServerReadyPattern: "Ready in",
      numberOfRuns: 3,
      settings: {
        chromeFlags: ["--no-sandbox", "--disable-dev-shm-usage"],
        formFactor: "mobile",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./artifacts/lighthouse",
    },
  },
};
