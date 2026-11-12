// The web build is published under https://ceomai.github.io/islamic-plus/app/ by the Pages
// workflow, which sets WEB_BASE_URL. Locally and in EAS builds nothing changes.
module.exports = ({ config }) =>
  process.env.WEB_BASE_URL
    ? { ...config, experiments: { ...config.experiments, baseUrl: process.env.WEB_BASE_URL } }
    : config;
