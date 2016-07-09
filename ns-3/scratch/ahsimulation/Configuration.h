#pragma once

#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/applications-module.h"
#include "ns3/wifi-module.h"
#include "ns3/mobility-module.h"
#include "ns3/ipv4-global-routing-helper.h"
#include "ns3/internet-module.h"
#include "ns3/extension-headers.h"
#include <iostream>
#include <fstream>
#include <stdio.h>
#include <stdlib.h>
#include <ctime>
#include <fstream>
#include <sys/stat.h>
#include <string>

using namespace ns3;
using namespace std;

struct Configuration {
	double simulationTime = 500;
	uint32_t seed = 1;
	uint32_t Nsta = 2;
	uint32_t NRawSta = 100;
	uint32_t SlotFormat = 0;
	uint32_t NRawSlotCount = 126;
	uint32_t NRawSlotNum = 5;
	uint32_t NGroup = 4;
	uint32_t BeaconInterval = 102400;

	string DataMode = "OfdmRate650KbpsBW2MHz";
	double datarate = 0.65;
	double bandWidth = 2;

	string visualizerIP = "";
	int visualizerPort = 7707;
	double visualizerSamplingInterval = 1;

	string rho = "400.0";

	string name = "";

	uint32_t trafficInterval = 987;
	uint16_t trafficPacketSize = 100;
	string trafficType = "tcpecho";

	Configuration();
	Configuration(int argc, char** argv);

};
