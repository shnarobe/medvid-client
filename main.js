//import electron
const {app,BrowserWindow,ipcMain,Menu,Tray}=require("electron");

const fs = require("fs");
const readline = require("readline");
const mongodb = require("mongodb");
const ws=require("ws");
const child_process=require("child_process");
const MongoClient = require("mongodb").MongoClient;
const winston=require("winston");
const logger = require("./logger");
var app_object={locals:{}};
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
//npm install --save socket.io-client
const socketio_client = require("socket.io-client");

const consumeMessages = require("./messageQueueConsumer");
const systemState=require("./systemstate");


let child=null;
var websocketAlt=null;
var ffmpeg=null;
var socket_;
var socket;
var recordingMap=new Map();
var uploadingMap=new Map();
var connectionClosed=false;

const connections=new Map();//holds all connections to the websocket server



//connect to the mongodb to upload files,place in .env
const MURL = process.env.MONGODB_URL;

let dbs;
/* mongoose.connect(MURL).then((m) => {
  dbs = m;
  console.log("database connection made");
}); */
// Create Instance of MongoClient for mongodb
//const client = new MongoClient(MURL);



// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to file or monitoring service here
  // Perform cleanup if needed
   // Log to file or monitoring service here
         logger.error('uncaughtException', {error:error.toString()});

          logger.logWithContext('error', 'Socket connection failed', app, {
              sessionId: "",//currentSessionId,
              error: error.toString(),
              stack: error.toString(),
              meta: {
                filename: "",//recordingFilename,
                duration: "",//recordingDuration
             }
            });
  //process.exit(1); // Exit with failure code
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log to file or monitoring service here
});

/* 
Implemented a custom transport for MongoDB

// Add error handler for Node.js warnings
process.on('warning', (warning) => {
  console.warn('Node.js warning:', warning.name, warning.message);
  // Log to file or monitoring service here
});

const logger = winston.createLogger({
  levels: {
    error: 0,    // Most severe
    warn: 1,
    info: 2,
    debug: 3     // Least severe
  },
  format: winston.format.combine(
    winston.format.timestamp(),// Add timestamp to logs
    winston.format.json()// Format logs as JSON
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
}); */
/**The main app will make a socketio connection to the server. this will be the main communication link
 * perform all external browser tasks using IPC 
  */
//1. Wait for the app to be ready before starting 
var tray=null;

