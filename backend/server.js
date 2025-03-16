const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/attendanceDB"; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));

// Student Schema (Includes Register Number)
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  registerNumber: { type: String, required: true, unique: true },
  image: { type: String, required: true },
  faceEncoding: { type: Array, required: true }
});
const Student = mongoose.model("Student", studentSchema);

// Attendance Schema (Includes Register Number & Entry Timing)
const attendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  name: { type: String, required: true },
  registerNumber: { type: String, required: true },
  entryTime: { type: Date, default: Date.now }
});
const Attendance = mongoose.model("Attendance", attendanceSchema);

// ✅ FIXED: Add missing `/students` route
app.get("/students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    console.error("Error fetching students:", err);
    res.status(500).json({ error: err.message });
  }
});

// API to Register Student
app.post("/add-student", async (req, res) => {
  try {
    console.log("📥 Received request to add student:", req.body); // Debugging

    const { name, registerNumber, image, faceEncoding } = req.body;
    if (!name || !registerNumber || !image || !faceEncoding) {
      console.error("❌ Missing required fields:", req.body);
      return res.status(400).json({ error: "All fields are required" });
    }

    // Debugging: Check if registerNumber already exists
    const existingStudent = await Student.findOne({ registerNumber });
    if (existingStudent) {
      console.error("❌ Register number already exists:", registerNumber);
      return res.status(400).json({ error: "Register number already exists" });
    }

    const student = new Student({ name, registerNumber, image, faceEncoding });
    await student.save();

    console.log("✅ Student added successfully:", student);
    res.status(201).json({ message: "✅ Student added successfully", student });
  } catch (err) {
    console.error("❌ Error adding student:", err);
    res.status(500).json({ error: err.message });
  }
});


// API to Mark Attendance
app.post("/mark-attendance", async (req, res) => {
  try {
    console.log("Received request to mark attendance:", req.body);

    const { faceEncoding } = req.body;
    if (!faceEncoding) return res.status(400).json({ error: "Face encoding required" });

    const students = await Student.find();
    let recognizedStudent = null;

    for (let student of students) {
      const storedEncoding = student.faceEncoding;
      const distance = euclideanDistance(faceEncoding, storedEncoding);

      console.log(`Checking ${student.name}: Distance = ${distance}`);

      if (distance < 0.5) { // Face match threshold
        recognizedStudent = student;
        break;
      }
    }

    if (!recognizedStudent) {
      console.log("❌ No matching student found!");
      return res.status(404).json({ error: "No matching student found!" });
    }

    console.log(`✅ Attendance marked for ${recognizedStudent.name}, Register No: ${recognizedStudent.registerNumber}`);

    const attendance = new Attendance({
      studentId: recognizedStudent._id,
      name: recognizedStudent.name,
      registerNumber: recognizedStudent.registerNumber
    });

    await attendance.save();
    res.status(201).json({ message: `✅ Attendance marked for ${recognizedStudent.name}`, attendance });

  } catch (err) {
    console.error("❌ Error in marking attendance:", err);
    res.status(500).json({ error: err.message });
  }
});

// Function to calculate Euclidean Distance
const euclideanDistance = (arr1, arr2) => {
  return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0));
};

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
