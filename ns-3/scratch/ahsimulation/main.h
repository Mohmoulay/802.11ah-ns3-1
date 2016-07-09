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

#include "Helper.h"
#include "Configuration.h"
#include "NodeEntry.h"
#include "SimpleTCPClient.h"
#include "Statistics.h"
#include "SimulationEventManager.h"

using namespace std;
using namespace ns3;

Statistics stats;
Configuration config;

SimulationEventManager eventManager;


Ptr<YansWifiChannel> channel;

NodeContainer staNodes;
NetDeviceContainer staDevices;

NodeContainer apNodes;
NetDeviceContainer apDevices;

Ipv4InterfaceContainer staNodeInterfaces;
Ipv4InterfaceContainer apNodeInterfaces;

ApplicationContainer serverApp;

vector<NodeEntry*> nodes;

void configureSTANodes(Ssid& ssid);

void configureAPNode(Ssid& ssid);

void configureIPStack();

void configureNodes();

void configureUDPServer();

void configureUDPClients();

void configureUDPEchoClients();

void configureUDPEchoServer();

void configureTCPEchoClients();

void configureTCPEchoServer();


void onSTAAssociated(int i);
void onSTADeassociated(int i);
    
void updateNodesQueueLength();

int main(int argc, char** argv);

void printStatistics();

void sendStatistics();
