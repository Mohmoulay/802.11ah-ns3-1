#include "main.h"

using namespace std;
using namespace ns3;

void configureSTANodes(Ssid& ssid) {
    // create STA nodes
    staNodes.Create(config.Nsta);

    // setup physical layer
    YansWifiPhyHelper phy = YansWifiPhyHelper::Default();
    phy.SetErrorRateModel("ns3::YansErrorRateModel");
    phy.SetChannel(channel);
    phy.Set("ShortGuardEnabled", BooleanValue(false));
    phy.Set("ChannelWidth", UintegerValue(config.bandWidth));
    phy.Set("EnergyDetectionThreshold", DoubleValue(-116.0));
    phy.Set("CcaMode1Threshold", DoubleValue(-119.0));
    phy.Set("TxGain", DoubleValue(0.0));
    phy.Set("RxGain", DoubleValue(0.0));
    phy.Set("TxPowerLevels", UintegerValue(1));
    phy.Set("TxPowerEnd", DoubleValue(0.0));
    phy.Set("TxPowerStart", DoubleValue(0.0));
    phy.Set("RxNoiseFigure", DoubleValue(3.0));
    phy.Set("LdpcEnabled", BooleanValue(true));

    // setup S1g MAC 
    S1gWifiMacHelper mac = S1gWifiMacHelper::Default();
    mac.SetType("ns3::StaWifiMac",
            "Ssid", SsidValue(ssid),
            "ActiveProbing", BooleanValue(false));

    // create wifi
    WifiHelper wifi = WifiHelper::Default();
    wifi.SetStandard(WIFI_PHY_STANDARD_80211ah);
    StringValue dataRate = StringValue(config.DataMode);
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager", "DataMode", dataRate, "ControlMode", dataRate);

    // install wifi device
    staDevices = wifi.Install(phy, mac, staNodes);

    // mobility
    MobilityHelper mobility;
    mobility.SetPositionAllocator("ns3::UniformDiscPositionAllocator",
            "X", StringValue("1000.0"),
            "Y", StringValue("1000.0"),
            "rho", StringValue(config.rho));
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(staNodes);

    // ascii logging for all traffic the AP transmits or receives
    AsciiTraceHelper ascii;
    phy.EnableAscii(ascii.CreateFileStream("wifiahstatracelog_.tr"), staDevices.Get(0));


}

void configureAPNode(Ssid& ssid) {
    // create AP node
    apNodes.Create(1);

    uint32_t NGroupStas = config.NRawSta / config.NGroup;

    // setup mac
    S1gWifiMacHelper mac = S1gWifiMacHelper::Default();
    mac.SetType("ns3::ApWifiMac",
            "Ssid", SsidValue(ssid),
            "BeaconInterval", TimeValue(MicroSeconds(config.BeaconInterval)),
            "NRawGroupStas", UintegerValue(NGroupStas),
            "NRawStations", UintegerValue(config.NRawSta),
            "SlotFormat", UintegerValue(config.SlotFormat),
            "SlotCrossBoundary", UintegerValue(1),
            "SlotDurationCount", UintegerValue(config.NRawSlotCount),
            "SlotNum", UintegerValue(config.NRawSlotNum));

    // setup physical layer
    YansWifiPhyHelper phy = YansWifiPhyHelper::Default();
    phy.SetErrorRateModel("ns3::YansErrorRateModel");
    phy.SetChannel(channel);
    phy.Set("ShortGuardEnabled", BooleanValue(false));
    phy.Set("ChannelWidth", UintegerValue(config.bandWidth));
    phy.Set("EnergyDetectionThreshold", DoubleValue(-116.0));
    phy.Set("CcaMode1Threshold", DoubleValue(-119.0));
    phy.Set("TxGain", DoubleValue(3.0));
    phy.Set("RxGain", DoubleValue(3.0));
    phy.Set("TxPowerLevels", UintegerValue(1));
    phy.Set("TxPowerEnd", DoubleValue(30.0));
    phy.Set("TxPowerStart", DoubleValue(30.0));
    phy.Set("RxNoiseFigure", DoubleValue(5));
    phy.Set("LdpcEnabled", BooleanValue(true));

    // create wifi
    WifiHelper wifi = WifiHelper::Default();
    wifi.SetStandard(WIFI_PHY_STANDARD_80211ah);
    StringValue dataRate = StringValue(config.DataMode);
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager", "DataMode", dataRate, "ControlMode", dataRate);


    apDevices = wifi.Install(phy, mac, apNodes);

    MobilityHelper mobilityAp;
    Ptr<ListPositionAllocator> positionAlloc = CreateObject<ListPositionAllocator> ();
    positionAlloc->Add(Vector(1000.0, 1000.0, 0.0));
    mobilityAp.SetPositionAllocator(positionAlloc);
    mobilityAp.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobilityAp.Install(apNodes);

    // ascii logging for all traffic the AP transmits or receives
    AsciiTraceHelper ascii;
    phy.EnableAscii(ascii.CreateFileStream("wifiahtracelog.tr"), apDevices.Get(0));

}

