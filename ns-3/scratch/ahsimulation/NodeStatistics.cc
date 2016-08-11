
#include "NodeStatistics.h"

Time NodeStatistics::getAveragePacketSentReceiveTime() {
	if(NumberOfSuccessfulPackets > 0)
		return TotalPacketSentReceiveTime / NumberOfSuccessfulPackets;
	else
		return Time();
}

Time NodeStatistics::getAveragePacketRoundTripTime() {
	if(NumberOfSuccessfulRoundtripPackets > 0)
		return TotalPacketRoundtripTime / NumberOfSuccessfulRoundtripPackets;
	else
		return Time();
}

long NodeStatistics::getNumberOfDroppedPackets() {
	if(NumberOfSentPackets == 0)
		return -1;
	else
		return NumberOfSentPackets - NumberOfSuccessfulPackets;
}

double NodeStatistics::getGoodputKbit() {
	if(TotalPacketSentReceiveTime.GetSeconds() > 0)
		return (TotalPacketPayloadSize*8 / (1024)) / TotalPacketSentReceiveTime.GetSeconds();
	else
		return -1;
}


Time NodeStatistics::getAverageRemainingWhenAPSendingPacketInSameSlot() {
	if(NumberOfAPSentPacketForNodeImmediately == 0)
		return Time();
	else
		return APTotalTimeRemainingWhenSendingPacketInSameSlot / NumberOfAPSentPacketForNodeImmediately;
}


int NodeStatistics::getTotalDrops() {
	int sum = 0;
	for(auto& pair : this-> NumberOfDropsByReason) {
		sum += pair.second;
	}

	for(auto& pair : this-> NumberOfDropsByReasonAtAP) {
		sum += pair.second;
	}
	return sum;
}
