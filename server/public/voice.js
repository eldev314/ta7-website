document.getElementById('startRecordingBtn').addEventListener('click', () => {
    let mediaRecorder;
    let audioChunks = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        mediaRecorder.start();

        setTimeout(() => {
            mediaRecorder.stop(); // Stops recording after 15 seconds
        }, 15000);
    });

    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks);
        const formData = new FormData();
        formData.append("file", audioBlob);
        formData.append("auth", "A17565121"); 

        try {
            const response = await fetch("https://ece140.frosty-sky-f43d.workers.dev/api/transcribe", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                displayTranscription(data.transcription);
                callInferenceAPI(data.transcription);
            } else {
                console.error('Error during transcription:', data);
            }
        } catch (error) {
            console.error('Failed to transcribe audio:', error);
        }
    };
});

function displayTranscription(transcription) {
    document.getElementById("transcription").innerText = transcription;
}

async function callInferenceAPI(transcription) {
    try {
        const sensorDataResponse = await fetch('http://127.0.0.1:8000/query_sensor_data?auth=A17565121&userId=A17565121');
        const sensorDataJson = await sensorDataResponse.json();
        if (!sensorDataResponse.ok) {
            throw new Error('Failed to fetch sensor data');
        }

        // Assuming sensorDataJson.results is an array of sensor readings
        const latestSensorData = sensorDataJson.results.reduce((acc, curr) => {
            // If current sensor type is not yet in acc or is older, update it
            if (!acc[curr.sensorType] || new Date(acc[curr.sensorType].time) < new Date(curr.time)) {
                acc[curr.sensorType] = curr.value; // Store only the value for simplicity
            }
            return acc;
        }, {});

        // Ensure we have data for all expected sensor types, even if it's just a default or placeholder value
        const sensorData = {
            temperature: latestSensorData['temperature'] || 0, // Consider a more reasonable default if possible
            humidity: latestSensorData['humidity'] || 0,
            light: latestSensorData['light'] || 0,
            pressure: latestSensorData['pressure'] || 0,
        };

        const inferenceResponse = await fetch("https://ece140.frosty-sky-f43d.workers.dev/api/inference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth: "A17565121", // Replace with your actual UCSD PID
                sensorData: sensorData,
                question: transcription,
            }),
        });
        const inferenceData = await inferenceResponse.json();
        if (inferenceResponse.ok) {
            displayAnswer(inferenceData);
        } else {
            throw new Error('Failed to perform inference');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}


function displayAnswer(data) {
    document.getElementById("answer").innerText = `Forecast: ${data.forecast} Suggestion: ${data.suggestion}`;
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}
