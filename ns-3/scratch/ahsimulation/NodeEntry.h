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

using namespace ns3;


class NodeEntry {
private:
    std::function<void()> associatedCallback;
    
public:
    int id;
    
    uint32_t aId;
    
    bool isAssociated;
    
    NodeEntry(int id);

    virtual ~NodeEntry();

    
    void SetAssociation(std::string context, Mac48Address address);
    void UnsetAssociation(std::string context, Mac48Address address);
    
    void OnPhyTxBegin(std::string context, Ptr<const Packet> packet);
    void OnPhyTxEnd(std::string context,Ptr<const Packet> packet);
    void OnPhyTxDrop(std::string context,Ptr<const Packet> packet);
    
    void OnPhyRxBegin(std::string context,Ptr<const Packet> packet);
    void OnPhyRxEnd(std::string context,Ptr<const Packet> packet);
    void OnPhyRxDrop(std::string context,Ptr<const Packet> packet);
    
    
    void SetAssociatedCallback(std::function<void()> assocCallback);
};

#endif /* NODEENTRY_H */

