../analyzebatchthreaded.pl \
/proj/wall2-ilabt-iminds-be/ns3ah/sensorlarge/ \
config=name,nsta,ngroup,nrawslotnum,trafficinterval,apalwaysschedulesfornextslot,contentionperrawslot \
stats=edcaqueuelength,tcpconnected,totalnumberofdrops,numberofmactxmissedack,numberoftransmissions,NumberOfDroppedPackets,AveragePacketSentReceiveTime,DropTCPTxBufferExceeded,totaldozetime,numberoftcpretransmissions,numberoftcpretransmissionsfromap,NumberOfAPScheduledPacketForNodeInNextSlot \
$@
