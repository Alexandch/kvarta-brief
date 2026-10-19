module.exports = {
  ci: {
    collect: {
      url: [process.env.LHCI_URL || "http://127.0.0.1:3000/"],
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
      outputDir: process.env.LHCI_OUTPUT_DIR || "./artifacts/lighthouse",
    },
  },
};
