/// <reference path="../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../typings/globals/highcharts/index.d.ts" />

declare class io {
    static connect(url: string): SocketIO.Socket;
}

abstract class SimulationNode {

    id: number = -1;

    x: number = 0;
    y: number = 0;
    aId: number = 0;
    groupNumber: number = 0;

    type: string = "";

    totalTransmitTime: Value[] = [];
    totalReceiveTime: Value[] = [];
    totalReceiveDozeTime: Value[] = [];
    totalReceiveActiveTime: Value[] = [];

    nrOfTransmissions: Value[] = [];
    nrOfTransmissionsDropped: Value[] = [];
    nrOfReceives: Value[] = [];
    nrOfReceivesDropped: Value[] = [];

    nrOfSentPackets: Value[] = [];
    nrOfSuccessfulPackets: Value[] = [];
    nrOfDroppedPackets: Value[] = [];

    avgPacketTimeOfFlight: Value[] = [];
    throughputKbit: Value[] = [];
}

class Value {
    constructor(public timestamp: number, public value: number) { }
}

class APNode extends SimulationNode {
    type: string = "AP";
}

class STANode extends SimulationNode {
    type: string = "STA";
}

class Simulation {

    nodes: STANode[] = [];

}

class SimulationGUI {

    public simulation: Simulation = new Simulation();
    public selectedNode: number = 0;
    public selectedPropertyForChart: string = "totalTransmitTime";

    private ctx: CanvasRenderingContext2D;
    private animations: Animation[] = [];

    area: number = 2000;

    private currentChart: HighchartsChartObject;

    private heatMapPalette: Palette;

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

        return "black";
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

    updateNodeGUI(full: boolean) {
        if (this.selectedNode < 0 || this.selectedNode >= this.simulation.nodes.length)
            return;

        let node = this.simulation.nodes[this.selectedNode];

        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);
        $("#nodeAID").text(node.aId);
        $("#nodeGroupNumber").text(node.aId);

        var propertyElements = $(".nodeProperty");
        for (let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");
            let values = <Value[]>node[prop];
            if (values.length > 0)
                $($(propertyElements[i]).find("td").get(1)).text(values[values.length - 1].value);
        }

        let showDeltas: boolean = $("#chkShowDeltas").prop("checked");

        if (full) {
            let values = <Value[]>node[this.selectedPropertyForChart];
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
                title: { text: self.selectedPropertyForChart },
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
                }]
            });

        }
        else {
            let values = <Value[]>node[this.selectedPropertyForChart];
            let lastValue = values[values.length - 1];
            if (!showDeltas)
                this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);
            else {
                if(values.length >= 2) {
                    let beforeLastValue = values[values.length-2];
                    this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value - beforeLastValue.value], true, false);
                }
                else
                    this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);                
            } 
        }
    }
}

class SimulationEvent {
    constructor(public time: number, public parts: string[]) {

    }
}

class EventManager {

    events: SimulationEvent[] = [];

    constructor(private sim: SimulationGUI, sock: SocketIO.Socket) {

        let self = this;
        sock.on("entry", function (data) {
            self.onReceive(data);
        });
    }

