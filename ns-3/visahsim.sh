./waf --run "scratch/ahsimulation/ahsimulation"\
" --NGroup=4"\
" --NRawSlotNum=5"\
<<<<<<< Updated upstream
" --DataMode=\"MCS2_8\""\
" --Rho=\"400\""\
=======
" --DataMode=\"MCS2_0\""\
" --Rho=\"1\""\
>>>>>>> Stashed changes
" --MaxTimeOfPacketsInQueue=1000"\
" --SimulationTime=200"\
" --TrafficInterval=1000"\
" --TrafficIntervalDeviation=1000"\
" --TrafficType=\"tcpipcamera\""\
" --IpCameraMotionPercentage=1"\
" --IpCameraMotionDuration=10"\
" --IpCameraDataRate=2"\
" --BeaconInterval=102400"\
" --MinRTO=819200"\
" --TCPConnectionTimeout=60000000"\
" --TCPSegmentSize=536"\
" --APAlwaysSchedulesForNextSlot=false"\
" --APScheduleTransmissionForNextSlotIfLessThan=5000"\
" --NRawSta=96"\
" --Nsta=1"\
" --VisualizerIP=\"localhost\""\
" --VisualizerPort=7000"\
" --VisualizerSamplingInterval=1"\
" --APPcapFile=\"appcap\""\
" --NSSFile=\"/home/dwight/ns3ah/802.11ah-ns3/ns-3/test.nss\""\
" --Name=\"test\""