void configureIPStack() {
    /* Internet stack*/
    InternetStackHelper stack;
    stack.Install(apNodes);
    stack.Install(staNodes);

    Ipv4AddressHelper address;
    address.SetBase("192.168.0.0", "255.255.0.0");

    staNodeInterfaces = address.Assign(staDevices);
    apNodeInterfaces = address.Assign(apDevices);
}

void configureNodes() {
    for (int i = 0; i < config.Nsta; i++) {

        NodeEntry* n = new NodeEntry(i);
        n->SetAssociatedCallback([ = ]{onSTAAssociated(i);});

        nodes.push_back(n);
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/Assoc", MakeCallback(&NodeEntry::SetAssociation, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/DeAssoc", MakeCallback(&NodeEntry::UnsetAssociation, n));
    }
}

void onSTAAssociated(int i) {
    cout << "Node " << std::to_string(i) << " is associated" << endl;
    int nrOfSTAAssociated = 0;
    for (int i = 0; i < config.Nsta; i++) {
        if (nodes[i]->isAssociated)
            nrOfSTAAssociated++;
    }

    if (nrOfSTAAssociated == config.Nsta) {
        // association complete, start sending packets
    }
}

int main(int argc, char** argv) {

    config = Configuration(argc, argv);

    RngSeedManager::SetSeed(config.seed);

    // setup wifi channel
    YansWifiChannelHelper channelBuilder = YansWifiChannelHelper();
    channelBuilder.AddPropagationLoss("ns3::LogDistancePropagationLossModel", "Exponent", DoubleValue(3.76), "ReferenceLoss", DoubleValue(8.0), "ReferenceDistance", DoubleValue(1.0));
    channelBuilder.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
    channel = channelBuilder.Create();
    
    Ssid ssid = Ssid("ns380211ah");

    // configure STA nodes
    configureSTANodes(ssid);

    // configure AP nodes
    configureAPNode(ssid);

    // configure IP addresses
    configureIPStack();

    // prepopulate routing tables and arp cache
    Ipv4GlobalRoutingHelper::PopulateRoutingTables();
    PopulateArpCache();

    // configure tracing for associations & other metrics 
    configureNodes();

    Ptr<MobilityModel> mobility1 = apNodes.Get(0)->GetObject<MobilityModel>();
    Vector apposition = mobility1->GetPosition();
    std::cout << "AP node, position = " << apposition << std::endl;

    int i = 0;
    while (i < config.Nsta) {
        Ptr<MobilityModel> mobility = staNodes.Get(i)->GetObject<MobilityModel>();
        Vector position = mobility->GetPosition();
        double distance = sqrt((position.x - apposition.x)*(position.x - apposition.x) + (position.y - apposition.y)*(position.y - apposition.y));
        std::cout << "Sta node#" << i << ", " << "position = " << position << "(distance to AP: " << distance << ")" << std::endl;
        i++;
    }


    Simulator::Stop(Seconds(10));
    Simulator::Run();


    return (EXIT_SUCCESS);
}

