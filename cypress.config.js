import { defineConfig } from "cypress";
import mochawesomeReporter from "cypress-mochawesome-reporter/plugin.js";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5174",
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    videoCompression: 32,
    videosFolder: "cypress/videos",
    screenshotOnRunFailure: true,
    screenshotsFolder: "cypress/screenshots",
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 30000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    chromeWebSecurity: false,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 0,

    setupNodeEvents(on, config) {
      // Implement mochawesome reporter
      mochawesomeReporter(on);

      return config;
    },

    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",

    // Report configuration
    reporter: "cypress-mochawesome-reporter",
    reporterOptions: {
      reportDir: "cypress/reports",
      overwrite: false,
      html: true,
      json: true,
      charts: true,
      reportPageTitle: "ERP Eventos - Reporte de Pruebas UI",
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
    },
  },

  env: {
    // Add your test environment variables here
    testUserEmail: "test@example.com",
    testUserPassword: "testpassword",
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
});
