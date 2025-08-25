const express = require("express");
const router = express.Router();
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
//let db = mongoose.connection.db;

router.post("/test", async (req, res) => {
  try {
    let systemStateId = "66cf6440b0fcaecdff469716";
    const db = mongoose.connection.db;
    //before returning response, update the database record for this room
    //use the mongodb driver to query as its simpler than mongoose
    console.log("app.locals", req.app.locals.ip);
    const test = db.collection("systemstates").find({});
    console.log("test connection on db", test);
    //find the state with stateId provided and room number matching the present room
    const state = await db.collection("systemstates").updateOne(
      {
        $and: [
          { _id: new mongodb.ObjectId(systemStateId) }, //"rooms.0.name":"Room57" },
          { "rooms.0.name": "Room57" },
        ],
      },
      {
        $set: {
          "rooms.0.room_type": "Node",
          "rooms.0.state.recording": true,
          "rooms.0.ip": "1.2.3.9",
        },
      }
    );

    console.log("system state", state);
  } catch (err) {
    console.log("Error in updating state", err);
  }
  res.status(200).send("hello");
});

router.post("/start", async (req, res) => {
  //create read stream for passing to ffmpeg
  //create write stream for writing output to
  readableStream = new Stream.Readable();
  const db = mongoose.connection.db;
  //save to file name provided
  console.log("file name received", req.body.fileName);
  fileName = req.body.fileName;

  stream = fs.createWriteStream("./recordings/" + req.body.fileName + ".mov");
 // var command = new Ffmpeg().input(readableStream).output(stream).on('end',()=>{}).run();

  //make websocket connection to ip provided
  websocket1 = new ws.WebSocket("ws://" + req.body.ip + ":9998");
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
  res.send(JSON.stringify({ message: "success" }));
});

router.get("/stop", (req, res) => {
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
  //const mp4WriteStream=fs.createWriteStream(fileName+".mp4");
  var command = new Ffmpeg().
  input(mp4ReadStream).
  //output(mp4WriteStream).
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
        res.send(JSON.stringify({ message: "success", location: filePath }));
      });
      console.log("reading from", filePath);
      //implement error handling
      fs.createReadStream(filePath).pipe(upload);
    } catch (err) {
      console.log("error", err);
      res.send(JSON.stringify({ message: "failure", location: filePath }));
    }
  }).save(fileName+".mp4");
  
  
});

/* //used for uploading files that comes in via form
const MURL="mongodb://10.20.142.211:27017/medvidDB";
            //creates a mongoose creation instance
            const connection=mongoose.createConnection(MURL);
            //Init gfs
            let gfs;
            //create a onetime event when DB connection is open
            //make sure the db instance is open before passing into `Grid`
            connection.once('open',()=>{
                //initialize stream for reading/writing to GRIDFS
                gfs=Grid(connection.db,mongoose.mongo);
                gfs.collection("recordings");

            });
            //create GridFsStorage engine
           // const gridFS=new gridFsStorage({db:connection});
           const storage = new GridFsStorage({
            url: MURL,
            file: (req, file) => {
              return new Promise((resolve, reject) => {
               
                  const filename = fileName + ".mov";
                  const fileInfo = {
                    filename: filename,
                    bucketName: 'recordings'
                  };
                  resolve(fileInfo);
               
              });
            }
          });
          //this servers as middleware on each route
          const upload = multer({ storage });
 */

        

module.exports = router;
