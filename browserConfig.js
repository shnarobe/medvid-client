const path = require('path');
const puppeteer = require('puppeteer-core');

async function launchBrowser() {
    const chromePath = path.join(__dirname, 'assets', 'chrome', 'chrome.exe');
    
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        args: [
            '--kiosk',  // Full screen
            '--disable-infobars',
            '--disable-notifications',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-popup-blocking',
            '--start-maximized'
        ],
        defaultViewport: null,
        ignoreDefaultArgs: ['--enable-automation']  // Hides automation warning
    });

    return browser;
}

// Function to validate Chrome installation
async function validateChromePath() {
    const chromePath = path.join(__dirname, 'assets', 'chrome', 'chrome.exe');
    try {
        const fs = require('fs');
        if (fs.existsSync(chromePath)) {
            return { exists: true, path: chromePath };
        }
        return { exists: false, path: chromePath };
    } catch (error) {
        return { exists: false, path: chromePath, error: error.message };
    }
}

module.exports = {
    launchBrowser,
    validateChromePath
};