app.whenReady().then(()=>{
  //create the tray icon
  tray=new Tray(path.join(__dirname,'logo.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'show', click: () => { console.log('show clicked..place aby function here to handle event'); } },
    { label: 'Quit', click: () => { app.quit(); } }
  ]);
  tray.setToolTip('SGUSimHub.@KrishnaRobertson(krobert4@sgu.edu)');
  tray.setContextMenu(contextMenu);

  // FLOW 1A: Renderer to Main process - listen for ipc calls from renderer process
  //channel: get_data_from_renderer_process, handler: handleDataFromRendererProcess
  /**THIS FUNCTION HANDLES ALL INCOMING COMMUNICATION
  ipcMain.handle('communication-channel', handleDataFromRendererProcess);
  It was decided not to use handle as there is an error handling issue with it...use ipcMain.on instead
  Note that if ipcMain.handle is use, then we must use invoke in the preload to call it
*/

  //FLOW 1B.   RENDERER TO MAIN
  //**THIS FUNCTION LISTENS FOR A MESSAGE/EVENT FROM THE RENDERER ON THE SPECIFIED CHANNEL AND CAN REPLY WITH A RESPONSE
  // NOTE THAT THE API STATES THAT:"when the messages arrives the listener would be called with listener(event,args)" */
  ipcMain.on('set-title-channel', (event, message) => {
    console.log('Message from renderer:', message);
    const webContents=event.sender;
    const wind=BrowserWindow.fromWebContents(webContents);
    win.setTitle(message);
    // You can send a response back to the renderer if needed
    //the preferred way to send a message back to gaurantee the correct process is being accessed
    event.reply('set-title-channel', 'Hello from main process!');//channel,...args[]
    //code for preload.js
    //setTitle:(title)=>ipcRenderer.send('set-title-channel',title);
  });

  //Main channel. When a new message arrives listener would be called with listener(event,args)
  ipcMain.on("communication-channel",handleDataFromRendererProcess);

    //1. make a database connection
    mongoose
      .connect(MURL)
      .then(async () => {
        console.log("Connected Successfully!");
        //read in config file with config details, dependency injection

        try {
          const fileStream = fs.createReadStream("./config.txt");
          const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
          });
          // Note: we use the crlfDelay option to recognize all instances of CR LF
          // ('\r\n') in input.txt as a single line break.
          let i = 0;
          rl.on(
            "line",
            await function (line) {
              //parse file contents
              const configArray = line.split("=");
              console.log("array", configArray);

              if (configArray[i] == "Name") {
                //store config in app_object to be accessed throughout
                app_object.locals.name = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.name);
              } else if (configArray[i] == "Type") {
                //store config in app_object to be accessed throughout
                app_object.locals.type = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.type);
              } else if (configArray[i] == "IP") {
                //store config in app_object to be accessed throughout
                app_object.locals.ip = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.ip);
              } else if (configArray[i] == "SERVER_IP") {
                //store config in app_object to be accessed throughout
                app_object.locals.serverip = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.serverip);
              } else if (configArray[i] == "RoomNumber") {
                //store config in app_object to be accessed throughout
                app_object.locals.roomnumber = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.roomnumber);
              }
              else if (configArray[i] == "Camera1") {
                //store config in app_object to be accessed throughout
                app_object.locals.camera1 = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.camera1);
              }
              else if (configArray[i] == "Camera2") {
                //store config in app_object to be accessed throughout
                app_object.locals.camera2 = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.camera2);
              }
              else if (configArray[i] == "Audio") {
                //store config in app_object to be accessed throughout
                app_object.locals.audio = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.audio);
              }
              else if (configArray[i] == "BrowserPath") {
                //store config in app_object to be accessed throughout
                app_object.locals.browserPath = configArray[i + 1];
                console.log("The app_object.locals", app_object.locals.browserPath);
              }
              
            }
          );

          
          //After reading file then proceed to set up socket
          rl.on("close", () => {
            //set up state
            systemState.init(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`,app_object.locals.camera1,app_object.locals.camera2);
            console.log(typeof app_object.locals.serverip, app_object.locals.serverip);
            console.log("state initialized", systemState.getState());
            
          //The RTSP server is now launched as a standalone service separately

            //make a websocket connection to server websocket
            //implement the server offset field so that the client can keep track of the last message it processed
            //this id will simply be an argument to the socket on event and is updated as follows:
            // socket.auth.serverOffset = serverOffset;
            //When a client gets disconnected, any call to socket.emit() is buffered until reconnection:
            //that is, socket.emit() on the client.
            const socketname = "ws://" + app_object.locals.serverip;
            socket = socketio_client(socketname, {
              auth: {
                serverOffset: 0,
              },
              reconnection: true,
              reconnectionAttempts: 10,
              reconnectionDelay: 1000,
            });

            // Socket error handling
            socket.on('error', (error) => {
              console.error('Socket.IO Error:', error);
              // Log to file or monitoring service here
            logger.error('Socket.IO Error:', {error:error.toString()});

              logger.logWithContext('error', 'Socket connection failed', app_object, {
                  sessionId: "",//currentSessionId,
                  error: error.toString(),
                  stack: error.toString(),
                  meta: {
                    filename: "",//recordingFilename,
                    duration: "",//recordingDuration
                }
          });
              systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, 
                {socketStatus: 'error', error: error.message});
            });

            socket.on('reconnect_failed', () => {
              console.error('Socket.IO: Failed to reconnect after all attempts');
              systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, 
                {socketStatus: 'reconnect_failed'});
            });

            socket.on('reconnect_attempt', (attemptNumber) => {
              console.log(`Socket.IO: Reconnection attempt ${attemptNumber}`);
              systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, 
                {socketStatus: 'reconnecting', attemptNumber});
            });

            socket.on("connect", () => {
              console.log("WebSocket connected");
              /**Each time the client connects, check the Db connection and if its not connected then reconnect
               * also check that the http server is running and restart it if not
               * This code piggybacks off socketio's reconnection logic, so it will automatically attempt to reconnect
               * This way whenever the client disconnects from the server, it will also attempt to reconnect to the database
               * in addition to reconnecting to the socketio server
              */
              if (!mongoose.connection.readyState) {
                mongoose.connect(MURL).then(() => {
                  console.log("Reconnected to MongoDB");
              
                  //rtspServerProcess = launchRtspServer(app_object.locals.camera1,app_object.locals.camera2,app_object.locals.audio);
                  socket.emit("db_reconnect", { message:"success" });
                }).catch(err => {
                  console.error("Failed to reconnect to MongoDB:", err);
                  socket.emit("db_reconnect", { message:"failure",error: "Failed to reconnect to MongoDB" });

                  logger.error('MongoDB Error:', {error: err.toString()});

                  logger.logWithContext('error', 'MongoDB reconnection failed', app_object, {
                    sessionId: "",//currentSessionId,
                    error: err.toString(),
                    stack: err.toString(),
                    meta: {
                      filename: "",//recordingFilename,
                      duration: "",//recordingDuration
                    }
                  });


                });
              }

            });
            //create second socket to connect to the child process namespace to send messages
            /* const childProcessSocket=socketio_client("ws://"+app_object.locals.serverip+"/examChildProcesses");
            childProcessSocket.on("connect",(socket)=>{
              console.log("parent connected",app_object.locals.ip+"_"+app_object.locals.roomnumber+"_"+app_object.locals.type);
            }); */

          

            console.log("web socket address", socketname);
            //on the client we get event name and argument list
            socket.on("start_session", async (obj, callback) => {
              console.log("data received", obj);
              console.log(typeof obj.clientname);
              //make an api call to start recording if socket name is equal to name
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                /**
                 * 
                 * Failure codes:
                 * 1 - the recording is already in progress(start)
                 * 2- unable to open websocket or ffmpeg process(start)
                 * 3- The room is not in the state object(on the controller side)(stop)-Enable start session
                 * 4- Data from the database could not be retrieved to ensure full proof checking of filename to stop(stop)-don't clear state and allow retry
                 * 5- filename to stop is not the same as the one in the map(possible corruption)(stop)-allow user to retry, controller will pick up error and reset
                 * 
                 */
                    console.log("MATCHED node name");
                    let ipaddr = obj.clientname.split("_")[0];
                    const sessionId=obj.sessionId;
                    //consume messages from the queue
                    //consumeMessages();
                    /**Before starting a recording make sure there isnt already a recording in progress */
                    if(recordingMap.has( obj.stepData.filename) && recordingMap.get(obj.stepData.filename).sessionId === sessionId){
                      //if recording is in progress and same session id then simply 
                      //return success else stop 
                      //if there is a recording in progress then return failure message and do not start a new recording
                      console.log("Recording already in progress for this ip address", obj.clientname);
                      callback({messageId:obj.stepData.messageId,stepName:"start_session",message:"success",description:"Recording already in progress",
                        clientname:obj.clientname,code:1,filename:obj.stepData.filename,sessionId:sessionId});

                        //log  
                        logger.error('Recording Error:', {error:"Recording already in progress"});

                        logger.logWithContext('error', 'Socket connection failed', app_object, {
                            sessionId: sessionId,
                            error: "Recording already in progress",
                            stack: "Recording already in progress",
                            meta: {
                              filename: obj.stepData.filename,
                              duration: "",
                          }
                          });
                      //TO DO:possibly stop recording 
                      return;
                    }
                    if(recordingMap.has( obj.stepData.filename) && recordingMap.get(obj.stepData.filename).sessionId != sessionId){
                      //if there is a recording in progress with a different session id then stop it
                      console.log("Stopping recording for this ip address", obj.clientname);
                      const {messageId,filename,ip,sessId}=recordingMap.get(recordingMap.keys().next().value);
                      await stopffmpegRecordingAlt(messageId,filename,ip);
                      recordingMap.clear();
                      callback({messageId:obj.stepData.messageId,stepName:"start_session",message:"failure",description:"Recording already in progress",
                        clientname:obj.clientname,code:1,filename:obj.stepData.filename,sessionId:sessionId});

                        //log  
                        logger.error('Recording Error:', {error:"Mismatched sessionID. Stopping older recording"});

                        logger.logWithContext('error', 'Socket connection failed', app_object, {
                            sessionId: sessionId,
                            error: "Mismatched sessionID. Stopping older recording",
                            stack: "Mismatched sessionID. Stopping older recording",
                            meta: {
                              filename: filename,
                              duration: "",
                              sessionBeingRecorded: sessId,
                              sessionAskedToStop: sessionId
                          }
                          });

                        return;

                    }
                  

                    const response = await startffmpegRecordingAlt(obj.stepData.filename,obj.stepData.messageId, ipaddr,sessionId);//await startffmpegRecording(obj.filename, ipaddr);
                    const result=JSON.parse(response);
                    console.log("response from start recording", result); 
                    if (result.message === "success") {
                      //update offset if action ws successfully taken by client
                      //socket.auth.offset = offset;
                      //console.log("offset added", socket.auth);
                      recordingMap.clear();//should only hold a single filename...clear it first as a precaution before adding new one
                      recordingMap.set(obj.stepData.filename,{messageId:obj.stepData.messageId,filename:obj.stepData.filename,ip:ipaddr,sessionId:sessionId});
                      console.log("recording map",recordingMap);
                      //save the last filename and ipaddress for use in case of disconnection of socket
                      callback({
                        messageId:result.messageId,
                        stepName:"start_session",
                        message: result.message,
                        description: result.description,
                        clientname: obj.clientname,
                        code: 0,
                        filename: result.filename,
                        sessionId:result.sessionId,
                        
                      });
                    systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, 
                      {examStep:"start Encounter",sessionId:obj.sessionId,filename:result.filename,status:"recording_in_progress"});

                    }
                    else{
                      //if failure return message and clear map so recording can be restarted
                      recordingMap.clear();
                      console.log("before the callback, this is the response: ", result);
                      callback({
                        messageId:result.messageId,
                        stepName:"start_session",
                        message: result.message,
                        description: result.description,
                        clientname: obj.clientname,
                        code: result.code,
                        filename: result.filename,
                        sessionId:result.sessionId,
                        
                      });

                      systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, 
                      {examStep:"start Encounter",status:"recording_failed"});
                    }
                    
                    //respond via socket with result, **possible way to update state
                    //note in this case that the json encoding and decoding is done internally by socket.io
                    
              }//IMPORTANT: DO NOT SEND AN ACK IF NA
            /*  else{
                console.log("NOT app_objectlicable to this room");
                //if the client name does not match then return failure message
                callback({ message: "NA", clientname: app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type });
                return;
              } */
            });

            socket.on("stop_session", async (arg1, callback) => {
              console.log("data received", arg1);
              let obj = arg1;
              //make an api call to start recording if socket name is equal to name
              console.log(
                "test",
                obj.clientname,
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              );
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                console.log("MATCHED");
              

                let ipaddr = obj.clientname.split("_")[0];
                //1.check if the filename matches the one in the map, if not then return failure message
                if(!recordingMap.has(obj.stepData.filename)){
                    console.log("No recording in progress for this ip address", obj.clientname,"does not match the filename in the map",
                      recordingMap.keys().next().value);
                    callback({messageId:obj.messageId,stepName:"stop_session",message:"failure",description:"Recording not found on client",
                      clientname:obj.clientname,code:5,filename:obj.stepData.filename,stepName:"stop_session",sessionId:obj.sessionId});
                    return;
                  }
                
                //2. once filename is found in the map then stop the recording and clear the map
                const {messageId,filename,ip}=recordingMap.get(obj.stepData.filename);
                console.log("messageId",messageId,"filename",filename,"ip",ip, "matches",obj.filename,ipaddr);            
                
                let result_ = await stopffmpegRecordingAlt(obj.stepData.filename,ipaddr);//await stopffmpegRecording(ipaddr, obj.filename);
                let result=JSON.parse(result_);
                
                console.log("ACK can be sent now", result,result.message,result['message']);
                if(result.message=="success"){
                  console.log("clearing recording map",recordingMap);
                  recordingMap.clear();
                }
                
                callback({ message: result.message, sessionId:obj.sessionId,clientname: obj.clientname,
                  messageId:obj.messageId,filename:obj.stepData.filename,stepName:"stop_session" });
              }//IMPORTANT: DO NOT SEND AN ACK IF NA
              /* else{
                console.log("NOT app_objectlicable to this room");
                //if the client name does not match then return failure message
                callback({ message: "NA", clientname: app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type });
                return;
              } */
            });

            //send the recording details to the caller on request(currently recording room)
            socket.on("recording_details", async (arg1, callback) => {
              console.log("data received", arg1);
              let obj = arg1;
              
              console.log(
                "Recording details",
                obj.clientname,
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              );
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                //get map details
                if(recordingMap.size==0){
                  
                  callback({message:"success",clientname:"",messageId:"",filename:"",ip:""});
                  return;
                }
                const {messageId,filename,ip}=recordingMap.get(recordingMap.keys().next().value);
                callback({message:"success",clientname:obj.clientname,messageId:messageId,filename:filename,ip:ip});
              }//IMPORTANT: DO NOT SEND AN ACK IF NA
              /* else{
                console.log("NOT app_objectlicable to this room");
                //if the client name does not match then return failure message
                callback({ message: "NA", clientname: app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type });
                return;
              } */


            });
            socket.on("cam_details", async (arg1, callback) => {
              console.log("data received", arg1);
              let obj = arg1;
              //make an api call to start recording if socket name is equal to name
              console.log(
                "test",
                obj.clientname,
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              );
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                console.log("MATCHED");
                //respond via socket with result, **possible way to update state
                //name=ip_number_type
                //ip_number_type=10.20.148.87_1_student
                let ipaddr = obj.clientname.split("_")[0];
              const result_=camDetails();
              const result=JSON.parse(result_);
                console.log("ACK can be sent now" + result);
                if(result.message=="failure"){
                  callback({ messageId:obj.messageId,message: result.message, clientname: obj.clientname,cam1:"",cam2:"" });
                }
                else{
                  callback({ messageId:obj.messageId,message: result.message, clientname: obj.clientname,cam1:result.camera1,cam2:result.camera2 });
              
                }
              }//IMPORTANT: DO NOT SEND AN ACK IF NA
              /* else{
                console.log("NOT app_objectlicable to this room");
                //if the client name does not match then return failure message
                callback({ message: "NA", clientname: app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type });
                return;
              } */
            });

            //**Exam step login**
            socket.on("login",async(arg1,callback)=>{

              let obj = arg1;
              //make an api call to start recording if socket name is equal to name
              console.log(
                "testing for match",
                obj.clientname,
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              );
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                      console.log("MATCHED");
                    


                    //call route to render login page
                    console.log("data received", obj);
                    let content='<h1>Login page coming soon!</h1>';
                    for(const key of Object.keys(obj)){
                      console.log("key",key,"obj[key]",obj[key]);
                      if(key.includes("stepData")){
                        for(const key1 of Object.keys(obj[key])){
                          console.log("stepData: key",key1,"value",obj[key][key1]);
                          if(key1.includes("content")){
                            console.log("content key",key1,"content value",obj[key][key1]);
                            content=obj[key][key1];//get the content from the object
                            
                          }
                        }
                        
                      
                      }
                    }
                    //send message to child process via its websocke.NB it has the examChildProcesses namespace
                  /*  childProcessSocket.broadcast.emit("login", {message:"success",step:"login",
                      clientname: obj.clientname,content:content,
                      type:"exam",divId:"login",display:"on",sessionId:obj.sessionId,description:"login call for child process"}); */
                    callback({ message: "success",status:"login initiated", stepName:"login",clientname: obj.clientname,sessionId:obj.sessionId,timeStamp:Date.now(),
                  stepData:{recordingName:"",participants:[],evaluations:[]}
                }); 
                    //Browsers ignore <script> tags added via innerHTML for security and performance reasons., 
                    // so add the script before hand in main.ejs
                    /**EVERY CALLBACK SHOULD RETRUN THE FOLLOWING FIELDS:{CLIENT NAME
                * SESSIONID,ACK TIMESTAMP,PAYLOAD:[RECORDINGNAME,STUDENTID:[],EVALID:[]]}
                * We can at least be sure that attempting to send data only takes place once a connection is
                *  established by defining an onopen event handler to do the work:
                * 
                *  */
                //check that ws connection is open before sending message
                /* if(connections.get(app_object.locals.ip).readyState===ws.OPEN){
                  //send the content to the client via websocket. This client should have the same ip as the server
                    connections.get(app_object.locals.ip).send(JSON.stringify({message:"success",step:"login",clientname: obj.clientname,content:content,
                      type:"exam",divId:"login",display:"on",sessionId:obj.sessionId}));
                    console.log(app_object.locals.ip,"=",connections.keys().next().value); 
                    //send socketio msg back to server of successful login and then update the state locally   
                  callback({ message: "success",status:"login initiated", stepName:"login",clientname: obj.clientname,sessionId:obj.sessionId,timeStamp:Date.now(),
                  stepData:{recordingName:"",participants:[],evaluations:[]}
                }); 
                systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`,
                  {examStep:"login",sessionId:obj.sessionId,status:"student_login_pending"});
                }
                else{
                  console.log("No connection found for ip",app_object.locals.ip, "map:",connections.keys().next().value);
                  callback({ message: "failure",stepName:"login",status:"student_login_failed", clientname: obj.clientname,sessionId:obj.sessionId,timeStamp:Date.now(),
                  stepData:{recordingName:"",participants:[],evaluations:[]}
                });
                systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, 
                  {examStep:"login",sessionId:obj.sessionId,status:"student_login_failed"});
                } */
                          
                  
                }
              
            });

            socket.on('Evaluation',async (arg1,callback)=>{
              const obj=arg1;
              if(obj.clientname===`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`){
                console.log("MATCHED");
                    
                /** stepData: {
                      content_6: '<ul><li><strong>QUestion 1</strong></li><li><strong>QUESTION 2</strong></li><br></ul>',
                      timer_6: '5 mins'
                    },
                    presetId: '936fd9b0-1bbc-4280-ac46-df7f50376a3e',
                    clientname: '10.20.142.196_84_patientpc',
                    examSessionId: 'b7c9114d-f75e-400a-ac5b-43cb5ebf8adf'
                } */

                //call route to render login page
                console.log("data received", obj);
                let content='';
                for(const key of Object.keys(obj)){
                  console.log("key",key,"obj[key]",obj[key]);
                  if(key.includes("stepData")){
                    for(const key1 of Object.keys(obj[key])){
                      console.log("stepData: key",key1,"value",obj[key][key1]);
                      if(key1.includes("content")){
                        console.log("content key",key1,"content value",obj[key][key1]);
                        content=obj[key][key1];//get the content from the object
                        
                      }
                    }
                    
                  
                  }
                }
              

              //send websocket message to client with content
              /* if(connections.has(app_object.locals.ip)){
                connections.get(app_object.locals.ip).send(JSON.stringify({message:"success",content:content,type:"exam"}));
                console.log("Eval step",app_object.locals.ip,"=",connections.keys().next().value);

              }
              else{
                console.log("No connection found for ip",app_object.locals.ip, "map:",connections.keys().next().value);
              } */
              
              callback({ message: "success", clientname: obj.clientname,sessionId:obj.sessionId });
                return;

              }
              
            });

            socket.on('Door Note',async (arg1,callback)=>{
              const obj=arg1;
              if(obj.clientname===`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`){
                console.log("MATCHED");
                    
                /** stepData: {
                      content_6: '<ul><li><strong>QUestion 1</strong></li><li><strong>QUESTION 2</strong></li><br></ul>',
                      timer_6: '5 mins'
                    },
                    presetId: '936fd9b0-1bbc-4280-ac46-df7f50376a3e',
                    clientname: '10.20.142.196_84_patientpc',
                    examSessionId: 'b7c9114d-f75e-400a-ac5b-43cb5ebf8adf'
                } */

                //call route to render login page
                console.log("data received", obj);
                let content='';
                for(const key of Object.keys(obj)){
                  console.log("key",key,"obj[key]",obj[key]);
                  if(key.includes("stepData")){
                    for(const key1 of Object.keys(obj[key])){
                      console.log("stepData: key",key1,"value",obj[key][key1]);
                      if(key1.includes("content")){
                        console.log("content key",key1,"content value",obj[key][key1]);
                        content=obj[key][key1];//get the content from the object
                        
                      }
                    }
                    
                  
                  }
                }
              

              //send websocket message to client with content
              /* if(connections.get(app_object.locals.ip).readyState===ws.OPEN){
                  connections.get(app_object.locals.ip).send(JSON.stringify({message:"success",step:"Door Note",content:content,type:"exam",
                  clientname: obj.clientname,sessionId:obj.sessionId,divId:"doorNoteContainer",display:"on"
                })); */
              // console.log("Doornote step",app_object.locals.ip,"=",connections.keys().next().value);
                callback({ message: "success",status:"door note initiated", clientname: obj.clientname,sessionId:obj.sessionId,user:obj.user,step:"Door Note",});

              /* }    
              else{
                //console.log("No connection found for ip",app_object.locals.ip, "map:",connections.keys().next().value);
                callback({ message: "failure", clientname: obj.clientname,sessionId:obj.sessionId,step:"Door Note",
                  status:"failure in connection",user:obj.user}); 
              } */
              
              
            

              }
              
            });

            
            socket.on('Honour Code',async (arg1,callback)=>{
              const obj=arg1;
              if(obj.clientname===`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`){
                console.log("MATCHED");
                    
                /** stepData: {
                      content_6: '<ul><li><strong>QUestion 1</strong></li><li><strong>QUESTION 2</strong></li><br></ul>',
                      timer_6: '5 mins'
                    },
                    presetId: '936fd9b0-1bbc-4280-ac46-df7f50376a3e',
                    clientname: '10.20.142.196_84_patientpc',
                    examSessionId: 'b7c9114d-f75e-400a-ac5b-43cb5ebf8adf'
                } */

                //call route to render login page
                console.log("data received", obj);
                let content='';
                for(const key of Object.keys(obj)){
                  console.log("key",key,"obj[key]",obj[key]);
                  if(key.includes("stepData")){
                    for(const key1 of Object.keys(obj[key])){
                      console.log("stepData: key",key1,"value",obj[key][key1]);
                      if(key1.includes("content")){
                        console.log("content key",key1,"content value",obj[key][key1]);
                        content=obj[key][key1];//get the content from the object
                        
                      }
                    }
                    
                  
                  }
                }
              

              //send websocket message to client with content
              /*  if(connections.has(app_object.locals.ip)){
                connections.get(app_object.locals.ip).send(JSON.stringify({message:"success",content:content,type:"exam"}));
                console.log("Eval step",app_object.locals.ip,"=",connections.keys().next().value);

              }
              else{
                console.log("No connection found for ip",app_object.locals.ip, "map:",connections.keys().next().value);
              }
                */
              callback({ message: "success", clientname: obj.clientname,examSessionId:obj.examSessionId });
                return;

              }
              
            });


            socket.on("Reset",async(arg1,callback)=>{

              let obj = arg1;
              //make an api call to start recording if socket name is equal to name
              console.log(
                "test",
                obj.clientname,
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              );
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                console.log("MATCHED");
                //call the reset function
                console.log("RESET CALLED. CLEAR DATA");
                callback({ message: "success",status:"Resetting rooms", clientname: obj.clientname,sessionId:obj.sessionId,stepName:"Reset",});
              }//IMPORTANT: DO NOT SEND AN ACK IF NA
              
            });

            //places the client in exam mode, this is used to launch the browser in kiosk mode and prevent navigation
            //the launched page will then make a socketio connection to the server
            socket.on("EXAM_MODE", async (obj, callback) => {
              console.log("received exam mode request", obj);
              try {
                //launch the browser in kiosk mode but first check if the window is already created
                if(!win){
                  createWindow();
                }
                callback({ message: "success", clientname: obj.clientname });
                systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, {browser:"disconnected"});

              }
              catch (error) {
                console.error('Error in EXAM_MODE:', error);
                callback({ message: "failure", clientname: obj.clientname });
              }
            });

            socket.on('disconnect_exam_mode', (obj,callback) => {
              console.log("Exam mode disconnected");
              // Handle exam mode disconnection
              if (Browser) {
                Browser.kill();
                Browser = null;
                systemState.updateState(`${app_object.locals.ip}_${app_object.locals.roomnumber}_${app_object.locals.type}`, {browser:"disconnected"});
                callback({ message: "success", clientname: obj.clientname });
              }
            });

            socket.on("error", (error) => {});

            socket.on("connect", () => {
              console.log("socket connected");
              //this is the same method used on the server to confirm that the recovery was successful
              if (socket.recovered) {
                // any event missed during the disconnection period will be received now
                console.log("socket recovery successful");
              } else {
                // new or unrecoverable session
                console.log("socket recovery not successful");
              }

              //1. upon connection send client name. we register the event handler within the 'connect' event
              //so its called whenever the client connects or reconnects
              socket.emit("initialize", {
                roomNumber: app_object.locals.roomnumber,
                type: app_object.locals.type,
                ip: app_object.locals.ip
              });
            });

            socket.on("disconnect", (reason) => {
              console.log("socket disconnected", reason, "calling stopffmpeg on ",recordingMap);
              //if the socket is closed, then we need to close the ffmpeg process and the websocket connection
              try{
                if(recordingMap.size>0){
                  recordingMap.forEach(async (value,key)=>{
                    let lastFileName=value.filename;
                    let lastIp=value.ip;
                    await stopffmpegRecordingAlt(lastFileName,lastIp);
                    console.log("stopping recording for ip",lastIp,"filename",lastFileName);
                  });
                  recordingMap.clear();
                }
                //**IMPORTANT**: close the child process as well by killing it
                /**
                 * 1.kill the child process if it is still running, this will close the browser and require the system to be placed back into exam mode
                 * thus creating a new connection to the server
                 * 2. option 2 is to keep the child process running and check for socket disconnection on the child process end and then reconnection
                 * 
                 */
                if (child && child.exitCode === null) {
                  console.log("killing child/client process as server disconnected");
                  child.kill();
                  child = null;
                }
                //ffmpeg.kill();
                //websocketAlt.close();
                //socket.close();
              }
              catch(err){
                console.log("error closing socket",err);
              }
              
            });

            socket.on("exam_action", (obj, callback) => {
              //check if the address is same as the nodes internal name
              //if so, deconstruct and take action
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                console.log("received aaction to :", obj);
                callback({ message: "success", clientname: obj.clientname });
              }
            });

            //handle force close of ghost recording
            socket.on("force_stop_session", async (obj, callback) => {
              console.log("received force close command:", obj);
              if (
                obj.clientname ===
                app_object.locals.ip + "_" + app_object.locals.roomnumber + "_" + app_object.locals.type
              ) {
                console.log("MATCHED");
              

                let ipaddr = obj.clientname.split("_")[0];
                //1.check if the filename matches the one in the map, if not then return failure message
                if(!recordingMap.has(obj.stepData.filename)){
                    console.log("No recording in progress for this ip address", obj.clientname,"does not match the filename in the map",
                      recordingMap.keys().next().value);
                    callback({messageId:obj.messageId,stepName:"force_close_session",message:"failure",description:"Recording not found on client",
                      clientname:obj.clientname,code:5,filename:obj.stepData.filename,stepName:"force_close_session",sessionId:obj.sessionId});
                    return;
                  }
              const data = await stopffmpegRecordingAlt(obj.stepData.filename, ipaddr);
              let result=JSON.parse(data);
                
                console.log("ACK can be sent now", result,result.message,result['message']);
                if(result.message=="success"){
                  console.log("clearing recording map",recordingMap);
                  recordingMap.clear();
                }
                
                callback({ message: result.message, sessionId:obj.sessionId,clientname: obj.clientname,
                  messageId:obj.messageId,filename:obj.stepData.filename,stepName:"force_close_session" });
                }
            });

          });
        } catch (err) {
          console.log("error reading file", err);
        }
      })
      .catch((error) => {
        console.log("Failed to connect!", error);
        setTimeout(() => {
        mongoose.connect(MURL).then(() => {
          console.log("Reconnected to MongoDB");
        
        }).catch(err => {
          console.error("Failed to reconnect to MongoDB:", err);
        });
      }, 5000);
      });

      mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    
    });

});


