
const Ffmpeg = require('fluent-ffmpeg');
  const Stream = require('stream')
//const {FFmpeg}=require("kiss-ffmpeg");
//FFmpeg.command="./ffmpeg/bin/ffmpeg";
const ws = require("ws");
const fs = require("fs");
const mongoose = require("mongoose");
const mongodb = require("mongodb");
const MongoClient = require("mongodb").MongoClient;
const systemStateModel = require("../models/systemStateModel");
const nodestate = require("../state");
/** const multer=require('multer');
const GridFsStorage=require('multer-gridfs-storage');
const Grid=require('gridfs-stream');
 */
//const ffmpeg=new FFmpeg();
var stream = null;
var readableStream=null;
var fileName = "";
var websocket1 = null;
const MURL = "mongodb://10.20.142.211:27017/";
module.exports={
start:(fileName,ip)=>{
	//create read stream for passing to ffmpeg
  //create write stream for writing output to
  readableStream = new Stream.Readable();
  const db = mongoose.connection.db;
  //save to file name provided
  console.log("file name received", fileName);
  

  stream = fs.createWriteStream("./recordings/" + fileName + ".mov");
 // var command = new Ffmpeg().input(readableStream).output(stream).on('end',()=>{}).run();

  //make websocket connection to ip provided
  websocket1 = new ws.WebSocket("ws://" + ip + ":9998");
  websocket1.on("open", () => {
    console.log("socket connected");
  });
  //writes the video file to disk as it comes in via stream
  websocket1.on("message", (data) => {
    stream.write(data);
  });
  websocket1.on("close", () => {
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
  return(JSON.stringify({ message: "success" }));
},
stop:()=>{
	/**When the recording stops, perform the following:
   * 1. close streams
   * 2. open readstream on video file
   * 3. pass readstream to ffmpeg to save or output file to disk as mp4
   * 4. upload mp4 file to db
   */
  const db = mongoose.connection.db;
  let filePath = "";
  if (stream) {
    console.log("received messsage to end stream");
    //save file path and close the stream
    filePath = stream.path;
    console.log("The file path is ", filePath);
    stream.close();
    //close the read stream as well
    //end 
    //close the websocket
    websocket1.close();
  }

  const mp4ReadStream=fs.createReadStream(filePath);
  const mp4WriteStream=fs.createWriteStream(fileName+".mp4");
  var command = new Ffmpeg().
  input(mp4ReadStream).
  output(mp4WriteStream).
  on('error',(err)=>{console.log(err)}).
  on('end',()=>{
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
        return(JSON.stringify({ message: "success", location: filePath }));
      });
      console.log("reading from", filePath);
      //implement error handling
      fs.createReadStream(filePath).pipe(upload);
    } catch (err) {
      console.log("error", err);
      return(JSON.stringify({ message: "failure", location: filePath }));
    }
  }).run();
}

}