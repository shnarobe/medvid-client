const path = require('path');
const EventEmitter = require('events');
const ws = require('ws');
const readline=require("readline");
const Stream = require('./VideoStream');
const child_process=require("child_process");
const fs=require("fs");
const chokidar=require("chokidar");

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});


// Add these constants at the top of the file after the imports
const PLACEHOLDER_VIDEO = path.join(__dirname, './assets/rtspStreams/placeholder.mp4');
//console.log(PLACEHOLDER_VIDEO);
//ffmpeg -f lavfi -i color=c=black:s=1280x720 -r 30  -t 10 placeholder.mp4
const PLACEHOLDER_AUDIO = path.join(__dirname, './assets/rtspStreams/silent_placeholder.mp3');
//ffmpeg -f lavfi -i anullsrc=r=44000:cl=stereo -t 10 -c:a mp2 -b:a 192k silent_placeholder.mp2


class RtspService extends EventEmitter {
   
	 constructor() {
        super();
        this.config =null;// this.loadConfig();
		this.configPath=path.join(__dirname,"config.txt");
        this.camera1 = "";
        this.camera2 = "";
        this.audioStream = ""; 
        this.stream = null;
		this.streamUrls={};
        this.healthCheckInterval = null;
        this.ffmpegOpts = [];
        this.lastDataTimestamp = Date.now();
    }


    /**Read configuration from file */
        loadConfig() {
			return new Promise((resolve)=>{
            try{
                const filePath = path.join(__dirname, "config.txt");
                console.log("Reading config file at", filePath);
                const fileStream = fs.createReadStream(filePath);
            
                const r1 = readline.createInterface({
                    input: fileStream,
                    output: process.stdout,
                    terminal: false
                    //crlfDelay: Infinity,
                });
                  // Note: we use the crlfDelay option to recognize all instances of CR LF
                  // ('\r\n') in input.txt as a single line break.
            
                let i = 0;
                r1.on(
                    "line",
                      (line)=> {
                      //parse file contents
                      const configArray = line.split("=");
                      console.log("array", configArray);
            
                       if (configArray[i] == "Camera1") {
                        //store config in app to be accessed throughout
                        this.camera1 = configArray[i + 1];
                        console.log("Added camera 1",this.camera1);
                      }
                      else if (configArray[i] == "Camera2") {
                        //store config in app to be accessed throughout
                        this.camera2 = configArray[i + 1];
                        console.log("Added camera 2", this.camera2);
                      }
                      else if(configArray[i]=="Audio"){
                        this.audioModule=configArray[i+1];
                        console.log("Added the audio module",this.audioModule);
                      }
                      
                    }
                );
                r1.on("close",()=>{
					console.log("config",{cam1:this.camera1, cam2:this.camera2, audio:this.audioModule });
					this.config= {cam1:this.camera1, cam2:this.camera2, audio:this.audioModule };
					return resolve();
					
					
                });
            }
            catch (error) {
                console.error('Error reading config file:', error);
                this.emit("error",error);
				return resolve();
				
            }
			});
            
        }
    
        async reloadConfig() {
			
			try{
				//we can have erroneous calls, thus always verify if the file is indeed different before changing
					const temp={...this.config};//get a copy of the existing streams
					await this.loadConfig();//read the current streams from file
					//console.log("two streams",this.config,temp);
					//check for changes in the streams
					const changes=this.compareObjects(this.config,temp);
					if(changes){
						//console.log("file changed");
						/*health check fetches the current streams, checks for changes
                        updates with placeholders if necessary and decides to reload
                        streams through updateStream if changes are present*/
					    await this.startHealthCheck();
                        clearInterval(this.healthCheckInterval);//cancel the previous interval
                        //holds the unique interval ID for health checks
                        this.healthCheckInterval = setInterval(() => {
                            this.startHealthCheck();
                        }, 60000);
					}
			}
			catch(error){
				console.log("Error in reload config",error);
				this.emit("error",error);
			}
           
           
			
			
       
        }

    async start() {
        try {
            // Read in the configuration file
			await this.loadConfig();

           // Initialize RTSP streams/placeholders and start VideoStream and Mpeg1Muxer
           //to process streams and output to clients via server
            await this.initializeStreams();

            // Start health monitoring, every minute
           this.healthCheckInterval = setInterval(()=>{
			   console.log("performing a health check");
			   this.startHealthCheck(); 
		   },60000);
		   
		   /**While fs.watch() is generally efficient, it can be unreliable in some scenarios and may exhibit platform-specific quirks. 
		   For instance, it might sometimes emit multiple events for a single modification or report all changes as 'rename' events on certain operating systems.*/
		   // Watch config file for changes
           /*  fs.watch(this.configPath, async(eventType) => {
                if (eventType === 'change') {
					console.log("file changed");
					clearInterval(healthChecks);//cancel the interval/health checks
                    await this.reloadConfig();
                }
            });
			*/
            //monitor the config file for any possible changes
			chokidar.watch(path.join(__dirname,"config.txt")).on("change",(event,path)=>{
				clearInterval(this.healthCheckInterval);//cancel the interval/health checks
				this.reloadConfig();
			});

			} catch (error) {
				console.error('Failed to start RTSP service:', error);
				this.emit('error', error);
				}
			}
				
   

