$(() => {
    $("span.pie").peity("pie", {
        fill: ['#1ab394', '#d7d7d7', '#ffffff']
    });

    $(".line").peity("line", {
        fill: '#1ab394',
        stroke: '#169c81'
    });

    $(".bar").peity("bar", {
        fill: ["#1ab394", "#d7d7d7"]
    });

    $(".bar_dashboard").peity("bar", {
        fill: ["#1ab394", "#d7d7d7"],
        width: 100
    });

    const updatingChart = $(".updating-chart").peity("line", { fill: '#1ab394', stroke: '#169c81', width: 64 });

    setInterval(() => {
        const random = Math.round(Math.random() * 10);
        const values = updatingChart.text().split(",");
        values.shift();
        values.push(random);

        updatingChart.text(values.join(",")).change();
    }, 1000);
});
//# sourceMappingURL=peity-demo.js.map
