import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";
import "./styles.css"; // Import the CSS file

function App() {
  const videoRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [students, setStudents] = useState([]);
  const [recognizedStudent, setRecognizedStudent] = useState(null);
  const [showPopup, setShowPopup] = useState(false); // State for animation
  const [name, setName] = useState(""); 
  const [registerNumber, setRegisterNumber] = useState(""); 
  const [image, setImage] = useState("");

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      setModelsLoaded(true);
    };
    loadModels();

    axios.get("http://localhost:5000/students")
      .then(response => setStudents(response.data))
      .catch(error => console.error("Error fetching students:", error));
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: {} }).then((stream) => {
      videoRef.current.srcObject = stream;
    });
  };

  const registerStudent = async () => {
    if (!name || !registerNumber || !image) {
      alert("Please fill all fields.");
      return;
    }

    const detections = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptor();

    if (!detections) {
      alert("No face detected! Please try again.");
      return;
    }

    const faceEncoding = Array.from(detections.descriptor);

    axios.post("http://localhost:5000/add-student", { name, registerNumber, image, faceEncoding })
      .then(() => {
        setStudents([...students, { name, registerNumber, image }]);
        setName("");
        setRegisterNumber("");
        setImage("");
      })
      .catch(error => console.error("Error adding student:", error));
  };

  const captureFace = async () => {
    const detections = await faceapi.detectSingleFace(
      videoRef.current,
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptor();

    if (!detections) return;

    const faceEncoding = Array.from(detections.descriptor);

    axios.post("http://localhost:5000/mark-attendance", { faceEncoding })
      .then(response => {
        setRecognizedStudent(response.data.attendance);
        setShowPopup(true); // Show the popup when attendance is marked

        // Hide popup after 3 seconds
        setTimeout(() => {
          setShowPopup(false);
        }, 3000);
      })
      .catch(err => {
        console.error(err);
        setRecognizedStudent(null);
      });
  };

  return (
    <div className="container">
      <h1>Face Recognition Attendance</h1>

      {/* Registration Form */}
      <input 
        type="text" 
        placeholder="Enter Name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
      />
      <input 
        type="text" 
        placeholder="Enter Register Number" 
        value={registerNumber} 
        onChange={(e) => setRegisterNumber(e.target.value)} 
      />
      <input 
        type="text" 
        placeholder="Enter Image URL" 
        value={image} 
        onChange={(e) => setImage(e.target.value)} 
      />
      <button onClick={registerStudent}>Register Student</button>

      {/* Video & Face Detection */}
      {modelsLoaded ? (
        <>
          <video ref={videoRef} autoPlay muted onPlay={captureFace} />
          <button onClick={startVideo}>Start Camera</button>

          {/* Animated Pop-up */}
          {showPopup && recognizedStudent && (
            <div className="popup">
              <p>🎓 <b>{recognizedStudent.name}</b></p>
              <p>📖 Register No: {recognizedStudent.registerNumber}</p>
              <p>✅ Attendance Marked</p>
            </div>
          )}
        </>
      ) : (
        <p>Loading models...</p>
      )}
    </div>
  );
}

export default App;
