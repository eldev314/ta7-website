let mediaRecorder; // Declare mediaRecorder globally 

document.getElementById('startRecordingBtn').addEventListener('click', startRecording);
document.getElementById('stopRecordingBtn').addEventListener('click', stopRecording);

function startRecording() {
    let audioChunks = [];

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        
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
                    updateUI('error', 'Error during transcription.');
                }
            } catch (error) {
                console.error('Failed to transcribe audio:', error);
                updateUI('error', 'Failed to transcribe audio.');
            }
        };

        mediaRecorder.start();
        updateUI('recording', 'Recording...');
        document.getElementById('stopRecordingBtn').style.display = 'inline'; // Show stop button
    })
    .catch(error => {
        console.error('Error getting user media:', error);
        updateUI('error', 'Error accessing your microphone. Please check permissions.');
    });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        updateUI('stopped', 'Recording stopped.');
        document.getElementById('stopRecordingBtn').style.display = 'none'; // Hide stop button
    }
}

function updateUI(status, message) {
    const statusText = document.getElementById("status");
    statusText.innerText = message;
}

function displayTranscription(transcription) {
    document.getElementById("transcription").innerText = transcription;
}

async function callInferenceAPI(transcription) {
    try {
        const sensorDataResponse = await fetch('http://127.0.0.1:8000/query_sensor_data?auth=A17565121&userId=A17565121'); // Left sensorType empty to to get all
        const sensorDataJson = await sensorDataResponse.json();
        if (!sensorDataResponse.ok) {
            throw new Error('Failed to fetch sensor data');
        }

       
        const latestSensorData = sensorDataJson.results.reduce((acc, curr) => {
            // If current sensor type is not yet in acc or is older then update it
            if (!acc[curr.sensorType] || new Date(acc[curr.sensorType].time) < new Date(curr.time)) {
                acc[curr.sensorType] = curr.value; 
            }
            return acc;
        }, {});

        // Ensure we have data for all expected sensor types
        const sensorData = {
            temperature: latestSensorData['temperature'] || 0, 
            humidity: latestSensorData['humidity'] || 0,
            light: latestSensorData['light'] || 0,
            pressure: latestSensorData['pressure'] || 0,
        };

        const inferenceResponse = await fetch("https://ece140.frosty-sky-f43d.workers.dev/api/inference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth: "A17565121", 
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


async function displayAnswer(data) {
    const transcription = document.getElementById("transcription").innerText;
    const requestedLang = getRequestedLanguage(transcription);
    let answerText = data.suggestion || `Forecast: ${data.forecast}`;

    if (requestedLang) {
        const translatedText = await translateText(answerText, requestedLang);
        if (translatedText) {
            answerText = translatedText;
            
        }
    }

    document.getElementById("answer").innerText = answerText;
    // Store the answer for playback
    document.getElementById("playbackBtn").setAttribute("data-text-to-speak", answerText);
    document.getElementById("answer").innerText = answerText;
    document.getElementById("playbackBtn").style.display = 'inline'; // Show the playback button
}

function getRequestedLanguage(transcription) {
    const languageRegex = /answer in (chinese|french|spanish|arabic|russian|german|japanese|portuguese|hindi)/i;
    const matches = transcription.match(languageRegex);
    if (matches && matches[1]) {
        // Map the language to the corresponding target_lang code
        const languages = {
            chinese: 'zh', french: 'fr', spanish: 'es', arabic: 'ar',
            russian: 'ru', german: 'de', japanese: 'ja', portuguese: 'pt', hindi: 'hi'
        };
        return languages[matches[1].toLowerCase()];
    }
    return null; // Return null if no language request is found
}

async function translateText(text, targetLang) {
    try {
        console.log(targetLang);
        const response = await fetch("https://ece140.frosty-sky-f43d.workers.dev/api/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                auth: "A17565121", 
                text: text,
                target_lang: targetLang,
            }),
        });
        const data = await response.json();
        
        console.log('Translation API response:', data); // Debugging line
        if (response.ok) {
            return data.transcription; // Return the translation
        } else {
            console.error('Error during translation:', data);
            return null;
        }
    } catch (error) {
        console.error('Failed to translate text:', error);
        return null;
    }
}


document.getElementById('playbackBtn').addEventListener('click', function() {
    const textToSpeak = this.getAttribute("data-text-to-speak");
    const requestedLang = getRequestedLanguage(document.getElementById("transcription").innerText);
    speak(textToSpeak, requestedLang);
});

function speak(text, langCode) {
    const utterance = new SpeechSynthesisUtterance(text);
    if (langCode) {
        utterance.lang = langCode;
    }
    speechSynthesis.speak(utterance);
}