app.on("window-all-closed", () => {
  //don't quit the app on window close
  app.hide();
});

// Connect to database via mongoose instead, so its accessible throughout app_object
//if connection fails try to recoonect after  seconds and log the error. If connection still fails  then exit the process
/*  */


/**IMPORTANT There are two classes of errors that can occur with a Mongoose connection.

Error on initial connection: If initial connection fails, Mongoose will emit an 'error' event and the promise mongoose.connect() returns will reject. However, Mongoose will not automatically try to reconnect.
Error after initial connection was established: Mongoose will attempt to reconnect, and it will emit an 'error' event. */
mongoose.connection.on("connected", () => {
  console.log("MongoDB connected successfully");
  //TO DO emit an event to the socket to indicate that the DB connection was successful
});
//handle errors after initial connection
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
/**Note that Mongoose does not necessarily emit an 'error' event if it loses connectivity to MongoDB. 
 * You should listen to the disconnected event to report when Mongoose is disconnected from MongoDB. */
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
  //attempt to reconnect
  setTimeout(() => {
    mongoose.connect(MURL).then(() => {
      console.log("Reconnected to MongoDB");
    }).catch(err => {
      console.error("Failed to reconnect to MongoDB:", err);
    });
  }, 5000);
  //TO DO emit an event to the socket to indicate that the DB connection was lost
});

