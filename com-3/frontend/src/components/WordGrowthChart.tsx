"use client";
import React, { useEffect, useRef } from 'react';

const WordGrowthChart = ({ data }) => {
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !window.Chart || !canvasRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.date);
    const authors = Object.keys(data[0]).filter(k => k !== 'date');
    
    const colors = [
      { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
      { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)' },
      { border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.2)' },
      { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)' }
    ];

    const datasets = authors.map((author, index) => ({
      label: author,
      data: data.map(d => d[author]),
      borderColor: colors[index % colors.length].border,
      backgroundColor: colors[index % colors.length].bg,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
    }));

    const ctx = canvasRef.current.getContext('2d');
    chartInstance.current = new window.Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#cbd5e1', font: { family: "'Inter', sans-serif" } }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#cbd5e1' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#cbd5e1' },
            title: { display: true, text: 'Word Count', color: '#cbd5e1' }
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [data]);

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

export default WordGrowthChart;
