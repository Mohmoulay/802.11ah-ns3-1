var EventManager = (function () {
    function EventManager(sim) {
        this.sim = sim;
        this.events = [];
    }
    EventManager.prototype.processEvents = function () {
        var eventsProcessed = this.events.length > 0;
        if (this.events.length > 1000)
            this.updateGUI = false;
        else
            this.updateGUI = true;
        var lastTime;
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
                    this.onNodeAssociated(ev.stream, parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]), parseInt(ev.parts[5]));
                    break;
                case 'stanodedeassoc':
                    this.onNodeDeassociated(ev.stream, parseInt(ev.parts[2]));
                    break;
                case 'apnodeadd':
                    this.onNodeAdded(ev.stream, false, -1, parseFloat(ev.parts[2]), parseFloat(ev.parts[3]), -1);
                    break;
                case 'nodestats':
                    this.onStatsUpdated(ev.stream, ev.time, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]), parseFloat(ev.parts[14]), parseFloat(ev.parts[15]), parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseFloat(ev.parts[18]), parseInt(ev.parts[19]), parseInt(ev.parts[20]), parseInt(ev.parts[21]), parseInt(ev.parts[22]), parseInt(ev.parts[23]), parseInt(ev.parts[24]), ev.parts[25], ev.parts[26], parseInt(ev.parts[27]));
                    break;
                default:
            }
            lastTime = ev.time;
            this.events.shift();
        }
        if (eventsProcessed) {
            this.sim.onSimulationTimeUpdated(lastTime);
            this.sim.updateGUI(false);
        }
    };
    EventManager.prototype.onReceiveBulk = function (entry) {
        for (var _i = 0, _a = entry.lines; _i < _a.length; _i++) {
            var l = _a[_i];
            this.onReceive({ stream: entry.stream, line: l });
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
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (typeof simulation == "undefined") {
            simulation = new Simulation();
            this.sim.simulationContainer.setSimulation(stream, simulation);
        }
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
        // this.sim.onNodeAdded(stream, id);
    };
    EventManager.prototype.onNodeAssociated = function (stream, id, aId, groupNumber, rawSlotIndex) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        var n = simulation.nodes[id];
        n.aId = aId;
        n.groupNumber = groupNumber;
        n.rawSlotIndex = rawSlotIndex;
        n.isAssociated = true;
        this.sim.onNodeAssociated(stream, id);
    };
    EventManager.prototype.onNodeDeassociated = function (stream, id) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        var n = simulation.nodes[id];
        n.isAssociated = false;
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
    EventManager.prototype.onStatsUpdated = function (stream, timestamp, id, totalTransmitTime, totalReceiveTime, totalReceiveDozeTime, totalReceiveActiveTime, nrOfTransmissions, nrOfTransmissionsDropped, nrOfReceives, nrOfReceivesDropped, nrOfSentPackets, nrOfSuccessfulPackets, nrOfDroppedPackets, avgPacketTimeOfFlight, goodputKbit, edcaQueueLength, nrOfSuccessfulRoundtripPackets, avgRoundTripTime, tcpCongestionWindow, numberOfTCPRetransmissions, numberOfTCPRetransmissionsFromAP, nrOfReceivesDroppedByDestination, numberOfMACTxRTSFailed, numberOfMACTxDataFailed, numberOfDropsByReason, numberOfDropsByReasonAtAP, tcpRtoValue) {
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
        n.nrOfReceivesDroppedByDestination.push(new Value(timestamp, nrOfReceivesDroppedByDestination));
        n.nrOfSentPackets.push(new Value(timestamp, nrOfSentPackets));
        n.nrOfSuccessfulPackets.push(new Value(timestamp, nrOfSuccessfulPackets));
        n.nrOfDroppedPackets.push(new Value(timestamp, nrOfDroppedPackets));
        n.avgSentReceiveTime.push(new Value(timestamp, avgPacketTimeOfFlight));
        n.goodputKbit.push(new Value(timestamp, goodputKbit));
        n.edcaQueueLength.push(new Value(timestamp, edcaQueueLength));
        n.nrOfSuccessfulRoundtripPackets.push(new Value(timestamp, nrOfSuccessfulRoundtripPackets));
        n.avgRoundtripTime.push(new Value(timestamp, avgRoundTripTime));
        n.tcpCongestionWindow.push(new Value(timestamp, tcpCongestionWindow));
        n.numberOfTCPRetransmissions.push(new Value(timestamp, numberOfTCPRetransmissions));
        n.numberOfTCPRetransmissionsFromAP.push(new Value(timestamp, numberOfTCPRetransmissionsFromAP));
        n.tcpRTO.push(new Value(timestamp, tcpRtoValue));
        n.numberOfMACTxRTSFailed.push(new Value(timestamp, numberOfMACTxRTSFailed));
        n.numberOfMACTxDataFailed.push(new Value(timestamp, numberOfMACTxDataFailed));
        if (typeof numberOfDropsByReason != "undefined") {
            var dropParts = numberOfDropsByReason.split(',');
            n.numberOfDropsByReasonUnknown.push(new Value(timestamp, parseInt(dropParts[0])));
            n.numberOfDropsByReasonPhyInSleepMode.push(new Value(timestamp, parseInt(dropParts[1])));
            n.numberOfDropsByReasonPhyNotEnoughSignalPower.push(new Value(timestamp, parseInt(dropParts[2])));
            n.numberOfDropsByReasonPhyUnsupportedMode.push(new Value(timestamp, parseInt(dropParts[3])));
            n.numberOfDropsByReasonPhyPreambleHeaderReceptionFailed.push(new Value(timestamp, parseInt(dropParts[4])));
            n.numberOfDropsByReasonPhyRxDuringChannelSwitching.push(new Value(timestamp, parseInt(dropParts[5])));
            n.numberOfDropsByReasonPhyAlreadyReceiving.push(new Value(timestamp, parseInt(dropParts[6])));
            n.numberOfDropsByReasonPhyAlreadyTransmitting.push(new Value(timestamp, parseInt(dropParts[7])));
            n.numberOfDropsByReasonPhyAlreadyPlcpReceptionFailed.push(new Value(timestamp, parseInt(dropParts[8])));
            n.numberOfDropsByReasonMacNotForAP.push(new Value(timestamp, parseInt(dropParts[9])));
            n.numberOfDropsByReasonMacAPToAPFrame.push(new Value(timestamp, parseInt(dropParts[10])));
        }
        if (typeof numberOfDropsByReason != "undefined") {
            var dropParts = numberOfDropsByReasonAtAP.split(',');
            n.numberOfDropsFromAPByReasonUnknown.push(new Value(timestamp, parseInt(dropParts[0])));
            n.numberOfDropsFromAPByReasonPhyInSleepMode.push(new Value(timestamp, parseInt(dropParts[1])));
            n.numberOfDropsFromAPByReasonPhyNotEnoughSignalPower.push(new Value(timestamp, parseInt(dropParts[2])));
            n.numberOfDropsFromAPByReasonPhyUnsupportedMode.push(new Value(timestamp, parseInt(dropParts[3])));
            n.numberOfDropsFromAPByReasonPhyPreambleHeaderReceptionFailed.push(new Value(timestamp, parseInt(dropParts[4])));
            n.numberOfDropsFromAPByReasonPhyRxDuringChannelSwitching.push(new Value(timestamp, parseInt(dropParts[5])));
            n.numberOfDropsFromAPByReasonPhyAlreadyReceiving.push(new Value(timestamp, parseInt(dropParts[6])));
            n.numberOfDropsFromAPByReasonPhyAlreadyTransmitting.push(new Value(timestamp, parseInt(dropParts[7])));
            n.numberOfDropsFromAPByReasonPhyAlreadyPlcpReceptionFailed.push(new Value(timestamp, parseInt(dropParts[8])));
            n.numberOfDropsFromAPByReasonMacNotForAP.push(new Value(timestamp, parseInt(dropParts[9])));
            n.numberOfDropsFromAPByReasonMacAPToAPFrame.push(new Value(timestamp, parseInt(dropParts[10])));
        }
        n.tcpRTO.push(new Value(timestamp, tcpRtoValue));
        if (this.updateGUI && stream == this.sim.selectedStream) {
            if (this.hasIncreased(n.totalTransmitTime)) {
                this.sim.addAnimation(new BroadcastAnimation(n.x, n.y));
            }
        }
        //if(this.hasIncreased(n.totalReceiveActiveTime))
        //   this.sim.addAnimation(new ReceivedAnimation(n.x, n.y));
        // this.sim.onNodeUpdated(stream, id);
    };
    return EventManager;
})();
var SimulationEvent = (function () {
    function SimulationEvent(stream, time, parts) {
        this.stream = stream;
        this.time = time;
        this.parts = parts;
    }
    return SimulationEvent;
})();
//# sourceMappingURL=eventmanager.js.map