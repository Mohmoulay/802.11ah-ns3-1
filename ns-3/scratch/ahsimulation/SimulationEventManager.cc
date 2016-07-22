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

		  config.name,

		  std::to_string(config.propagationLossExponent),
		  std::to_string(config.propagationLossReferenceLoss),
		  std::to_string(config.APAlwaysSchedulesForNextSlot),
		  std::to_string(config.MinRTO),
		  std::to_string(config.simulationTime),
		  config.trafficType,
		  std::to_string(config.trafficIntervalDeviation)
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

	int lastItem = DropReason::MacQueueSizeExceeded;
	std::stringstream s;
	for(int i = 0; i <= lastItem;i++) {
		s << map[(DropReason)i] << ((i == lastItem) ? "": ",");
	}
	return s.str();
}

void SimulationEventManager::onUpdateSlotStatistics(vector<long>& transmissionsPerSlotFromAP, vector<long>& transmissionsPerSlotFromSTA) {

	vector<string> values;

	values.push_back("slotstatsAP");
	for(int i = 0; i < transmissionsPerSlotFromAP.size(); i++) {
		values.push_back(std::to_string(transmissionsPerSlotFromAP[i]));
	}
	send(values);

	values.clear();

	values.push_back("slotstatsSTA");
	for(int i = 0; i < transmissionsPerSlotFromSTA.size(); i++) {
		values.push_back(std::to_string(transmissionsPerSlotFromSTA[i]));
	}
	send(values);
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
			std::to_string(stats.get(i).NumberOfMACTxMissedACK),
			this->SerializeDropReason(stats.get(i).NumberOfDropsByReason),
			this->SerializeDropReason(stats.get(i).NumberOfDropsByReasonAtAP),
			std::to_string(stats.get(i).TCPRTOValue.GetMicroSeconds()),
			std::to_string(stats.get(i).NumberOfAPScheduledPacketForNodeInNextSlot),
			std::to_string(stats.get(i).NumberOfAPSentPacketForNodeImmediately),
			std::to_string(stats.get(i).getAverageRemainingWhenAPSendingPacketInSameSlot().GetMicroSeconds()),
			std::to_string(stats.get(i).NumberOfCollisions),
			std::to_string(stats.get(i).NumberOfMACTxMissedACKAndDroppedPacket),
		});
	}
}

void SimulationEventManager::send(vector<string> str) {
	if(this->hostname != "") {


		//int sockfd ;
		if(socketDescriptor == -1) {
			std::cout << "Connecting to visualizer" << std::endl;
			socketDescriptor = stat_connect(this->hostname.c_str(), std::to_string(this->port).c_str());
			if(socketDescriptor == -1)
				return;
		}


		std::stringstream s;
		s << Simulator::Now().GetNanoSeconds() << ";";
		for(int i = 0; i < str.size(); i++) {
			s << str[i] << ((i != str.size()-1) ? ";" : "");
		}
		s << "\n";
		bool success = stat_send(socketDescriptor, string(s.str()).c_str());

		if(!success) {
			std::cout << "Sending failed" << std::endl;
			stat_close(socketDescriptor);
			socketDescriptor = -1;
		}
	}
}

SimulationEventManager::~SimulationEventManager() {

}

