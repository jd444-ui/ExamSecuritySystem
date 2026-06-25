/*const express =
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
router;*/
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

/*
  REGISTER RULE:
  - Student can register normally.
  - Admin can register only if correct ADMIN_SECRET_CODE is given.
*/
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, adminSecretCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    const requestedRole = role === "admin" ? "admin" : "student";

    if (requestedRole === "admin") {
      if (!process.env.ADMIN_SECRET_CODE) {
        return res.status(500).json({
          success: false,
          message: "Admin registration is not configured"
        });
      }

      if (adminSecretCode !== process.env.ADMIN_SECRET_CODE) {
        return res.status(403).json({
          success: false,
          message: "Invalid admin secret code"
        });
      }
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: requestedRole
    });

    return res.status(201).json({
      success: true,
      message:
        requestedRole === "admin"
          ? "Admin registered successfully"
          : "Student registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.log("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

/*
  LOGIN
*/
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

module.exports = router;