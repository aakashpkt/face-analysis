// Global declaration of audio context and analyser
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

// Load the models for face detection and other functionalities
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"), // Load TinyFaceDetector model
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"), // Load landmark detection model
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"), // Load face recognition model
  faceapi.nets.faceExpressionNet.loadFromUri("/models"), // Load expression detection model
])
  .then(startVideo)
  .catch((error) => console.error("Error loading models:", error)); // Handle loading errors

// Start the video stream
function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      const video = document.getElementById("video");
      video.srcObject = stream;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyzeAudio();
      video.onloadedmetadata = () => {
        const canvas = faceapi.createCanvasFromMedia(video);
        document.body.append(canvas);
        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight,
        };
        faceapi.matchDimensions(canvas, displaySize);

        let emotionLog = [];

        setInterval(async () => {
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );
          canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

          // Update the emotion display in real-time
          if (detections.length > 0) {
            const emotions = detections[0].expressions;
            const maxEmotion = Object.keys(emotions).reduce((a, b) =>
              emotions[a] > emotions[b] ? a : b
            );
            document.getElementById(
              "emotion"
            ).textContent = `Emotion: ${maxEmotion}`;
          } else {
            document.getElementById("emotion").textContent =
              "Emotion: No face detected";
          }
        }, 100); // Update every 100 milliseconds
      };
    })
    .catch((error) => {
      console.error("Error accessing webcam and microphone:", error);
    });
}

function analyzeAudio() {
  analyser.getByteTimeDomainData(dataArray);
  const volume =
    dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

  console.log("Volume:", volume);

  // Continue analyzing
  requestAnimationFrame(analyzeAudio);
}

function calculateVolume() {
  analyser.getByteTimeDomainData(dataArray);
  return dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
}
