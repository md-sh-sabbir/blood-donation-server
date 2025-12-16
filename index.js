const express = require('express')
const app = express()
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const bloodRequestsCollection = db.collection('donation_requests')

    app.post('/users', async(req, res) => {
        const userInfo = req.body 
        userInfo.createdAt = new Date()
        userInfo.role = userInfo.role || 'donor'
        const result = await usersCollection.insertOne(userInfo)
        res.send(result)
    })

    app.get('/user/:email', async(req, res) => {
        const email = req.params.email
        const query={}
        if(email){
            query.email = email
        }

        const result = await usersCollection.findOne(query)
        res.send(result)
    })


    app.get("/user/role/:email", async(req, res) => {
        const email = req.params.email 
        const query = {}
        if(email){
            query.email = email
        }

        const result = await usersCollection.findOne(query)
        res.send({role: result?.role})
    })

    app.post('/add-request', async(req, res) => {
        const data = req.body
        data.createdAt = new Date() 
        const result = await bloodRequestsCollection.insertOne(data)
        res.send(result)

    })

    app.get('/all-donation-requests', async(req, res) => {
      const cursor = bloodRequestsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })


    app.patch('/donation-requests/:id', async(req, res) => {
      const id = req.params.id

      const query = {_id: new ObjectId(id)}
      const update = {
        $set: {
          donationStatus: "inprogress",
        },
      };

      const result = await bloodRequestsCollection.updateOne(query, update)
      res.send(result)
    })

    app.get('/my-donation-requests/:email', async(req, res) => {
      const email = req.params.email 
      const size = Number(req.query.size)
      const page = Number(req.query.page)

      const query = {}
      
      if(email){
        query.requesterEmail = email
      }
      const result = await bloodRequestsCollection
      .find(query)
      .limit(size)
      .skip(size*page)
      .toArray()

      const totalRequest = await bloodRequestsCollection.countDocuments(query)

      res.send({request: result, totalRequest})
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
