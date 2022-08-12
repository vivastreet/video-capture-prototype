// const FaceDetect =
(() => {
  const video = document.querySelector('video');
  const record = document.querySelector('.record');
  const capturedImage = document.querySelector('#captured-image');
  const capturedMovieSrc = document.querySelector('#captured-movie-source');
  const videoOverlay = document.getElementById('video-overlay');
  const overlay = document.getElementById('overlay');
  const spinner = document.querySelector('.spinner')
  let recording = document.getElementById("recording");
  let flash = document.querySelector("#flash");
  let downloadButton = document.getElementById("downloadButton");
  let logElement = document.getElementById("log");
  let recordingTimeMS = 10000;
  let canvas;

  const constraints = {
    audio: false,
    video: {
      width: 1280,
      height: 720
    }
  };

  const getUserMedia = (stop) => {
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        const videoTracks = stream.getTracks();
        console.log('Got stream with constraints:', constraints);
        console.log(`Using video device: ${videoTracks[0].label}`);
        stream.onremovetrack = () => {
          console.log('Stream ended');
        };
        if (stop) {
          const [track] = videoTracks;
          track.stop();
          stream.removeTrack(videoTracks[0]);
          stream = null;
        }
      }).catch((error) => {
      if (error.name === 'ConstraintNotSatisfiedError') {
        console.error(
          `The resolution ${constraints.video.width.exact}x${constraints.video.height.exact} px is not supported by your device.`
        );
      } else if (error.name === 'PermissionDeniedError') {
        console.error(
          'Permissions have not been granted to use your camera and ' +
          'microphone, you need to allow the page access to your devices in ' +
          'order for the demo to work.'
        );
      } else {
        console.error(`getUserMedia error: ${error.name}`, error);
      }
    });
  };

  const initialise = () => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]).then(startVideo);
  };

  const startVideo = () => {
    videoOverlay.style.background = 'transparent';
    overlay.style.display = 'flex';
    hideShowElements(false);
    getUserMedia(false);
  };

  const stopVideo = () => {
    hideShowElements(true);
    clearCanvas();
    getUserMedia(true);
  };

  const captureImage = () => {
    doFlash();
    console.log('still image captured');
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    capturedImage.src = canvas.toDataURL('image/png');
    let imagePayload = {image: capturedImage.src};
    stopVideo();
  };

  const clearCanvas = () => {
    let canvases = document.getElementsByTagName('canvas');
    for (let i = canvases.length - 1; i >= 0; i -= 1) {
      canvases[i].parentNode.removeChild(canvases[i]);
    }
  };

  const hideShowElements = (val) => {
    let hide = !val ? 'flex' : 'none';
    let show = val ? 'flex' : 'none';
    record.style.display = show;
    overlay.style.display = hide;
  };

  const doFlash = () => {
    flash.className = 'flash-on';
    let millisecondsToWait = 100;
    setTimeout(function () {
      flash.className = 'flash-off';
    }, millisecondsToWait);
  };

  const blobToBase64 = blob => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise(resolve => {
      reader.onloadend = () => {
        resolve(reader.result);
      };
    });
  };

  const startRecording = (stream, lengthInMS) => {
    let recorder = new MediaRecorder(stream);
    let data = [];

    recorder.ondataavailable = (event) => data.push(event.data);
    recorder.start();

    logElement.innerHTML = '';
    countdown();


    let stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (event) => reject(event.name);
    });

    let recorded = wait(lengthInMS).then(
      () => {
        if (recorder.state === "recording") {
          recorder.stop();
          logElement.style.backgroundColor = 'green';
          logElement.innerHTML = "Recording complete";
          spinner.style.display = 'none';
          videoOverlay.style.backgroundImage = "url('/src/htdocs/images/placeholder.png')";
        }
      },
    );

    return Promise.all([
      stopped,
      recorded
    ]).then(() => data);
  };
  const countdown = () => {
    logElement.style.display = 'flex';
    logElement.style.backgroundColor = 'red';
    spinner.style.display = 'block';
    let timeleft = 10;
    let downloadTimer = setInterval(function(){
      if(timeleft > 0){
        logElement.innerHTML = "Recording for " + timeleft + " seconds";
      }
      timeleft -= 1;
    }, 1000);

  }
  record.addEventListener("click", () => {
    initialise();
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    }).then((stream) => {
      video.srcObject = stream;
      downloadButton.href = stream;
      video.captureStream = video.captureStream || video.mozCaptureStream;
      return new Promise((resolve) => video.onplaying = resolve);
    }).then(() => startRecording(video.captureStream(), recordingTimeMS))
      .then((recordedChunks) => {
        let recordedBlobMP4 = new Blob(recordedChunks, {type: "video/mp4"});
        recording.src = URL.createObjectURL(recordedBlobMP4);
        downloadButton.href = recording.src;
        downloadButton.download = "RecordedVideo.mp4";

        blobToBase64(recordedBlobMP4).then(res => {
          capturedMovieSrc.src = res
        });
      })
      .catch((error) => {
        if (error.name === "NotFoundError") {
          log("Camera or microphone not found. Can't record.");
        } else {
          log(error);
        }
      });
  }, false);

  video.addEventListener('play', () => {
    overlay.style.display = 'none';
    canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);
    const displaySize = {width: video.width, height: video.height}
    faceapi.matchDimensions(canvas, displaySize);
    const checkVideo = setInterval(async () => {

      const detections = await faceapi.detectSingleFace(video,
        new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      if (detections) {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        if (detections.detection.score > 0.97) {
          clearInterval(checkVideo);
          captureImage();
        }
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      }
    }, 100);
  });

  function log(msg) {
    logElement.style.display = 'flex';
    logElement.style.backgroundColor = 'red';
    logElement.innerHTML = `${msg}\n`;
  }

  function wait(delayInMS) {
    return new Promise((resolve) => setTimeout(resolve, delayInMS));
  }

})();
