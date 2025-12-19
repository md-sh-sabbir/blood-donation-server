const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://blood-bank:ZLRYM7yQEbFkLwaa@cluster0.enlhfah.mongodb.net/?appName=Cluster0";

// blood-bank
// ZLRYM7yQEbFkLwaa

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("blood_bank");
    const usersCollection = db.collection("users");
    const bloodRequestsCollection = db.collection("donation_requests");
    const paymentsCollection = db.collection("payments");

    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      userInfo.createdAt = new Date();
      userInfo.role = userInfo.role || "donor";
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.get("/user/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const result = await usersCollection.findOne(query);
      res.send({ role: result?.role });
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    app.patch("/update/user/status", async (req, res) => {
      const { email, status } = req.query;
      const query = { email: email };

      const updateStatus = {
        $set: {
          status: status,
        },
      };

      const result = await usersCollection.updateOne(query, updateStatus);

      res.send(result);
    });

    app.post("/add-request", async (req, res) => {
      const data = req.body;
      data.createdAt = new Date();
      const result = await bloodRequestsCollection.insertOne(data);
      res.send(result);
    });

    app.get("/search-requests", async (req, res) => {
      const { bloodGroup, district, upazila } = req.query;

      const query = {};
      if (!query) {
        return;
      }
      if (bloodGroup) {
        const fixed = bloodGroup.replace(/ /g, "+").trim();
        query.bloodGroup = fixed;
      }
      if (district) {
        query.recipientDistrict = district;
      }
      if (upazila) {
        query.recipientUpazila = upazila;
      }

      const result = await bloodRequestsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/all-donation-requests", async (req, res) => {
      const cursor = bloodRequestsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/donation-requests/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donationStatus: "inprogress",
        },
      };

      const result = await bloodRequestsCollection.updateOne(query, update);
      res.send(result);
    });

    app.get("/my-donation-requests/:email", async (req, res) => {
      const email = req.params.email;
      const size = Number(req.query.size);
      const page = Number(req.query.page);

      const query = {};

      if (email) {
        query.requesterEmail = email;
      }
      const result = await bloodRequestsCollection
        .find(query)
        .limit(size)
        .skip(size * page)
        .toArray();

      const totalRequest = await bloodRequestsCollection.countDocuments(query);

      res.send({ request: result, totalRequest });
    });

    app.get("/admin-all-donation-requests", async (req, res) => {
      const size = Number(req.query.size);
      const page = Number(req.query.page);

      const result = await bloodRequestsCollection
        .find()
        .limit(size)
        .skip(size * page)
        .toArray();

      const totalRequest = await bloodRequestsCollection.countDocuments();
      res.send({ request: result, totalRequest });
    });

    app.patch("/update-status", async (req, res) => {
      const { id, donationStatus } = req.body;

      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          donationStatus,
        },
      };

      const result = await bloodRequestsCollection.updateOne(query, update);

      res.send(result);
    });

    app.get("/featured-requests", async (req, res) => {
      const result = await bloodRequestsCollection
        .find()
        .limit(3)
        .sort({ donationDate: -1, donationTime: -1 })
        .toArray();
      res.send(result);
    });

    app.post("/create-payment-checkout", async (req, res) => {
      const information = req.body;
      const amount = parseInt(information.donateAmount) * 100;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: "Please Donate",
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          donorName: information?.donorName,
        },
        customer_email: information?.donorEmail,
        success_url: `${process.env.SITE_DOMAIN}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/payment-cancelled`,
      });

      res.send({ url: session.url });
    });

    app.post("/payment-success", async (req, res) => {
      const { session_id } = req.query;
      const session = await stripe.checkout.sessions.retrieve(session_id);
      console.log(session);

      const transactionId = session.payment_intent;

      const isPaymentExist = await paymentsCollection.findOne({transactionId})

      if(isPaymentExist){
        return
      }

      if(session.payment_status == 'paid'){
        const paymentInfo = {
          amount: session.amount_total/100,
          currency: session.currency,
          donorEmail: session.customer_email,
          transactionId,
          payment_status: session.payment_status,
          paidAt: new Date()
        }

        const result = await paymentsCollection.insertOne(paymentInfo)
        return res.send(result)
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
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
  res.send("Hello from server!");
});

app.listen(port, () => {
  console.log(`Server is runnig on port ${port}`);
});
