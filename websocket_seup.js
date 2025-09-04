 
          function setupWebsocket(){  
            
            webSocket.on('connect', () => {
                console.log('WebSocket...Child process connected to server',webSocket.id);
                //send a message to the server to initiate the exam
                webSocket.emit('examChildProcess_initialize', {clientname: backendData.clientname});
            });

            webSocket.on("disconnect", () => {
                console.log("WebSocket...Child process disconnected from server", webSocket.id, "clientname", backendData.clientname);
                if(webSocket.active){
                    console.log("WebSocket...Child process disconnected temporarily but is still active and will attempt to reconnect");
                }
                else{
                    console.log("WebSocket...Child process disconnected unexpectedly and must be manually restarted");
                    //possibly send a fetch request to the parent process to restart the child process and restore the state optionally
                }
            });

            webSocket.on("examChildProcess_initialize",(data)=>{
                console.log("examChildProcess has been successfully initialized on the server",data);
               
            });

            webSocket.on("login",async(data,callback)=>{
                console.log("login data received",data);

                if(data.clientname !== backendData.clientname) {
                    console.log("Ignoring login message from another client:", data.clientname);
                    callback({ message: "failure",status:"login initiated", stepName:"login",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                    return; // Ignore messages from other clients
                }
                    console.log("Login message recived via socketio from my parent after coming from the server",data);
                    //extract content
                   

                            //send ACK to server
                              callback({ message: "success",status:"login initiated", stepName:"login",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                             //send data to main to perform some action, similar to making a fetch call
                             window.API.send_to_main({
                               message: "success",
                               command: "login_form_initialized",
                               status: "login form initialized",
                               stepName: "login",
                               clientname: data.clientname,
                               sessionId: data.sessionId,
                               timeStamp: Date.now(),
                               stepData: {
                                 recordingName: "",
                                 participants: globalParticipants,
                                 evaluations: []
                               }
                             });
                            
                             //console.log("Login response from parent",response);
                             await window.API.onLoginInitiatedResponse((event,data)=>{
                               console.log("Login response from parent",data);
                             });

            });

                  webSocket.on("Door Note",async(data,callback)=>{
                console.log("Door note data received",data);

                if(data.clientname !== backendData.clientname) {
                    console.log("Ignoring login message from another client:", data.clientname);
                    return; // Ignore messages from other clients
                }
                    console.log("Door note message recived via socketio from my parent after coming from the server",data);
                    //extract content
                    const content=extractContent(data);
                            document.getElementById('doorNoteContainer').style.display = 'block';
                            document.getElementById('doorNoteContainer').innerHTML=content;
                            document.getElementById('doorNoteContainer').dataset.sessionId = data.sessionId;
                            document.getElementById('doorNoteContainer').dataset.stepName = data.stepName;  
                            document.getElementById('doorNoteContainer').dataset.clientname = data.clientname;
                           
                            
                            //hide all other divs except the student name container
                            //document.getElementById('studentNameContainer').style.display = 'none';
                            document.getElementById('waitingScreen').style.display = 'none';
                            document.getElementById('login').style.display = 'none';
                            document.getElementById('evaluationContainer').style.display = 'none';
                            document.getElementById('honourCodeContainer').style.display = 'none';

                            //send ACK to server
                              callback({ message: "success",status:"door note launched", stepName:"Door Note",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                             //send call to Parent to update state
                             const response=await window.API.send_to_main({
                               message: "success",
                               command: "door_note_launched",
                               status: "door note launched",
                               stepName: "Door Note",
                               clientname: data.clientname,
                               sessionId: data.sessionId,
                               timeStamp: Date.now(),
                               stepData: {
                                 recordingName: "",
                                 participants: globalParticipants,
                                 evaluations: []
                               }
                             });

                            console.log("response received from main",response);

            });

               webSocket.on("Honour Code",async(data,callback)=>{
                console.log("login data received",data);
                
                if(data.clientname !== backendData.clientname) {
                    console.log("Ignoring login message from another client:", data.clientname);
                    return; // Ignore messages from other clients
                }
                    console.log("Login message recived via socketio from my parent after coming from the server",data);
                    //extract content
                    const content=extractContent(data);
                            document.getElementById('honourCodeContainer').style.display = 'block';
                            document.getElementById('honourCodeContainer').innerHTML=content;
                            document.getElementById('honourCodeContainer').dataset.sessionId = data.sessionId;
                            document.getElementById('honourCodeContainer').dataset.stepName = data.stepName;
                            document.getElementById('honourCodeContainer').dataset.clientname = data.clientname;
                           
                            
                            //hide all other divs
                            //document.getElementById('studentNameContainer').style.display = 'none';
                            document.getElementById('waitingScreen').style.display = 'none';
                            document.getElementById('login').style.display = 'none';
                            document.getElementById('evaluationContainer').style.display = 'none';
                            document.getElementById('doorNoteContainer').style.display = 'none';

                            //send ACK to server
                              callback({ message: "success",status:"honor code loaded", stepName:"Honour Code",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                             //send fetch call to Parent to update state
                             window.API.send_to_main({
                               message: "success",
                                command: "honour_code_loaded",
                               status: "honor code loaded",
                               stepName: "Honour Code",
                               clientname: data.clientname,
                               sessionId: data.sessionId,
                               timeStamp: Date.now(),
                               stepData: {
                                 recordingName: "",
                                 participants: globalParticipants,
                                 evaluations: []
                               }
                             });

                             await window.API.onHonourCodeResponse((event,data)=>{
                               console.log("Honour Code response from parent",data);
                             });
            });

             webSocket.on("Evaluation",async(data,callback)=>{
                console.log("evalution data received",data);
                
                if(data.clientname !== 'backendData.clientname') {
                    console.log("Ignoring login message from another client:", data.clientname);
                    return; // Ignore messages from other clients
                }
                    console.log("evaluation message recived via socketio from my parent after coming from the server",data);
                    //extract content
                    const content=extractContent(data);
                            document.getElementById('evaluationContainer').style.display = 'block';
                            document.getElementById('evaluationContainer').innerHTML=content;
                            document.getElementById('evaluationContainer').dataset.sessionId = data.sessionId;
                            document.getElementById('honourCodeContainer').dataset.stepName = data.stepName;
                            document.getElementById('evaluationContainer').dataset.clientname = data.clientname;
                           
                            
                            //hide all other divs
                            //document.getElementById('studentNameContainer').style.display = 'none';
                            document.getElementById('waitingScreen').style.display = 'none';
                            document.getElementById('login').style.display = 'none';
                            document.getElementById('evaluationContainer').style.display = 'none';
                            document.getElementById('doorNoteContainer').style.display = 'none';

                            //send ACK to server
                              callback({ message: "success",status:"evaluation loaded", stepName:"Evaluation",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                             //send fetch call to Parent to update state
                             window.API.send_to_main({
                               message: "success",
                               command: "evaluation_loaded",
                               status: "evaluation loaded",
                               stepName: "Evaluation",
                               clientname: data.clientname,
                               sessionId: data.sessionId,
                               timeStamp: Date.now(),
                               stepData: {
                                 recordingName: "",
                                 participants: globalParticipants,
                                 evaluations: []
                               }
                             });

                             await window.API.onEvaluationResponse((event,data)=>{
                               console.log("Evaluation response from parent",data);
                             });

            });

             webSocket.on("Start Encounter",async(data,callback)=>{
                console.log("Start Encounter data received",data);
                
                if(data.clientname !== backendData.clientname) {
                    console.log("Ignoring login message from another client:", data.clientname);
                    return; // Ignore messages from other clients
                }
                    console.log("Start Encounter message recived via socketio from my parent after coming from the server",data);
                    //extract content
                   /*  const content=extractContent(data);
                            document.getElementById('evaluationContainer').style.display = 'block';
                            document.getElementById('evaluationContainer').innerHTML=content;
                            document.getElementById('evaluationContainer').dataset.sessionId = data.sessionId;
                            document.getElementById('honourCodeContainer').dataset.stepName = data.stepName;
                            document.getElementById('evaluationContainer').dataset.clientname = data.clientname;
                           
                            
                            //hide all other divs
                            document.getElementById('studentNameContainer').style.display = 'none';
                            document.getElementById('waitingScreen').style.display = 'none';
                            document.getElementById('login').style.display = 'none';
                            document.getElementById('evaluationContainer').style.display = 'none';
                            document.getElementById('doorNoteContainer').style.display = 'none';
 */
                            //send ACK to server
                              callback({ message: "success",status:"Start Encounter loaded", stepName:"Start Encounter",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                             //send fetch call to Parent to update state
                             window.API.send_to_main({
                               message: "success",
                               command: "start_encounter",
                               status: "start encounter loaded",
                               stepName: "Evaluation",
                               clientname: data.clientname,
                               sessionId: data.sessionId,
                               timeStamp: Date.now(),
                               stepData: {
                                 recordingName: "",
                                 participants: globalParticipants,
                                 evaluations: []
                               }
                             });


                            await window.API.onStartEncounterResponse((event,data)=>{
                               console.log("Start Encounter response from parent",data);
                            });

            });

                            webSocket.on("Reset",async(data,callback)=>{
                                console.log("Reset data received",data);
                                //clear all data attributes
                                document.getElementById('loginForm').querySelector('input[name="details"]').value = '';
                                document.getElementById('loginForm').querySelector('input[name="details"]').dataset.sessionId = ''; 
                                document.getElementById('loginForm').querySelector('input[name="details"]').dataset.stepName = '';
                                //clear dataset of divs
                                document.getElementById('studentNameContainer').dataset="";
                                document.getElementById('waitingScreen').dataset="";
                                document.getElementById('login').dataset="";
                                document.getElementById('doorNoteContainer').dataset="";
                                document.getElementById('evaluationContainer').dataset="";
                                document.getElementById('honourCodeContainer').dataset="";

                                
                                //hide all divs
                                document.getElementById('studentNameContainer').style.display = 'none';
                                document.getElementById('waitingScreen').style.display = 'none';
                                document.getElementById('login').style.display = 'none';
                                document.getElementById('doorNoteContainer').style.display = 'none';
                                document.getElementById('evaluationContainer').style.display = 'none';
                                document.getElementById('honourCodeContainer').style.display = 'none';

                                 //send ACK to server
                              callback({ message: "success",status:"Room Reset", stepName:"Reset",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                             }); 
                             //send fetch call to Parent to update state
                             window.API.send_to_main({
                               message: "success",
                               command: "reset_room",
                               status: "Room Reset",
                               stepName: "Reset",
                               clientname: data.clientname,
                               sessionId: data.sessionId,
                               timeStamp: Date.now(),
                               stepData: {
                                 recordingName: "",
                                 participants: globalParticipants,
                                 evaluations: []
                               }
                             });
                            
                             await window.API.onResetResponse((event,data)=>{
                               console.log("Reset response from parent",data);
                             });
                             });
            }