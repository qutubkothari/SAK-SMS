module.exports = {
  apps: [
    {
      name: 'sak-api',
      cwd: '/opt/sak-ai-enquiry-handler/apps/api',
      script: 'dist/index.js',
      node_args: '',
      env: {
        NODE_ENV: 'production',
        PORT: '4000'
      }
    }
  ]
}
