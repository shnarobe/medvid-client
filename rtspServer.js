var Stream = require("./VideoStream.js");
const fs=require("fs");
const readline=require("readline");
var camera1=null;
var camera2=null;
var audioModule=null;




//read from config file
try{
      const fileStream = fs.createReadStream("./config.txt");

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
            camera1 = configArray[i + 1];
            console.log("Added camera 1",camera1);
          }
          else if (configArray[i] == "Camera2") {
            //store config in app to be accessed throughout
            camera2 = configArray[i + 1];
            console.log("Added camera 2", camera2);
          }
          else if(configArray[i]=="Audio"){
            audioModule=configArray[i+1];
            console.log("Added the audio module",audioModule);
          }
          
        }
      );
	  
	  r1.on("close",()=>{
		  //set u[ stream after reading file
		  stream = new Stream({
		  name: "cam1",
		  //consider adding these via config file, dependency injection pattern
		  streamUrl: camera1,
		  streamUrl2: camera2,
		  streamUrl3: audioModule,
		  wsPort: 9998,
		  ffmpegOptions: {
			// options ffmpeg flags
			"-stats": "", // an option with no neccessary value uses a blank string
			"-r": 30,
			//"-ss": 10, //strart the output only after 50 sec
			"-s": "2560x720",
			"-b:v": 2500000,
			"-filter_complex": "[0:v][1:v]hstack=inputs=2[outv]",
			"-map": "[outv]",

			// options with required values specify the value after the key
  }
});
console.log(stream);
	  });
		
		
		
    }
    catch(error){
      console.log("error reading config file. Feed not started", error);
      return;
    }


//"-map": "1:a",
// "-c:a": "aac",
//"-b:a": "320k",
//"-ar": 44100,
// "-map": "1:a",
//"-b:v": 2500000,

//ffmpeg  -i  "rtsp://rtspstream:3692f2e72e09139fbde2ff0462fef481@zephyr.rtsp.stream/movie" -i  "rtsp://rtspstream:3692f2e72e09139fbde2ff0462fef481@zephyr.rtsp.stream/movie" -filter_complex "[0:v][1:v]hstack=inputs=2[outv]" -map 1:a -map "[outv]" hstacked.mov

/* stream2 = new Stream({
  name: "cam2",
  streamUrl: "rtsp://root:sgusimlab@10.20.150.141/axis-media/media.amp",
  wsPort: 9999,
  ffmpegOptions: {
    // options ffmpeg flags
    "-stats": "", // an option with no neccessary value uses a blank string
    "-r": 30, // options with required values specify the value after the key
  },
});
 */


