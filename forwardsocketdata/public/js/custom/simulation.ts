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

    numberOfTCPRetransmissionsFromAP : Value[] = [];
    numberOfMACTxRTSFailed : Value[] = [];
    numberOfMACTxDataFailed : Value[] = [];

    numberOfDropsByReasonUnknown:Value[] = [];
    numberOfDropsByReasonPhyInSleepMode:Value[] = [];
    numberOfDropsByReasonPhyNotEnoughSignalPower:Value[] = [];
    numberOfDropsByReasonPhyUnsupportedMode:Value[] = [];
    numberOfDropsByReasonPhyPreambleHeaderReceptionFailed:Value[] = [];
    numberOfDropsByReasonPhyRxDuringChannelSwitching:Value[] = [];
    numberOfDropsByReasonPhyAlreadyReceiving:Value[] = [];
    numberOfDropsByReasonPhyAlreadyTransmitting:Value[] = [];
    numberOfDropsByReasonPhyAlreadyPlcpReceptionFailed:Value[] = [];
    numberOfDropsByReasonMacNotForAP:Value[] = [];
    numberOfDropsByReasonMacAPToAPFrame:Value[] = [];

    numberOfDropsFromAPByReasonUnknown:Value[] = [];
    numberOfDropsFromAPByReasonPhyInSleepMode:Value[] = [];
    numberOfDropsFromAPByReasonPhyNotEnoughSignalPower:Value[] = [];
    numberOfDropsFromAPByReasonPhyUnsupportedMode:Value[] = [];
    numberOfDropsFromAPByReasonPhyPreambleHeaderReceptionFailed:Value[] = [];
    numberOfDropsFromAPByReasonPhyRxDuringChannelSwitching:Value[] = [];
    numberOfDropsFromAPByReasonPhyAlreadyReceiving:Value[] = [];
    numberOfDropsFromAPByReasonPhyAlreadyTransmitting:Value[] = [];
    numberOfDropsFromAPByReasonPhyAlreadyPlcpReceptionFailed:Value[] = [];
    numberOfDropsFromAPByReasonMacNotForAP:Value[] = [];
    numberOfDropsFromAPByReasonMacAPToAPFrame:Value[] = [];

    tcpRTO: Value[] = [];

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


    propagationLossExponent:number;
    propagationLossReferenceLoss:number;
    apAlwaysSchedulesForNextSlot:string;
    minRTO:number;
    simulationTime:number;
}
 
 
class Simulation {

    nodes: SimulationNode[] = [];
    config: SimulationConfiguration = new SimulationConfiguration();
}