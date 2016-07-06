#include "main.h"

using namespace std;
using namespace ns3;


int main(int argc, char** argv) {

	PacketMetadata::Enable();

    config = Configuration(argc, argv);
    stats = Statistics(config.Nsta);

    eventManager = SimulationEventManager(config.visualizerIP, config.visualizerPort);

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

    // configure position of AP
    Ptr<MobilityModel> mobility1 = apNodes.Get(0)->GetObject<MobilityModel>();
    Vector apposition = mobility1->GetPosition();
    std::cout << "AP node, position = " << apposition << std::endl;

    // configure position of stations
    int i = 0;
    while (i < config.Nsta) {
        Ptr<MobilityModel> mobility = staNodes.Get(i)->GetObject<MobilityModel>();
        Vector position = mobility->GetPosition();
        double distance = sqrt((position.x - apposition.x)*(position.x - apposition.x) + (position.y - apposition.y)*(position.y - apposition.y));
        std::cout << "Sta node#" << i << ", " << "position = " << position << "(distance to AP: " << distance << ")" << std::endl;
        nodes[i]->x = position.x;
        nodes[i]->y = position.y;
        i++;
    }

    eventManager.onStart(config);

    for(int i = 0; i < config.Nsta; i++)
    	eventManager.onSTANodeCreated(*nodes[i]);

    eventManager.onAPNodeCreated(apposition.x, apposition.y);

    // start sending statistics every second
    sendStatistics();

    Simulator::Stop(Seconds(config.simulationTime));
    Simulator::Run();
    Simulator::Destroy();


    stats.TotalSimulationTime = Seconds(config.simulationTime);
    printStatistics();

    return (EXIT_SUCCESS);
}

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
}

void OnAPPhyRxBegin(std::string context, Ptr<const Packet> packet) {
	//cout << " AP RX Begin " << endl;
}

void OnAPPhyRxDrop(std::string context, Ptr<const Packet> packet) {


	//cout << " AP RX Drop " << endl;
	//packet->Print(cout);

}

void configureAPNode(Ssid& ssid) {
    // create AP node
    apNodes.Create(1);

    uint32_t NGroupStas = config.NRawSta / config.NGroup;

    // setup mac
    S1gWifiMacHelper mac = S1gWifiMacHelper::Default();
    mac.SetType("ns3::S1gApWifiMac",
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

	Config::Connect("/NodeList/" + std::to_string(config.Nsta) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxBegin", MakeCallback(&OnAPPhyRxBegin));
	Config::Connect("/NodeList/" + std::to_string(config.Nsta) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxDrop", MakeCallback(&OnAPPhyRxDrop));


	phy.EnablePcap("pcapfile", apNodes, 0);

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


        NodeEntry* n = new NodeEntry(i, &stats, staNodes.Get(i), staDevices.Get(i));
        n->SetAssociatedCallback([ = ]{onSTAAssociated(i);});

        nodes.push_back(n);
        // hook up Associated and Deassociated events
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/Assoc", MakeCallback(&NodeEntry::SetAssociation, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/DeAssoc", MakeCallback(&NodeEntry::UnsetAssociation, n));

        // hook up TX
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyTxBegin", MakeCallback(&NodeEntry::OnPhyTxBegin, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyTxEnd", MakeCallback(&NodeEntry::OnPhyTxEnd, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyTxDrop", MakeCallback(&NodeEntry::OnPhyTxDrop, n));

        // hook up RX
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxBegin", MakeCallback(&NodeEntry::OnPhyRxBegin, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxEnd", MakeCallback(&NodeEntry::OnPhyRxEnd, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxDrop", MakeCallback(&NodeEntry::OnPhyRxDrop, n));

        // hook up PHY State change
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/State/State", MakeCallback(&NodeEntry::OnPhyStateChange, n));

    }
}

void udpPacketReceivedAtServer(Ptr<const Packet> packet, Address from) {
    int staId = -1;
    for (int i = 0; i < staNodeInterfaces.GetN(); i++) {
        if (staNodeInterfaces.GetAddress(i) == InetSocketAddress::ConvertFrom(from).GetIpv4()) {
            staId = i;
            break;
        }
    }
    if (staId != -1)
        nodes[staId]->OnUdpPacketReceivedAtAP(packet);
    else
    	cout << "*** Node could not be determined from received packet at AP " << endl;
}

void tcpPacketReceivedAtServer (Ptr<const Packet> packet, Address from) {
	cout << "TCP packet received at server " << endl;

    int staId = -1;
    for (int i = 0; i < staNodeInterfaces.GetN(); i++) {
        if (staNodeInterfaces.GetAddress(i) == InetSocketAddress::ConvertFrom(from).GetIpv4()) {
            staId = i;
            break;
        }
    }
    if (staId != -1)
        nodes[staId]->OnTcpPacketReceivedAtAP(packet);
    else
    	cout << "*** Node could not be determined from received packet at AP " << endl;
}

/*void udpPacketReceivedAtClient(Ptr<const Packet> packet, Address from) {
    int apId = -1;
    for (int i = 0; i < apNodeInterfaces.GetN(); i++) {
        if (apNodeInterfaces.GetAddress(i) == InetSocketAddress::ConvertFrom(from).GetIpv4()) {
        	apId = i;
            break;
        }
    }

    if (apId != -1)
        nodes[staId]->OnUdpPacketReceivedAtAP(packet);
    else
    	cout << "Echo packet received at client is not coming from AP" << endl;
}*/


void configureUDPServer() {
    UdpServerHelper myServer(9);
    serverApp = myServer.Install(apNodes);
    serverApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&udpPacketReceivedAtServer));
    serverApp.Start(Seconds(0));

}

void configureUDPEchoServer() {
    UdpEchoServerHelper myServer(9);
    serverApp = myServer.Install(apNodes);
    serverApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&udpPacketReceivedAtServer));
    serverApp.Start(Seconds(0));
}


