var Mpeg1Muxer, child_process, events, util;

child_process = require("child_process");

util = require("util");
fs=require("fs");

events = require("events");

Mpeg1Muxer = function (options) {
  var key;
  this.url = options.url;
  this.url2 = options.url2;
  this.url3 = options.url3;
  this.ffmpegOptions = options.ffmpegOptions;
  this.exitCode = undefined;
  this.additionalFlags = [];
  this.spawnOptions = [];
  if (this.ffmpegOptions) {
    for (key in this.ffmpegOptions) {
      this.additionalFlags.push(key);
      if (String(this.ffmpegOptions[key]) !== "") {
        this.additionalFlags.push(String(this.ffmpegOptions[key]));
      }
    }
  } 
 /*  // At the beginning of your spawnOptions
this.spawnOptions.push(
  "-isync", "1",           // Sync all inputs to first input
);
  //populate spawn based on the options url,url2,url3
  if(this.url){
    this.spawnOptions.push( "-rtsp_transport", "tcp",
  "-thread_queue_size", 8192,
  "-use_wallclock_as_timestamps", 1,
  "-i", this.url);   // input 0: video stream 1);
  }
  if(this.url2){
    this.spawnOptions.push( "-rtsp_transport", "tcp",
  "-thread_queue_size", 8192,
  "-use_wallclock_as_timestamps", 1,
  "-i", this.url2);   // input 1: video stream 2
  }
  if(this.url3){
    this.spawnOptions.push( "-rtsp_transport", "tcp",
  "-thread_queue_size", 8192,
  "-use_wallclock_as_timestamps", 1,
  "-i", this.url3);   // input 2: audio stream
  // } */
  //this.spawnOptions.push(...this.additionalFlags);
  // In Mpeg1Muxer.js after your regular options:
/* if(this.url3 && this.url  && this.url2) {
  // Manually add the audio mapping
  this.spawnOptions.push(
    "-filter_complex", 
    "[2:a]adelay=750|750[delayed_audio]", // 750ms delay, adjust as needed
    "-map", "[delayed_audio]" // map the delayed audio
  );
} */

/* if(this.url3 && (this.url  || this.url2)) {
  // Manually add the audio mapping
  this.spawnOptions.push(
    "-filter_complex", 
    "[1:a]adelay=750|750[delayed_audio]", // 750ms delay, adjust as needed
    "-map", "[delayed_audio]" // map the delayed audio
  );
} */
/*//"-vsync", "1",
  "-fps_mode","cfr",  // Force video sync
  "-async", "1",           // Audio sync
  "-copytb", "1",          // Copy timebase
  "-fflags", "+genpts",    // Generate PTS*/
  // Add these essential sync options
  this.spawnOptions=this.ffmpegOptions;
  
/* this.spawnOptions.push(
  "-"
);  */


//console.log("spawn options",this.spawnOptions);
  //the original array was called this.spawnOtions
  this.spawnOptionsOriginal = [
   /*  "-rtsp_transport",
    "tcp",
    "-use_wallclock_as_timestamps",
    0,
    "-thread_queue_size",
    4096,
    "-copyts",
    "-start_at_zero",
    "-isync", //sync both inputs to the first one
    1,
    "-copyts",
    "-start_at_zero",
    "-i",
    this.url,
    "-thread_queue_size",
    4096,
    "-copyts",
    "-start_at_zero",
    "-i",
    this.url2,
	//"-thread_queue_size",
    //4096,
    //"-copyts",
    //"-start_at_zero",
	"-i",
    this.url3,
    "-f",
    "mpegts",
    "-codec:v",
    "mpeg1video",
    "-codec:a",
    "mp2",
    "-map",
    "2:a", */

     "-rtsp_transport", "tcp",
  "-thread_queue_size", 4096,
  "-use_wallclock_as_timestamps", 1,
  "-i", this.url,      // input 0: video stream 1
  
  "-thread_queue_size", 4096, 
  "-use_wallclock_as_timestamps", 1,
  "-i", this.url2,     // input 1: video stream 2
  
  "-thread_queue_size", 4096,
  "-use_wallclock_as_timestamps", 1, 
  "-i", this.url3,     // input 2: audio stream
  
 /*  "-filter_complex", 
  "[0:v]setpts=PTS-STARTPTS,scale=1280:720[v0];" +//scales both video streams to 1280x720 in case they are different resolutions
  "[1:v]setpts=PTS-STARTPTS,scale=1280:720[v1];" +
  "[v0][v1]hstack=inputs=2[vout]",
  
  "-map", "[vout]",    // map combined video
  "-map", "2:a",       // map audio from input 2
  
  "-f", "mpegts",
  "-codec:v", "mpeg1video", 
  "-codec:a", "mp2",
  "-r", 30,            // force consistent frame rate
  "-async", 1,    */      // audio sync 
    // additional ffmpeg options go here
    ...this.additionalFlags,
    "-",
  ];
  
  console.log("spawn options full",this.spawnOptions);
  this.stream = child_process.spawn(options.ffmpegPath, this.spawnOptions, {
    detached: false,
  });
  //handle errors on the child process
  this.stream.on("error", (err) => {
    console.error("Error in Mpeg1Muxer stream:", err);
    //restart the stream or handle the error as needed
    this.stream = child_process.spawn(options.ffmpegPath, this.spawnOptions, {
    detached: false,
  });
    this.emit("exitWithError");
  });
  
  this.stream.on("spawn",()=>{
	  console.log("MOEG1MUXER CREATED");
  });
  
  this.inputStreamStarted = true;
  this.stream.stdout.on("data", (data) => {
	  //console.log("Mpeg1Muxer data",data);
    return this.emit("mpeg1data", data);
  });
  this.stream.stderr.on("data", (data) => {
    return this.emit("ffmpegStderr", data);
  });
  this.stream.on("exit", (code, signal) => {
	  console.log("MPEG!MUXER/ffmpeg exited",code);
    if (code === 1) {
      console.error("RTSP stream exited with error");
      this.exitCode = 1;
      return this.emit("exitWithError");
    }
  });
  return this;
};


/*var s=fs.createWriteStream("./output1.mov");
function writeTo(dat){
	s.write(dat);
	
}*/
util.inherits(Mpeg1Muxer, events.EventEmitter);

module.exports = Mpeg1Muxer;
