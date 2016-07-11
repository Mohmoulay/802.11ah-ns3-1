/*
 * SimulationEventManager.cc
 *
 *  Created on: Jun 30, 2016
 *      Author: dwight
 */

#include "SimulationEventManager.h"
#include "SimpleTCPClient.h"

SimulationEventManager::SimulationEventManager()
	: hostname("localhost"), port(7707) {
}

SimulationEventManager::SimulationEventManager(string hostname, int port)
	: hostname(hostname), port(port) {
}

void SimulationEventManager::onStart(Configuration& config) {
	send({"start",
		  std::to_string(config.NRawSta),
		  std::to_string(config.NGroup),
		  std::to_string(config.SlotFormat),
		  std::to_string(config.NRawSlotCount),
		  std::to_string(config.NRawSlotNum),

		  config.DataMode,
		  std::to_string(config.datarate),
		  std::to_string(config.bandWidth),

		  std::to_string(config.trafficInterval),
		  std::to_string(config.trafficPacketSize),

		  std::to_string(config.BeaconInterval),

		  config.name
	});
}


void SimulationEventManager::onAPNodeCreated(double x, double y) {
	send({"apnodeadd", std::to_string(x), std::to_string(y)});
}

void SimulationEventManager::onSTANodeCreated(NodeEntry& node) {
	send({"stanodeadd", std::to_string(node.id), std::to_string(node.x), std::to_string(node.y), std::to_string(node.aId)});
}

void SimulationEventManager::onNodeAssociated(NodeEntry& node) {
	send({"stanodeassoc", std::to_string(node.id), std::to_string(node.aId), std::to_string(node.rawGroupNumber), std::to_string(node.rawSlotIndex)});
}

void SimulationEventManager::onNodeDeassociated(NodeEntry& node) {
	send({"stanodedeassoc", std::to_string(node.id)});
}

string SimulationEventManager::SerializeDropReason(map<DropReason, long>& map) {

	int lastItem = DropReason::MacAPToAPFrame;
	std::stringstream s;
	for(int i = 0; i <= lastItem;i++) {
		s << map[(DropReason)i] << ((i == lastItem) ? "": ",");
	}
	return s.str();
}

void SimulationEventManager::onUpdateStatistics(Statistics& stats) {
	for(int i = 0; i < stats.getNumberOfNodes(); i++) {
		send({"nodestats", std::to_string(i),
			std::to_string(stats.get(i).TotalTransmitTime.GetMilliSeconds()),
			std::to_string(stats.get(i).TotalReceiveTime.GetMilliSeconds()),
			std::to_string(stats.get(i).TotalDozeTime.GetMilliSeconds()),
			std::to_string((Simulator::Now() - stats.get(i).TotalDozeTime).GetMilliSeconds()),
			std::to_string(stats.get(i).NumberOfTransmissions),
			std::to_string(stats.get(i).NumberOfTransmissionsDropped),
			std::to_string(stats.get(i).NumberOfReceives),
			std::to_string(stats.get(i).NumberOfReceivesDropped),
			std::to_string(stats.get(i).NumberOfSentPackets),
			std::to_string(stats.get(i).NumberOfSuccessfulPackets),
			std::to_string(stats.get(i).getNumberOfDroppedPackets()),
			std::to_string(stats.get(i).getAveragePacketSentReceiveTime().GetMilliSeconds()),
			std::to_string(stats.get(i).getGoodputKbit()),
			std::to_string(stats.get(i).EDCAQueueLength),
			std::to_string(stats.get(i).NumberOfSuccessfulRoundtripPackets),
			std::to_string(stats.get(i).getAveragePacketRoundTripTime().GetMilliSeconds()),
			std::to_string(stats.get(i).TCPCongestionWindow),
			std::to_string(stats.get(i).NumberOfTCPRetransmissions),
			std::to_string(stats.get(i).NumberOfTCPRetransmissionsFromAP),
			std::to_string(stats.get(i).NumberOfReceiveDroppedByDestination),
			std::to_string(stats.get(i).NumberOfMACTxRTSFailed),
			std::to_string(stats.get(i).NumberOfMACTxDataFailed),
			this->SerializeDropReason(stats.get(i).NumberOfDropsByReason),
			this->SerializeDropReason(stats.get(i).NumberOfDropsByReasonAtAP)
		});
	}
}

void SimulationEventManager::send(vector<string> str) {
	if(this->hostname != "") {


		int sockfd ;
		//if(socketDescriptor == -1) {

			sockfd = stat_connect(this->hostname.c_str(), std::to_string(this->port).c_str());
			if(sockfd == -1)
				return;

			socketDescriptor = sockfd;
		//}


		std::stringstream s;
		s << Simulator::Now().GetNanoSeconds() << ";";
		for(int i = 0; i < str.size(); i++) {
			s << str[i] << ((i != str.size()-1) ? ";" : "");
		}
		s << "\n";
		bool success = stat_send(sockfd, string(s.str()).c_str());

		//if(!success) {
			stat_close(sockfd);
			socketDescriptor = -1;
		//}
	}
}

SimulationEventManager::~SimulationEventManager() {

}

