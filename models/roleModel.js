const mongoose = require('mongoose');

const roleSchema=mongoose.Schema({
    name:{
        type:String,
        require:true,
        unique:true
    },
});


module.exports=mongoose.model("Role",roleSchema);