const express=require("express");
const router=express.Router();
const ldap=require("ldapjs");
const systemState=require("../systemstate");
const bcrypt = require("bcrypt");
const meduser=require("../models/userModel");
require("dotenv").config();


router.post("/login_launched",async(req,res)=>{
    console.log("login_launched: TO DO: UPDATE STATE ",req.body);
    res.send(JSON.stringify({message:"success",data:req.body}));
   
    
});

router.post("/student_login",async(req,res)=>{
    console.log("studentLogin: ",req.body);
    const data=req.body.data;
    const clientname=req.body.clientname;
    const sessionId=req.body.sessionId;
    const step=req.body.stepName;
    let {logged_in,user}=await localAuth(data.username,data.password);//ldapAuth(data.username, data.password, req, res);
    console.log("local auth: ",logged_in,user);
    //logged_in=true;
    //logged_user="testuser";
    //const username="testuser";
    const participants=[];
    
    if(logged_in){
      participants.push({firstName:user.firstName,lastName:user.lastName,username:user.username});
      //update the state with the new user
      systemState.updateState(clientname,{sessionId:sessionId,examStep:step,participants:[{name:user.name,username:user.username}]});
      console.log("successful login of students",participants);
        res.send({message:"success",participants:participants,sessionId:sessionId,step:step,clientname:clientname});
    }
    else{
        res.send({message:"failure",participants:[],sessionId:sessionId,step:step,clientname:clientname});
    }
    
});

router.post("/studentDoorNote",async(req,res)=>{ 
    console.log("studentDoorNote: ",req.body);
   // const data=req.body.data;
    const clientname=req.body.clientname;
    const sessionId=req.body.sessionId;
    const step=req.body.stepName;
    systemState.updateState(clientname,{sessionId:sessionId,examStep:step,participants:req.body.stepData.participants});
    //res.send({message:"success",participants:participants,sessionId:sessionId,step:step,clientname:clientname});
    res.send(JSON.stringify({message:"success",data:req.body}));
});

