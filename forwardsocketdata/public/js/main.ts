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

    type: string = "";

    totalTransmittedTime:Value[] = [];
}

class Value {
    constructor(public timestamp:number, public value:number) { }
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
    public selectedNode:number = 0;
    public selectedPropertyForChart:string = "totalTransmittedTime";

    private ctx: CanvasRenderingContext2D;
    private animations: Animation[] = [];

    private area:number = 2000;

    private currentChart:HighchartsChartObject;

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    }

    draw() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawNodes();

        for (let a of this.animations) {
            a.draw(this.ctx);
        }
    }

    private drawNodes() {
        this.ctx.fillStyle = "black";
        for (let n of this.simulation.nodes) {
            this.ctx.beginPath();

            if (n.type == "AP")
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 6, 0, Math.PI * 2, false);
            else
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 3, 0, Math.PI * 2, false);

            this.ctx.fill();
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

    onNodeUpdated(id:number) {
        if(id == this.selectedNode)
            this.updateNodeGUI(false);
    }

    onNodeAdded(id:number) {
        if(id == this.selectedNode)
            this.updateNodeGUI(true);
    }

    updateNodeGUI(full:boolean) {
        if(this.selectedNode < 0 || this.selectedNode >= this.simulation.nodes.length)
            return;

        let node = this.simulation.nodes[this.selectedNode];

        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);

        if(node.totalTransmittedTime.length > 0)
            $("#nodeTotalTransmittedTime").text(node.totalTransmittedTime[node.totalTransmittedTime.length-1].value);

        if(full) {
            let values = <Value[]>node[this.selectedPropertyForChart];
            var selectedData = [];
            for(let i = 0; i < values.length; i++)
                selectedData.push({ x: values[i].timestamp, y: values[i].value });

            let self = this;
            $('#nodeChart').highcharts({
                chart: {
                    type: 'spline',
                    animation: "Highcharts.svg", // don't animate in old IE
                    marginRight: 10, 
                    events: {
                    load: function () {
                        self.currentChart = (<HighchartsChartObject>this);
                    }}
                },
                xAxis: {
                    type: 'linear',
                    tickPixelInterval: 10000000
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
            let values =<Value[]>node[this.selectedPropertyForChart];
            let lastValue = values[values.length-1];
            this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, true);
        }
    }
}

abstract class Animation {

    protected time: number = 0;
    color: Color = new Color();
    abstract draw(ctx: CanvasRenderingContext2D);

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
    }

    draw(ctx: CanvasRenderingContext2D) {

        let radius = this.time / this.max_time * this.max_radius;

        this.color.a = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2, false);
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
    }

    draw(ctx: CanvasRenderingContext2D) {

        let radius = (1 - this.time / this.max_time) * this.max_radius;

        this.color.a = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2, false);
        ctx.stroke();
    }

    isFinished(): boolean {
        return this.time >= this.max_time;
    }
}


class Color {
    constructor(public r: number = 0, public g: number = 0, public b: number = 0, public a: number = 1) {
    }

    toString() {
        return `rgba(${this.r}, ${this.g},${this.b}, ${this.a})`;
    }
}

class SimulationEvent {
    constructor(public time: number, public parts: string[]) {

    }
}

class EventManager {

    events: SimulationEvent[] = [];

    constructor(private sim: SimulationGUI, sock:SocketIO.Socket) {

        let self = this;
        sock.on("entry", function (data) {
            self.onReceive(data);
            console.log(data);
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
                    this.onNodeAdded(true,parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]))
                    break;

                case 'apnodeadd':
                    this.onNodeAdded(false,-1, parseInt(ev.parts[2]), parseInt(ev.parts[3]))
                    break;

                case 'nodetx':
                    this.onNodeTx(parseInt(ev.parts[2]));
                    break;

                case 'noderx':
                    this.onNodeRx(parseInt(ev.parts[2]));
                    break;

                case 'nodestats':
                    this.onStatsUpdated(ev.time,
                                        parseInt(ev.parts[2]),
                                        parseInt(ev.parts[3]));
                    break;

                default:
            }

            this.events.shift();
        }
    }

    onReceive(line: string) {
        let parts = line.split(';');
        let time = parseInt(parts[0]);

        let ev = new SimulationEvent(time, parts);
        this.events.push(ev);
    }

    onStart() {
        simTime = 0;
        this.sim.simulation.nodes = [];
    }

    onNodeAdded(isSTA: boolean, id: number, x: number, y: number) {
        let n: SimulationNode = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;

        this.sim.simulation.nodes.push(n);

        this.sim.onNodeAdded(id);
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

    onStatsUpdated(timestamp:number, id: number, totalTransmitType:number) {
        // todo keep track of statistics
        sim.simulation.nodes[id].totalTransmittedTime.push(new Value(timestamp,totalTransmitType));

        sim.onNodeUpdated(id);
    }
}


let sim: SimulationGUI = null;
let evManager: EventManager = null;

let simTime = 0;
let time = new Date().getTime();

$(document).ready(function () {

    sim = new SimulationGUI(<HTMLCanvasElement>$("#canv").get(0));

    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var sock: SocketIO.Socket = io.connect("http://localhost:8080");
    sock.on("connect", function (data) {
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim, sock);
    }).on("error", function() {
        console.log("Unable to connect to server websocket endpoint");  
    });

    loop();
});


function loop() {
    sim.draw();
    let newTime = new Date().getTime();

    let dt = newTime - time;
    simTime += dt;

    sim.update(dt);
    if(evManager != null) {
        try {
            evManager.processEvents();
        }
        catch(e) {
            console.error(e);
        }
    }

    time = newTime;

    window.setTimeout(loop, 25);
}

