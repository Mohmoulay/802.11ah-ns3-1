#include "main.h"

using namespace std;
using namespace ns3;


int main(int argc, char** argv) {

	PacketMetadata::Enable();
	Config::SetDefault ("ns3::TcpL4Protocol::SocketType", StringValue ("ns3::TcpWestwood"));

    config = Configuration(argc, argv);

    // calculate parameters
    if(config.trafficPacketSize == -1)
    	config.trafficPacketSize = ((int)config.TCPSegmentSize - 100) < 0 ? 100 : (config.TCPSegmentSize - 100);

    if(config.ContentionPerRAWSlot != -1) {
    	// override the NSta based on the TIM groups and raw slot count
    	// to match the contention per slot.
    	int totalNrOfSlots = config.NGroup * config.NRawSlotNum;
    	int totalSta = totalNrOfSlots * (config.ContentionPerRAWSlot+1);

    	// only fill the first TIM group RAW if true, to reduce the number of stations overall
    	// to speed up the simulation. All the other TIM groups are behaving the same.
    	// Note that this is different from specifying only 1 TIM group because the DTIM cycle is still
    	// longer with more groups!
    	if(config.ContentionPerRAWSlotOnlyInFirstGroup)
    		config.Nsta = totalSta / config.NGroup;
    	else
    		config.Nsta = totalSta;

    	config.NRawSta = totalSta;
    }
    if(config.NRawSlotCount == -1)
    	config.NRawSlotCount = ceil(162 * 5 / config.NRawSlotNum);
    if(config.SlotFormat == -1)
    	config.SlotFormat = config.NRawSlotCount > 256 ? 1 : 0;
    if(config.NRawSta == -1)
    	config.NRawSta = config.Nsta;

    stats = Statistics(config.Nsta);

    transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);
    transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);

    eventManager = SimulationEventManager(config.visualizerIP, config.visualizerPort, config.NSSFile);

    RngSeedManager::SetSeed(config.seed);


	Config::SetDefault ("ns3::TcpSocketBase::MinRto",TimeValue(MicroSeconds(config.MinRTO)));
	// don't change the delayed ack timeout, for high values this causes the AP to retransmit
	//Config::SetDefault ("ns3::TcpSocket::DelAckTimeout",TimeValue(MicroSeconds(config.MinRTO)));
	Config::SetDefault ("ns3::TcpSocket::ConnTimeout",TimeValue(MicroSeconds(config.TCPConnectionTimeout)));

	Config::SetDefault ("ns3::TcpSocket::SegmentSize",UintegerValue(config.TCPSegmentSize));
	Config::SetDefault ("ns3::TcpSocket::InitialSlowStartThreshold",UintegerValue(config.TCPInitialSlowStartThreshold));
	Config::SetDefault ("ns3::TcpSocket::InitialCwnd",UintegerValue(config.TCPInitialCwnd));


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

    eventManager.onStartHeader();
    eventManager.onStart(config);


    for(int i = 0; i < config.Nsta; i++)
    	eventManager.onSTANodeCreated(*nodes[i]);

    eventManager.onAPNodeCreated(apposition.x, apposition.y);

    eventManager.onStatisticsHeader();
    // start sending statistics every second
    sendStatistics(true);

    Simulator::Stop(Seconds(config.simulationTime + config.CoolDownPeriod)); // allow up to a minute after the client & server apps are finished to process the queue
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

/*	int timGroup = (Simulator::Now().GetMicroSeconds() / config.BeaconInterval) % config.NGroup;

	uint16_t rawslotCount;
	 if(config.NRawSlotCount == -1)
	    	rawslotCount = ceil(162 * 5 / config.NRawSlotNum);
	    else
	    	rawslotCount = config.NRawSlotCount;

	S1gStrategy strategy;
	auto slotDuration = strategy.GetSlotDuration(rawslotCount);
	int slotIndex = (Simulator::Now().GetMicroSeconds() % config.BeaconInterval) / slotDuration.GetMicroSeconds();
*/
	int timGroup = currentTIMGroup;
	int slotIndex = currentRawSlot;

	//cout << "Transmission during tim group " << timGroup << ", slot: " << slotIndex << endl;


	if(senderDevice->GetAddress() == apDevices.Get(0)->GetAddress()) {
		// from AP
		transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval[timGroup * config.NRawSlotNum + slotIndex]+= packet->GetSerializedSize();
	}
	else {
		// from STA
		transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval[timGroup * config.NRawSlotNum + slotIndex]+= packet->GetSerializedSize();

	}
}

