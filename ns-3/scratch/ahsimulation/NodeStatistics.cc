
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
	return (TotalPacketPayloadSize*8 / (1024)) / TotalPacketTimeOfFlight.GetSeconds();
}