function executeExamCommands(config, command) {
  /*1. access config array for examProperty field that matches the command given. */

  for (i = 0; i < config.length; i++) {
    //2.if both the node type and exam property/command matches then and only then execute
    //e.g studentLogin should only match student Pc and run
    if (config[i].examProperty === command && config[i].type === my_type) {
      //display doornote
      if (command === "startRecording") {
        //hide the form
        startRecording();
        console.log("command executed start recording", config);
      } else if (command === "reset") {
        stopRecording();
        console.log("command executed stop recording", config);
      }
    }
  }
}


/**With this alternative function when we start a recording we create a websocket connection to the stream generated by rtspServer then
 * we spwan an ffmpeg process to read directly from that stream, convert it to mp4 and save it to disk
 */
async function startffmpegRecordingAlt(fn,msgId,ipaddr,sessId){
  return new Promise((resolve,reject)=>{
  //use a common websocket so that we open and close the same one
  //note here that we are using the websocket client on this side which makes a connection to the websocket server already listening, rtspServer.js
  //therefore we use the on open event on this side but the server side will have the on connection event
  websocketAlt= new ws.WebSocket("ws://"+ipaddr+":9998");
  //function ffmpegDirectConversion(ws,file_name){
  
    // Create an ffmpeg process
    ffmpeg =  child_process.spawn('ffmpeg', [
      '-f', 'mpegts',           // Input format (assuming MPEG-TS stream)
      '-i', 'pipe:0',           // Input from stdin rather than a file for example
      '-c:v', 'libx264',        // Video codec
      '-preset', 'fast',        // Encoding speed
      '-tune', 'film',          // Tune for film-like quality
      '-movflags', '+faststart',// Start video quickly (good for streaming)
      '-y',  					// Overwrite output file without asking
		//"-c:a aac",
	//'-f mp4',	  
      `./recordings/${fn}.mp4`            // Output file
  ]);

  websocketAlt.on("open",()=>{
	  console.log("websocket opened.");
	  //store the socket so we can pass it to stop recording later
	  
	  
  });
  /**rtspServer creates an instance of VideoStream, which in turn creates
   * an instance of Mpeg1Muxer to handle the video stream.
   * it does this by using ffmpeg to take the raw rtsp streams from the 
   * cameras, combine them and simply send data to the stdout stream 
   * of the ffmpeg process. Mpeg1Muxer emits a 'camdata' event 
   * whenever data is received and VideoStream listens for that event.
   * It then takes the data and sends it to all websocket clients over
   * the ws server.
   * When the websocket below receives the data, it pipes it to ffmpeg's stdin.
   * so that ffmpeg can process the video stream and save it to disk.
   */
  // Pipe the WebSocket stream to ffmpeg's stdin
  websocketAlt.on('message', (data) => {
      ffmpeg.stdin.write(data);
  });
  
  websocketAlt.on("error",(err)=>{
    //close all resources and return error message
    // Close ffmpeg process and WebSocket connection
    /**messageId:result.messageId,
                    message: result.message,
                    description: result.description,
                    clientname: obj.clientname,
                    code: result.code,
                    filename: result.filename,
                    sessionId:result.sessionId */
    try{
          if(ffmpeg){
            ffmpeg.stdin.end();
            //ffmpeg.kill('SIGINT'); // Terminate ffmpeg process on error
          }
          if(websocketAlt){
            websocketAlt.close(); // Close WebSocket connection on error
          }
      resolve( JSON.stringify({
      messageId:msgId,
      message:"failure",
      description: "Recording could not be started. Unable to open websocket.",
      code:2,
      filename:fn,
      sessionId:sessId
    }));
  }catch(err){
	  console.log(`Error closing websocket or ffmpeg ${err}`);
	  resolve( JSON.stringify({
    messageId:msgId,
    message:"failure",
    description: "Recording could not be started. Unable to open websocket.",
    code:2,
    filename:fn,
    sessionId:sessId
  }));
  }
  });
   // Handle ffmpeg's stdout and stderr for logging
  ffmpeg.stdout.on('data', (data) => {
      //console.log(`ffmpeg stdout: ${data}`);
  });

  ffmpeg.stderr.on('data', (data) => {
      //console.error(`ffmpeg stderr: ${data}`);
  });

  ffmpeg.on('close', (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
	  //only upload after ffmpeg fully saves file
	  //place long running task in separate function and return to caller
		 uploadAlt(fn,sessId);
  });
  //once ffmpeg is spawned we can resolve the promise and return success message
  ffmpeg.on("spawn",()=>{
    //store the ffmpeg and websocketAlt objects in the map so they can be accessed later
	  resolve( JSON.stringify({
      messageId:msgId,
      message:"success",
      description: "Recording successfully started by ffmpeg.",
      code:0,
      filename:fn,
      sessionId:sessId
}));
  });

  ffmpeg.on('error', (err) => {
      console.error('Error occurred with ffmpeg process:', err);
      //close all resources and return error message
      // Close ffmpeg process and WebSocket connection
      try{
            if(ffmpeg){
              ffmpeg.stdin.end();
              //ffmpeg.kill('SIGINT'); // Terminate ffmpeg process on error
            }
            if(websocketAlt){
              websocketAlt.close(); // Close WebSocket connection on error
            }
          resolve( JSON.stringify({
            messageId:msgId,
            message:"failure",
            description: "Recording could not be started. Unable to spawn ffmpeg.",
            code:2,
            filename:fn,
            sessionId:sessId
      }));
    }catch(err){
      console.log("error closing ffmpeg process",err);
      resolve( JSON.stringify({
        messageId:msgId,
        message:"failure",
        description: "Recording could not be started. Unable to spawn ffmpeg.",
        code:2,
        filename:fn,
        sessionId:sessId
      }));
    }
  });
  //}

  });//end promise block
}

