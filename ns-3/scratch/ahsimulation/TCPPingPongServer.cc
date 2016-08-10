/*
 * TCPPingPongServer.cc
 *
 *  Created on: Aug 9, 2016
 *      Author: dwight
 */

#include "TCPPingPongServer.h"

using namespace ns3;

TCPPingPongServer::TCPPingPongServer() {

}

TCPPingPongServer::~TCPPingPongServer() {

}

ns3::TypeId TCPPingPongServer::GetTypeId(void) {
	static ns3::TypeId tid = ns3::TypeId("TCPPingPongServer")
			.SetParent<TcpServer>()
			.AddConstructor<TCPPingPongServer>()
	;
	return tid;
}

void TCPPingPongServer::OnDataReceived(ns3::Address from) {


	char* buf = new char[1024];
	int nrOfBytesRead = Read(from, buf, 1024);
	auto msg = std::string(buf,nrOfBytesRead);
	delete buf;

	std::cout << "Received message from TCP client " << from << ": '" << msg << "'" << std::endl;

	std::string str = "PONG";
	std::cout << "Sending to TCP client "  << from << ": '" << str << "'" << std::endl;

	buf = (char*)str.c_str();
	Write(from, buf, (int)str.size());
	Flush(from);
}


