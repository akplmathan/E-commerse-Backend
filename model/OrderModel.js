const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    deliveryDate: { type: Date },
    orderID:{
      type:Number,
      required:true
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      }
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'Cash on Delivery'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending',
    },
    shippingAddress: {
      pincode: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      landmark: { type: String },
    },
    orderStatus: {
      type: String,
      enum: ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Processing',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    deliveredDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model('order', OrderSchema);
module.exports = Order;
