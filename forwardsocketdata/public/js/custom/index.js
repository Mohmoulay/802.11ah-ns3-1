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
    SimulationContainer.prototype.getStream = function (idx) {
        return this.keys[idx];
    };
    SimulationContainer.prototype.getStreams = function () {
        return this.keys.slice(0);
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
})();
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
        this.rawGroupColors = [new Color(200, 0, 0),
            new Color(0, 200, 0),
            new Color(0, 0, 200),
            new Color(200, 0, 200),
            new Color(200, 200, 0),
            new Color(0, 200, 200),
            new Color(100, 100, 0),
            new Color(100, 0, 100),
            new Color(0, 0, 100),
            new Color(0, 0, 0)];
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
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
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
    SimulationGUI.prototype.getMinMaxOfProperty = function (stream, prop, deltas) {
        if (!this.simulationContainer.hasSimulations())
            return [0, 0];
        var curMax = Number.MIN_VALUE;
        var curMin = Number.MAX_VALUE;
        if (prop != "") {
            var selectedSimulation = this.simulationContainer.getSimulation(stream);
            for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
                var n = _a[_i];
                var values = n[this.selectedPropertyForChart];
                if (deltas && values.length > 1) {
                    var curVal = values[values.length - 1].value;
                    var beforeVal = values[values.length - 2].value;
                    var value = curVal - beforeVal;
                    if (curMax < value)
                        curMax = value;
                    if (curMin > value)
                        curMin = value;
                }
                else if (values.length > 0) {
                    var value = values[values.length - 1].value;
                    if (curMax < value)
                        curMax = value;
                    if (curMin > value)
                        curMin = value;
                }
            }
            return [curMin, curMax];
        }
        else
            return [0, 0];
    };
    SimulationGUI.prototype.getColorForNode = function (n, curMax, curMin) {
        if (this.selectedPropertyForChart != "") {
            var el = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "']").get(0));
            var type = el.attr("data-type");
            if (typeof type != "undefined" && type != "") {
                var min;
                if (el.attr("data-max") == "*")
                    min = curMin;
                else
                    min = parseInt(el.attr("data-min"));
                var max;
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
        var minmax = this.getMinMaxOfProperty(this.selectedStream, this.selectedPropertyForChart, false);
        var curMax = minmax[1];
        var curMin = minmax[0];
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
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
    SimulationGUI.prototype.onNodeAssociated = function (stream, id) {
        if (stream == this.selectedStream) {
            var n = this.simulationContainer.getSimulation(stream).nodes[id];
            this.addAnimation(new AssociatedAnimation(n.x, n.y));
        }
    };
    SimulationGUI.prototype.onSimulationTimeUpdated = function (time) {
        $("#simCurrentTime").text(time);
    };
    SimulationGUI.prototype.changeNodeSelection = function (id) {
        this.selectedNode = id;
        this.updateGUI(true);
    };
    SimulationGUI.prototype.updateGUI = function (full) {
        if (!this.simulationContainer.hasSimulations())
            return;
        var simulations = this.simulationContainer.getSimulations();
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        this.updateConfigGUI(selectedSimulation);
        if (this.selectedNode < 0 || this.selectedNode >= selectedSimulation.nodes.length)
            this.updateGUIForAll(simulations, selectedSimulation, full);
        else
            this.updateGUIForSelectedNode(simulations, selectedSimulation, full);
    };
    SimulationGUI.prototype.updateConfigGUI = function (selectedSimulation) {
        $("#simulationName").text(selectedSimulation.config.name);
        var configElements = $(".configProperty");
        for (var i = 0; i < configElements.length; i++) {
            var prop = $(configElements[i]).attr("data-property");
            $($(configElements[i]).find("td").get(1)).text(selectedSimulation.config[prop]);
        }
    };
    SimulationGUI.prototype.updateGUIForSelectedNode = function (simulations, selectedSimulation, full) {
        var node = selectedSimulation.nodes[this.selectedNode];
        $("#nodeTitle").text("Node " + node.id);
        $("#nodePosition").text(node.x.toFixed(2) + "," + node.y.toFixed(2));
        if (node.type == "STA" && !node.isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeGroupNumber").text(node.groupNumber);
            $("#nodeRawSlotIndex").text(node.rawSlotIndex);
        }
        var propertyElements = $(".nodeProperty");
        for (var i = 0; i < propertyElements.length; i++) {
            var prop = $(propertyElements[i]).attr("data-property");
            var values = node[prop];
            if (typeof values != "undefined") {
                var el = "";
                if (values.length > 0) {
                    if (simulations.length > 1) {
                        // compare with avg of others
                        var sumVal = 0;
                        var nrVals = 0;
                        for (var j = 0; j < simulations.length; j++) {
                            if (simulations[j] != selectedSimulation && this.selectedNode < simulations[j].nodes.length) {
                                var vals = simulations[j].nodes[this.selectedNode][prop];
                                if (vals.length > 0) {
                                    sumVal += vals[vals.length - 1].value;
                                    nrVals++;
                                }
                            }
                        }
                        var avg = sumVal / nrVals;
                        if (values[values.length - 1].value > avg)
                            el = "<div class='valueup' title='Value has increased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + values[values.length - 1].value + "</div>";
                        else if (values[values.length - 1].value < avg)
                            el = "<div class='valuedown' title='Value has decreased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + values[values.length - 1].value + "</div>";
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
    };
    SimulationGUI.prototype.getAverageAndStdDevValue = function (simulation, prop) {
        var sum = 0;
        var count = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            var values = node[prop];
            if (values.length > 0) {
                sum += values[values.length - 1].value;
                count++;
            }
        }
        if (count == 0)
            return [];
        var avg = sum / count;
        var sumSquares = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            var values = node[prop];
            if (values.length > 0) {
                var val = (values[values.length - 1].value - avg) * (values[values.length - 1].value - avg);
                sumSquares += val;
            }
        }
        var stddev = Math.sqrt(sumSquares / count);
        return [avg, stddev];
    };
    SimulationGUI.prototype.updateGUIForAll = function (simulations, selectedSimulation, full) {
        $("#nodeTitle").text("All nodes");
        $("#nodePosition").text("---");
        $("#nodeAID").text("---");
        $("#nodeGroupNumber").text("---");
        $("#nodeRawSlotIndex").text("---");
        var propertyElements = $(".nodeProperty");
        for (var i = 0; i < propertyElements.length; i++) {
            var prop = $(propertyElements[i]).attr("data-property");
            var avgAndStdDev = this.getAverageAndStdDevValue(selectedSimulation, prop);
            var el = "";
            if (avgAndStdDev.length > 0) {
                var text = avgAndStdDev[0].toFixed(2) + " (stddev: " + avgAndStdDev[1].toFixed(2) + ")";
                if (simulations.length > 1) {
                    // compare with avg of others
                    var sumVal = 0;
                    var nrVals = 0;
                    for (var j = 0; j < simulations.length; j++) {
                        if (simulations[j] != selectedSimulation) {
                            var avgAndStdDevOther = this.getAverageAndStdDevValue(simulations[j], prop);
                            if (avgAndStdDevOther.length > 0) {
                                sumVal += avgAndStdDevOther[0];
                                nrVals++;
                            }
                        }
                    }
                    var avg = sumVal / nrVals;
                    if (avgAndStdDev[0] > avg)
                        el = "<div class='valueup' title='Average has increased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + text + "</div>";
                    else if (avgAndStdDev[0] < avg)
                        el = "<div class='valuedown' title='Average has decreased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + text + "</div>";
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
    };
    SimulationGUI.prototype.deferUpdateCharts = function (simulations, full) {
        var _this = this;
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
        if (this.selectedNode == -1)
            this.updateChartsForAll(selectedSimulation, simulations, full, showDeltas);
        else
            this.updateChartsForNode(selectedSimulation, simulations, full, showDeltas);
    };
    SimulationGUI.prototype.updateChartsForNode = function (selectedSimulation, simulations, full, showDeltas) {
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
                        name: this.simulationContainer.getStream(i),
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
                for (var s = 0; s < simulations.length; s++) {
                    var values = simulations[s].nodes[this.selectedNode][this.selectedPropertyForChart];
                    if (!showDeltas || values.length < 2) {
                        for (var i = this.currentChart.series[s].data.length; i < values.length; i++) {
                            var val = values[i];
                            this.currentChart.series[s].addPoint([val.timestamp, val.value], false, false);
                        }
                    }
                    else {
                        for (var i = this.currentChart.series[s].data.length; i < values.length; i++) {
                            var beforeVal = values[i - 1];
                            var val = values[i];
                            this.currentChart.series[s].addPoint([val.timestamp, val.value - beforeVal.value], false, false);
                        }
                    }
                }
                this.currentChart.redraw(false);
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
    SimulationGUI.prototype.updateChartsForAll = function (selectedSimulation, simulations, full, showDeltas) {
        this.updateDistributionChart(selectedSimulation, showDeltas);
        //this.updateAverageChart(selectedSimulation, showDeltas);
        var totalReceiveActiveTime = this.getAverageAndStdDevValue(selectedSimulation, "totalReceiveActiveTime");
        var totalReceiveDozeTime = this.getAverageAndStdDevValue(selectedSimulation, "totalReceiveDozeTime");
        if (totalReceiveActiveTime.length > 0 && totalReceiveDozeTime.length > 0) {
            var activeDozePieData = [{ name: "Active", y: totalReceiveActiveTime[0] },
                { name: "Doze", y: totalReceiveDozeTime[0] }];
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }
        var nrOfTransmissions = this.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissions");
        var nrOfTransmissionsDropped = this.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissionsDropped");
        if (nrOfTransmissions.length > 0 && nrOfTransmissionsDropped.length > 0) {
            var activeTransmissionsSuccessDroppedData = [{ name: "OK", y: nrOfTransmissions[0] - nrOfTransmissionsDropped[0] },
                { name: "Dropped", y: nrOfTransmissionsDropped[0] }];
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }
        var nrOfReceives = this.getAverageAndStdDevValue(selectedSimulation, "nrOfReceives");
        var nrOfReceivesDropped = this.getAverageAndStdDevValue(selectedSimulation, "nrOfReceivesDropped");
        if (nrOfReceives.length > 0 && nrOfReceivesDropped.length > 0) {
            var activeReceivesSuccessDroppedData = [{ name: "OK", y: nrOfReceives[0] - nrOfReceivesDropped[0] },
                { name: "Dropped", y: nrOfReceivesDropped[0] }];
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }
        var nrOfSuccessfulPackets = this.getAverageAndStdDevValue(selectedSimulation, "nrOfSuccessfulPackets");
        var nrOfDroppedPackets = this.getAverageAndStdDevValue(selectedSimulation, "nrOfDroppedPackets");
        if (nrOfSuccessfulPackets.length > 0 && nrOfDroppedPackets.length > 0) {
            var activePacketsSuccessDroppedData = [{ name: "OK", y: nrOfSuccessfulPackets[0] },
                { name: "Dropped", y: nrOfDroppedPackets[0] }];
            this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
        }
    };
    SimulationGUI.prototype.updateDistributionChart = function (selectedSimulation, showDeltas) {
        var series = [];
        // to ensure we can easily compare we need to have the scale on the X-axis starting and ending on the same values
        // so determine the overall minimum and maximum
        var overallMin = Number.MAX_VALUE;
        var overallMax = Number.MIN_VALUE;
        for (var _i = 0, _a = this.simulationContainer.getStreams(); _i < _a.length; _i++) {
            var s = _a[_i];
            var mm = this.getMinMaxOfProperty(s, this.selectedPropertyForChart, showDeltas);
            if (mm.length > 0) {
                if (overallMin > mm[0])
                    overallMin = mm[0];
                if (overallMax < mm[1])
                    overallMax = mm[1];
            }
        }
        var minMax = this.getMinMaxOfProperty(this.selectedStream, this.selectedPropertyForChart, showDeltas);
        // create 100 classes
        var nrOfClasses = 100;
        var classSize = (minMax[1] - minMax[0]) / nrOfClasses;
        var seriesValues = new Array(nrOfClasses + 1);
        for (var i_3 = 0; i_3 <= nrOfClasses; i_3++)
            seriesValues[i_3] = 0;
        for (var i = 0; i < selectedSimulation.nodes.length; i++) {
            var values = selectedSimulation.nodes[i][this.selectedPropertyForChart];
            if (showDeltas && values.length > 1) {
                var curVal = values[values.length - 1].value;
                var beforeVal = values[values.length - 2].value;
                var val = curVal - beforeVal;
                var alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
            else if (values.length > 0) {
                var val = values[values.length - 1].value;
                var alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
        }
        for (var i_4 = 0; i_4 <= seriesValues.length; i_4++) {
            var classStartValue = minMax[0] + classSize * i_4;
            series.push([classStartValue, seriesValues[i_4]]);
        }
        var self = this;
        var title = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "'] td").get(0)).text();
        $('#nodeChart').empty().highcharts({
            chart: {
                type: 'column',
                animation: "Highcharts.svg",
                alignTicks: false,
                events: {
                    load: function () {
                        self.currentChart = this;
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
    };
    SimulationGUI.prototype.updateAverageChart = function (selectedSimulation, showDeltas) {
        var self = this;
        var title = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "'] td").get(0)).text();
        var averages = [];
        var ranges = [];
        var nrOfValues = selectedSimulation.nodes[0][this.selectedPropertyForChart].length;
        for (var i = 0; i < nrOfValues; i++) {
            var minVal = Number.MAX_VALUE;
            var maxVal = Number.MIN_VALUE;
            var sum = 0;
            var count = 0;
            var timestamp = selectedSimulation.nodes[0][this.selectedPropertyForChart][i].timestamp;
            for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
                var n = _a[_i];
                var values = n[this.selectedPropertyForChart];
                if (i < values.length) {
                    var value = values[i].value;
                    sum += value;
                    count++;
                    if (minVal > value)
                        minVal = value;
                    if (maxVal < value)
                        maxVal = value;
                }
            }
            var avg = sum / count;
            averages.push([timestamp, avg]);
            ranges.push([timestamp, minVal, maxVal]);
        }
        $('#nodeChart').empty().highcharts({
            chart: {
                animation: "Highcharts.svg",
                marginRight: 10,
                events: {
                    load: function () {
                        self.currentChart = this;
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
                }, {
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
})();
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
    for (var _i = 0; _i < streams.length; _i++) {
        var stream = streams[_i];
        var rdb = "<input class=\"rdbStream\" name=\"streams\" type='radio' data-stream='" + stream + "'>&nbsp;";
        $("#rdbStreams").append(rdb);
    }
    sim.selectedStream = streams[0];
    $(".rdbStream[data-stream='" + sim.selectedStream + "']").prop("checked", true);
    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var opts = {
        reconnection: false,
        timeout: 1000000
    };
    var hasConnected = false;
    var sock = io.connect("http://" + window.location.host + "/");
    sock.on("connect", function (data) {
        if (hasConnected)
            return;
        hasConnected = true;
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim);
        console.log("Subscribing to " + streams);
        sock.emit("subscribe", {
            simulations: streams
        });
    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });
    sock.on("fileerror", function (data) {
        alert("Error: " + data);
    });
    sock.on("entry", function (data) {
        evManager.onReceive(data);
        //console.log("Received " + data.stream + ": " + data.line);
    });
    sock.on("bulkentry", function (data) {
        evManager.onReceiveBulk(data);
        //console.log("Received " + data.stream + ": " + data.line);
    });
    $(canvas).keydown(function (ev) {
        if (!sim.simulationContainer.hasSimulations())
            return;
        if (ev.keyCode == 37) {
            // left
            if (sim.selectedNode - 1 >= 0)
                sim.changeNodeSelection(sim.selectedNode - 1);
        }
        else if (ev.keyCode == 39) {
            // right
            if (sim.selectedNode + 1 < sim.simulationContainer.getSimulation(sim.selectedStream).nodes.length) {
                sim.changeNodeSelection(sim.selectedNode + 1);
            }
        }
    });
    $(canvas).click(function (ev) {
        if (!sim.simulationContainer.hasSimulations())
            return;
        var rect = canvas.getBoundingClientRect();
        var x = (ev.clientX - rect.left) / (canvas.width / sim.area);
        var y = (ev.clientY - rect.top) / (canvas.width / sim.area);
        var selectedSimulation = sim.simulationContainer.getSimulation(sim.selectedStream);
        var selectedNode = null;
        for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            var dist = Math.sqrt(Math.pow((n.x - x), 2) + Math.pow((n.y - y), 2));
            if (dist < 20) {
                selectedNode = n;
                break;
            }
        }
        if (selectedNode != null)
            sim.changeNodeSelection(selectedNode.id);
        else
            sim.changeNodeSelection(-1);
    });
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
        var rdbs = $(".rdbStream");
        for (var i = 0; i < rdbs.length; i++) {
            var rdb = $(rdbs.get(i));
            if (rdb.prop("checked")) {
                sim.selectedStream = rdb.attr("data-stream");
                sim.updateGUI(true);
            }
        }
    });
    $('.header').click(function () {
        $(this).find('span').text(function (_, value) { return value == '-' ? '+' : '-'; });
        $(this).nextUntil('tr.header').slideToggle(100, function () {
        });
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
//# sourceMappingURL=index.js.map