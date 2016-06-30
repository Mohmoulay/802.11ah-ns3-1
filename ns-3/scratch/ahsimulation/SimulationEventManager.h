/*
 * SimulationEventManager.h
 *
 *  Created on: Jun 30, 2016
 *      Author: dwight
 */

#ifndef SCRATCH_AHSIMULATION_SIMULATIONEVENTMANAGER_H_
#define SCRATCH_AHSIMULATION_SIMULATIONEVENTMANAGER_H_

#include "NodeEntry.h"
#include "Statistics.h"


class SimulationEventManager {

private:

	string hostname;
	int port;

	void send(vector<string> str);

public:
	SimulationEventManager();
	SimulationEventManager(string hostname, int port);


	void onStart();

	void onAPNodeCreated(double x, double y);

	void onSTANodeCreated(NodeEntry& node);

	void onUpdateStatistics(Statistics& stats);

	virtual ~SimulationEventManager();
};

#endif /* SCRATCH_AHSIMULATION_SIMULATIONEVENTMANAGER_H_ */
