"use strict";

(function () {
    const app = document.getElementById("app");
    const dateRegex = /\d\d\d\d\-\d\d\-\d\d/;
    const dateParser = d3.utcParse("%Y-%m-%d");
    const dateFormat = d3.timeFormat("%Y-%m-%d");

    const margin = {
        top: 30,
        right: 30,
        bottom: 30,
        left: 30
    };

    const width = window.innerWidth - margin.right;
    const height = window.innerHeight - margin.bottom;

    d3.csv(app.getAttribute("data-data-url"))
        .then(function (d) {
            return d.filter(x => x.geo_type === "country/region" && x.transportation_type === "driving");
        })
        .then(function (d) {
            const columnNames = Object.keys(d[0] || {})
                .filter(f => dateRegex.test(f))
                .reduce((obj, key) => {
                    obj.push(key);

                    return obj;
                }, []);

            const columnValues = columnNames
                .reduce((obj, key) => {
                    obj.push(dateParser(key));

                    return obj;
                }, []);

            const data = d.map(x => ({
                name: x.region,
                altName: x.alternative_name,
                type: x.transportation_type,
                values: columnNames
                    .reduce(function (obj, key) {
                        obj.push(parseInt(x[key]) - 100 || null);

                        return obj;
                    }, [])
            }));

            return {
                columns: columnValues,
                data: data
            };
        })
        .then(function (data) {
            console.log(data);

            const x = d3.scaleUtc()
                .domain(d3.extent(data.columns))
                .range([margin.left, width - margin.right]);

            const xAxis = g => g
                .attr("transform", `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

            const y = d3.scaleLinear()
                .domain([d3.min(data.data, d => d3.min(d.values)), d3.max(data.data, d => d3.max(d.values))]).nice()
                .range([height - margin.bottom, margin.top]);

            const yAxis = g => g
                .attr("transform", `translate(${margin.left},0)`)
                .call(d3.axisLeft(y))
                .call(g => g.select(".domain").remove())
                .call(g => g.select(".tick:last-of-type text").clone()
                    .attr("x", 3)
                    .attr("text-anchor", "start")
                    .attr("font-weight", "bold")
                    .text("Country"));

            const line = d3.line()
                .defined(d => d !== null)
                .x((d, i) => x(data.columns[i]))
                .y(d => y(d));

            const svg = d3.create("svg")
                .attr("viewBox", [0, 0, width, height])
                .style("overflow", "visible");

            svg.append("g")
                .call(xAxis);

            svg.append("g")
                .call(yAxis);

            const path = svg.append("g")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 1.5)
                .attr("stroke-linejoin", "round")
                .attr("stroke-linecap", "round")
                .selectAll("path")
                .data(data.data)
                .join("path")
                .style("mix-blend-mode", "multiply")
                .attr("d", d => line(d.values));

            function hover(svg, path) {
                if ("ontouchstart" in document) svg
                    .style("-webkit-tap-highlight-color", "transparent")
                    .on("touchmove", moved)
                    .on("touchstart", entered)
                    .on("touchend", left)
                else svg
                    .on("mousemove", moved)
                    .on("mouseenter", entered)
                    .on("mouseleave", left);

                const dot = svg.append("g")
                    .attr("display", "none");

                dot.append("circle")
                    .attr("r", 2.5);

                dot.append("text")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", 10)
                    .attr("text-anchor", "middle")
                    .attr("y", -8);

                function moved() {
                    d3.event.preventDefault();
                    const mouse = d3.mouse(this);
                    const xm = x.invert(mouse[0]);
                    const ym = y.invert(mouse[1]);
                    const i1 = d3.bisectLeft(data.columns, xm, 1);
                    const i0 = i1 - 1;
                    const i = xm - data.columns[i0] > data.columns[i1] - xm ? i1 : i0;
                    const s = d3.least(data.data, d => Math.abs(d.values[i] - ym));
                    path.attr("stroke", d => d === s ? null : "#ddd").filter(d => d === s).raise();
                    dot.attr("transform", `translate(${x(data.columns[i])},${y(s.values[i])})`);

                    const altName = s.altName ? ` (${s.altName})` : "";
                    dot.select("text").text(`${s.name} ${altName} - ${dateFormat(data.columns[i])} - ${s.values[i]}`);
                }

                function entered() {
                    path.style("mix-blend-mode", null).attr("stroke", "#ddd");
                    dot.attr("display", null);
                }

                function left() {
                    path.style("mix-blend-mode", "multiply").attr("stroke", null);
                    dot.attr("display", "none");
                }
            }

            svg.call(hover, path);

            const node = svg.node();

            app.appendChild(node);
        });
})();
