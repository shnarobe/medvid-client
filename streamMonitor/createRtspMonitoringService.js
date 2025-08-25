const {Service}=require("node-windows");
const RtspService=require("../streamMonitor");
const path=require("path");
// Windows Service Configuration
const svc = new Service({
    name: 'RTSP Stream monitoring Service',
    description: 'Manages RTSP camera streams for SGUSimHub',
    script: path.join(__dirname, 'streamMonitor', 'streamMonitor.js'),
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=2048'
    ]
});

// Service installation handlers
svc.on('install', () => {
    svc.start();
    console.log('RTSP service installed and started');
});

svc.on('error', (error) => {
    console.error('Service error:', error);
});



// Install the service
//if (require.main === module) {
    svc.install();
//}