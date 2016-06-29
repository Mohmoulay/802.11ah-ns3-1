
#include "NodeStatistics.h"

Time NodeStatistics::getAveragePacketTimeOfFlight() {
	if(NumberOfSuccessfulPackets > 0)
		return TotalPacketTimeOfFlight / NumberOfSuccessfulPackets;
	else
		return Time();
}

long NodeStatistics::getNumberOfDroppedPackets() {
	return NumberOfSentPackets - NumberOfSuccessfulPackets;
}

double NodeStatistics::getThroughputKbit() {
	if(TotalPacketTimeOfFlight.GetSeconds() > 0)
		return (TotalPacketPayloadSize*8 / (1024)) / TotalPacketTimeOfFlight.GetSeconds();
	else
		return -1;
}
