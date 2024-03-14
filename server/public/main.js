document.addEventListener("DOMContentLoaded", () => {
    const getDataBtn = document.getElementById("getDataBtn");
    const chartContainer = document.getElementById("temperatureChart").getContext("2d");

    getDataBtn.addEventListener("click", () => {
        fetchDataAndPlot();
    });

    async function fetchDataAndPlot() {
        try {
            const response = await fetch('http://127.0.0.1:8000/query_sensor_data?auth=A17565121&userId=A17565121&sensorType=temperature');
            const jsonData = await response.json();
            const data = jsonData.results;  // Access the 'results' array
    
            console.log('Retrieved Data:', data);
    
            const labels = data.map(entry => entry.time);
            const values = data.map(entry => entry.value);
    
            const ctx = document.getElementById('temperatureChart').getContext('2d');
            const temperatureChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Temperature (°C)',
                        data: values,
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1,
                        fill: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                }
            });
        } catch (error) {
            console.error('Error fetching temperature data:', error);
        }
    }

    function plotTemperatureData(temperatureData) {
        const timeLabels = temperatureData.map(entry => entry.time.toLocaleTimeString());
        const temperatureValues = temperatureData.map(entry => entry.value);

        // Create a line chart using Chart.js
        new Chart(chartContainer, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Temperature (°C)',
                    data: temperatureValues,
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 2,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom'
                    },
                    y: {
                        type: 'linear',
                        position: 'left'
                    }
                }
            }
        });
    }
});
