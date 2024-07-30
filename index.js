const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin:['http://localhost:5173','http://localhost:5174'],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_Password}@cluster0.9k9az0h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const logger = (req,res,next)=>{
  console.log('called',req.host,req.originalUrl)
  next()
} 

const verifyToken= async(req,res,next)=>{
  const token = req.cookies?.token;
  console.log('value of token',token)
  if(!token){
    return res.status(401).send({message:'not authorized'})
  }
  
  jwt.verify(token,process.env.Access_Token,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'Wrong Token'})
    }
    console.log('value of decoded',decoded)
    req.user = decoded.data
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

// Auth Related Api

// app.post("/jwt",async(req,res)=>{
//   const user = req.body;
//   const token =jwt.sign({
//     data:user,
//   },process.env.Access_Token,{expiresIn:'1h'})
//   res
//   .cookie('token',token,{httpOnly:true,secure:false,sameSite:'none'})
//   .send({success:true})

// })
 
app.post('/jwt',logger,async(req,res)=>{
  const user = req.body;
  const token =jwt.sign({
    data:user
  },process.env.Access_Token,{expiresIn:'1h'})
  res
  .cookie('token',token,{httpOnly:true,secure:false})
  .send({success:true})
})

    // Services Related Api
    const serviceCollection = client.db("car-doctor").collection("services");
    const orderCollection = client.db("car-doctor").collection("order");

    app.get("/services",logger, async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    });

    //  Post api
    // Booking order Api
    app.post("/order",logger, async (req, res) => {
      const orderData = req.body;
      const result = await orderCollection.insertOne(orderData);
      res.send(result);
    });

    // Get Api

    app.get("/order",verifyToken, async (req, res) => {
      console.log("tttt",req.cookies?.token)
      const queryEmail=req.query?.email;
      const userEmail = req.user.email;
      console.log("user in the Query",queryEmail)
      console.log("user in the user",userEmail)
      if(queryEmail !== userEmail){
        return res.status(403).send({message:'Email not matched'})
      }
      let query = {};
      if (queryEmail) {
        query = { email:queryEmail };
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    // All Order Api
    app.get("/order", async (req, res) => {
      const cursor = orderCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.delete("/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Car doctor server is running");
});

app.listen(port, () =>
  console.log(`Car doctor server running on port: ${port}`)
);
