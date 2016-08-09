#include "main.h"

using namespace std;
using namespace ns3;


int main(int argc, char** argv) {

	PacketMetadata::Enable();
	Config::SetDefault ("ns3::TcpL4Protocol::SocketType", StringValue ("ns3::TcpWestwood"));

    config = Configuration(argc, argv);
    stats = Statistics(config.Nsta);

    transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);
    transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);

    eventManager = SimulationEventManager(config.visualizerIP, config.visualizerPort);

    RngSeedManager::SetSeed(config.seed);

    if(config.trafficType == "tcpecho") {
    	Config::SetDefault ("ns3::TcpSocketBase::MinRto",TimeValue(MicroSeconds(config.MinRTO)));
    	// don't change the delayed ack timeout, for high values this causes the AP to retransmit
    	//Config::SetDefault ("ns3::TcpSocket::DelAckTimeout",TimeValue(MicroSeconds(config.MinRTO)));
    	Config::SetDefault ("ns3::TcpSocket::ConnTimeout",TimeValue(MicroSeconds(config.TCPConnectionTimeout)));

    	Config::SetDefault ("ns3::TcpSocket::SegmentSize",UintegerValue(config.TCPSegmentSize));
    	Config::SetDefault ("ns3::TcpSocket::InitialSlowStartThreshold",UintegerValue(config.TCPInitialSlowStartThreshold));
    	Config::SetDefault ("ns3::TcpSocket::InitialCwnd",UintegerValue(config.TCPInitialCwnd));
    }

    configureChannel();

    Ssid ssid = Ssid("ns380211ah");

    // configure STA nodes
    configureSTANodes(ssid);

    // configure AP nodes
    configureAPNode(ssid);

    // configure IP addresses
    configureIPStack();

    // prepopulate routing tables and arp cache
    cout << "Populating routing tables " << endl;
    //Ipv4GlobalRoutingHelper::PopulateRoutingTables();
    cout << "Populating arp cache " << endl;
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

void configureChannel() {
    // setup wifi channel
    YansWifiChannelHelper channelBuilder = YansWifiChannelHelper();
    channelBuilder.AddPropagationLoss("ns3::LogDistancePropagationLossModel", "Exponent", DoubleValue(config.propagationLossExponent), "ReferenceLoss", DoubleValue(config.propagationLossReferenceLoss), "ReferenceDistance", DoubleValue(1.0));
    channelBuilder.SetPropagationDelay("ns3::ConstantSpeedPropagationDelayModel");
    channel = channelBuilder.Create();

    channel->TraceConnectWithoutContext("Transmission", MakeCallback(&onChannelTransmission));
}

void onChannelTransmission(Ptr<NetDevice> senderDevice, Ptr<Packet> packet) {

	int timGroup = (Simulator::Now().GetMicroSeconds() / config.BeaconInterval) % config.NGroup;

	S1gStrategy strategy;
	auto slotDuration = strategy.GetSlotDuration(config.NRawSlotCount);
	int slotIndex = (Simulator::Now().GetMicroSeconds() % config.BeaconInterval) / slotDuration.GetMicroSeconds();

	//cout << "Transission during tim group " << timGroup << ", slot: " << slotIndex << endl;


	if(senderDevice->GetAddress() == apDevices.Get(0)->GetAddress()) {
		// from AP
		transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval[timGroup * config.NRawSlotNum + slotIndex]+= packet->GetSerializedSize();
	}
	else {
		// from STA
		transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval[timGroup * config.NRawSlotNum + slotIndex]+= packet->GetSerializedSize();

	}
}

void configureSTANodes(Ssid& ssid) {
	cout << "Configuring STA Nodes " << endl;
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
            "ActiveProbing", BooleanValue(false),
			"MaxMissedBeacons", UintegerValue (10 *config.NGroup),
			"MaxTimeInQueue", TimeValue(Seconds(config.MaxTimeOfPacketsInQueue)));

    // create wifi
    WifiHelper wifi = WifiHelper::Default();
    wifi.SetStandard(WIFI_PHY_STANDARD_80211ah);
    StringValue dataRate = StringValue(config.DataMode);
    wifi.SetRemoteStationManager("ns3::ConstantRateWifiManager", "DataMode", dataRate, "ControlMode", dataRate);

    cout << "Installing STA Node devices" << endl;
    // install wifi device
    staDevices = wifi.Install(phy, mac, staNodes);

    cout << "Configuring STA Node mobility" << endl;
    // mobility
    MobilityHelper mobility;
    mobility.SetPositionAllocator("ns3::UniformDiscPositionAllocator",
            "X", StringValue("1000.0"),
            "Y", StringValue("1000.0"),
            "rho", StringValue(config.rho));
    mobility.SetMobilityModel("ns3::ConstantPositionMobilityModel");
    mobility.Install(staNodes);

