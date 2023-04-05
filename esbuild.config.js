module.exports = (serverless) => ({
  bundle: true,
  minify: false,
  sourcemap: true,
  target: "node14",
  platform: "node",
  packager: "yarn",
  concurrency: 10,
})
