var Mpeg1Muxer, STREAM_MAGIC_BYTES, VideoStream, events, util, ws;

ws = require("ws");

util = require("util");

events = require("events");

Mpeg1Muxer = require("Mpeg1Muxer");

STREAM_MAGIC_BYTES = "jsmp"; // Must be 4 bytes

//function sets variables, calls functions and returns itself
VideoStream = function (options) {//it takes an options json object as argument, so we can extend by passing in a custome function, updateStreams
  this.options = options;
  this.updateOptions=[];
  this.name = options.name;
  this.streamUrl = options.streamUrl;
  this.streamUrl2 = options.streamUrl2;
  this.streamUrl3 = options.streamUrl3;
  this.width = options.width;
  this.height = options.height;
  this.wsPort = options.wsPort;
  this.inputStreamStarted = false;
  this.stream = undefined;
  this.lastDataTimestamp = Date.now();
  this.startMpeg1Stream();
  this.pipeStreamToSocketServer();
  return this;
};

console.log("Video Option ", VideoStream);
util.inherits(VideoStream, events.EventEmitter);

VideoStream.prototype.stop = async function () {
    console.log("Stopping VideoStream...");
   try{ 
    return new Promise((resolve, reject) => {
        const cleanup = {
            ffmpeg: false,
            websocket: false
        };

        const checkCompletion = () => {
            if (cleanup.ffmpeg && cleanup.websocket) {
                this.inputStreamStarted = false;
                console.log("VideoStream cleanup completed");
                resolve();
            }
        };

        // Kill ffmpeg stream
        if (this.stream) {
            this.stream.on('exit', () => {
                console.log("FFmpeg process terminated");
                cleanup.ffmpeg = true;
                checkCompletion();
            });

            this.stream.kill('SIGKILL');
        } else {
            cleanup.ffmpeg = true;
        }

        // Close WebSocket server
        if (this.wsServer) {
            // First terminate all clients
            this.wsServer.clients.forEach(client => {
                console.log("Terminating client connection");
                client.terminate();
            });

            // Then close the server
            this.wsServer.close(() => {
                console.log("WebSocket server closed");
                cleanup.websocket = true;
                checkCompletion();
            });
        } else {
            cleanup.websocket = true;
        }

        // Set a timeout in case cleanup hangs
        setTimeout(() => {
            if (!cleanup.ffmpeg || !cleanup.websocket) {
                reject(new Error('Stream stop operation timed out'));
            }
        }, 5000);
    });
   }
   catch(error){
	   this.emit("error",error);
   }
};
		
	

/*Custom function added to update streams without restarting the ws server*/
VideoStream.prototype.updateStreams=function(options){
	try{
			console.log("UPDATING ffmpeg stream within VideoStream",options);
			//intilaize the data that Mpeg1Muxer will need...the three streams and the ffmpeg options
		   this.streamUrl = options.streamUrl;
		  this.streamUrl2 = options.streamUrl2;
		  this.streamUrl3 = options.streamUrl3;
		  this.updateOptions=options.ffmpegOptions;
		  this.stream.kill('SIGKILL');
		  if(this.stream){
			  console.log("kill command sent but ffmpeg is still up");
		  }
		  //wait 10 seconds
		  setTimeout(()=>{
			  console.log("is ffmpeg killed: ",this.stream?'No':'Yes');
			  this.stream=null;
			//ensure ffmpeg is killed before exiting
		  this.inputStreamStarted = false;
		  
		  this.options.ffmpegOptions=this.updateOptions;
		  this.startMpeg1Stream();  
		  },10000);
	}
	catch(error){
		this.emit("error",error);
	}
  
	
}
//notice how it passes stream data and creates the mpeg1muxer
VideoStream.prototype.startMpeg1Stream = function () {
  var gettingInputData, gettingOutputData, inputData, outputData;
  console.log("values being used", this.streamUrl,
  this.streamUrl2,
  this.streamUrl3,
  this.updateOptions,
  this.options.ffmpegOptions);
  this.mpeg1Muxer = new Mpeg1Muxer({
    ffmpegOptions: this.options.ffmpegOptions===undefined?this.updateOptions:this.options.ffmpegOptions,
    url: this.streamUrl,
    url2: this.streamUrl2,
	url3: this.streamUrl3,
    ffmpegPath:
      this.options.ffmpegPath == undefined ? "ffmpeg" : this.options.ffmpegPath,
  });
  this.stream = this.mpeg1Muxer.stream;
  if (this.inputStreamStarted) {
    return;
  }
  this.mpeg1Muxer.on("mpeg1data", (data) => {
    return this.emit("camdata", data);//emits data to the ws server
  });
  gettingInputData = false;
  inputData = [];
  gettingOutputData = false;
  outputData = [];
  this.mpeg1Muxer.on("ffmpegStderr", (data) => {
    var size;
    data = data.toString();
    if (data.indexOf("Input #") !== -1) {
      gettingInputData = true;
    }
    if (data.indexOf("Output #") !== -1) {
      gettingInputData = false;
      gettingOutputData = true;
    }
    if (data.indexOf("frame") === 0) {
      gettingOutputData = false;
    }
    if (gettingInputData) {
      inputData.push(data.toString());
      size = data.match(/\d+x\d+/);
      if (size != null) {
        size = size[0].split("x");
        if (this.width == null) {
          this.width = parseInt(size[0], 10);
        }
        if (this.height == null) {
          return (this.height = parseInt(size[1], 10));
        }
      }
    }
  });
  this.mpeg1Muxer.on("ffmpegStderr", function (data) {
    return global.process.stderr.write(data);
  });
  this.mpeg1Muxer.on("exitWithError", () => {
    return this.emit("exitWithError");
  });
  return this;
};

VideoStream.prototype.pipeStreamToSocketServer = function () {
  this.wsServer = new ws.Server({
    port: this.wsPort,
  });
  //console.log(this.wsServer);
  this.wsServer.on("connection", (socket, request) => {
	  console.log("connection received by ws server");
    return this.onSocketConnect(socket, request);
  });
  this.wsServer.on('close',()=>{
	  console.log("SERVER CLOSED");
  });
  this.wsServer.broadcast = function (data, opts) {
    var results;
    results = [];
    for (let client of this.clients) {
      if (client.readyState === 1) {
        results.push(client.send(data, opts));
      } else {
        results.push(
          console.log(
            "Error: Client from remoteAddress " +
              client.remoteAddress +
              " not connected."
          )
        );
      }
    }
    return results;
  };
  return this.on("camdata", (data) => {
    //save the timestamp for the last received data
    this.lastDataTimestamp = Date.now();
    return this.wsServer.broadcast(data);//send data to all connected clients
  });
};

VideoStream.prototype.onSocketConnect = function (socket, request) {
  var streamHeader;
  // Send magic bytes and video size to the newly connected socket
  // struct { char magic[4]; unsigned short width, height;}
  streamHeader = new Buffer(8);
  streamHeader.write(STREAM_MAGIC_BYTES);
  streamHeader.writeUInt16BE(this.width, 4);
  streamHeader.writeUInt16BE(this.height, 6);
  socket.send(streamHeader, {
    binary: true,
  });
  console.log(
    `${this.name}: New WebSocket Connection (` +
      this.wsServer.clients.size +
      " total)"
  );

  socket.remoteAddress = request.connection.remoteAddress;

  return socket.on("close", (code, message) => {
    return console.log(
      `${this.name}: Disconnected WebSocket (` +
        this.wsServer?this.wsServer.clients.size:1 +
        " total)"
    );
  });
};

module.exports = VideoStream;