//    phy.EnablePcap("stafile", staNodes, 0);
}

void OnAPPhyRxBegin(std::string context, Ptr<const Packet> packet) {
//	cout << " AP RX Begin " << endl;
}

void OnAPPhyRxDrop(std::string context, Ptr<const Packet> packet, DropReason reason) {
	//cout << " AP RX Drop " << endl;
	//packet->Print(cout);

	// THIS REQUIRES PACKET METADATA ENABLE!
	auto pCopy = packet->Copy();
	auto it = pCopy->BeginItem();
	while(it.HasNext()) {

		auto item = it.Next();
		Callback<ObjectBase *> constructor = item.tid.GetConstructor ();

		ObjectBase *instance = constructor ();
		Chunk *chunk = dynamic_cast<Chunk *> (instance);
		chunk->Deserialize (item.current);

		if(dynamic_cast<WifiMacHeader*>(chunk)) {
			WifiMacHeader* hdr = (WifiMacHeader*)chunk;

			int staId = -1;
			for(int i = 0; i < staNodeInterfaces.GetN(); i++) {
				if(staNodes.Get(i)->GetDevice(0)->GetAddress() == hdr->GetAddr2()) {
					staId = i;
					break;
				}
			}

			if(staId != -1) {
				stats.get(staId).NumberOfDropsByReasonAtAP[reason]++;
			}
			delete chunk;
			break;
		}
		else
			delete chunk;
	}


}

void OnAPPacketToTransmitReceived(string context, Ptr<const Packet> packet, Mac48Address to, bool isScheduled, bool isDuringSlotOfSTA, Time timeLeftInSlot) {

	int staId = -1;
	for(int i = 0; i < staNodeInterfaces.GetN(); i++) {
		if(staNodes.Get(i)->GetDevice(0)->GetAddress() == to) {
			staId = i;
			break;
		}
	}
	if(staId != -1) {
		if(isScheduled)
			stats.get(staId).NumberOfAPScheduledPacketForNodeInNextSlot++;
		else {
			stats.get(staId).NumberOfAPSentPacketForNodeImmediately++;
			stats.get(staId).APTotalTimeRemainingWhenSendingPacketInSameSlot += timeLeftInSlot;
		}
	}
}

