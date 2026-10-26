// Fixed time zone so date and prayer-time tests behave the same on every machine and in CI.
// Set here (before test workers start) because changing TZ inside a worker is not reliable.
module.exports = async () => {
  process.env.TZ = 'Europe/Istanbul';
};
