module.exports = {
  apps: [
    {
      name: 'sak-api',
      cwd: '/opt/sak-ai-enquiry-handler/apps/api',
      script: 'apps/api/dist/index.js',
      node_args: '',
      env: {
        NODE_ENV: 'production',
        PORT: '4000'
      }
    }
  ]
}
