(() => {
    const video = document.querySelector('video');
    const record = document.querySelector('.record');
    const videoText = document.querySelector('.text');
    const capturedImage = document.querySelector('#captured-image')
    const videoOverlay = document.getElementById('video-overlay');
    const overlay = document.getElementById('overlay');
    const constraints = {
        audio: false,
        video: {
            width: 720,
            height: 540
        }
    };

    let canvas;

    const getUserMedia = (stop) => {
        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                const videoTracks = stream.getVideoTracks();
                console.log('Got stream with constraints:', constraints);
                console.log(`Using video device: ${videoTracks[0].label}`);
                stream.onremovetrack = () => {
                    console.log('Stream ended');
                };
                if (stop) {
                    stream = null;
                }
                video.srcObject = stream;

            })
            .catch((error) => {
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
    }

    const initialise = () => {
        Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]).then(startVideo);
    };

    const startVideo = () => {
        console.log('start recording');
        videoText.innerHTML='Click the record button and  <br/>place your face in the frame outlined';
        videoOverlay.style.background = 'transparent';
        overlay.style.display = 'flex';
        hideShowElements(false);
        getUserMedia(false);
    };
    const stopVideo = () => {
        console.log('stop recording');
        hideShowElements(true);
        videoOverlay.style.backgroundImage = "url('/src/htdocs/images/placeholder.png')";

        clearCanvas();
        getUserMedia(true);
    }

    const takePicture = () => {
        console.log('take a picture');
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        capturedImage.src = canvas.toDataURL('image/png');
        stopVideo();
    };

    const clearCanvas = () => {
        let canvases = document.getElementsByTagName('canvas');
        for (let i = canvases.length - 1; i >= 0; i -= 1) {
            canvases[i].parentNode.removeChild(canvases[i]);
        }
    };

    const hideShowElements = (val) => {
        let hide = !val ? 'flex' : 'none'
        let show = val  ? 'flex' : 'none'
        videoText.style.display = show;
        record.style.display = show;
        overlay.style.display = hide;
    }

    record.addEventListener('click', () => {
        initialise();
    })

    video.addEventListener('play', async () => {
        overlay.style.display = 'none';
        canvas = await faceapi.createCanvasFromMedia(video);
        document.body.append(canvas);
        const displaySize = {width: video.width, height: video.height}
        faceapi.matchDimensions(canvas, displaySize);
        const checkVideo = setInterval(async () => {

            const detections = await faceapi.detectSingleFace(video,
                new faceapi.TinyFaceDetectorOptions({minConfidence: 0.99})).withFaceLandmarks().withFaceExpressions();
            if (detections) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                console.log(detections);
                if (detections.detection.score > 0.98) {
                    clearInterval(checkVideo);
                    takePicture();
                }

                console.log('Face detected with score of: ', resizedDetections.detection.score);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                // faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

            }
        }, 100);
    });

})();
