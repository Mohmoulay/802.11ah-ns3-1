#include "NodeEntry.h"
#include "src/wifi/model/extension-headers.h"
#include "src/wifi/model/sta-wifi-mac.h"

using namespace ns3;
using namespace std;

NodeEntry::NodeEntry(int id, Statistics* stats, Ptr<Node> node,
		Ptr<NetDevice> device) :
		id(id), stats(stats), node(node), device(device) {
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

	if (txMap.find(packet->GetUid()) != txMap.end()) {
		Time oldTime = txMap[packet->GetUid()];
		txMap.erase(packet->GetUid());
		stats->get(this->id).TotalTransmitTime += (Simulator::Now() - oldTime);
	}
}

void NodeEntry::OnPhyTxDrop(std::string context, Ptr<const Packet> packet) {
	//cout << "[" << this->id << "] " << "Tx Dropped " << packet->GetUid() << endl;

	if (txMap.find(packet->GetUid()) != txMap.end()) {
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
	this->OnEndOfReceive(packet);
}

void NodeEntry::OnEndOfReceive(Ptr<const Packet> packet) {
	WifiMacHeader hdr;
	packet->PeekHeader(hdr);

	if (rxMap.find(packet->GetUid()) != txMap.end()) {
		Time oldTime = rxMap[packet->GetUid()];
		rxMap.erase(packet->GetUid());
		stats->get(this->id).TotalReceiveTime += (Simulator::Now() - oldTime);

		if (hdr.IsS1gBeacon()) {
			auto pCopy = packet->Copy();
			S1gBeaconHeader s1gBeaconHeader;
			pCopy->RemoveHeader(hdr);
			pCopy->RemoveHeader(s1gBeaconHeader);

			//       cout << "[" << this->id << "] " <<  "Received S1g beacon " << endl;
			auto raw = s1gBeaconHeader.GetRPS().GetRawAssigmentObj();

			this->lastBeaconAIDStart = raw.GetRawGroupAIDStart();
			this->lastBeaconAIDEnd = raw.GetRawGroupAIDEnd();

			//cout << "S1g beacon received" << endl;
			//cout << "RAW Group: page=" << std::to_string(raw.GetRawGroupPage()) << ", aId start=" << std::to_string(lastBeaconAIDStart) << ", aId end=" << std::to_string(lastBeaconAIDEnd) << endl;
			//cout << "RAW Group uint32: " << std::to_string(raw.GetRawGroup()) << endl;
		}

		// based on the last beacon AID range the station is dozing or not
		// if the AID assigned to the station falls within the AID range it's
		// the same as having the radio active during the RAW duration for potential
		// Rx.

		if (aId >= lastBeaconAIDStart && aId < lastBeaconAIDEnd) {
			// the last beacon received was a beacon for a RAW slot for the current station
			stats->get(this->id).TotalReceiveActiveTime += (Simulator::Now()
					- oldTime);
		} else {
			stats->get(this->id).TotalReceiveDozeTime += (Simulator::Now()
					- oldTime);
		}

		//s1gBeaconHeader.Print(cout);
	}
}

void NodeEntry::OnPhyRxDrop(std::string context, Ptr<const Packet> packet) {
//cout << "[" << this->id << "] " << "Rx Dropped " << packet->GetUid() << endl;

	this->OnEndOfReceive(packet);

	stats->get(this->id).NumberOfReceivesDropped++;
}

void NodeEntry::OnUdpPacketSent(Ptr<const Packet> packet) {
//cout << "[" << this->id << "] " << "UDP packet sent " << endl;

	stats->get(this->id).NumberOfSentPackets++;
}

void NodeEntry::OnUdpPacketReceivedAtAP(Ptr<const Packet> packet) {
	auto pCopy = packet->Copy();
	SeqTsHeader seqTs;
	pCopy->RemoveHeader(seqTs);
	auto timeDiff = (Simulator::Now() - seqTs.GetTs());

//cout << "[" << this->id << "] " << "UDP packet received at AP after "
//		<< std::to_string(timeDiff.GetMicroSeconds()) << "µs" << endl;

	stats->get(this->id).NumberOfSuccessfulPackets++;
	stats->get(this->id).TotalPacketTimeOfFlight += timeDiff;

	stats->get(this->id).TotalPacketPayloadSize += packet->GetSize();
}

void NodeEntry::SetAssociatedCallback(std::function<void()> assocCallback) {
	this->associatedCallback = assocCallback;
}

void NodeEntry::UpdateQueueLength() {
	Ptr<WifiNetDevice> wifiDe;
	wifiDe = this->device->GetObject<WifiNetDevice>();
	PointerValue ptr1;
	wifiDe->GetMac()->GetAttribute("BE_EdcaTxopN", ptr1);
	Ptr<EdcaTxopN> BE_edca = ptr1.Get<EdcaTxopN>();
	PointerValue ptr2;
	BE_edca->GetAttribute("Queue", ptr2);
	Ptr<WifiMacQueue> BE_edca_queue = ptr2.Get<WifiMacQueue>();
	this->queueLength = BE_edca_queue->GetSize();

	//cout << Simulator::Now().GetSeconds() << "s " << "Queue length of " << this->id << " is " << this->queueLength << endl;
}

NodeEntry::~NodeEntry() {
}

