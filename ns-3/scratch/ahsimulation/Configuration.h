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
	uint32_t Nsta = 1;
	uint32_t NRawSta = 96;
	uint32_t SlotFormat = 0;
	uint32_t NRawSlotCount = 126;
	uint32_t NRawSlotNum = 5;
	uint32_t NGroup = 4;
	uint32_t BeaconInterval = 102400;

	uint32_t MinRTO = 200000;
	uint32_t TCPConnectionTimeout = 6000000;
	uint32_t TCPSegmentSize = 536;
	uint32_t TCPInitialSlowStartThreshold = 0xffff;
	uint32_t TCPInitialCwnd = 1;

	double propagationLossExponent = 3.76;
	double propagationLossReferenceLoss = 8;


	bool APAlwaysSchedulesForNextSlot = false;
	uint32_t APScheduleTransmissionForNextSlotIfLessThan = 2000;

	string DataMode = "MCS2_1";
	//double datarate = 0.65;
	//double bandWidth = 2;

	string visualizerIP = "";
	int visualizerPort = 7707;
	double visualizerSamplingInterval = 1;

	string rho = "500.0";

	string name = "";

	string APPcapFile = "";
	string NSSFile = "";

	uint32_t trafficInterval = 10000;
	uint32_t trafficIntervalDeviation = 1000;

	uint16_t trafficPacketSize = 100;
	string trafficType = "tcpecho";

	double ipcameraMotionPercentage = 0.1;
	uint16_t ipcameraMotionDuration = 60;
	uint16_t ipcameraDataRate = 20;

	uint16_t MaxTimeOfPacketsInQueue = 100;

	Configuration();
	Configuration(int argc, char** argv);

};
