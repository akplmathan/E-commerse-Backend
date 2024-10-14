const express = require("express");
const Product = require("../model/ProductModel");
const router = express.Router();
const upload = require("../utill/multer");
const cloudinary = require("../utill/cloudinary");
const User = require("../model/UserModel");
const nodemailer = require("nodemailer");
const Order = require("../model/OrderModel");
const Category = require("../model/CategoryModel");
const Razorpay = require('razorpay')
const crypto = require('crypto')
require('dotenv').config()

const razorpay = new Razorpay({
  key_id: 'rzp_test_MWZ7f2Pizd7gl9',
  key_secret:'CwwgjHlCRCT2nrkaSWUjdTtx',
});

// Route to add a product
router.post("/add-product", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category, brand, stock, orgPrice } =
      req.body;

    if (!name || !description || !price || !category || !brand || !stock) {
      return res.send({ msg: "Fill the All Required Fields" });
    }

    if (req.file) {
      result = await cloudinary.uploader.upload(req.file.path);
    }

    const newProduct = new Product({
      name,
      description,
      price,
      category,
      brand,
      orgPrice,
      stock,
      images: result?.secure_url,
      cloudinary_id: result ? result.public_id : "",
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error);
  }
});

// Update Product
router.put("/update-product/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, brand, stock, orgPrice } =
      req.body;

    // Find the product by ID
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found!" });
    }

    // If a new image is uploaded, delete the old one and upload the new image to Cloudinary
    if (req.file) {
      // Delete the old image from Cloudinary
      if (product.cloudinary_id) {
        await cloudinary.uploader.destroy(product.cloudinary_id);
      }

      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);

      // Update the product with the new image URL and Cloudinary ID
      product.images = result.secure_url;
      product.cloudinary_id = result.public_id;
    }

    // Update the other product details only if provided, otherwise keep existing values
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    (product.orgPrice = orgPrice || product.orgPrice),
      (product.category = category || product.category);
    product.brand = brand || product.brand;
    product.stock = stock || product.stock;

    // Save the updated product
    await product.save();

    res.status(201).json({ msg: "Product updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error(error);
  }
});

// Delete Product
router.delete("/delete-product/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the product by ID
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found!" });
    }

    // Delete the image from Cloudinary if it exists
    if (product.cloudinary_id) {
      await cloudinary.uploader.destroy(product.cloudinary_id);
    }

    // Delete the product from the database
    await product.remove();

    res.status(200).json({ message: "Product deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.error(error);
  }
});

router.get("/GetAllProducts", async (req, res) => {
  try {
    const data = await Product.find();
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

router.get("/getSingleProduct/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const data = await Product.findById(id);
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

// Add to cart route
router.post("/add-to-cart", async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.json({ msg: "User not found" });
    }

    let product = await Product.findById(productId);
    if (!product) {
      return res.json({ msg: "Product not found" });
    }

    const cartItemIndex = user.cart.findIndex((item) =>
      item.product.equals(productId)
    );

    if (cartItemIndex > -1) {
      // Product already in cart, update the quantity
      user.cart[cartItemIndex].quantity += quantity;
    } else {
      user.cart.push({
        product: productId,
        quantity: quantity,
      });
    }

    await user.save();

    return res
      .status(201)
      .json({ msg: "Product added to cart successfully", cart: user.cart });
  } catch (error) {
    console.error(error);
    return res.json({ msg: "Server error", error });
  }
});

router.post("/remove-from-cart", async (req, res) => {
  const { userId, productId } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.json({ msg: "User not found" });
    }

    const cartItemIndex = user.cart.findIndex((item) =>
      item.product.equals(productId)
    );

    if (cartItemIndex > -1) {
      // Remove the item from the cart
      user.cart.splice(cartItemIndex, 1);
      await user.save();

      return res.status(201).json({
        msg: "Product removed from cart successfully",
        cart: user.cart,
      });
    } else {
      return res.json({ msg: "Product not found in cart" });
    }
  } catch (error) {
    console.error(error);
    return res.json({ msg: "Server error", error });
  }
});

//get cart products
router.get("/cart/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    let user = await User.findById(userId).populate("cart.product");

    return res.status(200).json({ cart: user.cart });
  } catch (error) {
    return res.json({ msg: "Server error", error });
  }
});

// Cancel Order Route
router.patch("/cancel/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.json({ success: false, msg: "Order not found" });
    }

    if (order.orderStatus === "Processing") {
      order.orderStatus = "Cancelled";
      await order.save();

      order.products.map(async(item,i)=>{
          const product = await Product.findById(item.product);

          product.stock += item.quantity
          product.sellCount -= item.quantity 

          await product.save()
 
      })


      return res
        .status(201)
        .json({ success: true, msg: "Order cancelled successfully" });
    } else {
      return res.json({ success: false, msg: "Order cannot be cancelled" });
    }
  } catch (error) {
    return res.json({ success: false, msg: "Internal server error" });
  }
});

