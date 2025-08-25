const createState=require("@persevie/statemanjs");
let nodeState;
module.exports={
    init:(name_,ip_,room_type_)=>{
        let d=new Date(1995,12,25);
         nodeState=createState.createState(
            {name:name_,
            ip: ip_,
            room_type: room_type_,
            normal:false,
            exam:false,
            student_login:false,
            door_note:false,
            rubric:false,
            recording: false,
            transfer_recording:false ,
            save_recording:false ,
            last_ping:d ,
            last_pong:d,
            });
    },
    getState:()=>{
        if(!nodeState){
            Error("Error saving state");
        }
        return nodeState;
    }
}