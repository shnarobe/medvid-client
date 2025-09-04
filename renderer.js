
            
            var globalParticipants = [];
          
            //add event listener to the form  
            document.querySelector('#loginForm').addEventListener('submit',async(event)=>{
            
                event.preventDefault();
                console.log("form submitted");
                const formData = new FormData(event.target);
                const objectData = Object.fromEntries(formData.entries());
                console.log("form data",objectData);  
                //send the form data to be processed
                //send the data to the main electron process so that authentication can occur
                /* window.API.send_to_main({
                    command:"log_in_student",
                    data: objectData,
                    clientname: document.getElementById('loginForm').querySelector('input[name="details"]').dataset.clientname,
                    sessionId: document.getElementById('loginForm').querySelector('input[name="details"]').dataset.sessionId,
                    step: document.getElementById('loginForm').querySelector('input[name="details"]').dataset.step
                }); */
            });
                /**EVENT LISTENERS */
                window.API.onLoginInitiated((data)=>{
                    //listen for command to load login form
                    //extract content and set form fields
                    try{

                    
                    const content=extractContent(data);

                    document.getElementById('login').style.display = 'block';
                    document.getElementById('loginForm').querySelector('input[name="details"]').value = data.sessionId;
                    document.getElementById('loginForm').querySelector('input[name="details"]').dataset.sessionId = data.sessionId;
                    document.getElementById('loginForm').querySelector('input[name="details"]').dataset.stepName = data.stepName;
                    document.getElementById('loginForm').querySelector('input[name="details"]').dataset.clientname = data.clientname;
                    
                    //hide all other divs
                    document.getElementById('studentNameContainer').style.display = 'none';
                    document.getElementById('waitingScreen').style.display = 'none';
                    document.getElementById('doorNoteContainer').style.display = 'none';
                    document.getElementById('evaluationContainer').style.display = 'none';
                    document.getElementById('honourCodeContainer').style.display = 'none';
                    //send back a response over separate channel to ACK command
                    window.API.onLoginInitiatedResponse({message: "success",status:"login initiated", stepName:"login",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                            });
                    }
                    catch(error){
                        //send back a response over separate channel to ACK command
                    window.API.onLoginInitiatedResponse({message: "failure",status:"login initiated", stepName:"login",clientname: data.clientname,
                              sessionId:data.sessionId,timeStamp:Date.now(),stepData:{recordingName:"",participants:[],evaluations:[]}
                            });

                    }


                });

                


              /*   let result;
                window.API.onLoginResponse((event,data)=>{
                    console.log("result received from parent process",data);
                    result=data;
                    if(result.message=="success"){
                    console.log("Login successful:", result); */
                //if the login is successful then send a message to the client via websocket
               /*  const sessionId=document.getElementById('loginForm').querySelector('input[name="details"]').dataset.sessionId;
                const step=document.getElementById('loginForm').querySelector('input[name="details"]').dataset.step;
                let user="";
                result.participants.forEach(participant => {
                    console.log("participant",participant);
                    user=user+participant.firstName+" "+participant.lastName+"( "+participant.username+" ) <br>";
 
                });
               //hide the login form
                document.getElementById('login').style.display = 'none';
                //diplay the logged in user 
                document.getElementById('studentNameContainer').innerHTML="Welcome "+user;
                document.getElementById('studentNameContainer').style.display="block";
                console.log("user",user,"sessionId",sessionId,"step",step);
                globalParticipants=result.participants;
                //send the message to the server with the user details
                webSocket.emit("login_complete",{message:"success",stepName:"login_complete",sessionId:sessionId,participants:globalParticipants,
                status:"complete",user:user,clientname:clientname});
                
                }
                else{
                    //if the login is not successful then display an error message
                   document.querySelector('#loginForm span.form-text').innerHTML="Login Failed: "+result.message+". Please try again.";
                    //document.getElementById('login').style.display = 'block';
                    //hide all other divs
                }*/
               // }
             //   });

                
           // });
            //add event listener to the form

            function extractContent(obj){
                let content="";
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
                    return content;
            }

            async function AckFetch(route,data){
                console.log("AckFetch called with route",route,"data",data);
                const response=await fetch(route,{
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify(data)
                });
                const result=await response.json();
                console.log("AckFetch result",result);
                return result;

            }

            
     