void configureTCPEchoServer() {
	TcpEchoServerHelper myServer(80);
	serverApp = myServer.Install(apNodes);
	serverApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&tcpPacketReceivedAtServer));
	serverApp.Start(Seconds(0));
}

void configureTCPEchoClients() {
	TcpEchoClientHelper clientHelper(apNodeInterfaces.GetAddress(0), 80); //address of remote node
	clientHelper.SetAttribute("MaxPackets", UintegerValue(4294967295u));
	clientHelper.SetAttribute("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	clientHelper.SetAttribute("PacketSize", UintegerValue(config.trafficPacketSize));
	for (uint16_t i = 0; i < config.Nsta; i++) {
		ApplicationContainer clientApp = clientHelper.Install(staNodes.Get(i));
		clientApp.Get(0)->TraceConnectWithoutContext("Tx", MakeCallback(&NodeEntry::OnTcpPacketSent, nodes[i]));
		clientApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&NodeEntry::OnTcpEchoPacketReceived, nodes[i]));

		clientApp.Get(0)->TraceConnectWithoutContext("CongestionWindow", MakeCallback(&NodeEntry::OnTcpCongestionWindowChanged, nodes[i]));

		double random = (rand() % (config.trafficInterval/1000*4)) / (double)4;
		clientApp.Start(Seconds(0+random));
		//clientApp.Stop(Seconds(simulationTime + 1));
	}
}

void configureUDPClients() {


    UdpClientHelper clientHelper(apNodeInterfaces.GetAddress(0), 9); //address of remote node
    clientHelper.SetAttribute("MaxPackets", UintegerValue(4294967295u));
    clientHelper.SetAttribute("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
    clientHelper.SetAttribute("PacketSize", UintegerValue(config.trafficPacketSize));
    for (uint16_t i = 0; i < config.Nsta; i++) {
        ApplicationContainer clientApp = clientHelper.Install(staNodes.Get(i));
        clientApp.Get(0)->TraceConnectWithoutContext("Tx", MakeCallback(&NodeEntry::OnUdpPacketSent, nodes[i]));


        double random = (rand() % (config.trafficInterval/1000*4)) / (double)4;
        clientApp.Start(Seconds(0+random));
        //clientApp.Stop(Seconds(simulationTime + 1));
    }
}

void configureUDPEchoClients() {
	UdpEchoClientHelper clientHelper(apNodeInterfaces.GetAddress(0), 9); //address of remote node
	clientHelper.SetAttribute("MaxPackets", UintegerValue(4294967295u));
	clientHelper.SetAttribute("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	clientHelper.SetAttribute("PacketSize", UintegerValue(config.trafficPacketSize));
	for (uint16_t i = 0; i < config.Nsta; i++) {
		ApplicationContainer clientApp = clientHelper.Install(staNodes.Get(i));
		clientApp.Get(0)->TraceConnectWithoutContext("Tx", MakeCallback(&NodeEntry::OnUdpPacketSent, nodes[i]));
		clientApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&NodeEntry::OnUdpEchoPacketReceived, nodes[i]));

		double random = (rand() % (config.trafficInterval/1000*4)) / (double)4;
		clientApp.Start(Seconds(0+random));
		//clientApp.Stop(Seconds(simulationTime + 1));
	}
}

