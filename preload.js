const {contextBridge,ipcRenderer} = require('electron');
const { on } = require('ws');

//expose the API global to the renderer
contextBridge.exposeInMainWorld('API', {
   //invoke calls the channel defined in main to take the data from the renderer and handle it
   //renderer to main
    send_to_main:(data) => ipcRenderer.invoke('get_data_from_renderer_process', data),
    //main to renderer
    onReceiveData: (callback) => ipcRenderer.on('data-channel', (event, data) => callback(event,data)),
    onLoginInitiatedResponse: (callback) => ipcRenderer.on('login-initiated-channel', (event, data) => callback(event,data)),
    onDoorNoteResponse: (callback) => ipcRenderer.on('door-note-channel', (event, data) => callback(event,data)),
    onHonourCodeResponse: (callback) => ipcRenderer.on('honour-code-channel', (event, data) => callback(event,data)),
    onEvaluationResponse: (callback) => ipcRenderer.on('evaluation-channel', (event, data) => callback(event,data)),
    onStartEncounterResponse: (callback) => ipcRenderer.on('start-encounter-channel', (event, data) => callback(event,data)),
    onResetResponse: (callback) => ipcRenderer.on('reset-channel', (event, data) => callback(event,data)),
    onLoginResponse: (callback) => ipcRenderer.on('login-response-channel', (event, data) => callback(event,data))
});