function waitForWebSocketClose() {
  return new Promise((resolve, reject) => {
      if (!websocketAlt || websocketAlt.readyState === 3) {
          console.log("WebSocket is already closed.");
          resolve(JSON.stringify({
              message: "success",
              description: "WebSocket is already closed."
          }));
          return;
      }

      websocketAlt.on('close', (code, reason) => {
          console.log(`WebSocketAlt closed with code: ${code}, reason: ${reason} within asyn method 2`);
          // Close ffmpeg process and WebSocket connection
              try{
                if(ffmpeg){
                ffmpeg.stdin.end();
                //ffmpeg.kill('SIGINT'); // Terminate ffmpeg process
                console.log("ffmpeg process killed on websocket close method");
              }
              
              websocketAlt=null;
            
            }
            catch(err){
              console.log("error closing ffmpeg process and websocket",err);
            
            }
          resolve(JSON.stringify({
              message: "success",
              description: "WebSocket closed successfully."
          }));
      });

      websocketAlt.on('error', (err) => {
          console.error("Error while closing WebSocket:", err);
          resolve(JSON.stringify({
              message: "failure",
              description: "Error while closing WebSocket.",
            
          }));
      });

      // Initiate WebSocket closure
      websocketAlt.close();
  });
}

async function stopffmpegRecordingAlt(fn,ipAddr){
 
  return new Promise(async(resolve)=>{
		let filePath=`./recordings/${fn}.mp4`;
		console.log("Stopffmpeg.Filepath is",filePath);
		console.log("Is websocket closed: ",websocketAlt===null);

    //close the websocket connection to the rtsp server
    
		  const result=await waitForWebSocketClose();
      console.log("result from waitForWebSocketClose",result);
      const parsedResult=JSON.parse(result);
      //websocketAlt.close();
      
      if(parsedResult.message=="success"){
        console.log("websocket closed successfully");
        console.log("Is websocket closed: ",websocketAlt===null);
        //add filename to upload map
        uploadingMap.set(fn,{filename:fn,ip:ipAddr});
        resolve( JSON.stringify({
          message:"success",
          description: "Recording successfully stopped by ffmpeg."
        }));
      }
      else{
        console.log("websocket not closed successfully");
        resolve( JSON.stringify({
          message:"failure",
          description: "Recording could not be stopped. Unable to close websocket."
        }));
      }
      
    
  
  });
}

