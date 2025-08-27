
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'SGUSimHub App',
  description: 'SGUSimHub App',
  script: path.join(__dirname, 'app.js'),
  nodeOptions: [
        '--harmony',
        '--max_old_space_size=2048'
    ]
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.install();
  