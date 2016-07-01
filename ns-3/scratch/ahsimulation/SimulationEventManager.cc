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

void SimulationEventManager::onStart() {
	send({"start"});
}


void SimulationEventManager::onAPNodeCreated(double x, double y) {
	send({"apnodeadd", std::to_string(x), std::to_string(y)});
}

void SimulationEventManager::onSTANodeCreated(NodeEntry& node) {
	send({"stanodeadd", std::to_string(node.id), std::to_string(node.x), std::to_string(node.y)});
}

void SimulationEventManager::onUpdateStatistics(Statistics& stats) {
	for(int i = 0; i < stats.getNumberOfNodes(); i++) {
		send({"nodestats", std::to_string(i),
			std::to_string(stats.get(i).TotalTransmitTime.GetMilliSeconds()),
			std::to_string(stats.get(i).TotalReceiveTime.GetMilliSeconds()),
			std::to_string(stats.get(i).TotalReceiveDozeTime.GetMilliSeconds()),
			std::to_string(stats.get(i).TotalReceiveActiveTime.GetMilliSeconds()),
			std::to_string(stats.get(i).getThroughputKbit())
		});
	}
}

void SimulationEventManager::send(vector<string> str) {
	if(this->hostname != "") {
		int sockfd = stat_connect(this->hostname.c_str(), std::to_string(this->port).c_str());
		if(sockfd == -1)
			return;

		std::stringstream s;
		s << Simulator::Now().GetNanoSeconds() << ";";
		for(int i = 0; i < str.size(); i++) {
			s << str[i] << ((i != str.size()) ? ";" : "");
		}
		s << "\n";
		stat_send(sockfd, string(s.str()).c_str());
		stat_close(sockfd);
	}
}

SimulationEventManager::~SimulationEventManager() {

}