function uploadAlt(fn,sessionID){
  const filePath=`./recordings/${fn}.mp4`;
  //check if the file exists before uploading
  if (!fs.existsSync(`./recordings/${fn}.mp4`)) {
    console.log("File does not exist, cannot upload to server",fn);
    socket.emit("upload_response", {
      filename:fn,
      message: "failure",
      description: "File does not exist",
      location: filePath,
      roomNumber: app_object.locals.roomnumber,
      type: app_object.locals.type,
      ip: app_object.locals.ip,
      sessionId:sessionID,
    });
    
  }
  //check if the file is the uploadMap
  if(!uploadingMap.has(fn)){
    console.log("File not in upload map, cannot upload to server",fn);
    socket.emit("upload_response", {
      filename:fn,
      message: "failure",
      description: "File not found in upload map",
      location: filePath,
      roomNumber: app_object.locals.roomnumber,
      type: app_object.locals.type,
      ip: app_object.locals.ip,
      sessionId:sessionID,
    });
  }

	
	
	try {
	
  //upload file to database
   const db = mongoose.connection.db;
   console.log("making db connection");
   
      
          //get db istance
          //db.collection("recordings.files");
          const bucket = new mongodb.GridFSBucket(db, {
            bucketName: "recordings",
          });
          const upload = bucket.openUploadStream(fn + ".mp4", {
            metadata: { field: "room", value: "55" },
          });
          upload.once("finish", () => {
            console.log("finished. file uploaded to db", fn);
            //reinitialize the stream and websocket variables
            str.close();
            socket.emit("upload_response", {
              filename:fn,
              message: "success",
              description: "File uploaded successfully",
              location: filePath,
              roomNumber: app_object.locals.roomnumber,
              type: app_object.locals.type,
              ip: app_object.locals.ip,
              sessionId:sessionID,
            });
            //remove the file from the uploading map
            uploadingMap.delete(fn);
            console.log("removed file from uploading map",fn);
            // //remove the file from the file system
            fs.unlink(`./recordings/${fn}.mp4`, (err) => {
              if (err) {
                console.error("Error deleting file:", err);
              } else {
                console.log("File deleted successfully:", `./recordings/${fn}.mp4`);
              }
            });
            
          });
		  
		  upload.on("error",(error)=>{
			  console.log("error uploading gridfs bucket",error);
        socket.emit("upload_response", {
          filename:fn,
          message: "failure",
          description: "File could not be uploaded",
          location: filePath,
          roomNumber: app_object.locals.roomnumber,
          type: app_object.locals.type,
          ip: app_object.locals.ip,
          sessionId:sessionID,
        });
		  });
         const str = fs.createReadStream(`./recordings/${fn}.mp4`);
        
                str.on("error", (error) => {
                  console.log(
                    "failed to create read stream for uploading file",
                    error
                  );
                  socket.emit("upload_response", {
                    filename:fn,
                    message: "failure",
                    description: "File could not be read",
                    location: filePath,
                    roomNumber: app_object.locals.roomnumber,
                    type: app_object.locals.type,
                    ip: app_object.locals.ip,
                    sessionId:sessionID,
                  });
                });
        
                str.pipe(upload);        
			        console.log("Sending recording:pipeing upload");
          
        } catch (err) {
          console.log("error in uploading file:", err);
          socket.emit("upload_response", {
           filename:fn,
            message: "failure",
            description: "File could not be uploaded due to error",
            location: filePath,
            roomNumber: app_object.locals.roomnumber,
            type: app_object.locals.type,
            ip: app_object.locals.ip,
            sessionId:sessionID,
          });
        }}


        function camDetails(){
          if(!app_object.locals.camera1 || !app_object.locals.camera2){
            console.log("camera details not found in app_object locals",app_object.locals.camera1,app_object.locals.camera2);
            return JSON.stringify({message:"failure",description:"Camera details not found"});
          }
          console.log("camera details found in app_object locals",app_object.locals.camera1,app_object.locals.camera2);
          return JSON.stringify({message:"success",camera1:app_object.locals.camera1,camera2:app_object.locals.camera2});
        }

        const createWindow = () => {
          //launch browser in full screen, kiosk mode
          const win = new BrowserWindow({
            width: 800,
            height: 600,
            //fullscreen: true,
            //kiosk: true,
            webPreferences: {
              //nodeIntegration: true,
              //contextIsolation: true,
              preload: path.join(__dirname, 'preload.js'),//pass in data to the renderer process
            },
          });
          win.loadFile('index.html');
          win.webContents.openDevTools();//open dev tools
          //set the webContents object so that we can pass data from main to the renderer with the 
          //client and server details
          win.webContents.on('did-finish-load', (event) => {
            console.log("WebContents finished loading:", event);
          //channel, args
            win.webContents.send('initialization-channel', {
              clientname: app_object.locals.ip + "_" + app_object.locals.roomnumber+"_"+app_object.locals.type,
              serverAddress: app_object.locals.serverip
            });
          });
        }
        /**This will be the main function to handle all communication flows from the renderer process.
         * It will consist of a switch statement or if else logic to handle different commands.
         */
        async function handleDataFromRendererProcess(event,rendererData){
            console.log("Event from renderer process",event," Data received from renderer process:", rendererData);
            // Return the data you want to send to the renderer process
            if(rendererData.command && rendererData.command==="log_in_student"){
              console.log("Logging in student:", rendererData);
              //send a message back that the student is being logged in
              //win.webContents.send('login-channel', {message:"success",command:"log_in_student",username:rendererData.data.username,password:rendererData.data.password});
              //use event.reply instead
              event.reply("communication-channel",{message:"success",command:"log_in_student",username:rendererData.data.username,password:rendererData.data.password});
            }
            else if(rendererData.command && rendererData.command==="get_cam_details"){
              console.log("Getting camera details:", rendererData);
              //send a message back with the camera details
              win.webContents.send('camera-channel', {message:"success",command:"get_cam_details",cameraDetails:camDetails()});
            }
            else if(rendererData.command && rendererData.command==="door_note_launched"){
              console.log("Door note launched:", rendererData);
              //send a message back that the door note has been launched
              win.webContents.send('door-note-channel', {message:"success",command:"door_note_launched"});
            }
            else if(rendererData.command && rendererData.command==="honour_code_launched"){
              console.log("Honour code launched:", rendererData);
              //send a message back that the honour code has been launched
              win.webContents.send('honour-code-channel', {message:"success",command:"honour_code_launched"});
            }
            else if(rendererData.command && rendererData.command==="evaluation_loaded"){
              console.log("Evaluation loaded:", rendererData);
              //send a message back that the evaluation has been loaded
              win.webContents.send('evaluation-channel', {message:"success",command:"evaluation_loaded"});
            }
            else if(rendererData.command && rendererData.command==="start_encounter"){
              console.log("Start encounter:", rendererData);
              //send a message back that the start encounter has been initiated
              win.webContents.send('start-encounter-channel', {message:"success",command:"start_encounter"});
            }
            else if(rendererData.command && rendererData.command==="reset_room"){
              console.log("Reset room:", rendererData);
              //send a message back that the reset room has been initiated
              win.webContents.send('reset-channel', {message:"success",command:"reset_room"});
            }
            else if(rendererData.command && rendererData.command==="login_form_initialized"){
              console.log("Login form initialized:", rendererData);
              //send a message back that the login form has been initialized
              win.webContents.send('login-form-channel', {message:"success",command:"login_form_initialized"});
            }
            else if(rendererData.command && rendererData.command==="door_note_launched"){
              console.log("Door note launched:", rendererData);
              //send a message back that the door note has been launched
              win.webContents.send('door-note-channel', {message:"success",command:"door_note_launched"});
            }
          }
