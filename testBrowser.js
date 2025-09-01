//create a service that then calls this code specifically to check if the browser can be launched
const child_process=require("child_process");
const path=require("path");
const puppeteer=require("puppeteer");
let child=null;
	//C:\Program Files (x86)\Google\Chrome\Application
	//"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
	//C:\Program Files\sgusimhub\assets\chrome\win64-139.0.7258.154\chrome-win64
	const browserPath=path.join(__dirname,"assets","chrome","win64-139.0.7258.154","chrome-win64","chrome.exe");
	console.log("browser path",browserPath);
	function native(){
	 child = child_process.spawn(browserPath,[
                 // "--kiosk",  //Enable kiosk mode (full-screen without UI)
                  "--disable-infobars", // Disable "Chrome is being controlled by automated test software" message
                  "--noerrdialogs", // Suppress error dialogs
                  "--disable-session-crashed-bubble", // Disable session restore prompts
                  "--disable-extensions", // Disable extensions
                  "--disable-component-update", // Disable component updates
                  "--disable-features=TranslateUI", // Disable translation UI 
                  'http://localhost:8080/']);
                child.on('error', (err) => {
                  console.error(`Error occurred with child process: ${err}`);
                 
                  //Failure case
                  //callback({ message: "failure", clientname: obj.clientname });
				  child=null;
                  
                 });
                child.on("spawn",()=>{  
                  //success case
                  console.log("child process spawned. Chrome successfully opened");
                 
                });
                child.stdout.on('data', (data) => {
                  console.log(`Google stdout: ${data}`);
              });
              
              child.stderr.on('data', (data) => {
                  console.error(`Google stderr: ${data}`);
              });
              
              child.on('close', (code) => {
                  console.log(`child process exited with code ${code}`);
                  child=null;
                 
              });
			  
	}
	
	async function puppet(){
		try{
					const chromePath = path.join(__dirname,"assets","chrome","win64-139.0.7258.154","chrome-win64","chrome.exe");
				console.log("puppet path",chromePath);
				const browser = await puppeteer.launch({
					headless: false,
					executablePath: chromePath,
					args: [
						//'--kiosk',  // Full screen
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

			   
				
				
				const page = await browser.newPage();
				await page.goto('http://localhost:8080/');
		}
		catch(error){
			console.log(error);
		}
	//await browser.close();
	}
	
	 native();
	 //puppet();
	//console.log(result);
		