    processEvents() {
        while (this.events.length > 0) {
            let ev = this.events[0];

            switch (ev.parts[1]) {
                case 'start':
                    this.onStart();
                    break;

                case 'stanodeadd':
                    this.onNodeAdded(true, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseInt(ev.parts[5]));
                    break;

                case 'stanodeassoc':
                    this.onNodeAssociated(parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]));
                    break;

                case 'apnodeadd':
                    this.onNodeAdded(false, -1, parseFloat(ev.parts[2]), parseFloat(ev.parts[3]), -1);
                    break;

                case 'nodetx':
                    this.onNodeTx(parseInt(ev.parts[2]));
                    break;

                case 'noderx':
                    this.onNodeRx(parseInt(ev.parts[2]));
                    break;

                case 'nodestats':
                    /*send({"nodestats", std::to_string(i),
                std::to_string(stats.get(i).TotalTransmitTime.GetMilliSeconds()),
                std::to_string(stats.get(i).TotalReceiveTime.GetMilliSeconds()),
                std::to_string(stats.get(i).TotalReceiveDozeTime.GetMilliSeconds()),
                std::to_string(stats.get(i).TotalReceiveActiveTime.GetMilliSeconds()),
    
                std::to_string(stats.get(i).NumberOfTransmissions),
                std::to_string(stats.get(i).NumberOfTransmissionsDropped),
                std::to_string(stats.get(i).NumberOfReceives),
                std::to_string(stats.get(i).NumberOfReceivesDropped),
    
                std::to_string(stats.get(i).NumberOfSentPackets),
                std::to_string(stats.get(i).NumberOfSuccessfulPackets),
                std::to_string(stats.get(i).NumberOfDroppedPackets),
    
                std::to_string(stats.get(i).getAveragePacketTimeOfFlight().GetMilliSeconds()),
                std::to_string(stats.get(i).getThroughputKbit())
            });
                */
                    this.onStatsUpdated(ev.time, parseInt(ev.parts[2]),
                        parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]),
                        parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]),
                        parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]),
                        parseFloat(ev.parts[14]), parseFloat(ev.parts[15]));
                    break;

                default:
            }

            this.sim.onSimulationTimeUpdated(ev.time);

            this.events.shift();
        }
    }

    onReceive(line: string) {
        let parts = line.split(';');
        let time = parseInt(parts[0]);
        time = time / (1000 * 1000); // ns -> ms

        let ev = new SimulationEvent(time, parts);
        this.events.push(ev);
    }

    onStart() {
        this.sim.simulation.nodes = [];
    }

    onNodeAdded(isSTA: boolean, id: number, x: number, y: number, aId: number) {
        let n: SimulationNode = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        n.aId = aId;

        this.sim.simulation.nodes.push(n);

        this.sim.onNodeAdded(id);
    }

    onNodeAssociated(id: number, aId: number, groupNumber: number) {
        let n = this.sim.simulation.nodes[id];
        n.aId = aId;
        n.groupNumber = groupNumber;
        this.sim.onNodeAssociated(id);
    }

    onNodeTx(id: number) {
        let n = this.sim.simulation.nodes[id];
        let a = new BroadcastAnimation(n.x, n.y);
        a.max_radius = 20;
        a.color = new Color(255, 0, 0, 1);
        sim.addAnimation(a);
        this.sim.addAnimation(a);
    }

    onNodeRx(id: number) {
        let n = this.sim.simulation.nodes[id];
        let a = new ReceivedAnimation(n.x, n.y);
        a.max_radius = 20;
        a.color = new Color(255, 0, 0, 1);
        sim.addAnimation(a);
        this.sim.addAnimation(a);
    }

    hasIncreased(values: Value[]): boolean {
        if (values.length >= 2) {
            let oldVal = values[values.length - 2].value;
            let newVal = values[values.length - 1].value;

            return oldVal < newVal;
        }
        else
            return false;
    }

    onStatsUpdated(timestamp: number, id: number,
        totalTransmitTime: number, totalReceiveTime: number, totalReceiveDozeTime: number, totalReceiveActiveTime: number,
        nrOfTransmissions: number, nrOfTransmissionsDropped: number, nrOfReceives: number, nrOfReceivesDropped: number,
        nrOfSentPackets: number, nrOfSuccessfulPackets: number, nrOfDroppedPackets: number,
        avgPacketTimeOfFlight: number, throughputKbit: number) {
        // todo keep track of statistics

        let n = sim.simulation.nodes[id];
        n.totalTransmitTime.push(new Value(timestamp, totalTransmitTime));

        n.totalReceiveTime.push(new Value(timestamp, totalReceiveTime));
        n.totalReceiveDozeTime.push(new Value(timestamp, totalReceiveDozeTime));
        n.totalReceiveActiveTime.push(new Value(timestamp, totalReceiveActiveTime));

        n.nrOfTransmissions.push(new Value(timestamp, nrOfTransmissions));
        n.nrOfTransmissionsDropped.push(new Value(timestamp, nrOfTransmissionsDropped));
        n.nrOfReceives.push(new Value(timestamp, nrOfReceives));
        n.nrOfReceivesDropped.push(new Value(timestamp, nrOfReceivesDropped));

        n.nrOfSentPackets.push(new Value(timestamp, nrOfSentPackets));
        n.nrOfSuccessfulPackets.push(new Value(timestamp, nrOfSuccessfulPackets));
        n.nrOfDroppedPackets.push(new Value(timestamp, nrOfDroppedPackets));

        n.avgPacketTimeOfFlight.push(new Value(timestamp, avgPacketTimeOfFlight));
        n.throughputKbit.push(new Value(timestamp, throughputKbit));

        if (this.hasIncreased(n.totalTransmitTime)) {
            sim.addAnimation(new BroadcastAnimation(n.x, n.y));
        }

        //if(this.hasIncreased(n.totalReceiveActiveTime))
        //   sim.addAnimation(new ReceivedAnimation(n.x, n.y));

        sim.onNodeUpdated(id);
    }
}


