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

    totalTransmitTime:Value[] = [];
    totalReceiveTime:Value[] = [];
    totalReceiveDozeTime:Value[] = [];
    totalReceiveActiveTime:Value[] = [];
    throughputKbit:Value[] = []
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
    public selectedPropertyForChart:string = "totalTransmitTime";

    private ctx: CanvasRenderingContext2D;
    private animations: Animation[] = [];

    area:number = 2000;

    private currentChart:HighchartsChartObject;

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    }

    draw() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawNodes();

        for (let a of this.animations) {
            a.draw(this.canvas, this.ctx, this.area);
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

    onSimulationTimeUpdated(time:number) {
        $("#simCurrentTime").text(time);
    }

    changeNodeSelection(id:number) {
        this.selectedNode = id;
        this.updateNodeGUI(true);
    }

    updateNodeGUI(full:boolean) {
        if(this.selectedNode < 0 || this.selectedNode >= this.simulation.nodes.length)
            return;

        let node = this.simulation.nodes[this.selectedNode];

        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);

        var propertyElements = $(".nodeProperty");
        for(let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");
            let values = <Value[]>node[prop];
            if(values.length > 0)
                $($(propertyElements[i]).find("td").get(1)).text(values[values.length-1].value);
        }

        if(full) {
            let values = <Value[]>node[this.selectedPropertyForChart];
            var selectedData = [];
            for(let i = 0; i < values.length; i++)
                selectedData.push({ x: values[i].timestamp, y: values[i].value });
                
            let self = this;
            $('#nodeChart').empty().highcharts({
                chart: {
                    type: 'spline',
                    animation: "Highcharts.svg", // don't animate in old IE
                    marginRight: 10, 
                    events: {
                    load: function () {
                        self.currentChart = (<HighchartsChartObject>this);
                    }}
                },
                plotOptions: {
                    series: { 
                        animation: false,
                        marker: { enabled:false }  
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
            let values =<Value[]>node[this.selectedPropertyForChart];
            let lastValue = values[values.length-1];
            this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);
        }
    }
}

abstract class Animation {

    protected time: number = 0;
    color: Color = new Color();
    abstract draw(canvas:HTMLCanvasElement, ctx: CanvasRenderingContext2D, area:number);

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
        this.color = new Color(255,0,0);
    }

    draw(canvas:HTMLCanvasElement, ctx: CanvasRenderingContext2D, area:number) {

        let radius = this.time / this.max_time * this.max_radius;

        this.color.a = 1 - this.time / this.max_time;
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
        this.color = new Color(0,255,0);
    }

    draw(canvas:HTMLCanvasElement, ctx: CanvasRenderingContext2D, area:number) {

        let radius = (1 - this.time / this.max_time) * this.max_radius;

        this.color.a = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y* (canvas.width / area), radius, 0, Math.PI * 2, false);
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
                    this.onNodeAdded(true,parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]))
                    break;

                case 'apnodeadd':
                    this.onNodeAdded(false,-1, parseFloat(ev.parts[2]), parseFloat(ev.parts[3]))
                    break;

                case 'nodetx':
                    this.onNodeTx(parseInt(ev.parts[2]));
                    break;

                case 'noderx':
                    this.onNodeRx(parseInt(ev.parts[2]));
                    break;

                case 'nodestats':
                    this.onStatsUpdated(ev.time, parseInt(ev.parts[2]),
                                        parseInt(ev.parts[3]), parseInt(ev.parts[4]), parseInt(ev.parts[5]), parseInt(ev.parts[6]), 
                                        parseFloat(ev.parts[7]));
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
        time = time / (1000*1000); // ns -> ms

        let ev = new SimulationEvent(time, parts);
        this.events.push(ev);
    }

    onStart() {
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

    hasIncreased(values:Value[]):boolean {
        if(values.length >= 2) {
            let oldVal = values[values.length-2].value;
            let newVal = values[values.length-1].value;
 
            return oldVal < newVal;
        }
        else
            return false;
    }

    onStatsUpdated(timestamp:number, id: number, totalTransmitTime:number, totalReceiveTime:number, totalReceiveDozeTime:number, totalReceiveActiveTime:number, throughputKbit:number) {
        // todo keep track of statistics

        let n = sim.simulation.nodes[id];
        n.totalTransmitTime.push(new Value(timestamp,totalTransmitTime));
        
        n.totalReceiveTime.push(new Value(timestamp,totalReceiveTime));
        n.totalReceiveDozeTime.push(new Value(timestamp,totalReceiveDozeTime));
        n.totalReceiveActiveTime.push(new Value(timestamp,totalReceiveActiveTime));

        n.throughputKbit.push(new Value(timestamp,throughputKbit));

        if(this.hasIncreased(n.totalTransmitTime)) {
            sim.addAnimation(new BroadcastAnimation(n.x, n.y));
        }

        if(this.hasIncreased(n.totalReceiveActiveTime))
            sim.addAnimation(new ReceivedAnimation(n.x, n.y));

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
    var sock: SocketIO.Socket = io.connect("http://localhost:8080");
    sock.on("connect", function (data) {
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim, sock);
    }).on("error", function() {
        console.log("Unable to connect to server websocket endpoint");  
    });

    $(canvas).click(ev => {
        let x = ev.clientX / (canvas.width / sim.area);
        let y = ev.clientY / (canvas.width / sim.area);

        let selectedNode:SimulationNode = null; 
        for(let n of sim.simulation.nodes) {
            
            let dist = Math.sqrt((n.x-x) **2 + (n.y - y) ** 2);
            if(dist < 20) {
                selectedNode = n;
                break;
            }
        }
        if(selectedNode != null)
            sim.changeNodeSelection(selectedNode.id);
    })
    $(".nodeProperty").click(function(ev) {
        $(".nodeProperty").removeClass("selected");
        $(this).addClass("selected");
        sim.selectedPropertyForChart = $(this).attr("data-property");

        sim.updateNodeGUI(true);
    });
    loop();
});


function loop() {
    sim.draw();
    let newTime = new Date().getTime();

    let dt = newTime - time;

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

