const createState = require("@persevie/statemanjs");


let nodeState;
/**The system state object will have a map storing each room.  */
module.exports = {
  init: (roomName,cam1,cam2) => {
    nodeState = createState.createState({
            name: roomName,
            ip: roomName.split("_")[0],
            roomType: roomName.split("_")[2],
            roomNumber:roomName.split("_")[1],
            normal: true,
            exam: false,
            examStep:"",
            sessionId:"",
            recording: false,
            sessionRecording: "",
            participants:[],
            evaluations:[],
            camera1:cam1,
            camera2:cam2,
            browser:"disconnected",
            websocket: "disconnected",
            status: "disconnected",
            masterSessionId: "",//set  at the start of the preset and used to verify incoming sessions before a reset is don
      
    });

    //call.get() on the returned state to get the actual state
    console.log("State initialized", nodeState,nodeState.get());
  },
  getState: () => {
    if (!nodeState) {
      console.log("Error with state");
      //Error("Error saving state");
    }
    return nodeState.get();
  },
  setState: (state) => {
    nodeState = state;
  },
  updateState: (roomName, updateData) => {
    /**There are two ways to change the state - set and update. 
     * The set method completely changes the state and is great for primitives and simple states. 
     * updateDate is a json object of form {key:value,key2:value2}*/
    if (!nodeState) {
      console.log("Error with state");
      //Error("Error saving state");
    }
    if(nodeState.get().name!==roomName){
        console.log("Error: roomName is undefined", roomName);
        return;
    }
    //console.log("state before update", nodeState.get().rooms);
    nodeState.update((state)=>{
      for(const key in updateData) {
        
          console.log("updating state", key, updateData[key]);
          state[key]=updateData[key];
        
     
      }
       
      
    });
    console.log("state after update", nodeState.get());
    
  }
}