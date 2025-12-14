const express = require('express')
const app = express()
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())


const uri = "mongodb+srv://blood-bank:ZLRYM7yQEbFkLwaa@cluster0.enlhfah.mongodb.net/?appName=Cluster0";

// blood-bank
// ZLRYM7yQEbFkLwaa

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const db = client.db("blood_bank");
    const usersCollection = db.collection("users");

    app.post('/users', async(req, res) => {
        const userInfo = req.body 
        userInfo.createdAt = new Date()
        userInfo.role = userInfo.role || 'donor'
        const result = await usersCollection.insertOne(userInfo)
        res.send(result)
    })



    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from server!')
})

app.listen(port, () => {
  console.log(`Server is runnig on port ${port}`)
})
