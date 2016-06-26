#include "NodeEntry.h"

using namespace ns3;
using namespace std;

NodeEntry::NodeEntry(int id) : id(id) {
}

void NodeEntry::SetAssociation(std::string context, Mac48Address address) {
    this->isAssociated = true;

    this->associatedCallback();
}

void NodeEntry::UnsetAssociation(std::string context, Mac48Address address) {
    this->isAssociated = false;
}


void NodeEntry::OnPhyTxBegin(std::string context, Ptr<const Packet> packet) {
    cout << "Begin Tx" << endl;
}

void NodeEntry::OnPhyTxEnd(std::string context,Ptr<const Packet> packet) {
    cout << "End Tx" << endl;
}

void NodeEntry::OnPhyTxDrop(std::string context,Ptr<const Packet> packet) {
    cout << "Tx Dropped" << endl;
}

void NodeEntry::OnPhyRxBegin(std::string context,Ptr<const Packet> packet) {
    cout << "Begin Rx" << endl;
}

void NodeEntry::OnPhyRxEnd(std::string context,Ptr<const Packet> packet) {
    cout << "End Rx" << endl;
}

void NodeEntry::OnPhyRxDrop(std::string context,Ptr<const Packet> packet) {
    cout << "Rx Dropped" << endl;
}

void NodeEntry::SetAssociatedCallback(std::function<void() > assocCallback) {
    this->associatedCallback = assocCallback;
}

NodeEntry::~NodeEntry() {
}

