"use client";
import React, { useEffect, useRef } from 'react';

const ContributionHeatmap = ({ data }: { data: any }) => {
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d3 = (typeof window !== 'undefined' ? (window as any).d3 : null);
    if (!data || !data.authors || !data.sections || !data.data || !d3) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 30, right: 30, bottom: 30, left: 100 };
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build X scales and axis (Authors)
    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.authors)
      .padding(0.05);
      
    svg.append("g")
      .attr("transform", `translate(0,0)`)
      .call(d3.axisTop(x).tickSize(0))
      .select(".domain").remove();
      
    // Style X axis text
    svg.selectAll(".tick text")
       .attr("fill", "var(--text-secondary)")
       .attr("font-size", "14px");

    // Build Y scales and axis (Sections)
    const y = d3.scaleBand()
      .range([0, height])
      .domain(data.sections)
      .padding(0.05);
      
    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .select(".domain").remove();

    // Style Y axis text
    svg.selectAll(".tick text")
       .attr("fill", "var(--text-secondary)")
       .attr("font-size", "14px");

    // Build color scale
    const myColor = d3.scaleSequential()
      .interpolator(d3.interpolateBlues) // Or interpolatePurples depending on theme
      .domain([0, 100]); // Max value 100%

    // Create a tooltip
    const tooltip = d3.select("body")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip");

    // Heatmap squares
    svg.selectAll()
      .data(data.data, function(d) { return d.author + ':' + d.section; })
      .enter()
      .append("rect")
        .attr("x", function(d) { return x(d.author); })
        .attr("y", function(d) { return y(d.section); })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function(d) { return d.value > 0 ? myColor(d.value) : "rgba(255,255,255,0.05)"; })
        .style("stroke-width", 1)
        .style("stroke", "var(--border-color)")
        .style("transition", "all 0.2s")
      .on("mouseover", function(event, d) {
        d3.select(this).style("stroke", "#fff").style("stroke-width", 2);
        tooltip.style("opacity", 1);
        tooltip.html(`<b>${d.author}</b><br>Section: ${d.section}<br>Contribution: ${d.value}%`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseleave", function() {
        d3.select(this).style("stroke", "var(--border-color)").style("stroke-width", 1);
        tooltip.style("opacity", 0);
      });

  }, [data]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div ref={svgRef}></div>
    </div>
  );
};

export default ContributionHeatmap;