int getBandwidth(string dataMode) {
	if(dataMode == "MCS1_0" ||
	   dataMode == "MCS1_1" || dataMode == "MCS1_2" ||
		dataMode == "MCS1_3" || dataMode == "MCS1_4" ||
		dataMode == "MCS1_5" || dataMode == "MCS1_6" ||
		dataMode == "MCS1_7" || dataMode == "MCS1_8" ||
		dataMode == "MCS1_9" || dataMode == "MCS1_10")
			return 1;

	else if(dataMode == "MCS2_0" ||
	    dataMode == "MCS2_1" || dataMode == "MCS2_2" ||
		dataMode == "MCS2_3" || dataMode == "MCS2_4" ||
		dataMode == "MCS2_5" || dataMode == "MCS2_6" ||
		dataMode == "MCS2_7" || dataMode == "MCS2_8")
			return 2;

	return 0;
}

string getWifiMode(string dataMode) {
	if(dataMode == "MCS1_0") return "OfdmRate300KbpsBW1MHz";
	else if(dataMode == "MCS1_1") return "OfdmRate600KbpsBW1MHz";
	else if(dataMode == "MCS1_2") return "OfdmRate900KbpsBW1MHz";
	else if(dataMode == "MCS1_3") return "OfdmRate1_2MbpsBW1MHz";
	else if(dataMode == "MCS1_4") return "OfdmRate1_8MbpsBW1MHz";
	else if(dataMode == "MCS1_5") return "OfdmRate2_4MbpsBW1MHz";
	else if(dataMode == "MCS1_6") return "OfdmRate2_7MbpsBW1MHz";
	else if(dataMode == "MCS1_7") return "OfdmRate3MbpsBW1MHz";
	else if(dataMode == "MCS1_8") return "OfdmRate3_6MbpsBW1MHz";
	else if(dataMode == "MCS1_9") return "OfdmRate4MbpsBW1MHz";
	else if(dataMode == "MCS1_10") return "OfdmRate150KbpsBW1MHz";


	else if(dataMode == "MCS2_0") return "OfdmRate650KbpsBW2MHz";
	else if(dataMode == "MCS2_1") return "OfdmRate1_3MbpsBW2MHz";
	else if(dataMode == "MCS2_2") return "OfdmRate1_95MbpsBW2MHz";
	else if(dataMode == "MCS2_3") return "OfdmRate2_6MbpsBW2MHz";
	else if(dataMode == "MCS2_4") return "OfdmRate3_9MbpsBW2MHz";
	else if(dataMode == "MCS2_5") return "OfdmRate5_2MbpsBW2MHz";
	else if(dataMode == "MCS2_6") return "OfdmRate5_85MbpsBW2MHz";
	else if(dataMode == "MCS2_7") return "OfdmRate6_5MbpsBW2MHz";
	else if(dataMode == "MCS2_8") return "OfdmRate7_8MbpsBW2MHz";
	return "";
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
    phy.Set("ChannelWidth", UintegerValue(getBandwidth(config.DataMode)));
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
    StringValue dataRate = StringValue(getWifiMode(config.DataMode));
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

    //phy.EnablePcap("stafile", staNodes, 0);
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

void OnAPRAWSlotStarted(string context, uint16_t timGroup, uint16_t rawSlot) {
	currentTIMGroup = timGroup;
	currentRawSlot = rawSlot;
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
    phy.Set("ChannelWidth", UintegerValue(getBandwidth(config.DataMode)));
    phy.Set("EnergyDetectionThreshold", DoubleValue(-116.0));
    phy.Set("CcaMode1Threshold", DoubleValue(-119.0));
    phy.Set("TxGain", DoubleValue(3.0));
    phy.Set("RxGain", DoubleValue(3.0));
    phy.Set("TxPowerLevels", UintegerValue(1));
    phy.Set("TxPowerEnd", DoubleValue(30.0));
    phy.Set("TxPowerStart", DoubleValue(30.0));
    phy.Set("RxNoiseFigure", DoubleValue(5));
    phy.Set("LdpcEnabled", BooleanValue(true));
    phy.Set("Transmitters", UintegerValue(1));
    phy.Set("Receivers", UintegerValue(1));


    // create wifi
    WifiHelper wifi = WifiHelper::Default();
    wifi.SetStandard(WIFI_PHY_STANDARD_80211ah);
    StringValue dataRate = StringValue(getWifiMode(config.DataMode));
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

	Config::Connect("/NodeList/" + std::to_string(config.Nsta) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::S1gApWifiMac/RAWSlotStarted", MakeCallback(&OnAPRAWSlotStarted));



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
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/NrOfTransmissionsDuringRAWSlot", MakeCallback(&NodeEntry::OnNrOfTransmissionsDuringRAWSlotChanged, n));


        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/S1gBeaconMissed", MakeCallback(&NodeEntry::OnS1gBeaconMissed, n));

        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/PacketDropped", MakeCallback(&NodeEntry::OnMacPacketDropped, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/Collision", MakeCallback(&NodeEntry::OnCollision, n));
        Config::Connect("/NodeList/" + std::to_string(i) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::RegularWifiMac/$ns3::StaWifiMac/TransmissionWillCrossRAWBoundary", MakeCallback(&NodeEntry::OnTransmissionWillCrossRAWBoundary, n));


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

void tcpPacketDroppedAtServer(Address to, Ptr<Packet> packet, DropReason reason) {
	int staId = getSTAIdFromAddress(Ipv4Address::ConvertFrom(to));
	if(staId != -1) {
		stats.get(staId).NumberOfDropsByReasonAtAP[reason]++;
	}
}

void tcpStateChangeAtServer(TcpSocket::TcpStates_t oldState, TcpSocket::TcpStates_t newState, Address to) {

    int staId = getSTAIdFromAddress(InetSocketAddress::ConvertFrom(to).GetIpv4());
    if(staId != -1)
			nodes[staId]->OnTcpStateChangedAtAP(oldState, newState);
		else
			cout << "*** Node could not be determined from received packet at AP " << endl;

	//cout << Simulator::Now().GetMicroSeconds() << " ********** TCP SERVER SOCKET STATE CHANGED FROM " << oldState << " TO " << newState << endl;
}

void tcpIPCameraDataReceivedAtServer(Address from, uint16_t nrOfBytes) {
    int staId = getSTAIdFromAddress(InetSocketAddress::ConvertFrom(from).GetIpv4());
    if(staId != -1)
			nodes[staId]->OnTcpIPCameraDataReceivedAtAP(nrOfBytes);
		else
			cout << "*** Node could not be determined from received packet at AP " << endl;
}

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
	wireTCPServer(serverApp);
	serverApp.Start(Seconds(0));
}


void configureTCPPingPongServer() {
	// TCP ping pong is a test for the new base tcp-client and tcp-server applications
	ObjectFactory factory;
	factory.SetTypeId (TCPPingPongServer::GetTypeId ());
	factory.Set("Port", UintegerValue (81));

	Ptr<Application> tcpServer = factory.Create<TCPPingPongServer>();
	apNodes.Get(0)->AddApplication(tcpServer);

	auto serverApp = ApplicationContainer(tcpServer);
	wireTCPServer(serverApp);
	serverApp.Start(Seconds(0));
}

void configureTCPPingPongClients() {

	ObjectFactory factory;
	factory.SetTypeId (TCPPingPongClient::GetTypeId ());
	factory.Set("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	factory.Set("PacketSize", UintegerValue(config.trafficPacketSize));

	factory.Set("RemoteAddress", Ipv4AddressValue (apNodeInterfaces.GetAddress(0)));
	factory.Set("RemotePort", UintegerValue (81));

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


void configureTCPIPCameraServer() {
	ObjectFactory factory;
	factory.SetTypeId (TCPIPCameraServer::GetTypeId ());
	factory.Set("Port", UintegerValue (82));

	Ptr<Application> tcpServer = factory.Create<TCPIPCameraServer>();
	apNodes.Get(0)->AddApplication(tcpServer);


	auto serverApp = ApplicationContainer(tcpServer);
	wireTCPServer(serverApp);
	serverApp.Start(Seconds(0));
//	serverApp.Stop(Seconds(config.simulationTime));
}

void configureTCPIPCameraClients() {

	ObjectFactory factory;
	factory.SetTypeId (TCPIPCameraClient::GetTypeId ());
	factory.Set("MotionPercentage", DoubleValue(config.ipcameraMotionPercentage));
	factory.Set("MotionDuration", TimeValue(Seconds(config.ipcameraMotionDuration)));
	factory.Set("DataRate", UintegerValue(config.ipcameraDataRate));

	factory.Set("PacketSize", UintegerValue(config.trafficPacketSize));

	factory.Set("RemoteAddress", Ipv4AddressValue (apNodeInterfaces.GetAddress(0)));
	factory.Set("RemotePort", UintegerValue (82));

	Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

	for (uint16_t i = 0; i < config.Nsta; i++) {

		Ptr<Application> tcpClient = factory.Create<TCPIPCameraClient>();
		staNodes.Get(i)->AddApplication(tcpClient);
		auto clientApp = ApplicationContainer(tcpClient);
		wireTCPClient(clientApp,i);

		clientApp.Start(MilliSeconds(0));
		clientApp.Stop(Seconds(config.simulationTime));
	}
}



void configureTCPFirmwareServer() {
	ObjectFactory factory;
	factory.SetTypeId (TCPFirmwareServer::GetTypeId ());
	factory.Set("Port", UintegerValue (83));

	factory.Set("FirmwareSize", UintegerValue (config.firmwareSize));
	factory.Set("BlockSize", UintegerValue (config.firmwareBlockSize));
	factory.Set("NewUpdateProbability", DoubleValue (config.firmwareNewUpdateProbability));

	Ptr<Application> tcpServer = factory.Create<TCPFirmwareServer>();
	apNodes.Get(0)->AddApplication(tcpServer);


	auto serverApp = ApplicationContainer(tcpServer);
	wireTCPServer(serverApp);
	serverApp.Start(Seconds(0));
//	serverApp.Stop(Seconds(config.simulationTime));
}

void configureTCPFirmwareClients() {

	ObjectFactory factory;
	factory.SetTypeId (TCPFirmwareClient::GetTypeId ());
	factory.Set("CorruptionProbability", DoubleValue(config.firmwareCorruptionProbability));
	factory.Set("VersionCheckInterval", TimeValue(MilliSeconds(config.firmwareVersionCheckInterval)));
	factory.Set("PacketSize", UintegerValue(config.trafficPacketSize));

	factory.Set("RemoteAddress", Ipv4AddressValue (apNodeInterfaces.GetAddress(0)));
	factory.Set("RemotePort", UintegerValue (83));

	Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

	for (uint16_t i = 0; i < config.Nsta; i++) {

		Ptr<Application> tcpClient = factory.Create<TCPFirmwareClient>();
		staNodes.Get(i)->AddApplication(tcpClient);
		auto clientApp = ApplicationContainer(tcpClient);
		wireTCPClient(clientApp,i);

		clientApp.Start(MilliSeconds(0));
		clientApp.Stop(Seconds(config.simulationTime));
	}
}


void configureTCPSensorServer() {
	ObjectFactory factory;
	factory.SetTypeId (TCPSensorServer::GetTypeId ());
	factory.Set("Port", UintegerValue (84));

	Ptr<Application> tcpServer = factory.Create<TCPSensorServer>();
	apNodes.Get(0)->AddApplication(tcpServer);


	auto serverApp = ApplicationContainer(tcpServer);
	wireTCPServer(serverApp);
	serverApp.Start(Seconds(0));
//	serverApp.Stop(Seconds(config.simulationTime));
}

void configureTCPSensorClients() {

	ObjectFactory factory;
	factory.SetTypeId (TCPSensorClient::GetTypeId ());

	factory.Set("Interval", TimeValue(MilliSeconds(config.trafficInterval)));
	factory.Set("PacketSize", UintegerValue(config.trafficPacketSize));
	factory.Set("MeasurementSize", UintegerValue(config.sensorMeasurementSize));

	factory.Set("RemoteAddress", Ipv4AddressValue (apNodeInterfaces.GetAddress(0)));
	factory.Set("RemotePort", UintegerValue (84));

	Ptr<UniformRandomVariable> m_rv = CreateObject<UniformRandomVariable> ();

	for (uint16_t i = 0; i < config.Nsta; i++) {

		Ptr<Application> tcpClient = factory.Create<TCPSensorClient>();
		staNodes.Get(i)->AddApplication(tcpClient);
		auto clientApp = ApplicationContainer(tcpClient);
		wireTCPClient(clientApp,i);

		double random = m_rv->GetValue(0, config.trafficInterval);
		clientApp.Start(MilliSeconds(0+random));
		clientApp.Stop(Seconds(config.simulationTime));
	}
}


void wireTCPServer(ApplicationContainer serverApp) {
	serverApp.Get(0)->TraceConnectWithoutContext("Rx", MakeCallback(&tcpPacketReceivedAtServer));
	serverApp.Get(0)->TraceConnectWithoutContext("Retransmission", MakeCallback(&tcpRetransmissionAtServer));
	serverApp.Get(0)->TraceConnectWithoutContext("PacketDropped", MakeCallback(&tcpPacketDroppedAtServer));
	serverApp.Get(0)->TraceConnectWithoutContext("TCPStateChanged", MakeCallback(&tcpStateChangeAtServer));

	if(config.trafficType == "tcpipcamera") {
		serverApp.Get(0)->TraceConnectWithoutContext("DataReceived", MakeCallback(&tcpIPCameraDataReceivedAtServer));
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

	clientApp.Get(0)->TraceConnectWithoutContext("PacketDropped", MakeCallback(&NodeEntry::OnTcpPacketDropped, nodes[i]));

	if(config.trafficType == "tcpfirmware") {
		clientApp.Get(0)->TraceConnectWithoutContext("FirmwareUpdated", MakeCallback(&NodeEntry::OnTcpFirmwareUpdated, nodes[i]));
	}
	else if(config.trafficType == "tcpipcamera") {
	    clientApp.Get(0)->TraceConnectWithoutContext("DataSent", MakeCallback(&NodeEntry::OnTcpIPCameraDataSent, nodes[i]));
	    clientApp.Get(0)->TraceConnectWithoutContext("StreamStateChanged", MakeCallback(&NodeEntry::OnTcpIPCameraStreamStateChanged, nodes[i]));
	}
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
    	else if(config.trafficType == "tcpipcamera") {
			configureTCPIPCameraServer();
			configureTCPIPCameraClients();
		}
    	else if(config.trafficType == "tcpfirmware") {
			configureTCPFirmwareServer();
			configureTCPFirmwareClients();
		}
    	else if(config.trafficType == "tcpsensor") {
			configureTCPSensorServer();
			configureTCPSensorClients();
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


		cout << "IP Camera Data sending rate: " << std::to_string(stats.get(i).getIPCameraSendingRate()) << "kbps" << endl;
		cout << "IP Camera Data receiving rate: " << std::to_string(stats.get(i).getIPCameraAPReceivingRate()) << "kbps" << endl;


		cout << "" << endl;
		cout << "Goodput: " << std::to_string(stats.get(i).getGoodputKbit()) << "Kbit" << endl;
//		cout << "Total bytes: " << std::to_string(stats.get(i).TotalPacketPayloadSize) << "b" << endl;
//		cout << "Total time: " << std::to_string(stats.get(i).TotalPacketTimeOfFlight.GetSeconds()) << "sec" << endl;
		cout << "*********************" << endl;
	}
}

void sendStatistics(bool schedule) {
	eventManager.onUpdateStatistics(stats);

	eventManager.onUpdateSlotStatistics(transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval, transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval);
	// reset
	transmissionsPerTIMGroupAndSlotFromAPSinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);
	transmissionsPerTIMGroupAndSlotFromSTASinceLastInterval = vector<long>(config.NGroup * config.NRawSlotNum, 0);

	if(schedule)
		Simulator::Schedule(Seconds(config.visualizerSamplingInterval), &sendStatistics, true);
}
