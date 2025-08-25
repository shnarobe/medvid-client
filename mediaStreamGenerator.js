//1.get the video stream from the canvas
//2.get the audio stream from the web Audio API library
//3.add the audio track to the canvas stream captured
//4. add combined mediastream to video element
//5.use webrtc from there
mediaStream = new MediaStream();
const canvas = document.querySelector("canvas");

const canvasStream = canvas.captureStream(30);
console.log("Stream found: ", canvasStream);
var audioContext = player.audioOut.context; //player.audioOut.context;
console.log("audio context", audioContext, "player", player);
//create destination stream
var dest = audioContext.createMediaStreamDestination();
const aStream = dest.stream;
console.log("audio stream?", aStream);
//create a source audio stream
//var sourceNode = audioContext.createMediaElementSource(vid); //player.audioOut.context.destination.connect(dest)
//connect source to destination
//sourceNode.connect(dest);
//vid.play();
//try using the output audio as a chain that then connects the destination stream to it
player.audioOut.destination.connect(dest);
canvasStream.addTrack(aStream.getAudioTracks()[0]);
document.querySelector("video#localVideo").srcObject = canvasStream;
player.options.pauseWhenHidden = false;
//construct client name
const funct = () => {
  let ip_and_port = window.location.host;
  end_index = ip_and_port.indexOf(":");
  ip_address = ip_and_port.substring(0, end_index);
  nom = ip_address + "_" + "57" + "_" + "node";
  console.log("constructed name: ", nom);
  return nom;
};