void configureAPNode(Ssid& ssid) {
	cout << "Configuring AP Node " << endl;
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
            "SlotDurationCount", UintegerValue(config.NRawSlotCount),
            "SlotNum", UintegerValue(config.NRawSlotNum),
			"ScheduleTransmissionForNextSlotIfLessThan", TimeValue(MicroSeconds(config.APScheduleTransmissionForNextSlotIfLessThan)),
			"AlwaysScheduleForNextSlot", BooleanValue(config.APAlwaysSchedulesForNextSlot),
			"MaxTimeInQueue", TimeValue(Seconds(config.MaxTimeOfPacketsInQueue)));

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
	Config::Connect("/NodeList/" + std::to_string(config.Nsta) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxDropWithReason", MakeCallback(&OnAPPhyRxDrop));
	Config::Connect("/NodeList/" + std::to_string(config.Nsta) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::S1gApWifiMac/PacketToTransmitReceivedFromUpperLayer", MakeCallback(&OnAPPacketToTransmitReceived));


	if(config.APPcapFile != "") {
		phy.EnablePcap(config.APPcapFile, apNodes, 0);
	}
}

void configureIPStack() {
	cout << "Configuring IP stack " << endl;
    /* Internet stack*/
    InternetStackHelper stack;
    stack.Install(apNodes);
    stack.Install(staNodes);

    Ipv4AddressHelper address;
    address.SetBase("192.168.0.0", "255.255.0.0");

    staNodeInterfaces = address.Assign(staDevices);
    apNodeInterfaces = address.Assign(apDevices);

    cout << "IP stack configured " << endl;
}

void configureNodes() {
	cout << "Configuring STA Node trace sources" << endl;
    for (int i = 0; i < config.Nsta; i++) {

    	cout << "Hooking up trace sources for STA " << i << endl;

        NodeEntry* n = new NodeEntry(i, &stats, staNodes.Get(i), staDevices.Get(i));
        n->SetAssociatedCallback([ = ]{onSTAAssociated(i);});
        n->SetDeassociatedCallback([ = ]{onSTADeassociated(i);});

        nodes.push_back(n);
        // hook up Associated and Deassociated events
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/Assoc", MakeCallback(&NodeEntry::SetAssociation, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/DeAssoc", MakeCallback(&NodeEntry::UnsetAssociation, n));

        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/S1gBeaconMissed", MakeCallback(&NodeEntry::OnS1gBeaconMissed, n));

        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/PacketDropped", MakeCallback(&NodeEntry::OnMacPacketDropped, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/Collision", MakeCallback(&NodeEntry::OnCollision, n));


        // hook up TX
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyTxBegin", MakeCallback(&NodeEntry::OnPhyTxBegin, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyTxEnd", MakeCallback(&NodeEntry::OnPhyTxEnd, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyTxDropWithReason", MakeCallback(&NodeEntry::OnPhyTxDrop, n));

        // hook up RX
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxBegin", MakeCallback(&NodeEntry::OnPhyRxBegin, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxEnd", MakeCallback(&NodeEntry::OnPhyRxEnd, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/PhyRxDropWithReason", MakeCallback(&NodeEntry::OnPhyRxDrop, n));


        // hook up MAC traces
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/RemoteStationManager/MacTxRtsFailed", MakeCallback(&NodeEntry::OnMacTxRtsFailed, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/RemoteStationManager/MacTxDataFailed", MakeCallback(&NodeEntry::OnMacTxDataFailed, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/RemoteStationManager/MacTxFinalRtsFailed", MakeCallback(&NodeEntry::OnMacTxFinalRtsFailed, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/RemoteStationManager/MacTxFinalDataFailed", MakeCallback(&NodeEntry::OnMacTxFinalDataFailed, n));

        // hook up PHY State change
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Phy/State/State", MakeCallback(&NodeEntry::OnPhyStateChange, n));

    }
}

int getSTAIdFromAddress(Ipv4Address from) {
    int staId = -1;
    for (int i = 0; i < staNodeInterfaces.GetN(); i++) {
        if (staNodeInterfaces.GetAddress(i) == from) {
            staId = i;
            break;
        }
    }
    return staId;
}

void udpPacketReceivedAtServer(Ptr<const Packet> packet, Address from) {
    int staId = getSTAIdFromAddress(InetSocketAddress::ConvertFrom(from).GetIpv4());
    if (staId != -1)
        nodes[staId]->OnUdpPacketReceivedAtAP(packet);
    else
    	cout << "*** Node could not be determined from received packet at AP " << endl;
}

void tcpPacketReceivedAtServer (Ptr<const Packet> packet, Address from) {
	int staId = getSTAIdFromAddress(InetSocketAddress::ConvertFrom(from).GetIpv4());
    if (staId != -1)
        nodes[staId]->OnTcpPacketReceivedAtAP(packet);
    else
    	cout << "*** Node could not be determined from received packet at AP " << endl;
}

void tcpRetransmissionAtServer(Address to) {
	int staId = getSTAIdFromAddress(Ipv4Address::ConvertFrom(to));
	if (staId != -1)
		nodes[staId]->OnTcpRetransmissionAtAP();
	else
		cout << "*** Node could not be determined from received packet at AP " << endl;
}

void tcpStateChangeAtServer(TcpSocket::TcpStates_t oldState, TcpSocket::TcpStates_t newState, Address to) {

    int staId = getSTAIdFromAddress(InetSocketAddress::ConvertFrom(to).GetIpv4());
    if(staId != -1)
			nodes[staId]->OnTcpStateChangedAtAP(oldState, newState);
		else
			cout << "*** Node could not be determined from received packet at AP " << endl;

	cout << Simulator::Now().GetMicroSeconds() << " ********** TCP SERVER SOCKET STATE CHANGED FROM " << oldState << " TO " << newState << endl;
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
	serverApp.Get(0)->TraceConnectWithoutContext("Retransmission", MakeCallback(&tcpRetransmissionAtServer));
	serverApp.Get(0)->TraceConnectWithoutContext("TCPStateChanged", MakeCallback(&tcpStateChangeAtServer));


	serverApp.Start(Seconds(0));
}


void configureTCPPingPongServer() {
	// TCP ping pong is a test for the new base tcp-client and tcp-server applications
	ObjectFactory factory;
	factory.SetTypeId (TCPPingPongServer::GetTypeId ());
	factory.Set("Port", UintegerValue (80));

	Ptr<Application> tcpServer = factory.Create<TCPPingPongServer>();
	apNodes.Get(0)->AddApplication(tcpServer);

	auto serverApp = ApplicationContainer(tcpServer);
	serverApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&tcpPacketReceivedAtServer));
	serverApp.Get(0)->TraceConnectWithoutContext("Retransmission", MakeCallback(&tcpRetransmissionAtServer));
	serverApp.Get(0)->TraceConnectWithoutContext("TCPStateChanged", MakeCallback(&tcpStateChangeAtServer));
	serverApp.Start(Seconds(0));
}

