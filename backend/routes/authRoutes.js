const express =
require("express");

const bcrypt =
require("bcryptjs");

const jwt =
require("jsonwebtoken");

const User =
require("../models/User");

const router =
express.Router();

router.post(
"/register",
async(req,res)=>{

try{

const {
name,
email,
password,
role
}
=
req.body;

let user =
await User.findOne({
email
});

if(user){

return res.status(400)
.json({
msg:"User Exists"
});
}

const salt =
await bcrypt.genSalt(10);

const hashed =
await bcrypt.hash(
password,
salt
);

user =
new User({

name,
email,
password:hashed,
role

});

await user.save();

res.json({
msg:"Registered"
});

}catch(err){

res.status(500)
.json(err);

}

});

router.post(
"/login",
async(req,res)=>{

try{

const {
email,
password
}
=
req.body;

const user =
await User.findOne({
email
});

if(!user){

return res.status(400)
.json({
msg:"User Not Found"
});
}

const match =
await bcrypt.compare(
password,
user.password
);

if(!match){

return res.status(400)
.json({
msg:"Wrong Password"
});
}

const payload = {

user:{

id:user.id,

role:user.role

}

};

jwt.sign(

payload,

process.env.JWT_SECRET,

{
expiresIn:"1d"
},

(err,token)=>{

res.json({

token,

role:
user.role

});

}

);

}catch(err){

res.status(500)
.json(err);

}

});

module.exports =
router;