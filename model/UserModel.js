const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
    },
    addresses: 
      {
        pincode: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        landmark: String,
      }
    ,
    cart: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
        },
        quantity: {
          type: Number,
          required: true,
          default: 1
        }
      }
    ],
    orderHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order',
      }
    ],
    resetPasswordOtp:{
      type:Number
    }
  },
 
  { timestamps: true }
);

const User = mongoose.model('user', UserSchema);
module.exports = User;
