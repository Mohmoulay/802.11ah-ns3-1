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

    cmd.AddValue("TrafficInterval", "Traffic interval time in ms", trafficInterval);
    cmd.AddValue("TrafficPacketSize", "Size of packets to send in bytes", trafficPacketSize);
    cmd.AddValue("TrafficType", "Kind of traffic (udp, udpecho, tcpecho)", trafficType);

    cmd.AddValue("DataMode", "Date mode", DataMode);
    cmd.AddValue("Datarate", "data rate in Mbps", datarate);
    cmd.AddValue("BandWidth", "bandwidth in MHz", bandWidth);

    cmd.AddValue("Rho", "maximal distance between AP and stations", rho);

    cmd.AddValue("VisualizerIP", "IP or hostname for the visualizer server, leave empty to not send data", visualizerIP);
    cmd.AddValue("VisualizerPort", "Port for the visualizer server", visualizerPort);

    cmd.AddValue("Name", "Name of the simulation", name);

    cmd.AddValue("VisualizerSamplingInterval", "Sampling interval of statistics in seconds", visualizerSamplingInterval);

    cmd.Parse(argc, argv);
}
