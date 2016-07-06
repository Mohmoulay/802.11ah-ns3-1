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
	//cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
	//		<< "µs " << "Begin Tx " << packet->GetUid() << endl;
	txMap.emplace(packet->GetUid(), Simulator::Now());

	if (txMap.size() > 1)
		cout << "warning: more than 1 transmission active: " << txMap.size()
				<< " transmissions" << endl;

	/*if (aId >= lastBeaconAIDStart && aId <= lastBeaconAIDEnd) {
	 Time timeDiff = (Simulator::Now() - this->lastBeaconReceivedOn);
	 cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds() << "µs" << " Tx started after " << timeDiff.GetMicroSeconds() << "µs since last s1g beacon" << endl;
	 }*/

	stats->get(this->id).NumberOfTransmissions++;
}

void NodeEntry::OnPhyTxEnd(std::string context, Ptr<const Packet> packet) {
	//cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
	// << "µs " << "End Tx " << packet->GetUid() << endl;

	if (txMap.find(packet->GetUid()) != txMap.end()) {
		Time oldTime = txMap[packet->GetUid()];
		txMap.erase(packet->GetUid());
		stats->get(this->id).TotalTransmitTime += (Simulator::Now() - oldTime);
	} else
		cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
				<< " End tx for packet " << packet->GetUid()
				<< " without a begin tx" << endl;
}

void NodeEntry::OnPhyTxDrop(std::string context, Ptr<const Packet> packet) {
	//cout << "[" << this->id << "] " << "Tx Dropped " << packet->GetUid() << endl;

	if (txMap.find(packet->GetUid()) != txMap.end()) {
		Time oldTime = txMap[packet->GetUid()];
		txMap.erase(packet->GetUid());
		stats->get(this->id).TotalTransmitTime += (Simulator::Now() - oldTime);
	} else
		cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
				<< " End tx for packet " << packet->GetUid()
				<< " without a begin tx" << endl;
	stats->get(this->id).NumberOfTransmissionsDropped++;
}

void NodeEntry::OnPhyRxBegin(std::string context, Ptr<const Packet> packet) {
	//cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
	//<< " Begin Rx " << packet->GetUid() << endl;

	rxMap.emplace(packet->GetUid(), Simulator::Now());
	stats->get(this->id).NumberOfReceives++;

	if (rxMap.size() > 1)
		cout << "warning: more than 1 receive active: " << rxMap.size()
				<< " receives" << endl;
}

void NodeEntry::OnPhyRxEnd(std::string context, Ptr<const Packet> packet) {
	//cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
	//<< " End Rx " << packet->GetUid() << endl;
	this->OnEndOfReceive(packet);
}

void NodeEntry::OnEndOfReceive(Ptr<const Packet> packet) {
	WifiMacHeader hdr;
	packet->PeekHeader(hdr);

	if (rxMap.find(packet->GetUid()) != rxMap.end()) {
		Time oldTime = rxMap[packet->GetUid()];
		rxMap.erase(packet->GetUid());

		stats->get(this->id).TotalReceiveTime += (Simulator::Now() - oldTime);

		if (hdr.IsS1gBeacon()) {
			lastBeaconReceivedOn = Simulator::Now();

			auto pCopy = packet->Copy();
			S1gBeaconHeader s1gBeaconHeader;
			pCopy->RemoveHeader(hdr);
			pCopy->RemoveHeader(s1gBeaconHeader);


			//       cout << "[" << this->id << "] " <<  "Received S1g beacon " << endl;
			auto raw = s1gBeaconHeader.GetRPS().GetRawAssigmentObj();

			this->lastBeaconAIDStart = raw.GetRawGroupAIDStart();
			this->lastBeaconAIDEnd = raw.GetRawGroupAIDEnd();


			if(s1gBeaconHeader.GetTIM().GetTIMCount() == 0) {
				// DTIM data
				uint32_t vmap = s1gBeaconHeader.GetTIM().GetPartialVBitmap();

				/*if(vmap != 0x0) {
					std::cout << Simulator::Now().GetMicroSeconds() << "[" << this->id << "]" << " DTIM beacon received, VMAP: ";
					for(int i = 31; i >= 0; i--)
						cout << ((vmap >> i) & 0x01);
					cout << endl;
				}*/


				/*	std::cout << Simulator::Now().GetMicroSeconds() << "[" << this->id << "]" << " DTIM beacon received, VMAP: ";
										for(int i = 31; i >= 0; i--)
											cout << ((vmap >> i) & 0x01);
										cout << endl;
				*/

				if((vmap >> this->rawGroupNumber) & 0x01 == 0x01) {
					// there is pending data at the AP
					rawTIMGroupFlaggedAsDataAvailableInDTIM = true;
				}
				else {
					// no pending data at the AP
					rawTIMGroupFlaggedAsDataAvailableInDTIM = false;
				}
			}


			//cout << "S1g beacon received" << endl;
			//cout << "RAW Group: page=" << std::to_string(raw.GetRawGroupPage()) << ", aId start=" << std::to_string(lastBeaconAIDStart) << ", aId end=" << std::to_string(lastBeaconAIDEnd) << endl;
			//cout << "RAW Group uint32: " << std::to_string(raw.GetRawGroup()) << endl;
		}

		// based on the last beacon AID range the station is dozing or not
		// if the AID assigned to the station falls within the AID range it's
		// the same as having the radio active during the RAW duration for potential
		// Rx.
		// The STA will only become awake if the DTIM data specified that there is data pending

	/*	if(this->id==48) {
			cout << "Receive on node 48 " << endl;
			cout << "TIM group was flagged in last DTIM?: " << rawTIMGroupFlaggedAsDataAvailableInDTIM << endl;
			cout << "Last beacon range: " << lastBeaconAIDStart << " - " << lastBeaconAIDEnd << endl;
		}
		*/
		if (rawTIMGroupFlaggedAsDataAvailableInDTIM && aId >= lastBeaconAIDStart && aId <= lastBeaconAIDEnd) {
			// the last beacon received was a beacon for a RAW slot for the current station
			stats->get(this->id).TotalReceiveActiveTime += (Simulator::Now()
					- oldTime);
		} else {
			stats->get(this->id).TotalReceiveDozeTime += (Simulator::Now()
					- oldTime);
		}

		//s1gBeaconHeader.Print(cout);
	} else {
		// this can happen when the state is SWITCHING, TX, RX when receiving the message preamble.
		// The begin RxBegin will not be triggered, but an RxDrop will be generated

		// cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds()
		//  	  <<" End rx for packet " << packet->GetUid() << " without a begin rx" << endl;
	}
}

