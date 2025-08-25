const Ffmpeg = require("fluent-ffmpeg");
const Stream = require("stream");
const path = require("path");
//const {FFmpeg}=require("kiss-ffmpeg");
//FFmpeg.command="./ffmpeg/bin/ffmpeg";
const ws = require("ws");
const fs = require("fs");
const mongoose = require("mongoose");
const mongodb = require("mongodb");
const MongoClient = require("mongodb").MongoClient;
const systemStateModel = require("./models/systemStateModel");
const nodeState = require("./state");

/** const multer=require('multer');
const GridFsStorage=require('multer-gridfs-storage');
const Grid=require('gridfs-stream');
 */
//const ffmpeg=new FFmpeg();

var readableStream = null;

var websocket1 = null;
var recording = false;

const MURL = "mongodb://10.20.142.211:27017/";

module.exports = {
  start: async (fn, ip, stream) => {
    //pass in the write stream as an argument, so it's created outside the code
    //1. first check for an existing recording and if so the return an error as there is an existing recording ongoing
    //Can't start a recording when one is already active
    //websocket should be new as well
    console.log("Recording in place/in progress", recording);
    if (recording) {
      console.log("A recording is already in place. First stop");
      return JSON.stringify({
        message: "failure",
        description: "Recording already in progress",
      });
    }
    //2.if a stream(data is being written to a file) is active but a recording is not in progress
    //then it should be closed, as it means that we are trying to start a new recording but there is an existing
    //recording(old stream) that is still being written out to disk and so this should be stopped.
    /*  if (stream) {
      stream.end();
    }
    //3. start with a fresh stream
    stream = null; */
   let filePath="";

    let fileName = fn;
    //create read stream for passing to ffmpeg
    //create write stream for writing output to
    //readableStream = new Stream.Readable();

    //save to file name provided
    console.log("file name received", fileName);

    // path.join(__dirname, "recordings", fileName+".mov")
    // var command = new Ffmpeg().input(readableStream).output(stream).on('end',()=>{}).run();
    //save file path and close the stream
    filePath = stream.path; //set the filepath from the stream object
    recording = true;
    stream.on("error", (error) => {
      console.log("failed to create write stream for saving reecording", error);
      return JSON.stringify({
        message: "failure",
        description: "Could not write recording to disk. Please try again.",
      });
    });

    //make websocket connection to ip provided, which is to the room we want to record
    websocket1 = new ws.WebSocket("ws://" + ip + ":9998");
    websocket1.on("open", () => {
      console.log("socket connected");
    });
    //writes the video file to disk as it comes in via stream,*or pipe it to disk. Uncomment below to return to previous method
   websocket1.on("message", (data) => {
      stream.write(data);
    });
    /**ALTERNATIVE: instead of writing the data to disk and later converting it we can spawn a new ffmpeg process and do the conversion directly */
    //ffmpegDirectConversion(websocket1,filePath);
    //close the stream when the websocket closes
    websocket1.on("close", () => {
      console.log("websocket is being closed");
      if (stream) {
        stream.end();
      }
    });
    websocket1.on("error", () => {
      console.log("error closing websocket");
    });

    //update state before writing to db. recording is true
    nodeState.getState().update((state) => {
      state.recording = true;
    });
    //once the result is returned back to the caller it sends the ACK back to the server so that it can update it's
    //own state
    return JSON.stringify({
      message: "success",
      description: "Successfully started recording.",
    });
  },
  stop: async (filename) => {
    /**When the recording stops, perform the following:
     * 1. close streams
     * 2. open readstream on video file
     * 3. pass readstream to ffmpeg to save or output file to disk as mp4
     * 4. upload mp4 file to db
     */
    //create a local copy of the readstream so that every call
    let mp4ReadStream = null;
    //const db = mongoose.connection.db;

    if (!recording) {
      //if recording is false then we cannot stop what we never started
      //return if there is no recording currently avaialble as it means no recording is available for stopping
      console.log("Found no recording to stop");
      return JSON.stringify({
        message: "failure",
        description: "Found no recording to stop",
      });
    }

    //stream.close();
    //close the read stream as well
    //end
    //close the websocket
    websocket1.close();
    let filePath = `./recordings/${filename}.mov`;
    console.log("The file path is ", filePath);
    //let a = filePath.split("/")[2]; //split(/[\/]/)[2];//match \ or /
    // let fileName = a.substring(0, a.indexOf(".mov"));
    console.log("the filename is", filename);
    //stream.close();
    //close the read stream as well
    //end
    //close the websocket and close the write stream as well
    websocket1.close();

    //check if the file exists before trying to read from it
    //let exists = fs.existsSync(filePath);

    //use the filepath to open a readstream
    mp4ReadStream = fs.createReadStream(filePath);

    //handle error on stream
    mp4ReadStream.on("error", (error) => {
      console.log("failed to create read stream for saving reecording", error);
      return JSON.stringify({
        message: "failure",
        description: "There was an error reading the stream",
      });
    });
    //mp4ReadStream = fs.createReadStream(filePath);
    //const mp4WriteStream = fs.createWriteStream("./recordings/"+fileName + ".mp4");
    recording = false; //recording stopped
    //place long running task in it's own function and return to caller
    convertAndUpload(mp4ReadStream, filename, filePath);
    //only after a session is successfully stopped should the 'start Session' button be re-enabled and the
    //session info be saved to the DB
    return JSON.stringify({ message: "success", description: filePath });
  },
};

