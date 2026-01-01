module.exports = {
  apps: [
    {
      name: 'sak-api',
      cwd: (process.env.APP_DIR || '/opt/sak-ai-enquiry-handler') + '/apps/api',
      script: 'dist/index.js',
      node_args: '',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || '8053'
      }
    }
  ]
}
