./waf --run "scratch/ahsimulation/ahsimulation"\
" --NGroup=8"\
" --SlotFormat=0"\
" --NRawSlotCount=162"\
" --NRawSlotNum=5"\
" --DataMode=\"OfdmRate650KbpsBW2MHz\""\
" --Datarate=0.65"\
" --BandWidth=2"\
" --Rho=\"500\""\
" --SimulationTime=1000"\
" --TrafficPacketSize=100"\
" --TrafficInterval=9876"\
" --BeaconInterval=102400"\
" --MinRTO=3276800"\
" --APAlwaysSchedulesForNextSlot=false"\
" --APScheduleTransmissionForNextSlotIfLessThan=5000"\
" --NRawSta=96"\
" --Nsta=10"\
" --VisualizerIP=\"192.168.0.247\""\
" --VisualizerPort=7707"\
" --VisualizerSamplingInterval=1"\
" --Name=\"test\""