void configureTCPPingPongClients() {

	ObjectFactory factory;
	factory.SetTypeId (TCPPingPongClient::GetTypeId ());
	factory.Set("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	factory.Set("PacketSize", UintegerValue(config.trafficPacketSize));

	factory.Set("RemoteAddress", Ipv4AddressValue (apNodeInterfaces.GetAddress(0)));
	factory.Set("RemotePort", UintegerValue (80));

	Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

	for (uint16_t i = 0; i < config.Nsta; i++) {

		Ptr<Application> tcpClient = factory.Create<TCPPingPongClient>();
		staNodes.Get(i)->AddApplication(tcpClient);
		auto clientApp = ApplicationContainer(tcpClient);
		wireTCPClient(clientApp,i);

		double random = m_rv->GetValue(0, config.trafficInterval);
		clientApp.Start(MilliSeconds(0+random));
		//clientApp.Stop(Seconds(simulationTime + 1));
	}
}



void wireTCPClient(ApplicationContainer clientApp, int i) {

	clientApp.Get(0)->TraceConnectWithoutContext("Tx", MakeCallback(&NodeEntry::OnTcpPacketSent, nodes[i]));
	clientApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&NodeEntry::OnTcpEchoPacketReceived, nodes[i]));

	clientApp.Get(0)->TraceConnectWithoutContext("CongestionWindow", MakeCallback(&NodeEntry::OnTcpCongestionWindowChanged, nodes[i]));
	clientApp.Get(0)->TraceConnectWithoutContext("RTO", MakeCallback(&NodeEntry::OnTcpRTOChanged, nodes[i]));
	clientApp.Get(0)->TraceConnectWithoutContext("RTT", MakeCallback(&NodeEntry::OnTcpRTTChanged, nodes[i]));
	clientApp.Get(0)->TraceConnectWithoutContext("SlowStartThreshold", MakeCallback(&NodeEntry::OnTcpSlowStartThresholdChanged, nodes[i]));
	clientApp.Get(0)->TraceConnectWithoutContext("EstimatedBW", MakeCallback(&NodeEntry::OnTcpEstimatedBWChanged, nodes[i]));

	clientApp.Get(0)->TraceConnectWithoutContext("TCPStateChanged", MakeCallback(&NodeEntry::OnTcpStateChanged, nodes[i]));
	clientApp.Get(0)->TraceConnectWithoutContext("Retransmission", MakeCallback(&NodeEntry::OnTcpRetransmission, nodes[i]));
}

