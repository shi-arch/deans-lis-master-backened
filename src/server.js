// index.js (or your main server file)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const jobRoutes = require("./routes/jobsRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const savedTalent = require("./routes/savedTalent");
const proposalRoutes = require("./routes/proposalRoutes");
const messageRoutes = require("./routes/messageRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const path = require('path');
const http = require("http");
const { Server } = require("socket.io");
const { getReceiverSocketId, setupSocket } = require("./socket/socket");

dotenv.config();
// const env = 'development';
// dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });

//console.log(`Running in ${env} mode>>>>>>>>>>>>>`);
console.log(`Mongo URIkkkkkkkkkkkkkkkkkkk: ${process.env.MONGO_URI}`);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://your-reactjs-app.com"], // Update with your React Native app origin if needed
    methods: ["GET", "POST"],
  },
});

// Initialize Socket.IO for real-time messaging
setupSocket(io);



app.use('/stories', express.static('public/stories'));
// app.use('/uploads', express.static(path.join(__dirname, 'docker ')));
app.use('/uploads', express.static('public/uploads'));

const fs = require('fs');

app.get('/stories/:filename', (req, res) => {
  const file = path.join(__dirname, 'public/stories', req.params.filename);
  const ext = path.extname(file).toLowerCase();

  if (!fs.existsSync(file)) {
    return res.status(404).send('File not found');
  }

  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.sendFile(file);
});


app.use(cors());

app.use(express.json());
 
// API Status Endpoint
app.get("/api/status", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "API is running",
    mongodb: dbStatus,
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/sellers", sellerRoutes);  //THis should be above the express.json
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/payments", paymentRoutes);



mongoose
  //.connect('mongodb://mongo:27017/signup_db', {
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));