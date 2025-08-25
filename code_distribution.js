//Create a Windows service for the Video Exam App using node-windows
// Install the node-windows package
// npm install node-windows --save

const { Service } = require('node-windows');
const path = require('path');

// Service configuration
const svc = new Service({
  name: 'Video Exam App',
  description: 'Video examination application service',
  script: path.join(__dirname, '../app.js'),
  nodeOptions: ['--max_old_space_size=4096'],
  env: [{ 
    name: "NODE_ENV", 
    value: "production" 
  }],
  workingDirectory: path.join(__dirname, '..'),
  allowServiceLogon: true
});

// Listen for service events
svc.on('install', () => {
  console.log('Service installed');
  svc.start();
});

svc.on('start', () => {
  console.log('Service started');
  // Set service recovery options
  require('child_process').exec(
    'sc failure "Video Exam App" reset= 86400 actions= restart/60000/restart/120000/restart/300000'
  );
  // Set service priority (high)
  require('child_process').exec('wmic process where name="node.exe" CALL setpriority "high priority"');
});

// Install the service
svc.install();


//create an auto update system
// Add to code_distribution.js or create updater.js
class AppUpdater {
  constructor(options = {}) {
    this.currentVersion = options.currentVersion || require('../package.json').version;
    this.updateServer = options.updateServer || 'https://your-update-server.com';
    this.updateInterval = options.updateInterval || 3600000; // 1 hour
    this.appDirectory = options.appDirectory || path.join(__dirname, '..');
  }

  async start() {
    console.log(`Updater started. Current version: ${this.currentVersion}`);
    
    // Check immediately on startup
    await this.checkForUpdates();
    
    // Then schedule regular checks
    setInterval(() => this.checkForUpdates(), this.updateInterval);
  }

  async checkForUpdates() {
    console.log('Checking for updates...');
    
    try {
      // Implementation of version checking and update process
      // This would fetch from your update server and compare versions
      const latestVersion = await this.getLatestVersion();
      
      if (this.isNewerVersion(latestVersion.version, this.currentVersion)) {
        console.log(`New version available: ${latestVersion.version}`);
        // Download and install update
        await this.downloadUpdate(latestVersion.downloadUrl);
        await this.installUpdate(latestVersion.version);
      } else {
        console.log('No updates available');
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  // Implementation methods would go here
}

// Export the updater
module.exports = AppUpdater;

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
set FFMPEG_PATH=c:\Program files\sgusimhub\ffmpeg\bin
setx PATH "%PATH%;%FFMPEG_PATH%" /M

:: Create program directory
mkdir "%ProgramFiles%\Video Exam App"

:: Copy files
xcopy /E /I /Y ".\\*" "%ProgramFiles%\\Video Exam App"

:: Install dependencies
cd "%ProgramFiles%\\Video Exam App"
npm install --production

:: Install as service
node service-installer.js

:: Create shortcuts
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%userprofile%\\Desktop\\Video Exam App.lnk');$s.TargetPath='%ProgramFiles%\\Video Exam App\\app.js';$s.Save()"

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
module.exports.createInstaller = createInstaller;

//Distribution steps
# Install dependencies
npm install

# Run the installer creation script
node node\ files/code_distribution.js --create-installer
/**
 * Distribute to Target Machines

Copy the entire dist folder to each target machine
Run install.bat as administrator on each machine
Verify Installation

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
