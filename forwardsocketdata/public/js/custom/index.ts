/// <reference path="../../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../../typings/globals/highcharts/index.d.ts" />

declare class io {
    static connect(url: string): SocketIO.Socket;
}

class SimulationGUI {

    public simulation: Simulation = new Simulation();
    public selectedNode: number = 0;
    public selectedPropertyForChart: string = "totalTransmitTime";

    private ctx: CanvasRenderingContext2D;
    private animations: Animation[] = [];

    area: number = 2000;

    private currentChart: HighchartsChartObject = null;

    private heatMapPalette: Palette;
    private rawGroupColors: Color[] = [new Color(0, 0, 255), new Color(0, 128, 255), new Color(0, 255, 128), new Color(0, 255, 255), new Color(128, 0, 255), new Color(255, 0, 255)];

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
        this.ctx.strokeStyle = "#CCC";
        for (let n of this.simulation.nodes) {
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

    private getMaxOfProperty(prop: string): number {
        let curMax: number = Number.MIN_VALUE;
        if (prop != "") {
            for (let n of this.simulation.nodes) {
                let values = (<Value[]>n[this.selectedPropertyForChart]);
                if (values.length > 0) {
                    let value = values[values.length - 1].value;
                    if (curMax < value) curMax = value;
                }
            }
            return curMax;
        }
        else
            return 0;

    }
    private getColorForNode(n: SimulationNode, curMax: number): string {
        if (this.selectedPropertyForChart != "") {
            let el = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "']").get(0));
            let type = el.attr("data-type");
            if (typeof type != "undefined" && type != "") {
                let min = parseInt(el.attr("data-min"));
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

        let curMax = this.getMaxOfProperty(this.selectedPropertyForChart);

        for (let n of this.simulation.nodes) {
            this.ctx.beginPath();

            if (n.type == "AP") {
                this.ctx.fillStyle = "black";
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 6, 0, Math.PI * 2, false);
            }
            else {
                this.ctx.fillStyle = this.getColorForNode(n, curMax);
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 3, 0, Math.PI * 2, false);
            }
            this.ctx.fill();

            if (this.selectedNode == n.id) {
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

    onNodeUpdated(id: number) {
        if (id == this.selectedNode)
            this.updateNodeGUI(false);
    }

    onNodeAdded(id: number) {
        if (id == this.selectedNode)
            this.updateNodeGUI(true);
    }

    onNodeAssociated(id: number) {
        let n = this.simulation.nodes[id];
        this.addAnimation(new AssociatedAnimation(n.x, n.y));
    }

    onSimulationTimeUpdated(time: number) {
        $("#simCurrentTime").text(time);
    }

    changeNodeSelection(id: number) {
        this.selectedNode = id;
        this.updateNodeGUI(true);
    }

    private refreshTimerId:number = -1;
    private lastUpdatedOn:Date = new Date();

    updateNodeGUI(full: boolean) {
        if (this.selectedNode < 0 || this.selectedNode >= this.simulation.nodes.length)
            return;

        let node = this.simulation.nodes[this.selectedNode];

        $("#simulationName").text(this.simulation.config.name);

        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);
        if (node.type == "STA" && !(<STANode>node).isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeGroupNumber").text(node.groupNumber);
        }

        var configElements = $(".configProperty");
        for (let i = 0; i < configElements.length; i++) {
            let prop = $(configElements[i]).attr("data-property");
            $($(configElements[i]).find("td").get(1)).text(this.simulation.config[prop]);
        }

        var propertyElements = $(".nodeProperty");
        for (let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");
            let values = <Value[]>node[prop];
            if (values.length > 0)
                $($(propertyElements[i]).find("td").get(1)).text(values[values.length - 1].value);
        }


        // prevent update flood by max 1 update per second or when gui changed
        let timeDiff = new Date().getTime() - this.lastUpdatedOn.getTime();
        if(timeDiff > 1000 || full) {
            this.updateCharts(node, true);
            this.lastUpdatedOn = new Date();
        }
        else {
            
            window.clearTimeout(this.refreshTimerId);
            this.refreshTimerId = window.setTimeout(() => {
                this.updateCharts(node, true);
                this.lastUpdatedOn = new Date();
            }, timeDiff);
        }
        
        
    }

    private updateCharts(node:SimulationNode, full:boolean) {
        let showDeltas: boolean = $("#chkShowDeltas").prop("checked");

        let values = <Value[]>node[this.selectedPropertyForChart];
        if (values.length > 0) {
            if (this.currentChart == null || full) {

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
                        }
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
                        name: this.selectedPropertyForChart,
                        data: selectedData
                    }],
                    credits: false
                });

            }
            else {
                let lastValue = values[values.length - 1];
                if (!showDeltas)
                    this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);
                else {
                    if (values.length >= 2) {
                        let beforeLastValue = values[values.length - 2];
                        this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value - beforeLastValue.value], true, false);
                    }
                    else
                        this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);
                }
            }
        }


        if (node.totalReceiveActiveTime.length > 0 && node.totalReceiveDozeTime.length > 0) {
            let activeDozePieData = [{ name: "Active", y: node.totalReceiveActiveTime[node.totalReceiveActiveTime.length - 1].value },
                { name: "Doze", y: node.totalReceiveDozeTime[node.totalReceiveDozeTime.length - 1].value }]
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }

        if (node.nrOfTransmissions.length > 0 && node.nrOfTransmissionsDropped.length > 0) {
            let activeTransmissionsSuccessDroppedData = [{ name: "OK", y: node.nrOfTransmissions[node.nrOfTransmissions.length - 1].value - node.nrOfTransmissionsDropped[node.nrOfTransmissionsDropped.length - 1].value },
                { name: "Dropped", y: node.nrOfTransmissionsDropped[node.nrOfTransmissionsDropped.length - 1].value }]
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }

        if (node.nrOfReceives.length > 0 && node.nrOfReceivesDropped.length > 0) {
            let activeReceivesSuccessDroppedData = [{ name: "OK", y: node.nrOfReceives[node.nrOfReceives.length - 1].value - node.nrOfReceivesDropped[node.nrOfReceivesDropped.length - 1].value },
                { name: "Dropped", y: node.nrOfReceivesDropped[node.nrOfReceivesDropped.length - 1].value }]
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }

        if (node.nrOfSuccessfulPackets.length > 0 && node.nrOfDroppedPackets.length > 0) {
            let activePacketsSuccessDroppedData = [{ name: "OK", y: node.nrOfSuccessfulPackets[node.nrOfSuccessfulPackets.length - 1].value },
                { name: "Dropped", y: node.nrOfDroppedPackets[node.nrOfDroppedPackets.length - 1].value }]
            this.createPieChart("#nodeChartUDPPacketSuccessDropped", 'UDP Packets OK/dropped', activePacketsSuccessDroppedData);
        }
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



$(document).ready(function () {


    let sim: SimulationGUI = null;
    let evManager: EventManager = null;

    let time = new Date().getTime();


    let canvas = <HTMLCanvasElement>$("#canv").get(0);
    sim = new SimulationGUI(canvas);

    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var sock: SocketIO.Socket = io.connect("http://" + window.location.host + "/");
    sock.on("connect", function (data) {
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim, sock);
    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });

    $(canvas).click(ev => {
        var rect = canvas.getBoundingClientRect();
        let x = (ev.clientX - rect.left) / (canvas.width / sim.area);
        let y = (ev.clientY - rect.top) / (canvas.width / sim.area);

        let selectedNode: SimulationNode = null;
        for (let n of sim.simulation.nodes) {

            let dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
            if (dist < 20) {
                selectedNode = n;
                break;
            }
        }
        if (selectedNode != null)
            sim.changeNodeSelection(selectedNode.id);
    })
    $(".nodeProperty").click(function (ev) {
        $(".nodeProperty").removeClass("selected");
        $(this).addClass("selected");
        sim.selectedPropertyForChart = $(this).attr("data-property");

        sim.updateNodeGUI(true);
    });

    $("#chkShowDeltas").change(function (ev) {
        sim.updateNodeGUI(true);
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
