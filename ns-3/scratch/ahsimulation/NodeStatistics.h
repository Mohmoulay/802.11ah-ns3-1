#ifndef NODESTATISTICS_H
#define NODESTATISTICS_H

#include "ns3/core-module.h"

using namespace std;
using namespace ns3;

class NodeStatistics {

public:
    Time TotalTransmitTime = Time();
    Time TotalReceiveTime = Time();
    Time TotalReceiveDozeTime = Time();
    Time TotalReceiveActiveTime = Time();
    
    long NumberOfTransmissions = 0;
    long NumberOfTransmissionsDropped = 0;
    long NumberOfReceives = 0;
    long NumberOfReceivesDropped = 0;
    
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

    uint32_t TCPCongestionWindow = 0;

};

#endif /* NODESTATISTICS_H */

