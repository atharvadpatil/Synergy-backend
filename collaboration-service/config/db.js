const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Collaboration Service: MongoDB connected successfully!")
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1); // Exit the app on failure
  }
};

module.exports = connectDB;