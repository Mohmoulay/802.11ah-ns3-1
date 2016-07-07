
class EventManager {

    events: SimulationEvent[] = [];

    constructor(private sim: SimulationGUI) {

    }

    processEvents() {
        while (this.events.length > 0) {
            let ev = this.events[0];

            
                switch (ev.parts[1]) {
                    case 'start':
                        this.onStart(ev.stream,parseInt(ev.parts[2]), parseInt(ev.parts[3]), ev.parts[4], parseInt(ev.parts[5]),
                            parseInt(ev.parts[6]), ev.parts[7], parseFloat(ev.parts[8]), parseFloat(ev.parts[9]),
                            parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), ev.parts[13]);
                        break;

                    case 'stanodeadd':
                        this.onNodeAdded(ev.stream,true, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseInt(ev.parts[5]));
                        break;

                    case 'stanodeassoc':
                        this.onNodeAssociated(ev.stream,parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]));
                        break;

                    case 'apnodeadd':
                        this.onNodeAdded(ev.stream,false, -1, parseFloat(ev.parts[2]), parseFloat(ev.parts[3]), -1);
                        break;

                    case 'nodestats':
                        this.onStatsUpdated(ev.stream, ev.time, parseInt(ev.parts[2]),
                            parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]),
                            parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]),
                            parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]),
                            parseFloat(ev.parts[14]), parseFloat(ev.parts[15]),
                            parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseFloat(ev.parts[18]), parseInt(ev.parts[19]));
                        break;
                    default:
                }
            

            this.sim.onSimulationTimeUpdated(ev.time);

            this.events.shift();
        }
    }

    onReceive(entry: IEntry) {
        let parts = entry.line.split(';');
        let time = parseInt(parts[0]);
        time = time / (1000 * 1000); // ns -> ms

        let ev = new SimulationEvent(entry.stream, time, parts);
        this.events.push(ev);
    }

    onStart(stream:string, aidRAWRange: number, numberOfRAWGroups: number, RAWSlotFormat: string, RAWSlotDuration: number, numberOfRAWSlots: number,
        dataMode: string, dataRate: number, bandwidth: number, trafficInterval: number, trafficPacketsize: number, beaconInterval: number,
        name: string) {

        let simulation = new Simulation();
        this.sim.simulationContainer.setSimulation(stream,simulation);

        simulation.nodes = [];
        let config = simulation.config;
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
    }

    onNodeAdded(stream:string,isSTA: boolean, id: number, x: number, y: number, aId: number) {
        let n: SimulationNode = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        n.aId = aId;

        this.sim.simulationContainer.getSimulation(stream).nodes.push(n);

        this.sim.onNodeAdded(stream, id);
    }

    onNodeAssociated(stream:string,id: number, aId: number, groupNumber: number) {
        let simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length) return;

        let n = simulation.nodes[id];
        n.aId = aId;
        n.groupNumber = groupNumber;
        (<STANode>n).isAssociated = true;

        this.sim.onNodeAssociated(stream, id);
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

    onStatsUpdated(stream: string, timestamp: number, id: number,
        totalTransmitTime: number, totalReceiveTime: number, totalReceiveDozeTime: number, totalReceiveActiveTime: number,
        nrOfTransmissions: number, nrOfTransmissionsDropped: number, nrOfReceives: number, nrOfReceivesDropped: number,
        nrOfSentPackets: number, nrOfSuccessfulPackets: number, nrOfDroppedPackets: number,
        avgPacketTimeOfFlight: number, goodputKbit: number,
        edcaQueueLength: number, nrOfSuccessfulRoundtripPackets: number, avgRoundTripTime: number, tcpCongestionWindow: number) {

        let simulation = this.sim.simulationContainer.getSimulation(stream);

        if (id < 0 || id >= simulation.nodes.length) return;
        // keep track of statistics

        let n = simulation.nodes[id];
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

        if(stream == this.sim.simulationContainer.getFirstStream()) {
            if (this.hasIncreased(n.totalTransmitTime)) {
                this.sim.addAnimation(new BroadcastAnimation(n.x, n.y));
            }
        }

        //if(this.hasIncreased(n.totalReceiveActiveTime))
        //   this.sim.addAnimation(new ReceivedAnimation(n.x, n.y));

        this.sim.onNodeUpdated(stream, id);
    }
}

class SimulationEvent {
    constructor(public stream: string, public time: number, public parts: string[]) {

    }
}
