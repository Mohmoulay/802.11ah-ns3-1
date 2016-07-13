#ifndef NODESTATISTICS_H
#define NODESTATISTICS_H

#include "ns3/core-module.h"
#include "ns3/drop-reason.h"

using namespace std;
using namespace ns3;

class NodeStatistics {

public:
    Time TotalTransmitTime = Time();
    Time TotalReceiveTime = Time();
    Time TotalDozeTime = Time();
    Time TotalActiveTime = Time();
    
    long NumberOfTransmissions = 0;
    long NumberOfTransmissionsDropped = 0;
    long NumberOfReceives = 0;
    long NumberOfReceivesDropped = 0;
    // the number of Rx that is dropped while STA was the destination
    long NumberOfReceiveDroppedByDestination = 0;
    
    // number of drops for any packets for between STA and AP by reason
    map<DropReason, long> NumberOfDropsByReason;
    // number of drops for any packets for between STA and AP by reason that occurred at AP
    map<DropReason, long> NumberOfDropsByReasonAtAP;


    long NumberOfSuccessfulPackets = 0;
    long NumberOfSentPackets = 0;
    
    long NumberOfSuccessfulRoundtripPackets = 0;

    long getNumberOfDroppedPackets();

    Time TotalPacketSentReceiveTime = Time();
    long TotalPacketPayloadSize = 0;
    
    Time TotalPacketRoundtripTime = Time();

    Time getAveragePacketSentReceiveTime();
    Time getAveragePacketRoundTripTime();

    double getGoodputKbit();

    int EDCAQueueLength = 0;

    long TCPCongestionWindow = 0;
    Time TCPRTOValue = Time();

    long NumberOfTCPRetransmissions = 0;
    long NumberOfTCPRetransmissionsFromAP = 0;

    long NumberOfMACTxRTSFailed = 0;
    long NumberOfMACTxDataFailed = 0;

    long NumberOfAPScheduledPacketForNodeInNextSlot = 0;
    long NumberOfAPSentPacketForNodeImmediately = 0;
    Time APTotalTimeRemainingWhenSendingPacketInSameSlot;

    Time getAverageRemainingWhenAPSendingPacketInSameSlot();
};

#endif /* NODESTATISTICS_H */

