const express = require('express');
const cors = require("cors")
const app = express();
const port = 4000;
const connectDB = require('./config/db')
const userRoute = require('./routes/userRoutes')
const productRoute = require('./routes/productRoute')


connectDB()
app.use(express.json())
app.use(cors())
app.use('/user',userRoute)
app.use('/product',productRoute)
app.listen(port,()=>{
    console.log("server is Running")
})