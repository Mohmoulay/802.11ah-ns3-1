#include "Configuration.h"

Configuration::Configuration() {
    
}

Configuration::Configuration(int argc, char** argv) {
    CommandLine cmd;
    cmd.AddValue("Seed", "random seed", seed);
    cmd.AddValue("SimulationTime", "Simulation time in seconds", simulationTime);

    cmd.AddValue("Nsta", "number of total stations", Nsta);
    cmd.AddValue("NRawSta", "number of stations supporting RAW", NRawSta);
    cmd.AddValue("SlotFormat", "format of NRawSlotCount", SlotFormat);
    cmd.AddValue("NRawSlotCount", "RAW slot duration", NRawSlotCount);
    cmd.AddValue("NRawSlotNum", "number of slots per RAW", NRawSlotNum);
    cmd.AddValue("NGroup", "number of RAW group", NGroup);

    cmd.AddValue("BeaconInterval", "Beacon interval time in us", BeaconInterval);
    cmd.AddValue("APAlwaysSchedulesForNextSlot", "AP Always schedules for next slot (true/false)", APAlwaysSchedulesForNextSlot);
    cmd.AddValue("APScheduleTransmissionForNextSlotIfLessThan", "AP schedules transmission for next slot if slot time is less than (microseconds)", APScheduleTransmissionForNextSlotIfLessThan);

    cmd.AddValue("TrafficInterval", "Traffic interval time in ms", trafficInterval);
    cmd.AddValue("TrafficIntervalDeviation", "Traffic interval deviation time in ms, each interval will have a random deviation between - dev/2 and + dev/2", trafficIntervalDeviation);

    cmd.AddValue("TrafficPacketSize", "Size of packets to send in bytes", trafficPacketSize);
    cmd.AddValue("TrafficType", "Kind of traffic (udp, udpecho, tcpecho)", trafficType);

    cmd.AddValue("MinRTO", "Minimum retransmission timeout for TCP sockets in microseconds", MinRTO);
    cmd.AddValue("TCPConnectionTimeout", "TCP Connection timeout to use for all Tcp Sockets", TCPConnectionTimeout);

    cmd.AddValue("TCPSegmentSize", "TCP Segment size in bytes", TCPSegmentSize);
    cmd.AddValue("TCPInitialSlowStartThreshold", "TCP Initial slow start threshold in segments", TCPInitialSlowStartThreshold);
    cmd.AddValue("TCPInitialCwnd", "TCP Initial congestion window in segments", TCPInitialCwnd);


    cmd.AddValue("DataMode", "Date mode", DataMode);
    cmd.AddValue("Datarate", "data rate in Mbps", datarate);
    cmd.AddValue("BandWidth", "bandwidth in MHz", bandWidth);

    cmd.AddValue("Rho", "maximal distance between AP and stations", rho);

    cmd.AddValue("PropagationLossExponent", "exponent gamma of the log propagation model, default values are outdoors", propagationLossExponent);
    cmd.AddValue("PropagationLossReferenceLoss", "reference loss of the log propagation model", propagationLossReferenceLoss);

    cmd.AddValue("VisualizerIP", "IP or hostname for the visualizer server, leave empty to not send data", visualizerIP);
    cmd.AddValue("VisualizerPort", "Port for the visualizer server", visualizerPort);
    cmd.AddValue("VisualizerSamplingInterval", "Sampling interval of statistics in seconds", visualizerSamplingInterval);


    cmd.AddValue("APPcapFile", "Name of the pcap file to generate at the AP, leave empty to omit generation", APPcapFile);
    cmd.AddValue("Name", "Name of the simulation", name);



    cmd.Parse(argc, argv);
}
