const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const { MongoClient, ServerApiVersion, ObjectId, Object } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://insight-b9-a11.web.app",
      "https://insight-b9-a11.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const logger = async (req, res, next) => {
  // console.log('called:', req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log('value of token in middleware', token);
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized" });
    }
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
  // next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ruowzmj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production"? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("inSightDB").collection("users");
    const blogCollection = client.db("inSightDB").collection("blogs");
    const wishlistCollection = client.db("inSightDB").collection("wishlist");
    const commentCollection = client.db("inSightDB").collection("comments");

    // auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, cookieOptions )
        .send({ success: true });
    });

    app.get("/blogs", logger, async (req, res) => {
      console.log("check: ", req.cookies.token);
      const cursor = blogCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/users", logger, async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/wishlist", logger, verifyToken, async (req, res) => {
      const cursor = wishlistCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/blogs/:id", logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    app.post("/blogs", async (req, res) => {
      const newBlogs = req.body;
      console.log(newBlogs);
      const result = await blogCollection.insertOne(newBlogs);
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const wishedBlogs = req.body;
      const result = await wishlistCollection.insertOne(wishedBlogs);
      res.send(result);
    });

    app.get("/myWishlist", logger, async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/myWishlist/:id", logger, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    });

    app.delete("/myWishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/comments", async (req, res) => {
      const newComment = req.body;
      console.log(newComment);
      const result = await commentCollection.insertOne(newComment);
      res.send(result);
    });
    app.get("/comments", logger, async (req, res) => {
      const cursor = commentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/comment", logger, async (req, res) => {
      let query = {};
      if (req.query?.id) {
        query = { id: req.query.id };
      }
      const result = await commentCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/blogs/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedBlog = req.body;
      const blog = {
        $set: {
          title: updatedBlog.title,
          imageURL: updatedBlog.imageURL,
          category: updatedBlog.category,
          name: updatedBlog.name,
          email: updatedBlog.email,
          shortDescription: updatedBlog.shortDescription,
          longDescription: updatedBlog.longDescription,
          currentTime: updatedBlog.currentTime,
        },
      };
      const result = await blogCollection.updateOne(filter, blog, options);
      res.send(result);
    });

    // user related APIs

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
  res.send("inSight server is running");
});

app.listen(port, () => {
  console.log(`inSight is running on ${port}`);
});