router.post("/studentHonourCode",async(req,res)=>{
    console.log("studentHonourCode: ",req.body);
     const clientname=req.body.clientname;
    const sessionId=req.body.sessionId;
    const step=req.body.stepName;
    systemState.updateState(clientname,{sessionId:sessionId,examStep:step,participants:req.body.stepData.participants});
    //res.send({message:"success",participants:participants,sessionId:sessionId,step:step,clientname:clientname});
    res.send(JSON.stringify({message:"success",data:req.body}));
 });

 router.post("/facultyEvaluation",async(req,res)=>{
    console.log("facultyEvaluation: ",req.body);
    const clientname=req.body.clientname;
    const sessionId=req.body.sessionId;
    const step=req.body.stepName;
    systemState.updateState(clientname,{sessionId:sessionId,examStep:step,participants:req.body.stepData.participants});
    //res.send({message:"success",participants:participants,sessionId:sessionId,step:step,clientname:clientname});
    res.send(JSON.stringify({message:"success",data:req.body}));
 });

 router.post("/startEncounter",async(req,res)=>{
    console.log("startEncounter: ",req.body);
    const clientname=req.body.clientname;
    const sessionId=req.body.sessionId;
    const step=req.body.stepName;
    systemState.updateState(clientname,{sessionId:sessionId,examStep:step,participants:req.body.stepData.participants});
    //res.send({message:"success",participants:participants,sessionId:sessionId,step:step,clientname:clientname});
    res.send(JSON.stringify({message:"success",data:req.body}));
 });

 router.post("/reset",async(req,res)=>{
    console.log("reset: ",req.body);
    const clientname=req.body.clientname;
    const sessionId=req.body.sessionId;
    const step=req.body.stepName;
    //reset the state
    systemState.updateState(clientname,{sessionId:sessionId,examStep:step,participants:[],evaluations:[]});
    //res.send({message:"success",participants:participants,sessionId:sessionId,step:step,clientname:clientname});
    res.send(JSON.stringify({message:"success",data:req.body}));
 });


 function ldapAuth(userN, passW, req, res) {
   return new Promise((resolve, reject) => {
     var fullName = "";
     const client = ldap.createClient({
       url: process.env.LDAP_URL,//"ldaps://10.20.16.11:636",
     /*   tlsOptions: {
         ca: [fs.readFileSync("cert/ldap.pem")], // Path to the certificate
     }, */
       timeout: 2000,
       connectTimeout: 2000,
       reconnect: true,
     });
 
     // User credentials
     //for AD we construct the userPrincipal name which serves as the distinguised name to bind with
     let username = userN + "@sgu.edu";
     let password = passW;
 
     // Connect and bind to the server
    
 
     client.bind(username, password, (err) => {
       //if error in binding return to caller with login error msg
       if (err) {
         success = "false";
         console.log("Authentication failed", err);
         client.unbind((err) => {
           if (err) {
             console.error("Error unbinding:", err.message);
           } else {
             console.log("Unbind successful");
           }
         });
        
         resolve({ logged_in: success, user: "" });
       }
       //if bind successful then search for the user
       success = "false";
       let suffix = "dc=sgu,dc=edu";
       let userPrincipalName = username;
       let serachOptions = {
         filter: `(userPrincipalName=${userPrincipalName})`,
       };
       //client .serach retruns two objects, an error object and a searchResult object
       //the searchResult object has three events that should be handled, onerror, onsearchentry(when at least one entry is found) and onend(when search is finised)
       client.search(
         suffix,
         { filter: `(userPrincipalName=${userPrincipalName})`, scope: "sub" },
         (err, searchResult) => {
           if (err) {
             console.log("error occured:", err);
             success = "false";
             client.unbind((err) => {
               if (err) {
                 console.error("Error unbinding:", err.message);
               } else {
                 console.log("Unbind successful");
               }
             });
             //only send response after binding failed or succeeded
             
             resolve({ logged_in: success, user: "" });
           }
           searchResult.on("error", (err) => {
             //
             console.log("Search result error", err);
             success = false;
             client.unbind((err) => {
               if (err) {
                 console.error("Error unbinding:", err.message);
               } else {
                 console.log("Unbind successful");
               }
             });
             
             resolve({ logged_in: success, user: "" });
           });
           searchResult.on("searchEntry", (entry) => {
             success = true;
 
             var lst = entry.attributes.filter((x) => x.type === "memberOf");
             if (lst.length) groups = lst[0].values;
             entry.attributes.forEach((l) => {
               //get and store user name
               l.type === "displayName"
                 ? (fullName = l.values[0])
                 : console.log(
                     "Deconstructing AD results:",
                     l.values,
                     "TYPE",
                     l.type
                   );
             });
             console.log("search successful", lst, "WELCOME:", fullName);
             resolve({ logged_in: success, user: fullName });
           });
           searchResult.on("end", (retVal) => {
             //succesful bind and search
             console.log("search ended", retVal);
             success = "true";
             client.unbind((err) => {
               if (err) {
                 console.error("Error unbinding:", err.message);
               } else {
                 console.log("Unbind successful");
               }
             });
             //only send response after binding failed or succeeded
             
             resolve({ logged_in: success, user: fullName });
           });
         }
       );
       client.on("error", (err) => {
         console.log("ldap client connection error", err);
         success = "false";
         //only send response after binding failed or succeeded
         client.unbind((err) => {
           if (err) {
             console.error("Error unbinding:", err.message);
           } else {
             console.log("Unbind successful");
           }
         });
         
         resolve({ logged_in: success, user: "" });
       });
     });
 
    
   });
 }

//performs local authentication using username and password
 function localAuth(userN, passW, req, res) {
   // Implement local authentication logic here
   return new Promise(async (resolve,reject)=>{
     try{
       //check if user exists in database
      const userExists = await  meduser.findOne({ username: userN });
         if (!userExists) {
           console.error("User not found:", err);
           return resolve({ logged_in: false, user: "" });
         }
         //if user exists then check password
         const isMatch = await bcrypt.compare(passW, userExists.password);
         if (!isMatch) {
           console.error("Password mismatch");
           return resolve({ logged_in: false, user: "" });
         }
         console.log("User authenticated successfully");
         return resolve({ logged_in: true, user: userExists });
       
       
     }
     catch(err){
       console.error("Error during local authentication:", err);
       return resolve({ logged_in: false, user: "" });
     }
   });
 }
 module.exports=router;