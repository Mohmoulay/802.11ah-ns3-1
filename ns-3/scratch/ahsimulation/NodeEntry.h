#pragma once

#ifndef NODEENTRY_H
#define NODEENTRY_H

#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/applications-module.h"
#include "ns3/wifi-module.h"
#include "ns3/mobility-module.h"
#include "ns3/ipv4-global-routing-helper.h"
#include "ns3/internet-module.h"
#include "ns3/extension-headers.h"
#include <functional>
#include "Statistics.h"

using namespace ns3;


class NodeEntry {
private:

	Ptr<Node> node;
	Ptr<NetDevice> device;

    std::function<void()> associatedCallback;
    std::map<uint64_t, Time> txMap;
    std::map<uint64_t, Time> rxMap;
    uint16_t lastBeaconAIDStart = 0;
    uint16_t lastBeaconAIDEnd = 0;

    Statistics* stats;
    
    void OnEndOfReceive(Ptr<const Packet> packet);

public:
    int id;
    
    uint32_t aId = 0;
    uint8_t rawGroupNumber = 0;
    
    double x = 0;
    double y = 0;
    bool isAssociated = false;
    uint32_t queueLength = 0;
    
    NodeEntry(int id, Statistics* stats,Ptr<Node> node, Ptr<NetDevice> device);

    virtual ~NodeEntry();

    
    void SetAssociation(std::string context, Mac48Address address);
    void UnsetAssociation(std::string context, Mac48Address address);
    
    void OnPhyTxBegin(std::string context, Ptr<const Packet> packet);
    void OnPhyTxEnd(std::string context,Ptr<const Packet> packet);
    void OnPhyTxDrop(std::string context,Ptr<const Packet> packet);
    
    void OnPhyRxBegin(std::string context,Ptr<const Packet> packet);
    void OnPhyRxEnd(std::string context,Ptr<const Packet> packet);
    void OnPhyRxDrop(std::string context,Ptr<const Packet> packet);

    void OnPhyStateChange(std::string context, const Time start, const Time duration, const WifiPhy::State state);

    void OnUdpPacketSent(Ptr<const Packet> packet);
    void OnUdpPacketReceivedAtAP(Ptr<const Packet> packet);

    void UpdateQueueLength();
    
    void SetAssociatedCallback(std::function<void()> assocCallback);
};

#endif /* NODEENTRY_H */