    async initializeStreams() {
        try {
            this.ffmpegOpts = [];
            //console.log("value of config",this.config);
            // Check stream availability and use placeholders if needed
            const cam1Available = await this.checkStreamAvailable(this.config.cam1);
            const cam2Available = await this.checkStreamAvailable(this.config.cam2);
            const audioAvailable = await this.checkStreamAvailable(this.config.audio);

            //console.log("Camera 1 available:", cam1Available);
            //console.log("Camera 2 available:", cam2Available);
            //console.log("Audio available:", audioAvailable);

            // Determine which streams to use
            this.streamUrls = {
                cam1: cam1Available ? this.config.cam1 : PLACEHOLDER_VIDEO,
                cam2: cam2Available ? this.config.cam2 : PLACEHOLDER_VIDEO,
                audio: audioAvailable ? this.config.audio : PLACEHOLDER_AUDIO
            };

            // Log stream status
            console.log('Stream status:', {
                cam1: cam1Available ? 'LIVE' : 'PLACEHOLDER',
                cam2: cam2Available ? 'LIVE' : 'PLACEHOLDER',
                audio: audioAvailable ? 'LIVE' : 'PLACEHOLDER'
            });
			//sync video to the live stream always
			if(cam1Available && !cam2Available){
				this.ffmpegOpts.push("-isync", "0");//sync to the first stream
			}
			else if(cam2Available && !cam1Available){
				this.ffmpegOpts.push("-isync", "1");//sync to the first stream
				
			}
			else if(cam1Available && cam2Available){
				this.ffmpegOpts.push("-isync", "1");//sync to the first stream
			}
			
			 // Build filter complex with correct input options
        this.ffmpegOpts.push(
			 
            //"-rtsp_transport","tcp",        // Add RTSP transport option
			 "-thread_queue_size",8192,
			"-use_wallclock_as_timestamps", 1,
            "-i", this.streamUrls.cam1,           // First input
			 "-thread_queue_size", 8192,
			"-use_wallclock_as_timestamps", 1,
            "-i", this.streamUrls.cam2,           // Second input
			 "-thread_queue_size", 8192,
			"-use_wallclock_as_timestamps", 1,
            "-i", this.streamUrls.audio,  
			// Audio input
			 "-filter_complex", 
			"[2:a]adelay=750|750[delayed_audio]", // 750ms delay, adjust as needed
			"-map", "[delayed_audio]",
			//"-vsync","1",
            "-filter_complex", 
                "[0:v]setpts=PTS-STARTPTS,scale=1280:720[v0];"+
                "[1:v]setpts=PTS-STARTPTS,scale=1280:720[v1];"+
                "[v0][v1]hstack=inputs=2[vout]",
            "-map", "[vout]",
            "-f", "mpegts",
            "-codec:v", "mpeg1video",
            "-r", "30",
            "-b:v", "2500000",
            //"-fps_mode", "crf",
            "-async", "1",
			"-copytb","1",
            "-max_delay", "500000",
            "-max_muxing_queue_size", "1024",
			"-");

             
            // Initialize stream with potentially replaced streams
            this.stream = new Stream({
                name: "combinedStream",
                streamUrl: this.streamUrls.cam1,
                streamUrl2: this.streamUrls.cam2,
                streamUrl3: this.streamUrls.audio,
                wsPort: 9998,
                ffmpegOptions: this.ffmpegOpts,
                // Add reconnect options
                /* reconnect: true,
                reconnectInterval: 500000,
                onStreamError: async (streamType) => {
                    console.log(`Stream error detected for ${streamType}, attempting to recover...`);
                    // Try to recover the original stream
                    const isAvailable = await this.checkStreamAvailable(this.config[streamType]);
                    if (isAvailable) {
						console.log("CHECKING STREAM AVAILABILITY");
                        this.stream.updateSource(streamType, this.config[streamType]);
                    } else {
                        console.log(`Using placeholder for ${streamType}`);
                        this.stream.updateSource(streamType, 
                            streamType === 'audio' ? PLACEHOLDER_AUDIO : PLACEHOLDER_VIDEO
                        );
                    }
                } */
            });

            

        } catch (error) {
            console.error('Error initializing streams:', error);
            this.emit('error', error);
        }
    }
	
