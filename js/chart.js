document.addEventListener('DOMContentLoaded', function () {
  const chartContainer = document.getElementById('chartContainer');
  const chartToggle = document.getElementById('toggleNightingaleChart');
  const dataWeightSlider = document.getElementById('dataWeightSlider');
  const dataWeightLabel = document.getElementById('dataWeightLabel');
  const videoWeightLabel = document.getElementById('videoWeightLabel');
  const sensitivityLevel = document.getElementById('sensitivityLevel');

  let myChart;

  // Handle Nightingale Chart Toggle
  chartToggle.addEventListener('change', function () {
    if (this.checked) {
      chartContainer.classList.remove('hidden');
      if (!myChart) {
        myChart = echarts.init(chartContainer);
      }
      updateChart();
    } else {
      chartContainer.classList.add('hidden');
    }
  });

  // Handle Data Weighting Slider
  dataWeightSlider.addEventListener('input', function () {
    const audioWeight = this.value;
    const videoWeight = 100 - audioWeight;
    dataWeightLabel.textContent = audioWeight;
    videoWeightLabel.textContent = videoWeight;
  });

  // Update Chart with Dynamic Data
  function updateChart() {
    // Determine sensitivity factor (if needed to adjust other aspects later)
    const sensitivity = sensitivityLevel.value;
    const factor =
      sensitivity === 'low' ? 0.8 : sensitivity === 'high' ? 1.2 : 1.0;

    myChart.setOption({
      legend: {
        bottom: '5%', // Adjust this value to position the legend below the chart
        textStyle: {
          fontSize: 8, // Adjust the font size as needed
          fontFamily: 'Arial, sans-serif', // Optional: specify the font family
          color: '#333', // Optional: specify the font color
        },
      },
      toolbox: {
        show: true,
        feature: {
          mark: { show: true },
        },
      },
      series: [
        {
          name: 'Emotion Intensity',
          type: 'pie',
          label: { show: false }, // Hide labels around the diagram
          radius: ['20%', '80%'],
          center: ['50%', '37.5%'],
          // Using fixed values for exact angular sizes (total 360°)
          data: [
            {
              value: 30,
              name: 'Surprised',
              itemStyle: { color: 'hsla(96, 72.50%, 60.00%, 0.84)' },
            }, // Signals: mIxns (e.g., Ears Up), poses (e.g., Jumping), audio (e.g., Whimpering)
            {
              value: 30,
              name: 'Excited',
              itemStyle: { color: 'hsla(96, 72.50%, 60.00%, 0.63)' },
            }, // Signals: mIxns (e.g., Tongue Out, Smiling), poses (e.g., Tail Shacking, Running in Circles), audio (e.g., Barking, Panting)
            {
              value: 30,
              name: 'Happy',
              itemStyle: { color: 'hsla(96, 72.50%, 60.00%, 0.42)' },
            }, // Signals: mIxns (e.g., Puppy Eyes, Smiling), poses (e.g., Tail Shacking, Running in Circles), audio (e.g., Panting)
            {
              value: 30,
              name: 'Content',
              itemStyle: { color: 'hsla(45, 72.50%, 72.50%, 0.84)' },
            }, // Signals: mIxns (e.g., Licking, Puppy Eyes), poses (e.g., Belly Upwards), audio (e.g., soft Howling or low-level sounds)
            {
              value: 60,
              name: 'Relaxed',
              itemStyle: { color: 'hsla(45, 72.50%, 72.50%, 0.63)' },
            }, // Signals: mIxns (e.g., Licking, Smiling), poses (e.g., Walking with head down, Belly Upwards), audio (e.g., Moaning)
            {
              value: 30,
              name: 'Tired',
              itemStyle: { color: 'hsla(209, 84.00%, 25.00%, 0.84)' },
            }, // Signals: poses (e.g., Walking with head down), audio (e.g., Moaning, Panting), mIxns (minimal activity)
            {
              value: 30,
              name: 'Bored',
              itemStyle: { color: 'hsla(209, 84.00%, 25.00%, 0.63)' },
            }, // Signals: mIxns (e.g., Puppy Eyes), poses (e.g., Crawling), audio (e.g., low-level Howling)
            {
              value: 30,
              name: 'Sad',
              itemStyle: { color: 'hsla(209, 84.00%, 25.00%, 0.42)' },
            }, // Signals: mIxns (e.g., Puppy Eyes), poses (e.g., Walking with head down), audio (e.g., Whimpering, Moaning)
            {
              value: 30,
              name: 'Neutral',
              itemStyle: { color: 'hsla(10, 75.00%, 50.00%, 0.21))' },
            }, // Signals: Minimal signals; balanced low-intensity across mIxns, poses, and audio indicating baseline state
            {
              value: 30,
              name: 'Scared',
              itemStyle: { color: 'hsla(10, 75.00%, 50.00%, 0.42)' },
            }, // Signals: mIxns (e.g., Teeth Showing), poses (e.g., Crawling), audio (e.g., Growning, Howling)
            {
              value: 30,
              name: 'Angry',
              itemStyle: { color: 'hsla(10, 75.00%, 50.00%, 0.84)' },
            }, // Signals: mIxns (e.g., Teeth Showing), poses (e.g., Tail Shacking), audio (e.g., Barking, Growning)
          ],
          itemStyle: {
            borderRadius: 5,
            borderColor: 'rgba(255, 255, 255, 1)', // White border to create spacing between slices
            borderWidth: 3.6,
          },
        },
      ],
    });
  }

  // Update chart when sensitivity changes
  sensitivityLevel.addEventListener('change', function () {
    if (myChart) {
      updateChart();
    }
  });
});
