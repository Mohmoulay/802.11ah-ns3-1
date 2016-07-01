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
        this.aId = 0;
        this.groupNumber = 0;
        this.type = "";
        this.totalTransmitTime = [];
        this.totalReceiveTime = [];
        this.totalReceiveDozeTime = [];
        this.totalReceiveActiveTime = [];
        this.nrOfTransmissions = [];
        this.nrOfTransmissionsDropped = [];
        this.nrOfReceives = [];
        this.nrOfReceivesDropped = [];
        this.nrOfSentPackets = [];
        this.nrOfSuccessfulPackets = [];
        this.nrOfDroppedPackets = [];
        this.avgPacketTimeOfFlight = [];
        this.throughputKbit = [];
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
        this.isAssociated = false;
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
        this.selectedPropertyForChart = "totalTransmitTime";
        this.animations = [];
        this.area = 2000;
        this.rawGroupColors = [new Color(0, 0, 255), new Color(0, 128, 255), new Color(0, 255, 128), new Color(0, 255, 255), new Color(128, 0, 255), new Color(255, 0, 255)];
        this.ctx = canvas.getContext("2d");
        this.heatMapPalette = new Palette();
        this.heatMapPalette.addColor(new Color(255, 0, 0, 1, 0));
        this.heatMapPalette.addColor(new Color(255, 255, 0, 1, 0.5));
        this.heatMapPalette.addColor(new Color(0, 255, 0, 1, 1));
    }
    SimulationGUI.prototype.draw = function () {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawRange();
        this.drawNodes();
        for (var _i = 0, _a = this.animations; _i < _a.length; _i++) {
            var a = _a[_i];
            a.draw(this.canvas, this.ctx, this.area);
        }
    };
    SimulationGUI.prototype.drawRange = function () {
        this.ctx.strokeStyle = "#CCC";
        for (var _i = 0, _a = this.simulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            if (n.type == "AP") {
                for (var i = 1; i <= 10; i++) {
                    var radius = 100 * i * (this.canvas.width / this.area);
                    this.ctx.beginPath();
                    this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), radius, 0, Math.PI * 2, false);
                    this.ctx.stroke();
                }
            }
        }
    };
    SimulationGUI.prototype.getMaxOfProperty = function (prop) {
        var curMax = Number.MIN_VALUE;
        if (prop != "") {
            for (var _i = 0, _a = this.simulation.nodes; _i < _a.length; _i++) {
                var n = _a[_i];
                var values = n[this.selectedPropertyForChart];
                if (values.length > 0) {
                    var value = values[values.length - 1].value;
                    if (curMax < value)
                        curMax = value;
                }
            }
            return curMax;
        }
        else
            return 0;
    };
    SimulationGUI.prototype.getColorForNode = function (n, curMax) {
        if (this.selectedPropertyForChart != "") {
            var el = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "']").get(0));
            var type = el.attr("data-type");
            if (typeof type != "undefined" && type != "") {
                var min = parseInt(el.attr("data-min"));
                var max = void 0;
                if (el.attr("data-max") == "*")
                    max = curMax;
                else
                    max = parseInt(el.attr("data-max"));
                var values = n[this.selectedPropertyForChart];
                if (values.length > 0) {
                    var value = values[values.length - 1];
                    var alpha = (value.value - min) / (max - min);
                    if (type == "LOWER_IS_BETTER")
                        return this.heatMapPalette.getColorAt(1 - alpha).toString();
                    else
                        return this.heatMapPalette.getColorAt(alpha).toString();
                }
            }
        }
        if (n.type == "STA" && !n.isAssociated)
            return "black";
        else
            return this.rawGroupColors[n.groupNumber % this.rawGroupColors.length].toString();
    };
    SimulationGUI.prototype.drawNodes = function () {
        var curMax = this.getMaxOfProperty(this.selectedPropertyForChart);
        for (var _i = 0, _a = this.simulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
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
    SimulationGUI.prototype.onNodeAssociated = function (id) {
        var n = this.simulation.nodes[id];
        this.addAnimation(new AssociatedAnimation(n.x, n.y));
    };
    SimulationGUI.prototype.onSimulationTimeUpdated = function (time) {
        $("#simCurrentTime").text(time);
    };
    SimulationGUI.prototype.changeNodeSelection = function (id) {
        this.selectedNode = id;
        this.updateNodeGUI(true);
    };
    SimulationGUI.prototype.updateNodeGUI = function (full) {
        if (this.selectedNode < 0 || this.selectedNode >= this.simulation.nodes.length)
            return;
        var node = this.simulation.nodes[this.selectedNode];
        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);
        if (node.type == "STA" && !node.isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeGroupNumber").text(node.groupNumber);
        }
        var propertyElements = $(".nodeProperty");
        for (var i = 0; i < propertyElements.length; i++) {
            var prop = $(propertyElements[i]).attr("data-property");
            var values = node[prop];
            if (values.length > 0)
                $($(propertyElements[i]).find("td").get(1)).text(values[values.length - 1].value);
        }
        var showDeltas = $("#chkShowDeltas").prop("checked");
        if (full) {
            var values = node[this.selectedPropertyForChart];
            var selectedData = [];
            if (!showDeltas) {
                for (var i = 0; i < values.length; i++)
                    selectedData.push({ x: values[i].timestamp, y: values[i].value });
            }
            else {
                selectedData.push({ x: values[0].timestamp, y: values[0].value });
                for (var i = 1; i < values.length; i++)
                    selectedData.push({ x: values[i].timestamp, y: values[i].value - values[i - 1].value });
            }
            var self_1 = this;
            var title = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "'] td").get(0)).text();
            $('#nodeChart').empty().highcharts({
                chart: {
                    type: 'spline',
                    animation: "Highcharts.svg",
                    marginRight: 10,
                    events: {
                        load: function () {
                            self_1.currentChart = this;
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
                    }]
            });
        }
        else {
            var values = node[this.selectedPropertyForChart];
            var lastValue = values[values.length - 1];
            if (!showDeltas)
                this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);
            else {
                if (values.length >= 2) {
                    var beforeLastValue = values[values.length - 2];
                    this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value - beforeLastValue.value], true, false);
                }
                else
                    this.currentChart.series[0].addPoint([lastValue.timestamp, lastValue.value], true, false);
            }
        }
    };
    return SimulationGUI;
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
                    this.onStatsUpdated(ev.time, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]), parseFloat(ev.parts[14]), parseFloat(ev.parts[15]));
                    break;
                default:
            }
            this.sim.onSimulationTimeUpdated(ev.time);
            this.events.shift();
        }
    };
    EventManager.prototype.onReceive = function (line) {
        var parts = line.split(';');
        var time = parseInt(parts[0]);
        time = time / (1000 * 1000); // ns -> ms
        var ev = new SimulationEvent(time, parts);
        this.events.push(ev);
    };
    EventManager.prototype.onStart = function () {
        this.sim.simulation.nodes = [];
    };
    EventManager.prototype.onNodeAdded = function (isSTA, id, x, y, aId) {
        var n = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        n.aId = aId;
        this.sim.simulation.nodes.push(n);
        this.sim.onNodeAdded(id);
    };
    EventManager.prototype.onNodeAssociated = function (id, aId, groupNumber) {
        var n = this.sim.simulation.nodes[id];
        n.aId = aId;
        n.groupNumber = groupNumber;
        n.isAssociated = true;
        this.sim.onNodeAssociated(id);
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
    EventManager.prototype.hasIncreased = function (values) {
        if (values.length >= 2) {
            var oldVal = values[values.length - 2].value;
            var newVal = values[values.length - 1].value;
            return oldVal < newVal;
        }
        else
            return false;
    };
    EventManager.prototype.onStatsUpdated = function (timestamp, id, totalTransmitTime, totalReceiveTime, totalReceiveDozeTime, totalReceiveActiveTime, nrOfTransmissions, nrOfTransmissionsDropped, nrOfReceives, nrOfReceivesDropped, nrOfSentPackets, nrOfSuccessfulPackets, nrOfDroppedPackets, avgPacketTimeOfFlight, throughputKbit) {
        // todo keep track of statistics
        var n = sim.simulation.nodes[id];
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
    };
    return EventManager;
}());
var sim = null;
var evManager = null;
var time = new Date().getTime();
$(document).ready(function () {
    var canvas = $("#canv").get(0);
    sim = new SimulationGUI(canvas);
    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var sock = io.connect("http://" + window.location.host + "/");
    sock.on("connect", function (data) {
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim, sock);
    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });
    $(canvas).click(function (ev) {
        var x = (ev.clientX - $(canvas).offset().left) / (canvas.width / sim.area);
        var y = (ev.clientY - $(canvas).offset().top) / (canvas.width / sim.area);
        var selectedNode = null;
        for (var _i = 0, _a = sim.simulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            var dist = Math.sqrt(Math.pow((n.x - x), 2) + Math.pow((n.y - y), 2));
            if (dist < 20) {
                selectedNode = n;
                break;
            }
        }
        if (selectedNode != null)
            sim.changeNodeSelection(selectedNode.id);
    });
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
    var newTime = new Date().getTime();
    var dt = newTime - time;
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
var Animation = (function () {
    function Animation() {
        this.time = 0;
        this.color = new Color(0, 0, 0, 1, 0);
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
        this.color = new Color(255, 0, 0);
    }
    BroadcastAnimation.prototype.draw = function (canvas, ctx, area) {
        var radius = this.time / this.max_time * this.max_radius;
        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
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
        this.color = new Color(0, 255, 0);
    }
    ReceivedAnimation.prototype.draw = function (canvas, ctx, area) {
        var radius = (1 - this.time / this.max_time) * this.max_radius;
        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    };
    ReceivedAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return ReceivedAnimation;
}(Animation));
var AssociatedAnimation = (function (_super) {
    __extends(AssociatedAnimation, _super);
    function AssociatedAnimation(x, y) {
        _super.call(this);
        this.x = x;
        this.y = y;
        this.max_time = 3000;
    }
    AssociatedAnimation.prototype.draw = function (canvas, ctx, area) {
        var offset = this.time / this.max_time * Math.PI * 2;
        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.setLineDash(([10, 2]));
        ctx.lineWidth = 3;
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), 10, offset, offset + Math.PI * 2, false);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    };
    AssociatedAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return AssociatedAnimation;
}(Animation));
var Color = (function () {
    function Color(red, green, blue, alpha, position) {
        if (alpha === void 0) { alpha = 1; }
        if (position === void 0) { position = 0; }
        this.red = Math.floor(red);
        this.green = Math.floor(green);
        this.blue = Math.floor(blue);
        this.alpha = alpha;
        this.position = Math.round(position * 100) / 100;
    }
    Color.prototype.toString = function () {
        return "rgba(" + this.red + ", " + this.green + "," + this.blue + ", " + this.alpha + ")";
    };
    return Color;
}());
var Palette = (function () {
    function Palette() {
        this.colors = [];
        this.lookup = [];
    }
    Palette.prototype.buildLookup = function () {
        this.lookup = [];
        for (var i = 0; i < 1000; i++)
            this.lookup.push(this.getColorAt(i / 1000));
    };
    ;
    Palette.prototype.getColorFromLookupAt = function (position) {
        var idx;
        if (isNaN(position))
            idx = 0;
        else
            idx = Math.floor(position * this.lookup.length);
        if (idx < 0)
            idx = 0;
        if (idx >= this.lookup.length)
            idx = this.lookup.length - 1;
        return this.lookup[idx];
    };
    ;
    Palette.prototype.getColorAt = function (position) {
        if (position < this.colors[0].position)
            return this.colors[0];
        if (position >= this.colors[this.colors.length - 1].position)
            return this.colors[this.colors.length - 1];
        for (var i = 0; i < this.colors.length; i++) {
            if (position >= this.colors[i].position && position < this.colors[i + 1].position) {
                var relColorAlpha = (position - this.colors[i].position) / (this.colors[i + 1].position - this.colors[i].position);
                var red = this.colors[i].red * (1 - relColorAlpha) + this.colors[i + 1].red * (relColorAlpha);
                var green = this.colors[i].green * (1 - relColorAlpha) + this.colors[i + 1].green * (relColorAlpha);
                var blue = this.colors[i].blue * (1 - relColorAlpha) + this.colors[i + 1].blue * (relColorAlpha);
                return new Color(red, green, blue, 1, position);
            }
        }
    };
    Palette.prototype.addColor = function (c) {
        this.colors.push(c);
    };
    Palette.prototype.drawTo = function (ctx, width, height) {
        for (var i = 0; i < width; i++) {
            var pos = i / width;
            var c = this.getColorFromLookupAt(pos);
            ctx.fillStyle = "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
            ctx.fillRect(i, 0, 1, height);
        }
    };
    return Palette;
}());
//# sourceMappingURL=main.js.map