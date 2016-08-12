/*
 * TCPFirmwareServer.cc
 *
 *  Created on: Aug 9, 2016
 *      Author: dwight
 */

#include "TCPFirmwareServer.h"

using namespace ns3;

TCPFirmwareServer::TCPFirmwareServer() {

	m_rv = CreateObject<UniformRandomVariable>();

}

TCPFirmwareServer::~TCPFirmwareServer() {
	m_rv = 0;
}

ns3::TypeId TCPFirmwareServer::GetTypeId(void) {
	static ns3::TypeId tid = ns3::TypeId("TCPFirmwareServer")
			.SetParent<TcpServer>()
			.AddConstructor<TCPFirmwareServer>()

			.AddAttribute ("FirmwareSize",
			                   "The size of the firmware to send",
			                   UintegerValue(1024 * 1024 * 5),
			                   MakeUintegerAccessor(&TCPFirmwareServer::firmwareSize),
			                   MakeUintegerChecker<uint32_t>())

		   .AddAttribute ("BlockSize",
						   "The size of 1 chunk when sending the firmware",
						   UintegerValue(1024),
						   MakeUintegerAccessor(&TCPFirmwareServer::firmwareBlockSize),
						   MakeUintegerChecker<uint16_t>())

		   .AddAttribute("NewUpdateProbability",
									   "The probability that the received version is outdated",
									   DoubleValue(0.01),
									   MakeDoubleAccessor(&TCPFirmwareServer::newVersionProbability),
									   MakeDoubleChecker<double>(0.0,1.0))
	;
	return tid;
}

void TCPFirmwareServer::OnConnected(ns3::Address from) {
	stringBuffer[from] = "";
}

void TCPFirmwareServer::OnDataReceived(ns3::Address from) {

	std::string data = ReadString(from, 1024);
	stringBuffer[from] += data;

	while(int splitIdx = stringBuffer[from].find("\n\n\n") != 0) {

		std::string msg = stringBuffer[from].substr(0, splitIdx);
		 stringBuffer[from].erase(0, splitIdx + 3);


		if(msg.find("VERSION") == 0) {

			bool newerVersion = m_rv->GetValue(0,1) < newVersionProbability;
			if(newerVersion)
				WriteString(from, std::string("NEWUPDATE,") + std::to_string(firmwareSize) + "," + std::to_string(firmwareBlockSize), false);
		}
		else if(msg.find("READYTOUPDATE") == 0) {
			curFirmwarePos[from] = 0;
			SendFirmwareBlock(from);
		}
		else if(msg.find("NEXTBLOCK") == 0) {
			curFirmwarePos[from] += firmwareBlockSize;
			SendFirmwareBlock(from);
		}
		else if(msg.find("BLOCKFAILED") == 0) {
			SendFirmwareBlock(from);
		}
		else if(msg.find("UPDATED") == 0) {
			curFirmwarePos.erase(from);
		}

		// end of statement
		WriteString(from, "\n\n\n", true);
	}
}

void TCPFirmwareServer::SendFirmwareBlock(Address from) {
	if(curFirmwarePos[from] > firmwareSize)
		WriteString(from, "ENDOFUPDATE",false);
	else {
		WriteString(from, "BLOCK", false);
		char* buf = new char[firmwareBlockSize];
		for(int i = 0; i < firmwareBlockSize; i++)
			buf[i] = i % 256;
		Write(from, buf, firmwareBlockSize);
		delete buf;
	}
}