void onSTAAssociated(int i) {

    nodes[i]->rawGroupNumber = ((nodes[i]->aId - 1) / (config.NRawSta / config.NGroup));
	cout << "Node " << std::to_string(i) << " is associated and has aId " << nodes[i]->aId << " and falls in RAW group " << std::to_string(nodes[i]->rawGroupNumber) << endl;

    eventManager.onNodeAssociated(*nodes[i]);

    int nrOfSTAAssociated = 0;
    for (int i = 0; i < config.Nsta; i++) {
        if (nodes[i]->isAssociated)
            nrOfSTAAssociated++;
    }

    if (nrOfSTAAssociated == config.Nsta) {
    	cout << "All stations associated, configuring UDP clients & server" << endl;
        // association complete, start sending packets
    	stats.TimeWhenEverySTAIsAssociated = Simulator::Now();

        //configureUDPServer();
        //configureUDPClients();
    	//configureUDPEchoServer();
    	//configureUDPEchoClients();
		configureTCPEchoServer();
		configureTCPEchoClients();

        updateNodesQueueLength();
    }
}


void updateNodesQueueLength() {
	for(int i = 0; i < config.Nsta; i++) {
		nodes[i]->UpdateQueueLength();

		stats.get(i).EDCAQueueLength = nodes[i]->queueLength;
	}

	Simulator::Schedule(Seconds(0.5), &updateNodesQueueLength);
}

void printStatistics() {
	cout << "Statistics" << endl;
	cout << "----------" << endl;
	cout << "Total simulation time: " << std::to_string(stats.TotalSimulationTime.GetMilliSeconds()) << "ms" << endl;
	cout << "Time every station associated: " << std::to_string(stats.TimeWhenEverySTAIsAssociated.GetMilliSeconds()) << "ms" << endl;
	cout << "" << endl;
	for(int i = 0; i < config.Nsta; i++) {
		cout << "Node " << std::to_string(i) << endl;
		cout << "X: " << nodes[i]->x << ", Y: " << nodes[i]->y << endl;
		cout << "Tx Remaining Queue size: " << nodes[i]->queueLength << endl;
		cout << "Tcp congestion window value: " << nodes[i]->congestionWindowValue << endl;
		cout << "--------------" << endl;

		cout << "Total transmit time: " << std::to_string(stats.get(i).TotalTransmitTime.GetMilliSeconds()) << "ms" << endl;
		cout << "Total receive time: " << std::to_string(stats.get(i).TotalReceiveTime.GetMilliSeconds()) << "ms" << endl;
		cout << "    Total active receive time: " << std::to_string(stats.get(i).TotalReceiveActiveTime.GetMilliSeconds()) << "ms" << endl;
		cout << "    Total doze receive time: " << std::to_string(stats.get(i).TotalReceiveDozeTime.GetMilliSeconds()) << "ms" << endl;

		cout << "Number of transmissions: " << std::to_string(stats.get(i).NumberOfTransmissions) << endl;
		cout << "Number of transmissions dropped: " << std::to_string(stats.get(i).NumberOfTransmissionsDropped) << endl;
		cout << "Number of receives: " << std::to_string(stats.get(i).NumberOfReceives) << endl;
		cout << "Number of receives dropped: " << std::to_string(stats.get(i).NumberOfReceivesDropped) << endl;

		cout << "" << endl;
		cout << "Number of packets sent: " << std::to_string(stats.get(i).NumberOfSentPackets) << endl;
		cout << "Number of packets successful: " << std::to_string(stats.get(i).NumberOfSuccessfulPackets) << endl;
		cout << "Number of packets dropped: " << std::to_string(stats.get(i).getNumberOfDroppedPackets()) << endl;

		cout << "Number of roundtrip packets successful: " << std::to_string(stats.get(i).NumberOfSuccessfulRoundtripPackets) << endl;

		cout << "Average packet sent/receive time: " << std::to_string(stats.get(i).getAveragePacketSentReceiveTime().GetMicroSeconds()) << "µs" << endl;
		cout << "Average packet roundtrip time: " << std::to_string(stats.get(i).getAveragePacketRoundTripTime().GetMicroSeconds()) << "µs" << endl;

		cout << "" << endl;
		cout << "Goodput: " << std::to_string(stats.get(i).getGoodputKbit()) << "Kbit" << endl;
//		cout << "Total bytes: " << std::to_string(stats.get(i).TotalPacketPayloadSize) << "b" << endl;
//		cout << "Total time: " << std::to_string(stats.get(i).TotalPacketTimeOfFlight.GetSeconds()) << "sec" << endl;
		cout << "*********************" << endl;
	}
}

void sendStatistics() {
	eventManager.onUpdateStatistics(stats);
	Simulator::Schedule(Seconds(1), &sendStatistics);
}
