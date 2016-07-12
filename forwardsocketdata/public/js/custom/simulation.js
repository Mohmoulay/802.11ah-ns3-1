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
        this.rawSlotIndex = 0;
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
        this.numberOfTCPRetransmissions = [];
        this.nrOfReceivesDroppedByDestination = [];
        this.numberOfTCPRetransmissionsFromAP = [];
        this.numberOfMACTxRTSFailed = [];
        this.numberOfMACTxDataFailed = [];
        this.numberOfDropsByReasonUnknown = [];
        this.numberOfDropsByReasonPhyInSleepMode = [];
        this.numberOfDropsByReasonPhyNotEnoughSignalPower = [];
        this.numberOfDropsByReasonPhyUnsupportedMode = [];
        this.numberOfDropsByReasonPhyPreambleHeaderReceptionFailed = [];
        this.numberOfDropsByReasonPhyRxDuringChannelSwitching = [];
        this.numberOfDropsByReasonPhyAlreadyReceiving = [];
        this.numberOfDropsByReasonPhyAlreadyTransmitting = [];
        this.numberOfDropsByReasonPhyAlreadyPlcpReceptionFailed = [];
        this.numberOfDropsByReasonMacNotForAP = [];
        this.numberOfDropsByReasonMacAPToAPFrame = [];
        this.numberOfDropsFromAPByReasonUnknown = [];
        this.numberOfDropsFromAPByReasonPhyInSleepMode = [];
        this.numberOfDropsFromAPByReasonPhyNotEnoughSignalPower = [];
        this.numberOfDropsFromAPByReasonPhyUnsupportedMode = [];
        this.numberOfDropsFromAPByReasonPhyPreambleHeaderReceptionFailed = [];
        this.numberOfDropsFromAPByReasonPhyRxDuringChannelSwitching = [];
        this.numberOfDropsFromAPByReasonPhyAlreadyReceiving = [];
        this.numberOfDropsFromAPByReasonPhyAlreadyTransmitting = [];
        this.numberOfDropsFromAPByReasonPhyAlreadyPlcpReceptionFailed = [];
        this.numberOfDropsFromAPByReasonMacNotForAP = [];
        this.numberOfDropsFromAPByReasonMacAPToAPFrame = [];
        this.tcpRTO = [];
    }
    return SimulationNode;
})();
var Value = (function () {
    function Value(timestamp, value) {
        this.timestamp = timestamp;
        this.value = value;
    }
    return Value;
})();
var APNode = (function (_super) {
    __extends(APNode, _super);
    function APNode() {
        _super.apply(this, arguments);
        this.type = "AP";
    }
    return APNode;
})(SimulationNode);
var STANode = (function (_super) {
    __extends(STANode, _super);
    function STANode() {
        _super.apply(this, arguments);
        this.type = "STA";
        this.isAssociated = false;
    }
    return STANode;
})(SimulationNode);
var SimulationConfiguration = (function () {
    function SimulationConfiguration() {
        this.name = "";
    }
    return SimulationConfiguration;
})();
var Simulation = (function () {
    function Simulation() {
        this.nodes = [];
        this.config = new SimulationConfiguration();
    }
    return Simulation;
})();
//# sourceMappingURL=simulation.js.map