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

#include "Helper.h"
#include "Configuration.h"
#include "NodeEntry.h"

using namespace std;
using namespace ns3;

Configuration config;

YansWifiChannelHelper channel;

NodeContainer staNodes;
NetDeviceContainer staDevices;

NodeContainer apNodes;
NetDeviceContainer apDevices;

Ipv4InterfaceContainer staNodeInterfaces;
Ipv4InterfaceContainer apNodeInterfaces;
    
vector<NodeEntry*> nodes;

void configureSTANodes(Configuration& config, Ssid& ssid);

void configureAPNode(Configuration& config, Ssid& ssid);

void configureIPStack();

void configureNodes(Configuration& config);

void onSTAAssociated(int i);
    
int main(int argc, char** argv);
