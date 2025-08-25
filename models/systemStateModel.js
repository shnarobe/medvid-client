const mongoose = require("mongoose");
//create the room schema which will be a subdocument embedded in the main state object
const roomSubSchema = mongoose.Schema({
  name: { type: String },
  ip: { type: String, default: "1.1.1.1" },
  room_type: { type: String,default:"null" },
  state: {
    normal: { type: Boolean, default: false },
    exam: { type: Boolean, default: false },
    student_login: { type: Boolean, default: false },
    door_note: { type: Boolean, default: false },
    rubric: { type: Boolean, default: false },
    recording: { type: Boolean, default: false },
    transfer_recording: { type: Boolean, default: false },
    save_recording: { type: Boolean, default: false },
    last_ping: { type: Date },
    last_pong: { type: Date },
  },
  //configuration,
});
const systemStateSchema = mongoose.Schema({
  name: { type: String }, //name:String
  date: { type: Date, default: Date.now },
  rooms: [roomSubSchema],
});

module.exports = mongoose.model("systemState", systemStateSchema);
