const express=require("express");
const router=express.Router();

router.post("/camdetails",async(req,res)=>{
    console.log("cameras: ",JSON.parse(req.body.camera1),JSON.parse(req.body.camera2));
    res.send(JSON.stringify({message:"success",camera1:req.body.camera1,camera2:req.body.camera2}));
});

router.get("/test",(req,res)=>{
	res.send(JSON.stringify({message:"success"}));
});

module.exports=router;