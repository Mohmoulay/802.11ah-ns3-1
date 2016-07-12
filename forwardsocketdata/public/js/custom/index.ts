/// <reference path="../../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../../typings/globals/highcharts/index.d.ts" />

declare namespace io {
    class Options {
        reconnection: boolean;
        timeout: number;
    }
    function connect(url: string): SocketIO.Socket;
    function socket(url: string, opts: Options): SocketIO.Socket;
}

class SimulationContainer {

    private keys: string[] = [];

    private simulations = {};
    getSimulation(stream: string): Simulation {
        return this.simulations[stream];
    }

    setSimulation(stream: string, sim: Simulation) {
        this.simulations[stream] = sim;
        this.keys.push(stream);
    }

    hasSimulations(): boolean {
        return this.keys.length > 0;
    }

    getStream(idx: number): string {
        return this.keys[idx];
    }

    getStreams(): string[] {
        return this.keys.slice(0);
    }

    getSimulations(): Simulation[] {
        let sims: Simulation[] = [];
        for (let k of this.keys) {
            sims.push(this.simulations[k]);
        }
        return sims;
    }

}
class SimulationGUI {

    public simulationContainer: SimulationContainer = new SimulationContainer();
    public selectedNode: number = 0;
    public selectedPropertyForChart: string = "totalTransmitTime";
    public selectedStream: string = "";

    private ctx: CanvasRenderingContext2D;
    private animations: Animation[] = [];

    area: number = 2000;

    private currentChart: HighchartsChartObject = null;

    private heatMapPalette: Palette;
    private rawGroupColors: Color[] = [new Color(200, 0, 0),
        new Color(0, 200, 0),
        new Color(0, 0, 200),
        new Color(200, 0, 200),
        new Color(200, 200, 0),
        new Color(0, 200, 200),
        new Color(100, 100, 0),
        new Color(100, 0, 100),
        new Color(0, 0, 100),
        new Color(0, 0, 0)];


    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = <CanvasRenderingContext2D>canvas.getContext("2d");

