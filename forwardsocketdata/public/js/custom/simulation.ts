abstract class SimulationNode {

    id: number = -1;

    x: number = 0;
    y: number = 0;
    aId: number = 0;
    groupNumber: number = 0;
    rawSlotIndex: number = 0;

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

    avgSentReceiveTime: Value[] = [];
    goodputKbit: Value[] = [];

    edcaQueueLength:Value[] = [];
    nrOfSuccessfulRoundtripPackets: Value[] = [];
    avgRoundtripTime: Value[] = [];

    tcpCongestionWindow: Value[] = [];
    numberOfTCPRetransmissions: Value[] = [];

    nrOfReceivesDroppedByDestination: Value[] = [];
}

class Value {
    constructor(public timestamp: number, public value: number) { }
}

class APNode extends SimulationNode {
    type: string = "AP";
}

class STANode extends SimulationNode {
    type: string = "STA";

    isAssociated: boolean = false;
}


class SimulationConfiguration {

    AIDRAWRange: number;
    numberOfRAWGroups: number;

    RAWSlotFormat: string;
    numberOfRAWSlots: number;
    RAWSlotDuration: number;

    dataMode: string;
    dataRate: number;
    bandwidth: number;

    trafficInterval: number;
    trafficPacketsize: number;

    beaconInterval: number;

    name:string = "";
}
 
 
class Simulation {

    nodes: SimulationNode[] = [];
    config: SimulationConfiguration = new SimulationConfiguration();
}