void NodeEntry::OnPhyRxDrop(std::string context, Ptr<const Packet> packet) {
//cout << "[" << this->id << "] " << "Rx Dropped " << packet->GetUid() << endl;

	this->OnEndOfReceive(packet);

	stats->get(this->id).NumberOfReceivesDropped++;
}

void NodeEntry::OnPhyStateChange(std::string context, const Time start,
		const Time duration, const WifiPhy::State state) {

	/*cout << "[" << this->id << "] " << Simulator::Now().GetMicroSeconds() << "State change, new state is ";

	 switch (state) {
	 case WifiPhy::State::IDLE:
	 cout << "IDLE";
	 break;
	 case WifiPhy::State::TX:
	 cout << "TX";
	 break;
	 case WifiPhy::State::RX:
	 cout << "RX";
	 break;
	 case WifiPhy::State::SLEEP:
	 cout << "SLEEP";
	 break;
	 case WifiPhy::State::SWITCHING:
	 cout << "SWITCHING";
	 break;
	 case WifiPhy::State::CCA_BUSY:
	 cout << "CCA_BUSY";
	 break;

	 }
	 cout << endl;
	 */

}

void NodeEntry::OnUdpPacketSent(Ptr<const Packet> packet) {
//cout << "[" << this->id << "] " << "UDP packet sent " << endl;

	stats->get(this->id).NumberOfSentPackets++;

	/*		cout << "[" << this->id << "] "  << Simulator::Now().GetMicroSeconds() <<
	 " Packet sent" << endl;
	 */

	/*	if (aId >= lastBeaconAIDStart && aId <= lastBeaconAIDEnd) {
	 cout << "[" << this->id << "] "  << Simulator::Now().GetMicroSeconds() <<
	 " Packet is enqueued during the RAW slot period of the node" << endl;
	 }
	 */
}

void NodeEntry::OnUdpEchoPacketReceived(Ptr<const Packet> packet,
		Address from) {
	//cout << "Echo packet received back from AP ("
		//	<< InetSocketAddress::ConvertFrom(from).GetIpv4() << ")" << endl;

	auto pCopy = packet->Copy();
	SeqTsHeader seqTs;
	pCopy->RemoveHeader(seqTs);
	auto timeDiff = (Simulator::Now() - seqTs.GetTs());

	stats->get(this->id).NumberOfSuccessfulRoundtripPackets++;
	stats->get(this->id).TotalPacketRoundtripTime += timeDiff;

}

void NodeEntry::OnUdpPacketReceivedAtAP(Ptr<const Packet> packet) {
	auto pCopy = packet->Copy();
	SeqTsHeader seqTs;
	pCopy->RemoveHeader(seqTs);
	auto timeDiff = (Simulator::Now() - seqTs.GetTs());

//cout << "[" << this->id << "] " << "UDP packet received at AP after "
	//	<< std::to_string(timeDiff.GetMicroSeconds()) << "µs" << endl;

	stats->get(this->id).NumberOfSuccessfulPackets++;
	stats->get(this->id).TotalPacketSentReceiveTime += timeDiff;

	/*cout << this->node->GetDevice(0)->GetAddress() << " ";
	 cout << "[" << this->id << "] "  << Simulator::Now().GetMicroSeconds() << " Packet received in " << timeDiff.GetMicroSeconds() << "µs" << endl;
	 */

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