let sim: SimulationGUI = null;
let evManager: EventManager = null;

let time = new Date().getTime();

$(document).ready(function () {

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
        let x = ev.clientX / (canvas.width / sim.area);
        let y = ev.clientY / (canvas.width / sim.area);

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
});


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











abstract class Animation {

    protected time: number = 0;
    color: Color = new Color(0, 0, 0, 1, 0);
    abstract draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number);

    update(dt: number) {
        this.time += dt;
    }

    abstract isFinished(): boolean;
}

class BroadcastAnimation extends Animation {

    max_radius: number = 50;
    max_time: number = 1000;

    constructor(private x: number, private y: number) {
        super();
        this.color = new Color(255, 0, 0);
    }

    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number) {

        let radius = this.time / this.max_time * this.max_radius;

        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}

class ReceivedAnimation extends Animation {

    max_radius: number = 10;
    max_time: number = 1000;

    constructor(private x: number, private y: number) {
        super();
        this.color = new Color(0, 255, 0);
    }

    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number) {

        let radius = (1 - this.time / this.max_time) * this.max_radius;

        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}


class AssociatedAnimation extends Animation {

    max_time: number = 3000;

    constructor(private x: number, private y: number) {
        super();
    }

    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, area: number) {

        let offset = this.time / this.max_time * Math.PI * 2;

        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.setLineDash(([10, 2]));
        ctx.lineWidth = 3;
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), 10, offset, offset + Math.PI * 2, false);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}


class Color {

    red: number;
    green: number;
    blue: number;
    position: number;
    alpha: number;

    constructor(red: number, green: number, blue: number, alpha: number = 1, position: number = 0) {

        this.red = Math.floor(red);
        this.green = Math.floor(green);
        this.blue = Math.floor(blue);
        this.alpha = alpha;
        this.position = Math.round(position * 100) / 100;
    }

    toString() {
        return `rgba(${this.red}, ${this.green},${this.blue}, ${this.alpha})`;
    }
}

class Palette {

    private colors: Color[] = [];
    private lookup: Color[] = [];

    buildLookup() {
        this.lookup = [];
        for (var i = 0; i < 1000; i++)
            this.lookup.push(this.getColorAt(i / 1000));
    };

    getColorFromLookupAt(position: number) {
        let idx;
        if (isNaN(position))
            idx = 0;
        else
            idx = Math.floor(position * this.lookup.length);

        if (idx < 0) idx = 0;
        if (idx >= this.lookup.length) idx = this.lookup.length - 1;
        return this.lookup[idx];
    };


    getColorAt(position: number): Color {

        if (position < this.colors[0].position)
            return this.colors[0];

        if (position >= this.colors[this.colors.length - 1].position)
            return this.colors[this.colors.length - 1];

        for (let i = 0; i < this.colors.length; i++) {

            if (position >= this.colors[i].position && position < this.colors[i + 1].position) {
                var relColorAlpha = (position - this.colors[i].position) / (this.colors[i + 1].position - this.colors[i].position);
                var red = this.colors[i].red * (1 - relColorAlpha) + this.colors[i + 1].red * (relColorAlpha);
                var green = this.colors[i].green * (1 - relColorAlpha) + this.colors[i + 1].green * (relColorAlpha);
                var blue = this.colors[i].blue * (1 - relColorAlpha) + this.colors[i + 1].blue * (relColorAlpha);

                return new Color(red, green, blue, 1, position);
            }
        }
    }

    addColor(c: Color) {
        this.colors.push(c);
    }

    drawTo(ctx: CanvasRenderingContext2D, width: number, height: number) {
        for (let i: number = 0; i < width; i++) {
            let pos = i / width;

            let c = this.getColorFromLookupAt(pos);
            ctx.fillStyle = `rgb(${c.red},${c.green},${c.blue})`;
            ctx.fillRect(i, 0, 1, height);
        }
    }
}