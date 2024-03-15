document.addEventListener("DOMContentLoaded", () => {
    const getDataBtn = document.getElementById("getDataBtn");
    const locationDropdown = document.getElementById("locationDropdown");
    const sensorDropdown = document.getElementById("sensorDropdown");
    let temperatureChart = null;

    getDataBtn.addEventListener("click", () => {
        fetchDataAndPlot();
    });

    async function fetchDataAndPlot() {
        try {
            const location = locationDropdown.value;
            const sensorType = sensorDropdown.value;
            let unit = 'Unit';
    
            // Define units based on sensor type
            switch (sensorType) {
                case 'temperature':
                    unit = '°C';
                    break;
                case 'light':
                    unit = 'Lux';
                    break;
                case 'pressure':
                    unit = 'hPa';
                    break;
                case 'humidity':
                    unit = '%';
                    break;
                default:
                    break;
            }
    
            const response = await fetch(`http://127.0.0.1:8000/query_sensor_data?auth=A17565121&sensorType=${sensorType}&location=${location}`);
            const jsonData = await response.json();
            let data = jsonData.results;
    
            // Filter data based on start and end times
            const startTime = new Date(document.getElementById("startTime").value);
            const endTime = new Date(document.getElementById("endTime").value);
    
            if (!isNaN(startTime.getTime())) {
                data = data.filter(entry => new Date(entry.time) >= startTime);
            }
            if (!isNaN(endTime.getTime())) {
                data = data.filter(entry => new Date(entry.time) <= endTime);
            }
    
            console.log('Filtered Data:', data);
    
            const labels = data.map(entry => {
                const date = new Date(entry.time);
                const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                return `${formattedDate} ${formattedTime}`;
            });
            const values = data.map(entry => entry.value);
    
            if (temperatureChart) {
                temperatureChart.destroy(); // Destroy previous chart instance
            }
    
            const ctx = document.getElementById('temperatureChart').getContext('2d');
            temperatureChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${sensorType.charAt(0).toUpperCase() + sensorType.slice(1)} (${unit})`,
                        data: values,
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1,
                        fill: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            ticks: {
                                autoSkip: true,
                                maxTicksLimit: 20
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }
    

    
});