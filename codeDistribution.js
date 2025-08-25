//package the application
// Add to code_distribution.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createInstaller() {
  console.log('Creating application installer...');
  
  // 1. Bundle the application
  console.log('Bundling application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // 2. Copy necessary files to dist folder
  const distDir = path.join(__dirname, '../dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // 3. Create batch file for installation
  const installBat = path.join(distDir, 'install.bat');
  fs.writeFileSync(installBat, `
@echo off
echo Installing Video Exam App...

:: Set FFmpeg path
set FFMPEG_PATH=c:\Program Files\sgusimhub\ffmpeg\bin
setx PATH "%PATH%;%FFMPEG_PATH%" /M

:: Create program directory
mkdir "%ProgramFiles%\Video Exam App"

:: Copy files
xcopy /E /I /Y ".\\*" "%ProgramFiles%\\sgusimhub"

:: Install dependencies
cd "%ProgramFiles%\\sgusimhub"
npm install 

:: Install as service
node service-installer.js

:: Also Install as RtspService
node /streamMonitor/createRtspMonitoringService.js

:: Create shortcuts
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%userprofile%\\Desktop\\sgusimhub.lnk');$s.TargetPath='%ProgramFiles%\\sgusimhub\\app.js';$s.Save()"

echo Installation complete!
pause
  `);//also set ffmpeg path in batch file
  
  // 4. Create service installer
  const serviceInstaller = path.join(distDir, 'service-installer.js');
  fs.writeFileSync(serviceInstaller, `
const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'Video Exam App',
  description: 'Video examination application service',
  script: path.join(__dirname, 'app.js'),
  nodeOptions: ['--max_old_space_size=4096'],
  env: [{ name: "NODE_ENV", value: "production" }],
  workingDirectory: __dirname
});

svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.install();
  `);
  
  console.log('Installer created successfully in dist folder');
}

// Export the installer function
//module.exports.createInstaller = createInstaller;
createInstaller();


/**
 * Distribute to Target Machines

1. Copy the entire dist folder to each target machine
2. Run install.bat as administrator on each machine - this will install the application and set it up as a service
3. Verify Installation

Check services (services.msc) for "Video Exam App"
Verify app starts on system boot
Test functionality
Setup Update Server

Create a simple server with version info:
{ "version": "1.0.1", "downloadUrl": "https://your-server.com/updates/video-app-1.0.1.zip" }
 */
/**5. Security Configuration
Run service as specific user
sc config "Video Exam App" obj= ".\VideoAppUser" password= "SecurePassword"
Set appropriate permissions
icacls "%ProgramFiles%\Video Exam App" /grant "VideoAppUser":(OI)(CI)F
Configure firewall
netsh advfirewall firewall add rule name="Video App" dir=in action=allow program="%ProgramFiles%\Video Exam App\app.js" enable=yes

These steps provide a complete solution for distributing your Node.js application to multiple machines
 with automatic updates, startup on boot, and proper priority settings. */
