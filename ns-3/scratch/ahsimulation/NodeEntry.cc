#include "NodeEntry.h"

using namespace ns3;

NodeEntry::NodeEntry(int id) : id(id) {
}

void NodeEntry::SetAssociation(std::string context, Mac48Address address) {
    this->isAssociated = true;
    
    this->associatedCallback();
}

void NodeEntry::UnsetAssociation(std::string context, Mac48Address address) {
    this->isAssociated = false;
}

void NodeEntry::SetAssociatedCallback(std::function<void()> assocCallback) {
    this->associatedCallback = assocCallback;
}

NodeEntry::~NodeEntry() {
}

