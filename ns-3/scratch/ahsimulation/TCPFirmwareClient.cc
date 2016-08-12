/*
 * TCPFirmwareClient.cc
 *
 *  Created on: Aug 9, 2016
 *      Author: dwight
 */

#include "TCPFirmwareClient.h"

using namespace ns3;

TCPFirmwareClient::TCPFirmwareClient() {

	m_rv = CreateObject<UniformRandomVariable>();
}

TCPFirmwareClient::~TCPFirmwareClient() {

	m_rv = 0;
}

ns3::TypeId TCPFirmwareClient::GetTypeId(void) {
	static ns3::TypeId tid = ns3::TypeId("TCPFirmwareClient")
			.SetParent<TcpClient>()
			.AddConstructor<TCPFirmwareClient>()

			.AddAttribute ("VersionCheckInterval",
			                   "The interval to check versions",
			                   TimeValue (Seconds (1.0)),
			                   MakeTimeAccessor (&TCPFirmwareClient::m_interval),
			                   MakeTimeChecker ())

		   .AddAttribute("CorruptionProbability",
									   "The probability that the received block was corrupted",
									   DoubleValue(0.01),
									   MakeDoubleAccessor(&TCPFirmwareClient::corruptionProbability),
									   MakeDoubleChecker<double>(0.0,1.0))
	;
	return tid;
}

void TCPFirmwareClient::StartApplication(void) {
	ns3::TcpClient::StartApplication();

	stringBuffer = "";
	actionEventId = ns3::Simulator::Schedule(m_interval, &TCPFirmwareClient::Action, this);
}

void TCPFirmwareClient::Action() {

	std::string str = "VERSION";

	WriteString("VERSION,1.01.2345", false);
	WriteString("\n\n\n", true);

	actionEventId = ns3::Simulator::Schedule(m_interval, &TCPFirmwareClient::Action, this);
}


void TCPFirmwareClient::OnDataReceived() {

	std::string data = ReadString(1024);
	stringBuffer += data;

	while(int splitIdx = stringBuffer.find("\n\n\n") != 0) {

		std::string msg = stringBuffer.substr(0, splitIdx);
		stringBuffer.erase(0, splitIdx + 3);

		if(msg.find("NEWUPDATE") == 0) {

			// schedule ?
			WriteString("READYTOUPDATE", false);

			// cancel version check until firmware is updated
			ns3::Simulator::Cancel(actionEventId);
		}
		else if(msg.find("BLOCK") == 0) {
			bool corruption = m_rv->GetValue(0,1) < corruptionProbability;

			if(corruption)
				WriteString("BLOCKFAILED", false);
			else
				WriteString("NEXTBLOCK", false);
		}
		else if(msg.find("ENDOFUPDATE") == 0) {

			// schedule
			WriteString("UPDATED", false);

			// restart version check
			actionEventId = ns3::Simulator::Schedule(m_interval, &TCPFirmwareClient::Action, this);
		}

		// end of statement
		WriteString("\n\n\n", true);
	}

}
