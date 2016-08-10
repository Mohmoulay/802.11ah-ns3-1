/*
 * TCPPingPongClient.cc
 *
 *  Created on: Aug 9, 2016
 *      Author: dwight
 */

#include "TCPPingPongClient.h"

using namespace ns3;

TCPPingPongClient::TCPPingPongClient() {

}

TCPPingPongClient::~TCPPingPongClient() {

}

ns3::TypeId TCPPingPongClient::GetTypeId(void) {
	static ns3::TypeId tid = ns3::TypeId("TCPPingPongClient")
			.SetParent<TcpClient>()
			.AddConstructor<TCPPingPongClient>()

			.AddAttribute ("Interval",
			                   "The time to wait between packets",
			                   TimeValue (Seconds (1.0)),
			                   MakeTimeAccessor (&TCPPingPongClient::m_interval),
			                   MakeTimeChecker ())
	;
	return tid;
}

void TCPPingPongClient::StartApplication(void) {
	ns3::TcpClient::StartApplication();

	ns3::Simulator::Schedule(m_interval, &TCPPingPongClient::Action, this);
}

void TCPPingPongClient::Action() {

	std::string str = "PING";

	std::cout << "Sending to TCP Server: '" << str << "'" << std::endl;

	char* buf = (char*)str.c_str();
	Write(buf, (int)str.size());

	Flush();

	ns3::Simulator::Schedule(m_interval, &TCPPingPongClient::Action, this);
}


void TCPPingPongClient::OnDataReceived() {

	char* buf = new char[1024];
	int nrOfBytesRead = Read(buf, 1024);
	auto reply = std::string(buf,nrOfBytesRead);
	delete buf;

	if(reply != "PONG") {
		// something went wrong
	}

	std::cout << "Reply from TCP Server: '" << reply << "'" << std::endl;
}