void configureTCPEchoClients() {
	TcpEchoClientHelper clientHelper(apNodeInterfaces.GetAddress(0), 80); //address of remote node
	clientHelper.SetAttribute("MaxPackets", UintegerValue(4294967295u));
	clientHelper.SetAttribute("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	clientHelper.SetAttribute("IntervalDeviation", TimeValue(MilliSeconds(config.trafficIntervalDeviation)));
	clientHelper.SetAttribute("PacketSize", UintegerValue(config.trafficPacketSize));

	Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

	for (uint16_t i = 0; i < config.Nsta; i++) {
		ApplicationContainer clientApp = clientHelper.Install(staNodes.Get(i));
		wireTCPClient(clientApp,i);

		double random = m_rv->GetValue(0, config.trafficInterval);
		clientApp.Start(MilliSeconds(0+random));
		//clientApp.Stop(Seconds(simulationTime + 1));
	}
}

void configureUDPClients() {
    UdpClientHelper clientHelper(apNodeInterfaces.GetAddress(0), 9); //address of remote node
    clientHelper.SetAttribute("MaxPackets", UintegerValue(4294967295u));
    clientHelper.SetAttribute("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
    clientHelper.SetAttribute("PacketSize", UintegerValue(config.trafficPacketSize));

    Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

    for (uint16_t i = 0; i < config.Nsta; i++) {
        ApplicationContainer clientApp = clientHelper.Install(staNodes.Get(i));
        clientApp.Get(0)->TraceConnectWithoutContext("Tx", MakeCallback(&NodeEntry::OnUdpPacketSent, nodes[i]));

		double random = m_rv->GetValue(0, config.trafficInterval);
		clientApp.Start(MilliSeconds(0+random));
        //clientApp.Stop(Seconds(simulationTime + 1));
    }
}

void configureUDPEchoClients() {
	UdpEchoClientHelper clientHelper(apNodeInterfaces.GetAddress(0), 9); //address of remote node
	clientHelper.SetAttribute("MaxPackets", UintegerValue(4294967295u));
	clientHelper.SetAttribute("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	clientHelper.SetAttribute("IntervalDeviation", TimeValue(MilliSeconds(config.trafficIntervalDeviation)));
	clientHelper.SetAttribute("PacketSize", UintegerValue(config.trafficPacketSize));

	Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

	for (uint16_t i = 0; i < config.Nsta; i++) {
		ApplicationContainer clientApp = clientHelper.Install(staNodes.Get(i));
		clientApp.Get(0)->TraceConnectWithoutContext("Tx", MakeCallback(&NodeEntry::OnUdpPacketSent, nodes[i]));
		clientApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&NodeEntry::OnUdpEchoPacketReceived, nodes[i]));

		double random = m_rv->GetValue(0, config.trafficInterval);
		clientApp.Start(MilliSeconds(0+random));
		//clientApp.Stop(Seconds(simulationTime + 1));
	}
}

void onSTAAssociated(int i) {

    nodes[i]->rawGroupNumber = ((nodes[i]->aId - 1) / (config.NRawSta / config.NGroup));

    nodes[i]->rawSlotIndex = nodes[i]->aId % config.NRawSlotNum;

	cout << "Node " << std::to_string(i) << " is associated and has aId " << nodes[i]->aId << " and falls in RAW group " << std::to_string(nodes[i]->rawGroupNumber) << endl;

    eventManager.onNodeAssociated(*nodes[i]);


    int nrOfSTAAssociated = 0;
    for (int i = 0; i < config.Nsta; i++) {
        if (nodes[i]->isAssociated)
            nrOfSTAAssociated++;
    }

    if (nrOfSTAAssociated == config.Nsta) {
    	cout << "All stations associated, configuring clients & server" << endl;
        // association complete, start sending packets
    	stats.TimeWhenEverySTAIsAssociated = Simulator::Now();

    	if(config.trafficType == "udp") {
    		configureUDPServer();
    		configureUDPClients();
    	}
    	else if(config.trafficType == "udpecho") {
    		configureUDPEchoServer();
    		configureUDPEchoClients();
    	}
    	else if(config.trafficType == "tcpecho") {
			configureTCPEchoServer();
			configureTCPEchoClients();
    	}
    	else if(config.trafficType == "tcppingpong") {
    		configureTCPPingPongServer();
			configureTCPPingPongClients();
		}

        updateNodesQueueLength();
    }
}

void onSTADeassociated(int i) {
	eventManager.onNodeDeassociated(*nodes[i]);
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
		cout << "Tcp congestion window value: " <<  std::to_string(stats.get(i).TCPCongestionWindow) << endl;
		cout << "--------------" << endl;

		cout << "Total transmit time: " << std::to_string(stats.get(i).TotalTransmitTime.GetMilliSeconds()) << "ms" << endl;
		cout << "Total receive time: " << std::to_string(stats.get(i).TotalReceiveTime.GetMilliSeconds()) << "ms" << endl;
		cout << "" << endl;
		cout << "Total active time: " << std::to_string(stats.get(i).TotalActiveTime.GetMilliSeconds()) << "ms" << endl;
		cout << "Total doze time: " << std::to_string(stats.get(i).TotalDozeTime.GetMilliSeconds()) << "ms" << endl;
		cout << "" << endl;
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

	eventManager.onUpdateSlotStatistics(transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval, transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval);
	// reset
	transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);
	transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);

	Simulator::Schedule(Seconds(config.visualizerSamplingInterval), &sendStatistics);
}
