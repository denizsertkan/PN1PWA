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
  function updateChart(data) {
    if (!myChart) return;

    const chartData = Object.entries(data).map(([emotion, value]) => ({
      name: emotion,
      value: Math.round(value * 100),
    }));

    myChart.setOption({
      series: [{ data: chartData }],
    });
  }

  // Update chart when sensitivity changes
  sensitivityLevel.addEventListener('change', function () {
    if (myChart) {
      updateChart();
    }
  });
});
