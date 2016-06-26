#include "NodeEntry.h"
#include "src/wifi/model/extension-headers.h"
#include "src/wifi/model/sta-wifi-mac.h"

using namespace ns3;
using namespace std;

NodeEntry::NodeEntry(int id) : id(id) {
}

void NodeEntry::SetAssociation(std::string context, Mac48Address address) {
    this->isAssociated = true;
    
    
    // determine AID
    auto matches = Config::LookupMatches("/NodeList/" + std::to_string(this->id) + "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::StaWifiMac/");
    auto obj = matches.Get(0)->GetObject<StaWifiMac>();
    this->aId = obj->GetAID();
    
    //cout << "Associated with aId " << this->aId;
   
    this->associatedCallback();
}

void NodeEntry::UnsetAssociation(std::string context, Mac48Address address) {
    this->isAssociated = false;
}

void NodeEntry::OnPhyTxBegin(std::string context, Ptr<const Packet> packet) {
    cout << "Begin Tx " << packet->GetUid() << endl;
}

void NodeEntry::OnPhyTxEnd(std::string context,Ptr<const Packet> packet) {
    cout << "End Tx " << packet->GetUid() << endl;
}

void NodeEntry::OnPhyTxDrop(std::string context,Ptr<const Packet> packet) {
    cout << "Tx Dropped " << packet->GetUid() << endl;
}

void NodeEntry::OnPhyRxBegin(std::string context,Ptr<const Packet> packet) {
    cout << "Begin Rx " << packet->GetUid() << endl;
}

void NodeEntry::OnPhyRxEnd(std::string context,Ptr<const Packet> packet) {
    cout << "End Rx " << packet->GetUid() << endl;
    
    WifiMacHeader hdr;
    packet->PeekHeader(hdr);
    
    if(hdr.IsS1gBeacon()) {
        auto pCopy = packet->Copy();
        S1gBeaconHeader s1gBeaconHeader;
        pCopy->RemoveHeader(hdr);
        pCopy->RemoveHeader(s1gBeaconHeader);
        
        
        cout << "Received S1g beacon " << endl;
        auto raw = s1gBeaconHeader.GetRPS().GetRawAssigmentObj();
        
        //s1gBeaconHeader.Print(cout);
    }
    
   // hdr.Print(cout);
    //packet->Print(cout);
}

void NodeEntry::OnPhyRxDrop(std::string context,Ptr<const Packet> packet) {
    cout << "Rx Dropped " << packet->GetUid() << endl;
}

void NodeEntry::SetAssociatedCallback(std::function<void() > assocCallback) {
    this->associatedCallback = assocCallback;
}

NodeEntry::~NodeEntry() {
}