// Function to generate a random 6-digit bill number
const generateOrderID = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Route to create an order for makePayment
router.post("/makePayment", async (req, res) => {
  const { amount } = req.body;

  const options = {
    amount: amount * 100, // Amount in smallest currency unit (paise for INR)
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    
    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// Route to verify payment
router.post("/verify", (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  const shasum = crypto.createHmac("sha256", process.env.KEY_SECRET);
  shasum.update(`${order_id}|${payment_id}`);
  const digest = shasum.digest("hex");

  if (digest === signature) {
    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Invalid signature",
    });
  }
});

//order Product
router.post("/order", async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, shippingAddress, userID } =
      req.body;

    if (!["upi", "Cash on Delivery"].includes(paymentMethod)) {
      return res.json({ msg: "Invalid payment method." });
    }

    const user = await User.findById(userID);
    if(paymentMethod== 'upi'){
      var paymentStatus  = 'Completed'
    }
    // Generate a unique bill number
    let orderID;
    let isUnique = false;
    while (!isUnique) {
      orderID = generateOrderID();
      const existingBill = await Order.findOne({ orderID });
      if (!existingBill) {
        isUnique = true;
      }
    }
    // Create new order
    const newOrder = new Order({
      user: userID,
      orderID,
      products,
      totalAmount,
      paymentMethod,
      shippingAddress,
      paymentStatus
    });

    const savedOrder = await newOrder.save();

    if (savedOrder) {
      products.map(async (item, i) => {
        const product = await Product.findById(item.product);

        product.stock -= item.quantity;
        product.sellCount += item.quantity;
        await product.save();
      });
    }

    user.orderHistory.push(savedOrder._id);
    user.save();
    res.status(201).send({ msg: "Order placed SuccessFully", orderID });
  } catch (error) {
    console.log(error);
    res.json({ msg: "Order placement failed.", error });
  }
});

//confirm order Otp
router.post("/send-otp", async (req, res) => {
  try {
    const email = req.body.email;

    GenerateOtp = Math.floor(Math.random() * 1000000);
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "akplmathan@gmail.com",
        pass: "tghhabqgmtsrrnmo",
      },
    });
    let mailOptions = {
      from: '"AMAZON" <amazon.com>',
      to: email,
      subject: "Order Confirmation",
      text: "Order Confirmation",
      html: `<p>Your Otp is <h2>${GenerateOtp}</h2></p>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: %s", info.messageId);
    });
    res.status(201).send({ msg: "email send", otp: GenerateOtp });
  } catch (error) {
    console.log(error);
  }
});

// Update order status route
router.put("/orders/:id", async (req, res) => {
  const { orderStatus, deliveryDate } = req.body;

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, deliveryDate },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(201).json({ msg: "Status Updated Successfully", updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Get all orders (with filters and sorting)
router.get("/orders", async (req, res) => {
  const orders = await Order.find()
    .populate("products.product")
    .populate("user");
  res.json(orders);
});

//Category Register
router.post("/category/register", upload.single("image"), async (req, res) => {
  try {
    const name = req.body.name;
    if (!name) {
      return res.send({ msg: "Please Enter Name" });
    }
    if (!req.file) {
      return res.send({ msg: "Please Select The Image" });
    }
    if (req.file) {
      result = await cloudinary.uploader.upload(req.file.path);
    }

    const newCategory = new Category({
      name,
      image: result.secure_url,
      cloudinary_id: result ? result.public_id : "",
    });

    const savedCategory = await newCategory.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.log(error);
  }
});

//category update
router.put("/category/update/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body.name;

    const category = await Category.findById(id);

    if (!category) {
      return res.send({ msg: "Category Not Found" });
    }

    // If a new image is uploaded, delete the old one and upload the new image to Cloudinary
    if (req.file) {
      // Delete the old image from Cloudinary
      if (category.cloudinary_id) {
        await cloudinary.uploader.destroy(category.cloudinary_id);
      }

      // Upload new image to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path);

      // Update the product with the new image URL and Cloudinary ID
      category.image = result.secure_url;
      category.cloudinary_id = result.public_id;
    }
    category.name = name || category.name;

    await category.save();
    res.status(201).send({ msg: "Updated SuccessFully" });
  } catch (error) {
    console.log(error);
  }
});

//category Delete
router.delete("/category/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await Category.findByIdAndDelete(id);

    res.status(201).send({ msg: "Category Deleted SuccessFully" });
  } catch (error) {
    console.log(error);
  }
});

//get Category
router.get("/category", async (req, res) => {
  try {
    const result = await Category.find();
    res.send({ category: result });
  } catch (error) {
    console.log(error);
  }
});

//use Aggregation method
router.get("/details", async (req, res) => {
  try {
    const order = Order.aggregate([]);
    const product = Product.aggregate([
      {
        $match: {
          stock: { $lt: 10 }, // Filters products with stock less than 10
        },
      },
      {
        $group: {
          _id: null,
          countLowStock: { $sum: 1 }, // Counts the number of products with stock < 10
        },
      },
    ]);
    const user = User.aggregate([]);

    res.status(200).json({ product: product[0], order, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
