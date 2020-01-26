const path = require('path')

module.exports = {
  apps: [{
    name: 'app',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '2G'
  }]
}