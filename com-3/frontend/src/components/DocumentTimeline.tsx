"use client";
import React, { useEffect, useRef } from 'react';

const DocumentTimeline = ({ data }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0 || !window.d3) return;

    const d3 = window.d3;
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const width = 1000 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parsedData = data.map(d => ({
      ...d,
      date: new Date(d.timestamp)
    }));

    // X axis (Time)
    const x = d3.scaleTime()
      .domain(d3.extent(parsedData, d => d.date))
      .range([0, width]);
      
    svg.append("g")
      .attr("transform", `translate(0, ${height / 2})`)
      .call(d3.axisBottom(x).ticks(5))
      .select(".domain")
      .attr("stroke", "var(--border-color)")
      .attr("stroke-width", 2);

    // Style axis text
    svg.selectAll(".tick text")
       .attr("fill", "var(--text-secondary)")
       .attr("y", 15);
    
    svg.selectAll(".tick line").remove();

    // Color scale for authors
    const authors = Array.from(new Set(parsedData.map(d => d.author)));
    const color = d3.scaleOrdinal()
      .domain(authors)
      .range(["var(--accent-blue)", "var(--accent-purple)", "var(--accent-teal)", "var(--accent-rose)"]);

    // Tooltip
    const tooltip = d3.select("body")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip");

    // Draw lines connecting nodes
    svg.append("path")
      .datum(parsedData)
      .attr("fill", "none")
      .attr("stroke", "var(--border-color)")
      .attr("stroke-width", 3)
      .attr("d", d3.line()
        .x(d => x(d.date))
        .y(height / 2)
      );

    // Draw nodes
    svg.selectAll("myCircles")
      .data(parsedData)
      .enter()
      .append("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", height / 2)
        .attr("r", d => Math.max(6, Math.min(15, d.words_added / 20))) // Size based on words added
        .attr("fill", d => color(d.author))
        .attr("stroke", "var(--bg-primary)")
        .attr("stroke-width", 3)
        .style("cursor", "pointer")
        .style("transition", "transform 0.2s")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("transform", `translate(${x(d.date)}, ${height/2}) scale(1.5) translate(${-x(d.date)}, ${-height/2})`);
        tooltip.style("opacity", 1);
        tooltip.html(`
          <strong>${d.author}</strong><br/>
          ${d.date.toLocaleDateString()} ${d.date.toLocaleTimeString()}<br/>
          <em>${d.message}</em><br/>
          Words Added: +${d.words_added}
        `)
        .style("left", (event.pageX + 15) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", function() {
        d3.select(this).attr("transform", "scale(1)");
        tooltip.style("opacity", 0);
      });

  }, [data]);

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div ref={svgRef}></div>
    </div>
  );
};

export default DocumentTimeline;