        this.heatMapPalette = new Palette();
        this.heatMapPalette.addColor(new Color(255, 0, 0, 1, 0));
        this.heatMapPalette.addColor(new Color(255, 255, 0, 1, 0.5));
        this.heatMapPalette.addColor(new Color(0, 255, 0, 1, 1));
    }

    draw() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawRange();
        this.drawNodes();

        for (let a of this.animations) {
            a.draw(this.canvas, this.ctx, this.area);
        }
    }

    private drawRange() {
        if (!this.simulationContainer.hasSimulations())
            return;

        this.ctx.strokeStyle = "#CCC";

        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        for (let n of selectedSimulation.nodes) {
            if (n.type == "AP") {
                for (let i = 1; i <= 10; i++) {
                    let radius = 100 * i * (this.canvas.width / this.area);
                    this.ctx.beginPath();
                    this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), radius, 0, Math.PI * 2, false);
                    this.ctx.stroke();
                }
            }
        }
    }

    private getMinMaxOfProperty(stream: string, prop: string, deltas: boolean): number[] {
        if (!this.simulationContainer.hasSimulations())
            return [0, 0];

        let curMax: number = Number.MIN_VALUE;
        let curMin: number = Number.MAX_VALUE;
        if (prop != "") {
            let selectedSimulation = this.simulationContainer.getSimulation(stream);
            for (let n of selectedSimulation.nodes) {
                let values = (<Value[]>n[this.selectedPropertyForChart]);
                if (deltas && values.length > 1) {
                    let curVal = values[values.length - 1].value;
                    let beforeVal = values[values.length - 2].value;
                    let value = curVal - beforeVal;
                    if (curMax < value) curMax = value;
                    if (curMin > value) curMin = value;
                }
                else if (values.length > 0) {
                    let value = values[values.length - 1].value;
                    if (curMax < value) curMax = value;
                    if (curMin > value) curMin = value;
                }
            }
            return [curMin, curMax];
        }
        else
            return [0, 0];

    }
    private getColorForNode(n: SimulationNode, curMax: number, curMin: number): string {
        if (this.selectedPropertyForChart != "") {
            let el = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "']").get(0));
            let type = el.attr("data-type");
            if (typeof type != "undefined" && type != "") {
                let min;
                if (el.attr("data-max") == "*")
                    min = curMin;
                else
                    min = parseInt(el.attr("data-min"));
                let max: number;
                if (el.attr("data-max") == "*")
                    max = curMax;
                else
                    max = parseInt(el.attr("data-max"));


                let values = (<Value[]>n[this.selectedPropertyForChart]);
                if (values.length > 0) {
                    let value = values[values.length - 1];

                    let alpha = (value.value - min) / (max - min);
                    if (type == "LOWER_IS_BETTER")
                        return this.heatMapPalette.getColorAt(1 - alpha).toString();
                    else
                        return this.heatMapPalette.getColorAt(alpha).toString();
                }
            }
        }

        if (n.type == "STA" && !(<STANode>n).isAssociated)
            return "black";
        else
            return this.rawGroupColors[n.groupNumber % this.rawGroupColors.length].toString();
    }

    private drawNodes() {
        if (!this.simulationContainer.hasSimulations())
            return;

        let minmax = this.getMinMaxOfProperty(this.selectedStream, this.selectedPropertyForChart, false);
        let curMax = minmax[1];
        let curMin = minmax[0];
        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        for (let n of selectedSimulation.nodes) {
            this.ctx.beginPath();

            if (n.type == "AP") {
                this.ctx.fillStyle = "black";
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 6, 0, Math.PI * 2, false);
            }
            else {
                this.ctx.fillStyle = this.getColorForNode(n, curMax, curMin);
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 3, 0, Math.PI * 2, false);
            }
            this.ctx.fill();

            if (this.selectedNode >= 0 && this.selectedNode == n.id) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = "blue";
                this.ctx.lineWidth = 3;
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 8, 0, Math.PI * 2, false);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            }

        }
    }

    update(dt: number) {
        for (let a of this.animations) {
            a.update(dt);
        }

        let newAnimationArr: Animation[] = [];
        for (let i: number = this.animations.length - 1; i >= 0; i--) {
            if (!this.animations[i].isFinished())
                newAnimationArr.push(this.animations[i]);
        }
        this.animations = newAnimationArr;
    }

    addAnimation(anim: Animation) {
        this.animations.push(anim);
    }

    /*onNodeUpdated(stream: string, id: number) {
        // bit of a hack to only update all overview on node stats with id = 0 because otherwise it would hammer the GUI update
        if (id == this.selectedNode || (this.selectedNode == -1 && id == 0)) {
                this.updateGUI(false);
        }
    }

    onNodeAdded(stream: string, id: number) {
        if (id == this.selectedNode)
            this.updateGUI(true);
    }
*/
    onNodeAssociated(stream: string, id: number) {
        if (stream == this.selectedStream) {
            let n = this.simulationContainer.getSimulation(stream).nodes[id];
            this.addAnimation(new AssociatedAnimation(n.x, n.y));
        }
    }

    onSimulationTimeUpdated(time: number) {
        $("#simCurrentTime").text(time);
    }

    changeNodeSelection(id: number) {
        this.selectedNode = id;
        this.updateGUI(true);
    }

    private refreshTimerId: number = -1;
    private lastUpdatedOn: Date = new Date();

    updateGUI(full: boolean) {
        if (!this.simulationContainer.hasSimulations())
            return;


        let simulations = this.simulationContainer.getSimulations();
        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);

        this.updateConfigGUI(selectedSimulation);

        if (this.selectedNode < 0 || this.selectedNode >= selectedSimulation.nodes.length)
            this.updateGUIForAll(simulations, selectedSimulation, full);
        else
            this.updateGUIForSelectedNode(simulations, selectedSimulation, full);


    }

    private updateConfigGUI(selectedSimulation: Simulation) {

        $("#simulationName").text(selectedSimulation.config.name);
        var configElements = $(".configProperty");
        for (let i = 0; i < configElements.length; i++) {
            let prop = $(configElements[i]).attr("data-property");
            $($(configElements[i]).find("td").get(1)).text(selectedSimulation.config[prop]);
        }

    }
    private updateGUIForSelectedNode(simulations: Simulation[], selectedSimulation: Simulation, full: boolean) {
        let node = selectedSimulation.nodes[this.selectedNode];


        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x.toFixed(2) + "," + node.y.toFixed(2));
        if (node.type == "STA" && !(<STANode>node).isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeGroupNumber").text(node.groupNumber);
            $("#nodeRawSlotIndex").text(node.rawSlotIndex);
        }

        var propertyElements = $(".nodeProperty");
        for (let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");

            let values = <Value[]>node[prop];

            if (typeof values != "undefined") {

                let el: string = "";

                if (values.length > 0) {
                    if (simulations.length > 1) {
                        // compare with avg of others
                        let sumVal = 0;
                        let nrVals = 0;
                        for (let j = 0; j < simulations.length; j++) {
                            if (simulations[j] != selectedSimulation && this.selectedNode < simulations[j].nodes.length) {
                                let vals = (<Value[]>simulations[j].nodes[this.selectedNode][prop]);
                                if (vals.length > 0) {
                                    sumVal += vals[vals.length - 1].value;
                                    nrVals++;
                                }
                            }
                        }

                        let avg = sumVal / nrVals;
                        if (values[values.length - 1].value > avg)
                            el = `<div class='valueup' title='Value has increased compared to average (${avg.toFixed(2)}) of other simulations'>${values[values.length - 1].value}</div>`;
                        else if (values[values.length - 1].value < avg)
                            el = `<div class='valuedown' title='Value has decreased compared to average (${avg.toFixed(2)}) of other simulations'>${values[values.length - 1].value}</div>`;
                        else
                            el = values[values.length - 1].value + "";
                    }
                    else {
                        el = values[values.length - 1].value + "";
                    }


                    $($(propertyElements[i]).find("td").get(1)).empty().append(el);
                }
            }
            else
                $($(propertyElements[i]).find("td").get(1)).empty().append("Property not found");
        }

        this.deferUpdateCharts(simulations, full);
    }


    private getAverageAndStdDevValue(simulation: Simulation, prop: string): number[] {

        let sum = 0;
        let count = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            let values = (<Value[]>node[prop]);
            if (values.length > 0) {
                sum += values[values.length - 1].value;
                count++;
            }
        }
        if (count == 0) return [];

        let avg = sum / count;

        let sumSquares = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            let values = (<Value[]>node[prop]);
            if (values.length > 0) {
                let val = (values[values.length - 1].value - avg) * (values[values.length - 1].value - avg);
                sumSquares += val;
            }
        }
        let stddev = Math.sqrt(sumSquares / count);

        return [avg, stddev];
    }

    private updateGUIForAll(simulations: Simulation[], selectedSimulation: Simulation, full: boolean) {


        $("#nodeTitle").text("All nodes");
        $("#nodePosition").text("---");
        $("#nodeAID").text("---");
        $("#nodeGroupNumber").text("---");
        $("#nodeRawSlotIndex").text("---");

        var propertyElements = $(".nodeProperty");
        for (let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");


            let avgAndStdDev = this.getAverageAndStdDevValue(selectedSimulation, prop);

            let el: string = "";

            if (avgAndStdDev.length > 0) {
                let text = `${avgAndStdDev[0].toFixed(2)} (stddev: ${avgAndStdDev[1].toFixed(2)})`;

                if (simulations.length > 1) {
                    // compare with avg of others
                    let sumVal = 0;
                    let nrVals = 0;
                    for (let j = 0; j < simulations.length; j++) {
                        if (simulations[j] != selectedSimulation) {
                            let avgAndStdDevOther = this.getAverageAndStdDevValue(simulations[j], prop);

                            if (avgAndStdDevOther.length > 0) {
                                sumVal += avgAndStdDevOther[0];
                                nrVals++;
                            }
                        }
                    }


                    let avg = sumVal / nrVals;


                    if (avgAndStdDev[0] > avg)
                        el = `<div class='valueup' title='Average has increased compared to average (${avg.toFixed(2)}) of other simulations'>${text}</div>`;
                    else if (avgAndStdDev[0] < avg)
                        el = `<div class='valuedown' title='Average has decreased compared to average (${avg.toFixed(2)}) of other simulations'>${text}</div>`;
                    else
                        el = text;
                }
                else {
                    el = text;
                }

                $($(propertyElements[i]).find("td").get(1)).empty().append(el);
            }
        }

        this.deferUpdateCharts(simulations, full);
    }

    private deferUpdateCharts(simulations: Simulation[], full: boolean) {
        // prevent update flood by max 1 update per second or when gui changed
        let timeDiff = new Date().getTime() - this.lastUpdatedOn.getTime();
        if (timeDiff > 1000 || full) {
            this.updateCharts(simulations, full);
            this.lastUpdatedOn = new Date();
        }
        else {

            window.clearTimeout(this.refreshTimerId);
            this.refreshTimerId = window.setTimeout(() => {
                this.updateCharts(simulations, full);
                this.lastUpdatedOn = new Date();
            }, timeDiff);
        }
    }

    private updateCharts(simulations: Simulation[], full: boolean) {
        let showDeltas: boolean = $("#chkShowDeltas").prop("checked");
        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);

        if (this.selectedNode == -1)
            this.updateChartsForAll(selectedSimulation, simulations, full, showDeltas);
        else
            this.updateChartsForNode(selectedSimulation, simulations, full, showDeltas);
    }

    private updateChartsForNode(selectedSimulation: Simulation, simulations: Simulation[], full: boolean, showDeltas: boolean) {
        let firstNode = selectedSimulation.nodes[this.selectedNode];

        if ((<Value[]>firstNode[this.selectedPropertyForChart]).length > 0) {
            if (this.currentChart == null || full) {

                let series = [];
                for (let i = 0; i < simulations.length; i++) {
                    let values = <Value[]>simulations[i].nodes[this.selectedNode][this.selectedPropertyForChart];

                    var selectedData = [];

                    if (!showDeltas) {
                        for (let i = 0; i < values.length; i++)
                            selectedData.push({ x: values[i].timestamp, y: values[i].value });
                    }
                    else {
                        selectedData.push({ x: values[0].timestamp, y: values[0].value });
                        for (let i = 1; i < values.length; i++)
                            selectedData.push({ x: values[i].timestamp, y: values[i].value - values[i - 1].value });
                    }

                    series.push({
                        name: this.simulationContainer.getStream(i),
                        data: selectedData
                    });
                }



                let self = this;
                let title = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "'] td").get(0)).text();


                $('#nodeChart').empty().highcharts({
                    chart: {
                        type: 'spline',
                        animation: "Highcharts.svg", // don't animate in old IE
                        marginRight: 10,
                        events: {
                            load: function () {
                                self.currentChart = (<HighchartsChartObject>this);
                            }
                        },
                        zoomType: "x"
                    },
                    plotOptions: {
                        series: {
                            animation: false,
                            marker: { enabled: false }
                        }
                    },
                    title: { text: title },
                    xAxis: {
                        type: 'linear',
                        tickPixelInterval: 100,
                    },
                    yAxis: {
                        title: { text: 'Value' },
                        plotLines: [{
                            value: 0,
                            width: 1,
                            color: '#808080'
                        }]
                    },
                    legend: { enabled: false },
                    series: series,
                    credits: false
                });

            }
            else {
                for (let s = 0; s < simulations.length; s++) {
                    let values = <Value[]>simulations[s].nodes[this.selectedNode][this.selectedPropertyForChart];
                    if (!showDeltas || values.length < 2) {
                        for (let i = this.currentChart.series[s].data.length; i < values.length; i++) {
                            let val = values[i];
                            this.currentChart.series[s].addPoint([val.timestamp, val.value], false, false);
                        }
                    }
                    else {
                        for (let i = this.currentChart.series[s].data.length; i < values.length; i++) {
                            let beforeVal = values[i - 1];
                            let val = values[i];
                            this.currentChart.series[s].addPoint([val.timestamp, val.value - beforeVal.value], false, false);
                        }
                    }
                }

                this.currentChart.redraw(false);
            }
        }


        if (firstNode.totalReceiveActiveTime.length > 0 && firstNode.totalReceiveDozeTime.length > 0) {
            let activeDozePieData = [{ name: "Active", y: firstNode.totalReceiveActiveTime[firstNode.totalReceiveActiveTime.length - 1].value },
                { name: "Doze", y: firstNode.totalReceiveDozeTime[firstNode.totalReceiveDozeTime.length - 1].value }]
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }

        if (firstNode.nrOfTransmissions.length > 0 && firstNode.nrOfTransmissionsDropped.length > 0) {
            let activeTransmissionsSuccessDroppedData = [{ name: "OK", y: firstNode.nrOfTransmissions[firstNode.nrOfTransmissions.length - 1].value - firstNode.nrOfTransmissionsDropped[firstNode.nrOfTransmissionsDropped.length - 1].value },
                { name: "Dropped", y: firstNode.nrOfTransmissionsDropped[firstNode.nrOfTransmissionsDropped.length - 1].value }]
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }

        if (firstNode.nrOfReceives.length > 0 && firstNode.nrOfReceivesDropped.length > 0) {
            let activeReceivesSuccessDroppedData = [{ name: "OK", y: firstNode.nrOfReceives[firstNode.nrOfReceives.length - 1].value - firstNode.nrOfReceivesDropped[firstNode.nrOfReceivesDropped.length - 1].value },
                { name: "Dropped", y: firstNode.nrOfReceivesDropped[firstNode.nrOfReceivesDropped.length - 1].value }]
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }

        if (firstNode.nrOfSuccessfulPackets.length > 0 && firstNode.nrOfDroppedPackets.length > 0) {
            let activePacketsSuccessDroppedData = [{ name: "OK", y: firstNode.nrOfSuccessfulPackets[firstNode.nrOfSuccessfulPackets.length - 1].value },
                { name: "Dropped", y: firstNode.nrOfDroppedPackets[firstNode.nrOfDroppedPackets.length - 1].value }]
            this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
        }
    }

    private updateChartsForAll(selectedSimulation: Simulation, simulations: Simulation[], full: boolean, showDeltas: boolean) {
        this.updateDistributionChart(selectedSimulation, showDeltas);
        //this.updateAverageChart(selectedSimulation, showDeltas);

        let totalReceiveActiveTime = this.getAverageAndStdDevValue(selectedSimulation, "totalReceiveActiveTime");
        let totalReceiveDozeTime = this.getAverageAndStdDevValue(selectedSimulation, "totalReceiveDozeTime");

        if (totalReceiveActiveTime.length > 0 && totalReceiveDozeTime.length > 0) {
            let activeDozePieData = [{ name: "Active", y: totalReceiveActiveTime[0] },
                { name: "Doze", y: totalReceiveDozeTime[0] }]
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }

        let nrOfTransmissions = this.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissions");
        let nrOfTransmissionsDropped = this.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissionsDropped");

        if (nrOfTransmissions.length > 0 && nrOfTransmissionsDropped.length > 0) {
            let activeTransmissionsSuccessDroppedData = [{ name: "OK", y: nrOfTransmissions[0] - nrOfTransmissionsDropped[0] },
                { name: "Dropped", y: nrOfTransmissionsDropped[0] }]
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }

        let nrOfReceives = this.getAverageAndStdDevValue(selectedSimulation, "nrOfReceives");
        let nrOfReceivesDropped = this.getAverageAndStdDevValue(selectedSimulation, "nrOfReceivesDropped");

        if (nrOfReceives.length > 0 && nrOfReceivesDropped.length > 0) {
            let activeReceivesSuccessDroppedData = [{ name: "OK", y: nrOfReceives[0] - nrOfReceivesDropped[0] },
                { name: "Dropped", y: nrOfReceivesDropped[0] }]
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }

        let nrOfSuccessfulPackets = this.getAverageAndStdDevValue(selectedSimulation, "nrOfSuccessfulPackets");
        let nrOfDroppedPackets = this.getAverageAndStdDevValue(selectedSimulation, "nrOfDroppedPackets");

        if (nrOfSuccessfulPackets.length > 0 && nrOfDroppedPackets.length > 0) {
            let activePacketsSuccessDroppedData = [{ name: "OK", y: nrOfSuccessfulPackets[0] },
                { name: "Dropped", y: nrOfDroppedPackets[0] }]
            this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
        }
    }

    private updateDistributionChart(selectedSimulation: Simulation, showDeltas: boolean) {
        let series = [];

        // to ensure we can easily compare we need to have the scale on the X-axis starting and ending on the same values
        // so determine the overall minimum and maximum
        let overallMin = Number.MAX_VALUE;
        let overallMax = Number.MIN_VALUE;
        for (let s of this.simulationContainer.getStreams()) {
            let mm = this.getMinMaxOfProperty(s, this.selectedPropertyForChart, showDeltas);
            if (mm.length > 0) {
                if (overallMin > mm[0]) overallMin = mm[0];
                if (overallMax < mm[1]) overallMax = mm[1];
            }
        }

        let minMax = this.getMinMaxOfProperty(this.selectedStream, this.selectedPropertyForChart, showDeltas);
        // create 100 classes
        let nrOfClasses = 100;

        let classSize = (minMax[1] - minMax[0]) / nrOfClasses;

        let seriesValues = new Array(nrOfClasses + 1);
        for (let i = 0; i <= nrOfClasses; i++)
            seriesValues[i] = 0;

        for (var i = 0; i < selectedSimulation.nodes.length; i++) {
            let values = <Value[]>selectedSimulation.nodes[i][this.selectedPropertyForChart];
            if (showDeltas && values.length > 1) {
                let curVal = values[values.length - 1].value;
                let beforeVal = values[values.length - 2].value;
                let val = curVal - beforeVal;
                let alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
            else if (values.length > 0) {
                let val = values[values.length - 1].value;
                let alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
        }

        for (let i = 0; i <= seriesValues.length; i++) {
            let classStartValue = minMax[0] + classSize * i;
            series.push([classStartValue, seriesValues[i]]);
        }

        let self = this;
        let title = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "'] td").get(0)).text();


        $('#nodeChart').empty().highcharts({
            chart: {
                type: 'column',
                animation: "Highcharts.svg", // don't animate in old IE
                alignTicks: false,
                events: {
                    load: function () {
                        self.currentChart = (<HighchartsChartObject>this);
                    }
                },
            },
            title: { text: "Distribution of " + title },
            plotOptions: {
                series: {
                    animation: false,
                    marker: { enabled: false },
                    shadow: false,
                },
                column: {
                    borderWidth: 0,
                    pointPadding: 0,
                    groupPadding: 0,
                    pointWidth: 10
                }
            },
            xAxis: {
                min: overallMin,
                max: overallMax
            },
            yAxis: {
                endOnTick: false
            },
            series: [{
                name: " ",
                data: series
            }],
            legend: { enabled: false },
            credits: false
        });
    }


    private updateAverageChart(selectedSimulation: Simulation, showDeltas: boolean) {

        let self = this;
        let title = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "'] td").get(0)).text();

        let averages = [];
        let ranges = [];
        let nrOfValues = (<Value[]>selectedSimulation.nodes[0][this.selectedPropertyForChart]).length;

        for (var i = 0; i < nrOfValues; i++) {

            let minVal = Number.MAX_VALUE;
            let maxVal = Number.MIN_VALUE;
            let sum = 0;
            let count = 0;

            let timestamp = (<Value[]>selectedSimulation.nodes[0][this.selectedPropertyForChart])[i].timestamp;
            for (let n of selectedSimulation.nodes) {
                let values = (<Value[]>n[this.selectedPropertyForChart]);
                if (i < values.length) {
                    let value = values[i].value;
                    sum += value;
                    count++;
                    if (minVal > value) minVal = value;
                    if (maxVal < value) maxVal = value;
                }
            }

            let avg = sum / count;
            averages.push([timestamp, avg]);
            ranges.push([timestamp, minVal, maxVal]);
        }


        $('#nodeChart').empty().highcharts({
            chart: {
                animation: "Highcharts.svg", // don't animate in old IE
                marginRight: 10,
                events: {
                    load: function () {
                        self.currentChart = (<HighchartsChartObject>this);
                    }
                },
                zoomType: "x"
            },
            plotOptions: {
                series: {
                    animation: false,
                    marker: { enabled: false }
                }
            },
            title: { text: title },
            xAxis: {
                type: 'linear',
                tickPixelInterval: 100,
            },
            yAxis: {
                title: { text: 'Value' },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            legend: { enabled: false },
            series: [{
                name: title,
                type: "spline",
                data: averages,
                zIndex: 1,
            }, <any>{
                name: 'Range',
                data: ranges,
                type: 'arearange',
                zIndex: 0,
                lineWidth: 0,
                linkedTo: ':previous',
                color: Highcharts.getOptions().colors[0],
                fillOpacity: 0.3,
            }],
            credits: false
        });
    }

    createPieChart(selector: string, title: string, data: any) {
        $(selector).empty().highcharts({
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
                marginTop: 20
            },
            title: { text: title, style: { fontSize: "0.8em" } },
            tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>' },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: false,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    },
                    animation: false
                }
            },
            series: [{ data: data }],
            credits: false,
            exporting: { enabled: false }
        });
    }

}