function convertAndUpload(mp4ReadStream,  fileName, filePath) {
  const db = mongoose.connection.db;
  var command = new Ffmpeg()
    .input(mp4ReadStream)
    .outputOptions(["-c:v libx264", "-c:a aac", "-f mp4"])
    //videoCodec('libx264').
    //audioCodec('aac')
    //output(mp4WriteStream).
    .on("error", (err) => {
      console.log(err);
    })
    .on("end", () => {
      console.log("finished savinf file, now uploading");
      try {
        //get db istance
        //db.collection("recordings.files");
        const bucket = new mongodb.GridFSBucket(db, {
          bucketName: "recordings",
        });
        const upload = bucket.openUploadStream(fileName + ".mp4", {
          metadata: { field: "room", value: "55" },
        });
        upload.once("finish", () => {
          console.log("finished");
          //reinitialize the stream and websocket variables
          //stream = null;
          //websocket1 = null;
          //return JSON.stringify({ message: "success", location: filePath });
        });
        console.log("reading from", filePath);
        //implement error handling

        const str = fs.createReadStream(`./recordings/${fileName}.mp4`);

        str.on("error", (error) => {
          console.log(
            "failed to create read stream for saving reecording",
            error
          );
          //consider code to try to read from file again such as 
          return JSON.stringify({ message: "failure" ,description:"Failed to read from file and convert it!."});
        });

        str.pipe(upload);

        //fs.createReadStream("./recordings/"+fileName+".mp4").pipe(upload);
      } catch (err) {
        console.log("error", err);
        return JSON.stringify({ message: "failure", location: filePath });
      }
    })
    .save(`./recordings/${fileName}.mp4`); //path.join(__dirname, "recordings", fileName+".mp4"));
  //pipe(mp4WriteStream,{end:true})//.
}


function ffmpegDirectConversion(ws,file_name){
  
    // Create an ffmpeg process
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'mpegts',           // Input format (assuming MPEG-TS stream)
      '-i', 'pipe:0',           // Input from stdin
      '-c:v', 'libx264',        // Video codec
      '-preset', 'fast',        // Encoding speed
      '-tune', 'film',          // Tune for film-like quality
      '-movflags', '+faststart',// Start video quickly (good for streaming)
      '-y',                     // Overwrite output file without asking
      file_name+".mp4"            // Output file
  ]);

  // Pipe the WebSocket stream to ffmpeg's stdin
  ws.on('message', (data) => {
      ffmpeg.stdin.write(data);
  });

  // Close ffmpeg's stdin when the WebSocket connection is closed
  ws.on('close', () => {
      ffmpeg.stdin.end();
      console.log('WebSocket connection closed');
  });

  // Handle ffmpeg's stdout and stderr for logging
  ffmpeg.stdout.on('data', (data) => {
      console.log(`ffmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
      console.error(`ffmpeg stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
  });

  ffmpeg.on('error', (err) => {
      console.error('Error occurred with ffmpeg process:', err);
  });
}