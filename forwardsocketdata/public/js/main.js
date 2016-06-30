/// <reference path="../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../typings/globals/highcharts/index.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var SimulationNode = (function () {
    function SimulationNode() {
        this.id = -1;
        this.x = 0;
        this.y = 0;
        this.type = "";
        this.totalTransmittedTime = [];
    }
    return SimulationNode;
}());
var Value = (function () {
    function Value(timestamp, value) {
        this.timestamp = timestamp;
        this.value = value;
    }
    return Value;
}());
var APNode = (function (_super) {
    __extends(APNode, _super);
    function APNode() {
        _super.apply(this, arguments);
        this.type = "AP";
    }
    return APNode;
}(SimulationNode));
var STANode = (function (_super) {
    __extends(STANode, _super);
    function STANode() {
        _super.apply(this, arguments);
        this.type = "STA";
    }
    return STANode;
}(SimulationNode));
var Simulation = (function () {
    function Simulation() {
        this.nodes = [];
    }
    return Simulation;
}());
var SimulationGUI = (function () {
    function SimulationGUI(canvas) {
        this.canvas = canvas;
        this.simulation = new Simulation();
        this.selectedNode = 0;
        this.selectedPropertyForChart = "totalTransmittedTime";
        this.animations = [];
        this.area = 2000;
        this.ctx = canvas.getContext("2d");
    }
    SimulationGUI.prototype.draw = function () {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawNodes();
        for (var _i = 0, _a = this.animations; _i < _a.length; _i++) {
            var a = _a[_i];
            a.draw(this.ctx);
        }
    };
    SimulationGUI.prototype.drawNodes = function () {
        this.ctx.fillStyle = "black";
        for (var _i = 0, _a = this.simulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            this.ctx.beginPath();
            if (n.type == "AP")
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 6, 0, Math.PI * 2, false);
            else
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 3, 0, Math.PI * 2, false);
            this.ctx.fill();
        }
    };
    SimulationGUI.prototype.update = function (dt) {
        for (var _i = 0, _a = this.animations; _i < _a.length; _i++) {
            var a = _a[_i];
            a.update(dt);
        }
        var newAnimationArr = [];
        for (var i = this.animations.length - 1; i >= 0; i--) {
            if (!this.animations[i].isFinished())
                newAnimationArr.push(this.animations[i]);
        }
        this.animations = newAnimationArr;
    };
    SimulationGUI.prototype.addAnimation = function (anim) {
        this.animations.push(anim);
    };
    SimulationGUI.prototype.onNodeUpdated = function (id) {
        if (id == this.selectedNode)
            this.updateNodeGUI(false);
    };
    SimulationGUI.prototype.onNodeAdded = function (id) {
        if (id == this.selectedNode)
            this.updateNodeGUI(true);
    };
    SimulationGUI.prototype.updateNodeGUI = function (full) {
        if (this.selectedNode < 0 || this.selectedNode >= this.simulation.nodes.length)
            return;
        var node = this.simulation.nodes[this.selectedNode];
        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);
        if (node.totalTransmittedTime.length > 0)
            $("#nodeTotalTransmittedTime").text(node.totalTransmittedTime[node.totalTransmittedTime.length - 1].value);
        if (full) {
            var values = node[this.selectedPropertyForChart];
            var selectedData = [];
            for (var i = 0; i < values.length; i++)
                selectedData.push({ x: values[i].timestamp, y: values[i].value });
            var self_1 = this;
            $('#nodeChart').highcharts({
                chart: {
                    type: 'spline',
                    animation: "Highcharts.svg",
                    marginRight: 10,
                    events: {
                        load: function () {
                            self_1.currentChart = this;
                        } }
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
            var values = node[this.selectedPropertyForChart];
            var lastValue = values[values.length - 1];
            this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, true);
        }
    };
    return SimulationGUI;
}());
var Animation = (function () {
    function Animation() {
        this.time = 0;
        this.color = new Color();
    }
    Animation.prototype.update = function (dt) {
        this.time += dt;
    };
    return Animation;
}());
var BroadcastAnimation = (function (_super) {
    __extends(BroadcastAnimation, _super);
    function BroadcastAnimation(x, y) {
        _super.call(this);
        this.x = x;
        this.y = y;
        this.max_radius = 50;
        this.max_time = 1000;
    }
    BroadcastAnimation.prototype.draw = function (ctx) {
        var radius = this.time / this.max_time * this.max_radius;
        this.color.a = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2, false);
        ctx.stroke();
    };
    BroadcastAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return BroadcastAnimation;
}(Animation));
var ReceivedAnimation = (function (_super) {
    __extends(ReceivedAnimation, _super);
    function ReceivedAnimation(x, y) {
        _super.call(this);
        this.x = x;
        this.y = y;
        this.max_radius = 10;
        this.max_time = 1000;
    }
    ReceivedAnimation.prototype.draw = function (ctx) {
        var radius = (1 - this.time / this.max_time) * this.max_radius;
        this.color.a = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2, false);
        ctx.stroke();
    };
    ReceivedAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return ReceivedAnimation;
}(Animation));
var Color = (function () {
    function Color(r, g, b, a) {
        if (r === void 0) { r = 0; }
        if (g === void 0) { g = 0; }
        if (b === void 0) { b = 0; }
        if (a === void 0) { a = 1; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    Color.prototype.toString = function () {
        return "rgba(" + this.r + ", " + this.g + "," + this.b + ", " + this.a + ")";
    };
    return Color;
}());
var SimulationEvent = (function () {
    function SimulationEvent(time, parts) {
        this.time = time;
        this.parts = parts;
    }
    return SimulationEvent;
}());
var EventManager = (function () {
    function EventManager(sim, sock) {
        this.sim = sim;
        this.events = [];
        var self = this;
        sock.on("entry", function (data) {
            self.onReceive(data);
            console.log(data);
        });
    }
    EventManager.prototype.processEvents = function () {
        while (this.events.length > 0) {
            var ev = this.events[0];
            switch (ev.parts[1]) {
                case 'start':
                    this.onStart();
                    break;
                case 'stanodeadd':
                    this.onNodeAdded(true, parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]));
                    break;
                case 'apnodeadd':
                    this.onNodeAdded(false, -1, parseInt(ev.parts[2]), parseInt(ev.parts[3]));
                    break;
                case 'nodetx':
                    this.onNodeTx(parseInt(ev.parts[2]));
                    break;
                case 'noderx':
                    this.onNodeRx(parseInt(ev.parts[2]));
                    break;
                case 'nodestats':
                    this.onStatsUpdated(ev.time, parseInt(ev.parts[2]), parseInt(ev.parts[3]));
                    break;
                default:
            }
            this.events.shift();
        }
    };
    EventManager.prototype.onReceive = function (line) {
        var parts = line.split(';');
        var time = parseInt(parts[0]);
        var ev = new SimulationEvent(time, parts);
        this.events.push(ev);
    };
    EventManager.prototype.onStart = function () {
        simTime = 0;
        this.sim.simulation.nodes = [];
    };
    EventManager.prototype.onNodeAdded = function (isSTA, id, x, y) {
        var n = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        this.sim.simulation.nodes.push(n);
        this.sim.onNodeAdded(id);
    };
    EventManager.prototype.onNodeTx = function (id) {
        var n = this.sim.simulation.nodes[id];
        var a = new BroadcastAnimation(n.x, n.y);
        a.max_radius = 20;
        a.color = new Color(255, 0, 0, 1);
        sim.addAnimation(a);
        this.sim.addAnimation(a);
    };
    EventManager.prototype.onNodeRx = function (id) {
        var n = this.sim.simulation.nodes[id];
        var a = new ReceivedAnimation(n.x, n.y);
        a.max_radius = 20;
        a.color = new Color(255, 0, 0, 1);
        sim.addAnimation(a);
        this.sim.addAnimation(a);
    };
    EventManager.prototype.onStatsUpdated = function (timestamp, id, totalTransmitType) {
        // todo keep track of statistics
        sim.simulation.nodes[id].totalTransmittedTime.push(new Value(timestamp, totalTransmitType));
        sim.onNodeUpdated(id);
    };
    return EventManager;
}());
var sim = null;
var evManager = null;
var simTime = 0;
var time = new Date().getTime();
$(document).ready(function () {
    sim = new SimulationGUI($("#canv").get(0));
    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var sock = io.connect("http://localhost:8080");
    sock.on("connect", function (data) {
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim, sock);
    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });
    loop();
});
function loop() {
    sim.draw();
    var newTime = new Date().getTime();
    var dt = newTime - time;
    simTime += dt;
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
//# sourceMappingURL=main.js.map