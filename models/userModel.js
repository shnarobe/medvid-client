const mongoose = require("mongoose");
const roles = require("./roleModel");

//this schema will allow the reading and writing from the database
const userSchema = mongoose.Schema({
  firstName: { type: String, require: true },
  lastName: { type: String, require: true },
  email: { type: String, require: true },
  username: { type: String, require: true, min: 1 },
  password: { type: String, require: true, min: 6 },
  role: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref:"Role"
    }
  ],
  token: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("medusers", userSchema);