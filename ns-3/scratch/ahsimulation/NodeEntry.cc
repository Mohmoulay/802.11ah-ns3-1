#include "NodeEntry.h"
#include "src/wifi/model/extension-headers.h"
#include "src/wifi/model/sta-wifi-mac.h"

using namespace ns3;
using namespace std;

NodeEntry::NodeEntry(int id, Statistics* stats) :
		id(id), stats(stats) {
}

void NodeEntry::SetAssociation(std::string context, Mac48Address address) {
	this->isAssociated = true;

	// determine AID
	auto matches =
			Config::LookupMatches(
					"/NodeList/" + std::to_string(this->id)
							+ "/DeviceList/0/$ns3::WifiNetDevice/Mac/$ns3::StaWifiMac/");
	auto obj = matches.Get(0)->GetObject<StaWifiMac>();
	this->aId = obj->GetAID();

	//cout << "Associated with aId " << this->aId;

	this->associatedCallback();
}

void NodeEntry::UnsetAssociation(std::string context, Mac48Address address) {
	this->isAssociated = false;
}

void NodeEntry::OnPhyTxBegin(std::string context, Ptr<const Packet> packet) {
	//  cout << "[" << this->id << "] " << "Begin Tx " << packet->GetUid() << endl;
    txMap.emplace(packet->GetUid(), Simulator::Now());
    stats->get(this->id).NumberOfTransmissions++;
}

void NodeEntry::OnPhyTxEnd(std::string context, Ptr<const Packet> packet) {
	//  cout << "[" << this->id << "] " <<  "End Tx " << packet->GetUid() << endl;
    
    
    if(txMap.find(packet->GetUid()) != txMap.end()) {
        Time oldTime = txMap[packet->GetUid()];
        txMap.erase(packet->GetUid());
        stats->get(this->id).TotalTransmitTime += (Simulator::Now() - oldTime);
    }
}

void NodeEntry::OnPhyTxDrop(std::string context, Ptr<const Packet> packet) {
	//cout << "[" << this->id << "] " << "Tx Dropped " << packet->GetUid() << endl;

    if(txMap.find(packet->GetUid()) != txMap.end()) {
        Time oldTime = txMap[packet->GetUid()];
        txMap.erase(packet->GetUid());
        stats->get(this->id).TotalTransmitTime += (Simulator::Now() - oldTime);
    }

    stats->get(this->id).NumberOfTransmissionsDropped++;
}

void NodeEntry::OnPhyRxBegin(std::string context, Ptr<const Packet> packet) {
	// cout << "[" << this->id << "] " <<  "Begin Rx " << packet->GetUid() << endl;
	rxMap.emplace(packet->GetUid(), Simulator::Now());
	stats->get(this->id).NumberOfReceives++;
}

void NodeEntry::OnPhyRxEnd(std::string context, Ptr<const Packet> packet) {
	//   cout << "End Rx " << packet->GetUid() << endl;

	WifiMacHeader hdr;
	packet->PeekHeader(hdr);

	if (hdr.IsS1gBeacon()) {
		auto pCopy = packet->Copy();
		S1gBeaconHeader s1gBeaconHeader;
		pCopy->RemoveHeader(hdr);
		pCopy->RemoveHeader(s1gBeaconHeader);

		//       cout << "[" << this->id << "] " <<  "Received S1g beacon " << endl;
		auto raw = s1gBeaconHeader.GetRPS().GetRawAssigmentObj();


		//s1gBeaconHeader.Print(cout);
	}

    if(rxMap.find(packet->GetUid()) != txMap.end()) {
        Time oldTime = rxMap[packet->GetUid()];
        rxMap.erase(packet->GetUid());
        stats->get(this->id).TotalReceiveTime += (Simulator::Now() - oldTime);
    }
	// hdr.Print(cout);
	//packet->Print(cout);
}

void NodeEntry::OnPhyRxDrop(std::string context, Ptr<const Packet> packet) {
	cout << "[" << this->id << "] " << "Rx Dropped " << packet->GetUid() << endl;

	if(rxMap.find(packet->GetUid()) != txMap.end()) {
		Time oldTime = rxMap[packet->GetUid()];
		rxMap.erase(packet->GetUid());
		stats->get(this->id).TotalReceiveTime += (Simulator::Now() - oldTime);
	}
    stats->get(this->id).NumberOfReceivesDropped++;
}

void NodeEntry::OnUdpPacketSent(Ptr<const Packet> packet) {
	cout << "[" << this->id << "] " << "UDP packet sent " << endl;

	stats->get(this->id).NumberOfSentPackets++;
}

void NodeEntry::OnUdpPacketReceivedAtAP(Ptr<const Packet> packet) {
	auto pCopy = packet->Copy();
	SeqTsHeader seqTs;
	pCopy->RemoveHeader(seqTs);
	auto timeDiff = (Simulator::Now() - seqTs.GetTs());

	cout << "[" << this->id << "] " << "UDP packet received at AP after "
			<< std::to_string(timeDiff.GetMicroSeconds()) << "µs" << endl;

	stats->get(this->id).NumberOfSuccessfulPackets++;
	stats->get(this->id).TotalPacketTimeOfFlight += timeDiff;

	stats->get(this->id).TotalPacketPayloadSize += packet->GetSize();
}

void NodeEntry::SetAssociatedCallback(std::function<void()> assocCallback) {
	this->associatedCallback = assocCallback;
}

NodeEntry::~NodeEntry() {
}

