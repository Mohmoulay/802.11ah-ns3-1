var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
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
var EventManager = (function () {
    function EventManager(sim) {
        this.sim = sim;
        this.events = [];
    }
    EventManager.prototype.processEvents = function () {
        while (this.events.length > 0) {
            var ev = this.events[0];
            switch (ev.parts[1]) {
                case 'start':
                    this.onStart(ev.stream, parseInt(ev.parts[2]), parseInt(ev.parts[3]), ev.parts[4], parseInt(ev.parts[5]), parseInt(ev.parts[6]), ev.parts[7], parseFloat(ev.parts[8]), parseFloat(ev.parts[9]), parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), ev.parts[13]);
                    break;
                case 'stanodeadd':
                    this.onNodeAdded(ev.stream, true, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseInt(ev.parts[5]));
                    break;
                case 'stanodeassoc':
                    this.onNodeAssociated(ev.stream, parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]));
                    break;
                case 'apnodeadd':
                    this.onNodeAdded(ev.stream, false, -1, parseFloat(ev.parts[2]), parseFloat(ev.parts[3]), -1);
                    break;
                case 'nodestats':
                    this.onStatsUpdated(ev.stream, ev.time, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]), parseFloat(ev.parts[14]), parseFloat(ev.parts[15]), parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseFloat(ev.parts[18]), parseInt(ev.parts[19]));
                    break;
                default:
            }
            this.sim.onSimulationTimeUpdated(ev.time);
            this.events.shift();
        }
    };
    EventManager.prototype.onReceive = function (entry) {
        var parts = entry.line.split(';');
        var time = parseInt(parts[0]);
        time = time / (1000 * 1000); // ns -> ms
        var ev = new SimulationEvent(entry.stream, time, parts);
        this.events.push(ev);
    };
    EventManager.prototype.onStart = function (stream, aidRAWRange, numberOfRAWGroups, RAWSlotFormat, RAWSlotDuration, numberOfRAWSlots, dataMode, dataRate, bandwidth, trafficInterval, trafficPacketsize, beaconInterval, name) {
        var simulation = new Simulation();
        this.sim.simulationContainer.setSimulation(stream, simulation);
        simulation.nodes = [];
        var config = simulation.config;
        config.AIDRAWRange = aidRAWRange;
        config.numberOfRAWGroups = numberOfRAWGroups;
        config.RAWSlotFormat = RAWSlotFormat;
        config.numberOfRAWSlots = numberOfRAWSlots;
        config.RAWSlotDuration = RAWSlotDuration;
        config.dataMode = dataMode;
        config.dataRate = dataRate;
        config.bandwidth = bandwidth;
        config.trafficInterval = trafficInterval;
        config.trafficPacketsize = trafficPacketsize;
        config.beaconInterval = beaconInterval;
        config.name = name;
    };
    EventManager.prototype.onNodeAdded = function (stream, isSTA, id, x, y, aId) {
        var n = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        n.aId = aId;
        this.sim.simulationContainer.getSimulation(stream).nodes.push(n);
        this.sim.onNodeAdded(stream, id);
    };
    EventManager.prototype.onNodeAssociated = function (stream, id, aId, groupNumber) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        var n = simulation.nodes[id];
        n.aId = aId;
        n.groupNumber = groupNumber;
        n.isAssociated = true;
        this.sim.onNodeAssociated(stream, id);
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
    EventManager.prototype.onStatsUpdated = function (stream, timestamp, id, totalTransmitTime, totalReceiveTime, totalReceiveDozeTime, totalReceiveActiveTime, nrOfTransmissions, nrOfTransmissionsDropped, nrOfReceives, nrOfReceivesDropped, nrOfSentPackets, nrOfSuccessfulPackets, nrOfDroppedPackets, avgPacketTimeOfFlight, goodputKbit, edcaQueueLength, nrOfSuccessfulRoundtripPackets, avgRoundTripTime, tcpCongestionWindow) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        // keep track of statistics
        var n = simulation.nodes[id];
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
        n.avgSentReceiveTime.push(new Value(timestamp, avgPacketTimeOfFlight));
        n.goodputKbit.push(new Value(timestamp, goodputKbit));
        n.edcaQueueLength.push(new Value(timestamp, edcaQueueLength));
        n.nrOfSuccessfulRoundtripPackets.push(new Value(timestamp, nrOfSuccessfulRoundtripPackets));
        n.avgRoundtripTime.push(new Value(timestamp, avgRoundTripTime));
        n.tcpCongestionWindow.push(new Value(timestamp, tcpCongestionWindow));
        if (stream == this.sim.simulationContainer.getFirstStream()) {
            if (this.hasIncreased(n.totalTransmitTime)) {
                this.sim.addAnimation(new BroadcastAnimation(n.x, n.y));
            }
        }
        //if(this.hasIncreased(n.totalReceiveActiveTime))
        //   this.sim.addAnimation(new ReceivedAnimation(n.x, n.y));
        this.sim.onNodeUpdated(stream, id);
    };
    return EventManager;
}());
var SimulationEvent = (function () {
    function SimulationEvent(stream, time, parts) {
        this.stream = stream;
        this.time = time;
        this.parts = parts;
    }
    return SimulationEvent;
}());
/// <reference path="../../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../../typings/globals/highcharts/index.d.ts" />
var SimulationContainer = (function () {
    function SimulationContainer() {
        this.keys = [];
        this.simulations = {};
    }
    SimulationContainer.prototype.getSimulation = function (stream) {
        return this.simulations[stream];
    };
    SimulationContainer.prototype.setSimulation = function (stream, sim) {
        this.simulations[stream] = sim;
        this.keys.push(stream);
    };
    SimulationContainer.prototype.hasSimulations = function () {
        return this.keys.length > 0;
    };
    SimulationContainer.prototype.getFirstSimulation = function () {
        return this.simulations[this.keys[0]];
    };
    SimulationContainer.prototype.getFirstStream = function () {
        return this.keys[0];
    };
    SimulationContainer.prototype.getSimulations = function () {
        var sims = [];
        for (var _i = 0, _a = this.keys; _i < _a.length; _i++) {
            var k = _a[_i];
            sims.push(this.simulations[k]);
        }
        return sims;
    };
    return SimulationContainer;
}());
var SimulationGUI = (function () {
    function SimulationGUI(canvas) {
        this.canvas = canvas;
        this.simulationContainer = new SimulationContainer();
        this.selectedNode = 0;
        this.selectedPropertyForChart = "totalTransmitTime";
        this.selectedStream = "";
        this.animations = [];
        this.area = 2000;
        this.currentChart = null;
        this.rawGroupColors = [new Color(0, 0, 255), new Color(0, 128, 255), new Color(0, 255, 128), new Color(0, 255, 255), new Color(128, 0, 255), new Color(255, 0, 255)];
        this.refreshTimerId = -1;
        this.lastUpdatedOn = new Date();
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
        if (!this.simulationContainer.hasSimulations())
            return;
        this.ctx.strokeStyle = "#CCC";
        for (var _i = 0, _a = this.simulationContainer.getFirstSimulation().nodes; _i < _a.length; _i++) {
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
        if (!this.simulationContainer.hasSimulations())
            return 0;
        var curMax = Number.MIN_VALUE;
        if (prop != "") {
            for (var _i = 0, _a = this.simulationContainer.getFirstSimulation().nodes; _i < _a.length; _i++) {
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
        if (!this.simulationContainer.hasSimulations())
            return;
        var curMax = this.getMaxOfProperty(this.selectedPropertyForChart);
        for (var _i = 0, _a = this.simulationContainer.getFirstSimulation().nodes; _i < _a.length; _i++) {
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
    SimulationGUI.prototype.onNodeUpdated = function (stream, id) {
        if (id == this.selectedNode)
            this.updateNodeGUI(false);
    };
    SimulationGUI.prototype.onNodeAdded = function (stream, id) {
        if (id == this.selectedNode)
            this.updateNodeGUI(true);
    };
    SimulationGUI.prototype.onNodeAssociated = function (stream, id) {
        if (stream == this.simulationContainer.getFirstStream()) {
            var n = this.simulationContainer.getSimulation(stream).nodes[id];
            this.addAnimation(new AssociatedAnimation(n.x, n.y));
        }
    };
    SimulationGUI.prototype.onSimulationTimeUpdated = function (time) {
        $("#simCurrentTime").text(time);
    };
    SimulationGUI.prototype.changeNodeSelection = function (id) {
        this.selectedNode = id;
        this.updateNodeGUI(true);
    };
    SimulationGUI.prototype.updateNodeGUI = function (full) {
        var _this = this;
        if (!this.simulationContainer.hasSimulations())
            return;
        if (this.selectedNode < 0 || this.selectedNode >= this.simulationContainer.getFirstSimulation().nodes.length)
            return;
        var simulations = this.simulationContainer.getSimulations();
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        var node = selectedSimulation.nodes[this.selectedNode];
        $("#simulationName").text(selectedSimulation.config.name);
        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x + "," + node.y);
        if (node.type == "STA" && !node.isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeGroupNumber").text(node.groupNumber);
        }
        var configElements = $(".configProperty");
        for (var i = 0; i < configElements.length; i++) {
            var prop = $(configElements[i]).attr("data-property");
            $($(configElements[i]).find("td").get(1)).text(selectedSimulation.config[prop]);
        }
        var propertyElements = $(".nodeProperty");
        for (var i = 0; i < propertyElements.length; i++) {
            var prop = $(propertyElements[i]).attr("data-property");
            var values = node[prop];
            if (values.length > 0)
                $($(propertyElements[i]).find("td").get(1)).text(values[values.length - 1].value);
        }
        // prevent update flood by max 1 update per second or when gui changed
        var timeDiff = new Date().getTime() - this.lastUpdatedOn.getTime();
        if (timeDiff > 1000 || full) {
            this.updateCharts(simulations, full);
            this.lastUpdatedOn = new Date();
        }
        else {
            window.clearTimeout(this.refreshTimerId);
            this.refreshTimerId = window.setTimeout(function () {
                _this.updateCharts(simulations, full);
                _this.lastUpdatedOn = new Date();
            }, timeDiff);
        }
    };
    SimulationGUI.prototype.updateCharts = function (simulations, full) {
        var showDeltas = $("#chkShowDeltas").prop("checked");
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        var firstNode = selectedSimulation.nodes[this.selectedNode];
        if (firstNode[this.selectedPropertyForChart].length > 0) {
            if (this.currentChart == null || full) {
                var series = [];
                for (var i = 0; i < simulations.length; i++) {
                    var values = simulations[i].nodes[this.selectedNode][this.selectedPropertyForChart];
                    var selectedData = [];
                    if (!showDeltas) {
                        for (var i_1 = 0; i_1 < values.length; i_1++)
                            selectedData.push({ x: values[i_1].timestamp, y: values[i_1].value });
                    }
                    else {
                        selectedData.push({ x: values[0].timestamp, y: values[0].value });
                        for (var i_2 = 1; i_2 < values.length; i_2++)
                            selectedData.push({ x: values[i_2].timestamp, y: values[i_2].value - values[i_2 - 1].value });
                    }
                    series.push({
                        name: "[" + i + "] " + this.selectedPropertyForChart,
                        data: selectedData
                    });
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
                        tickPixelInterval: 100
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
                for (var s = 0; s < simulations.length; s++) {
                    var values = simulations[s].nodes[this.selectedNode][this.selectedPropertyForChart];
                    if (!showDeltas || values.length < 2) {
                        for (var i = this.currentChart.series[s].data.length; i < values.length; i++) {
                            var val = values[i];
                            this.currentChart.series[s].addPoint([val.timestamp, val.value], true, false);
                        }
                    }
                    else {
                        for (var i = this.currentChart.series[s].data.length; i < values.length; i++) {
                            var beforeVal = values[i - 1];
                            var val = values[i];
                            this.currentChart.series[s].addPoint([val.timestamp, val.value - beforeVal.value], true, false);
                        }
                    }
                }
            }
        }
        if (firstNode.totalReceiveActiveTime.length > 0 && firstNode.totalReceiveDozeTime.length > 0) {
            var activeDozePieData = [{ name: "Active", y: firstNode.totalReceiveActiveTime[firstNode.totalReceiveActiveTime.length - 1].value },
                { name: "Doze", y: firstNode.totalReceiveDozeTime[firstNode.totalReceiveDozeTime.length - 1].value }];
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }
        if (firstNode.nrOfTransmissions.length > 0 && firstNode.nrOfTransmissionsDropped.length > 0) {
            var activeTransmissionsSuccessDroppedData = [{ name: "OK", y: firstNode.nrOfTransmissions[firstNode.nrOfTransmissions.length - 1].value - firstNode.nrOfTransmissionsDropped[firstNode.nrOfTransmissionsDropped.length - 1].value },
                { name: "Dropped", y: firstNode.nrOfTransmissionsDropped[firstNode.nrOfTransmissionsDropped.length - 1].value }];
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }
        if (firstNode.nrOfReceives.length > 0 && firstNode.nrOfReceivesDropped.length > 0) {
            var activeReceivesSuccessDroppedData = [{ name: "OK", y: firstNode.nrOfReceives[firstNode.nrOfReceives.length - 1].value - firstNode.nrOfReceivesDropped[firstNode.nrOfReceivesDropped.length - 1].value },
                { name: "Dropped", y: firstNode.nrOfReceivesDropped[firstNode.nrOfReceivesDropped.length - 1].value }];
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }
        if (firstNode.nrOfSuccessfulPackets.length > 0 && firstNode.nrOfDroppedPackets.length > 0) {
            var activePacketsSuccessDroppedData = [{ name: "OK", y: firstNode.nrOfSuccessfulPackets[firstNode.nrOfSuccessfulPackets.length - 1].value },
                { name: "Dropped", y: firstNode.nrOfDroppedPackets[firstNode.nrOfDroppedPackets.length - 1].value }];
            this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
        }
    };
    SimulationGUI.prototype.createPieChart = function (selector, title, data) {
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
    };
    return SimulationGUI;
}());
function getParameterByName(name, url) {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
    if (!results)
        return "";
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
$(document).ready(function () {
    var sim = null;
    var evManager = null;
    var time = new Date().getTime();
    var canvas = $("#canv").get(0);
    sim = new SimulationGUI(canvas);
    var streams;
    var compare = getParameterByName("compare");
    if (compare == "")
        streams = ["live"];
    else
        streams = compare.split(',');
    for (var _i = 0, streams_1 = streams; _i < streams_1.length; _i++) {
        var stream = streams_1[_i];
        var rdb = "<input class=\"rdbStream\" name=\"streams\" type='radio' data-stream='" + stream + "'>&nbsp;";
        $("#rdbStreams").append(rdb);
    }
    sim.selectedStream = streams[0];
    $(".rdbStream[data-stream='" + sim.selectedStream + "']").prop("checked", true);
    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var sock = io.connect("http://" + window.location.host + "/");
    sock.on("connect", function (data) {
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim);
        console.log("Subscribing to " + streams);
        sock.emit("subscribe", {
            simulations: streams
        });
    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });
    sock.on("error", function (data) {
        alert("Error: " + data);
    });
    sock.on("entry", function (data) {
        evManager.onReceive(data);
        //console.log("Received " + data.stream + ": " + data.line);
    });
    $(canvas).click(function (ev) {
        if (!sim.simulationContainer.hasSimulations())
            return;
        var rect = canvas.getBoundingClientRect();
        var x = (ev.clientX - rect.left) / (canvas.width / sim.area);
        var y = (ev.clientY - rect.top) / (canvas.width / sim.area);
        var selectedNode = null;
        for (var _i = 0, _a = sim.simulationContainer.getFirstSimulation().nodes; _i < _a.length; _i++) {
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
    $(".rdbStream").change(function (ev) {
        var rdbs = $(".rdbStream");
        for (var i = 0; i < rdbs.length; i++) {
            var rdb = $(rdbs.get(i));
            if (rdb.prop("checked")) {
                sim.selectedStream = rdb.attr("data-stream");
                sim.updateNodeGUI(true);
            }
        }
    });
    loop();
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
});
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
        this.avgSentReceiveTime = [];
        this.goodputKbit = [];
        this.edcaQueueLength = [];
        this.nrOfSuccessfulRoundtripPackets = [];
        this.avgRoundtripTime = [];
        this.tcpCongestionWindow = [];
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
var SimulationConfiguration = (function () {
    function SimulationConfiguration() {
        this.name = "";
    }
    return SimulationConfiguration;
}());
var Simulation = (function () {
    function Simulation() {
        this.nodes = [];
        this.config = new SimulationConfiguration();
    }
    return Simulation;
}());
//# sourceMappingURL=main.js.map