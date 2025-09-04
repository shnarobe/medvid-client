const {contextBridge,ipcRenderer} = require('electron');

//expose the API global to the renderer and creates a safe, bi-directional, synchronous bridge across isolated contexts
contextBridge.exposeInMainWorld('API', {
   //invoke calls the channel defined in main to take the data from the renderer and handle it
   //renderer to main..NB This channel can also reply back using event.reply...so in effect this is the only channel that can be used
    //send_to_main:(data) => ipcRenderer.invoke('communication-channel', data),//avoid using invoke as there is an error handling issue
    
    /**Method signature: (channel,listener)
     * It listens to the channel, when a new message arrives listener is called with event,args
     * For security reasons we don't expose the event object to the renderer, hence only the data is in the call back
     */
   
    onLoginInitiated: (callback) => ipcRenderer.on('login-initiated-channel', (event, data) => callback(data)),
    onLoginInitiatedResponse:(responseData)=>ipcRenderer.send("login-initiated-response-channel",responseData),




    
     /* data_channel: (callback) => ipcRenderer.on('communication-channel', (event, data) => callback(data)),
    onDoorNoteResponse: (callback) => ipcRenderer.on('door-note-channel', (event, data) => callback(event,data)),
    onHonourCodeResponse: (callback) => ipcRenderer.on('honour-code-channel', (event, data) => callback(event,data)),
    onEvaluationResponse: (callback) => ipcRenderer.on('evaluation-channel', (event, data) => callback(event,data)),
    onStartEncounterResponse: (callback) => ipcRenderer.on('start-encounter-channel', (event, data) => callback(event,data)),
    onResetResponse: (callback) => ipcRenderer.on('reset-channel', (event, data) => callback(event,data)),
    onLoginResponse: (callback) => ipcRenderer.on('login-response-channel', (event, data) => callback(event,data))  */
});
