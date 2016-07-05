
#include "NodeStatistics.h"

Time NodeStatistics::getAveragePacketSentReceiveTime() {
	if(NumberOfSuccessfulPackets > 0)
		return TotalPacketSentReceiveTime / NumberOfSuccessfulPackets;
	else
		return Time();
}

long NodeStatistics::getNumberOfDroppedPackets() {
	return NumberOfSentPackets - NumberOfSuccessfulPackets;
}

double NodeStatistics::getGoodputKbit() {
	if(TotalPacketSentReceiveTime.GetSeconds() > 0)
		return (TotalPacketPayloadSize*8 / (1024)) / TotalPacketSentReceiveTime.GetSeconds();
	else
		return -1;
}