	 async checkStreamAvailable(url) {
	try{
        return new Promise((resolve) => {
			
			if(!url){
				return resolve(false);
				
			}
			let dataReceived=false;
			const ffmpeg_process=child_process.spawn("ffprobe",[
			//'rtsp-transport','tcp',
			'-i',url,
			//'-t','1',
			//'f','null',
			//'-'
			]);
            
            ffmpeg_process.stdout.on("data",(data)=>{
				console.log("data received,standadr out",data.toString());
				dataReceived=true;
				
			});
			
			ffmpeg_process.stderr.on("data",(data)=>{
				console.log("data received:standard error",data.toString());
				if(data.toString().includes("Stream #")){
				dataReceived=true;
				console.log("data received",data);
				}
			});
			
			const timeoutId=setTimeout(()=>{
				ffmpeg_process.kill();
				resolve(dataReceived);
			},4000);
			
			ffmpeg_process.on("close",()=>{
				clearTimeout(timeoutId);
				resolve(dataReceived);
			})
			
			
    });
	}
	catch(error){
		this.emit("error",error);
	}
	}
	
	
    async startHealthCheck() {
	 try{
		console.log("starting health check");
      if (!this.stream || !this.stream.wsServer || this.stream.lastDataTimestamp < Date.now() - 60000) {
		 
			  if (this.stream && this.stream.wsServer) {
						console.log("stopping server");
						 const result=await this.stream.stop();
						 console.log("result of stop",result);
				}
			  await this.loadConfig();
			  await this.initializeStreams();
		  
	  }
	  console.log("recreated ws server");
        this.ffmpegOpts = [];
		//fetch the stream statuses and compare with what it was originally, any change, then updateStreams
		//this means that one or more streams changed since we last started.
		 // Check stream availability and use placeholders if needed
            const cam1Available = await this.checkStreamAvailable(this.config.cam1);
            const cam2Available = await this.checkStreamAvailable(this.config.cam2);
            const audioAvailable = await this.checkStreamAvailable(this.config.audio);

            console.log("Camera 1 available:", cam1Available);
            console.log("Camera 2 available:", cam2Available);
            console.log("Audio available:", audioAvailable);

            // Determine which streams to use
            const newStreamUrls = {
                cam1: cam1Available ? this.config.cam1 : PLACEHOLDER_VIDEO,
                cam2: cam2Available ? this.config.cam2 : PLACEHOLDER_VIDEO,
                audio: audioAvailable ? this.config.audio : PLACEHOLDER_AUDIO
            };
			//check for changes in the streams
			const changes=this.compareObjects(this.streamUrls,newStreamUrls);
			if(changes){
				console.log("stream url before:",this.streamUrls);
				//update streamUrls to point to the updated stream list if there were any changes
				this.streamUrls=newStreamUrls;
				console.log("stream url after:",this.streamUrls);
				
				//sync video to the live stream always
				if(cam1Available && !cam2Available){
					this.ffmpegOpts.push("-isync", "0");//sync to the first stream
				}
				else if(cam2Available && !cam1Available){
					this.ffmpegOpts.push("-isync", "1");//sync to the first stream
					
				}
				else if(cam1Available && cam2Available){
					this.ffmpegOpts.push("-isync", "1");//sync to the first stream
				}

				this.ffmpegOpts.push(

					//"-rtsp_transport","tcp",        // Add RTSP transport option
					 "-thread_queue_size",8192,
					"-use_wallclock_as_timestamps", 1,
					"-i", this.streamUrls.cam1,           // First input
					 "-thread_queue_size", 8192,
					"-use_wallclock_as_timestamps", 1,
					"-i", this.streamUrls.cam2,           // Second input
					 "-thread_queue_size", 8192,
					"-use_wallclock_as_timestamps", 1,
					"-i", this.streamUrls.audio,  
					// Audio input
					 "-filter_complex", 
					"[2:a]adelay=750|750[delayed_audio]", // 750ms delay, adjust as needed
					"-map", "[delayed_audio]",
					//"-vsync","1",
					"-filter_complex", 
						"[0:v]setpts=PTS-STARTPTS,scale=1280:720[v0];"+
						"[1:v]setpts=PTS-STARTPTS,scale=1280:720[v1];"+
						"[v0][v1]hstack=inputs=2[vout]",
					"-map", "[vout]",
					"-f", "mpegts",
					"-codec:v", "mpeg1video",
					"-r", "30",
					"-b:v", "2500000",
					//"-fps_mode", "crf",
					"-async", "1",
					"-copytb","1",
					"-max_delay", "500000",
					"-max_muxing_queue_size", "1024",
					"-"
				);
				//if there are changes then update the streams
				this.stream.updateStreams({             
                streamUrl: this.streamUrls.cam1,
                streamUrl2: this.streamUrls.cam2,
                streamUrl3: this.streamUrls.audio,
                ffmpegOptions: this.ffmpegOpts
				});
			}
			return;
	 }
	catch(error){
			  console.log("error in new ws creation",error);
			  this.emit("error",error);
		  }
		/* 
        this.healthCheckInterval = setInterval(() => {
            const now = Date.now();
            const dataAge = now - this.lastDataTimestamp;

            // If no data received for 10 seconds, restart streams
            if (dataAge > 10000) {
                console.warn('No stream data received for 10 seconds, restarting streams...');
                this.restartAllStreams();
            }
        }, 50000); // Check every 5 seconds */
    }
	
	compareObjects(obj1,obj2){
	try{
		let changes=false;
		for(const key in obj1){
			if(obj1[key]===obj2[key]){
				changes=false;
			}
			else{
				changes=true;
				break;
			}
		}
		return changes;
	}
	
	catch(error){
		this.emit("error",error);
	}

    
}




}


try{
rtsp=new RtspService();
rtsp.start();
}
catch(error){
	console.log("error");
}


