const router = require('express').Router()
const validator = require("validator");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer')
const User = require('../model/UserModel');
const verifyToken = require('../verify/verifyToken');
const jwt = require('jsonwebtoken')
require('dotenv').config()

//signup route
router.post("/signup", async (req, res) => {
    try {
      const { name,email, password, otp } = req.body;
  
      const validEmail = await validator.isEmail(email);
      const UserExist = await User.findOne({ email: email });
  
      if (!name ||  !email || !password) {
        return res.send({ msg: "Fill The all Required Fields" });
      } else {
        if (!validEmail) {
          return res.send({ msg: "Please Enter Valid Email" });
        }
        if (!UserExist) {
          if (password.length < 8) {
            return res.send({ msg: "Password must be have 8 letters" });
          }
  
          const salt = Number(process.env.SALT);
  
          const HashedPassword = await bcrypt.hashSync(password, salt);
          var result;
       
          const user = {
            name,
            email,
            password: HashedPassword
          };
          if (!otp) {
            return res.send({ msg: "Please Enter Otp" });
          }
          if (GenerateOtp != otp) {
            return res.send({ msg: "Otp is wrong" });
          }
          await User.create(user);
  
          res.status(200).send({ msg: "user Created Successfully" });
        } else {
          res.send({ msg: "user already exists" });
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
  
  // Signup verifycation via Gmail
  
  router.put("/signup/verify", async (req, res) => {
    try {
      const email  = req.body.email;
   
      
      const validEmail = await validator.isEmail(email);
      if (!email) {
        return res.status(404).send({ msg: "enter email addresss" });
      }
      if (!validEmail) {
        return res.status(404).send({ msg: "please enter valid email" });
      }
  
      GenerateOtp = Math.floor(Math.random() * 1000000);
      let transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "akplmathan@gmail.com",
          pass: 'tghhabqgmtsrrnmo',
        },
      });
      let mailOptions = {
        from: '"AMAZON" <amazon.com>',
        to: email,
        subject: "email verification",
        text: "welcome to our Website",
        html: `<p>Your Otp is <h2>${GenerateOtp}</h2></p>`,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
      });
      res.status(200).send({ msg: "email send" });
      return GenerateOtp;
    } catch (error) {
      console.log(error);
    }
  });

// Route to add/update user address
router.put('/:userId/address', async (req, res) => {
  const { userId } = req.params;
  const { pincode, addressLine1, addressLine2, city, state, landmark } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ msg: "User not found" });
    }

    user.addresses = {
      pincode,
      addressLine1,
      addressLine2,
      city,
      state,
      landmark
    };

    await user.save();

    return res.status(201).json({ msg: "Address updated successfully", user });
  } catch (error) {
    return res.json({ msg: "Server error", error });
  }
});
  
  //login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const PSCheck = bcrypt.compareSync(password, user.password);
      if (PSCheck) {
        const token = jwt.sign({ id: user._id }, 'SECRETE');
        res.send({ token });
      } else {
        return res.send({ msg: "incorrect password" });
      }
    } else {
      return res.send({ msg: "User Doesn`t exist" });
    }
  } catch (error) {
    console.log(error);
  }
});

//find SingleUser
router.get("/find-user", verifyToken, async (req, res) => {
  try {
    const id = req.id;
    const response = await User.findById(id).populate({
      path: 'orderHistory',
      populate: {
        path: 'products.product',
        model: 'product',
      },
    })
    res.send(response);
  } catch (error) {
    console.log(error);
  }
});

//get all User
router.get('getAllUser',async(req,res)=>{
  try {
    const data = await User.find();
    res.send(data);
  } catch (error) {
    console.log(error)
  }
})


//phone number change  verification email

let GenerateOtp1;
router.put("/phone/verify", async (req, res) => {
  try {
    const email  = req.body.email;
 
    
    const validEmail = await validator.isEmail(email);
    if (!email) {
      return res.status(404).send({ msg: "enter email addresss" });
    }
    if (!validEmail) {
      return res.status(404).send({ msg: "please enter valid email" });
    }

    GenerateOtp1 = Math.floor(Math.random() * 1000000);
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "akplmathan@gmail.com",
        pass: 'tghhabqgmtsrrnmo',
      },
    });
    let mailOptions = {
      from: '"AMAZON" <amazon.com>',
      to: email,
      subject: "Verification for Change phone Number",
      text: "Dont Share your  OTP for Anyone",
      html: `<p>Your Otp is <h2>${GenerateOtp1}</h2></p>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: %s", info.messageId);
    });
    res.status(200).send({ msg: "email send" });
    return GenerateOtp1;
  } catch (error) {
    console.log(error);
  }
});
//update User Info
router.put('/user-edit',async(req,res)=>{
  try {
    const {name,phone,otp,email}  = req.body;
  
    
    const user =await User.findOne({email})
    if(phone){
      if(GenerateOtp1 != otp){
        
        return res.send({msg:'otp is wrong'})
      }
      else{
          user.phone = phone;
      }
    };
    user.name = name || user.name;
    await user.save();
    res.status(201).send({msg:'User Updated SuccessFully'})

  } catch (error) {
    console.log(error)
  }
})



// Change Password Route
router.put('/change-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.id);
    if (!user) return res.json({ msg: 'User not found' });

    // Check if the old password is correct
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.json({ msg: 'Incorrect old password' });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.status(201).json({ msg: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

  
// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: 'User not found' });

    // Generate OTP
    const otp = Math.floor(Math.random() * 1000000);

    // Store OTP in the user's record
    user.resetPasswordOtp = otp;
    await user.save();

    // Send OTP via email
    const message = `Your password reset OTP is: ${otp}`;
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "akplmathan@gmail.com",
        pass: 'tghhabqgmtsrrnmo',
      },
    });
    let mailOptions = {
      from: '"AMAZON" <amazon.com>',
      to: email,
      subject: "OTP For Password Reset",
      text: "",
      html: `<p>Your Otp is <h2>${otp}</h2></p>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: %s", info.messageId);
    });

    res.status(201).json({ msg: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Forgot Password Route 
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ msg: 'User not found' });

    // Check if OTP matches and is still valid
    if (user.resetPasswordOtp != otp ) {
      return res.json({ msg: 'Invalid or expired OTP' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear OTP fields
    user.resetPasswordOtp = undefined;
    await user.save();

    res.status(201).json({ msg: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
});

  module.exports = router;