interface IEntry {
    stream: string;
    line: string;
}
interface IEntries {
    stream: string;
    lines: string[];
}

function getParameterByName(name: string, url?: string) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return "";
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(document).ready(function () {


    let sim: SimulationGUI = null;
    let evManager: EventManager = null;

    let time = new Date().getTime();


    let canvas = <HTMLCanvasElement>$("#canv").get(0);
    sim = new SimulationGUI(canvas);

    let streams: string[];
    let compare = getParameterByName("compare");
    if (compare == "")
        streams = ["live"];
    else
        streams = compare.split(',');
    for (let stream of streams) {
        let rdb = `<input class="rdbStream" name="streams" type='radio' data-stream='${stream}'>&nbsp;`;
        $("#rdbStreams").append(rdb);
    }
    sim.selectedStream = streams[0];
    $(`.rdbStream[data-stream='${sim.selectedStream}']`).prop("checked", true);

    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    let opts = {
        reconnection: false,
        timeout: 1000000
    };


    let hasConnected = false;
    var sock: SocketIO.Socket = io.connect("http://" + window.location.host + "/");
    sock.on("connect", function (data) {
        if (hasConnected) // only connect once
            return;

        hasConnected = true
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim);



        console.log("Subscribing to " + streams);
        sock.emit("subscribe", {
            simulations: streams
        });

    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });

    sock.on("fileerror", function (data: string) {
        alert("Error: " + data);
    });

    sock.on("entry", function (data: IEntry) {
        evManager.onReceive(data);
        //console.log("Received " + data.stream + ": " + data.line);
    });

    sock.on("bulkentry", function (data: IEntries) {
        evManager.onReceiveBulk(data);
        //console.log("Received " + data.stream + ": " + data.line);
    });

    $(canvas).keydown(ev => {
        if (!sim.simulationContainer.hasSimulations())
            return;

        if (ev.keyCode == 37) {
            // left
            if (sim.selectedNode - 1 >= 0)
                sim.changeNodeSelection(sim.selectedNode-1);

        }
        else if (ev.keyCode == 39) {
            // right
            if (sim.selectedNode + 1 < sim.simulationContainer.getSimulation(sim.selectedStream).nodes.length) {
                sim.changeNodeSelection(sim.selectedNode+1);
            }
        }
    });

    $(canvas).click(ev => {
        if (!sim.simulationContainer.hasSimulations())
            return;

        var rect = canvas.getBoundingClientRect();
        let x = (ev.clientX - rect.left) / (canvas.width / sim.area);
        let y = (ev.clientY - rect.top) / (canvas.width / sim.area);

        let selectedSimulation = sim.simulationContainer.getSimulation(sim.selectedStream);
        let selectedNode: SimulationNode = null;
        for (let n of selectedSimulation.nodes) {

            let dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
            if (dist < 20) {
                selectedNode = n;
                break;
            }
        }
        if (selectedNode != null)
            sim.changeNodeSelection(selectedNode.id);
        else
            sim.changeNodeSelection(-1);
    })
    $(".nodeProperty").click(function (ev) {
        $(".nodeProperty").removeClass("selected");
        $(this).addClass("selected");
        sim.selectedPropertyForChart = $(this).attr("data-property");
        sim.updateGUI(true);
    });

    $("#chkShowDeltas").change(function (ev) {
        sim.updateGUI(true);
    });

    $(".rdbStream").change(function (ev) {
        let rdbs = $(".rdbStream");
        for (let i = 0; i < rdbs.length; i++) {
            let rdb = $(rdbs.get(i));
            if (rdb.prop("checked")) {
                sim.selectedStream = rdb.attr("data-stream");
                sim.updateGUI(true);
            }
        }
    });

    $('.header').click(function () {
        $(this).find('span').text(function (_, value) { return value == '-' ? '+' : '-' });
        $(this).nextUntil('tr.header').slideToggle(100, function () {
        });
    });


    loop();


    function loop() {
        sim.draw();
        let newTime = new Date().getTime();

        let dt = newTime - time;

        sim.update(dt);
        if (evManager != null) {
            try {
                evManager.processEvents();
            }
            catch (e) {
                console.error(e);
            }
        }

        time = newTime;

        window.setTimeout(loop, 25);
    }

});
