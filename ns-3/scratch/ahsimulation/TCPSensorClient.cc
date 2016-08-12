/*
 * TCPSensorClient.cc
 *
 *  Created on: Aug 9, 2016
 *      Author: dwight
 */

#include "TCPSensorClient.h"

using namespace ns3;

TCPSensorClient::TCPSensorClient() {

}

TCPSensorClient::~TCPSensorClient() {

}

ns3::TypeId TCPSensorClient::GetTypeId(void) {
	static ns3::TypeId tid = ns3::TypeId("TCPSensorClient")
			.SetParent<TcpClient>()
			.AddConstructor<TCPSensorClient>()

			.AddAttribute ("Interval",
			                   "The time to wait between packets",
			                   TimeValue (Seconds (1.0)),
			                   MakeTimeAccessor (&TCPSensorClient::m_interval),
			                   MakeTimeChecker ())

		   .AddAttribute ("PacketSize",
						   "The size of a measurement",
						   UintegerValue(1024),
						   MakeUintegerAccessor(&TCPSensorClient::packetSize),
						   MakeUintegerChecker<uint16_t>())

	;
	return tid;
}

void TCPSensorClient::StartApplication(void) {
	ns3::TcpClient::StartApplication();

	ns3::Simulator::Schedule(m_interval, &TCPSensorClient::Action, this);
}

void TCPSensorClient::Action() {

	WriteString("MEASUREMENT", false);

	char* buf = new char[packetSize];
	for(int i = 0; i < packetSize; i++)
		buf[i] = i % 256;
	Write(buf, packetSize);
	delete buf;

	ns3::Simulator::Schedule(m_interval, &TCPSensorClient::Action, this);
}


void TCPSensorClient::OnDataReceived() {

	std::string reply = ReadString(1024);
	std::cout << "Reply from TCP Server: '" << reply << "'" << std::endl;
}
