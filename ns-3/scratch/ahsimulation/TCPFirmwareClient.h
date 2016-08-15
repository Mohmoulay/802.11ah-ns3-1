

#ifndef SCRATCH_APPLICATIONS_PINGPONG_TCPFirmwareClient_H_
#define SCRATCH_APPLICATIONS_PINGPONG_TCPFirmwareClient_H_


#include "ns3/tcp-client.h"
#include "ns3/application.h"
#include "ns3/core-module.h"


class TCPFirmwareClient : public ns3::TcpClient {
public:
	TCPFirmwareClient();
	virtual ~TCPFirmwareClient();

	static ns3::TypeId GetTypeId (void);

protected:
	virtual void StartApplication(void);
	virtual void StopApplication(void);
	virtual void OnDataReceived();

private:
	void Action();

	ns3::Time m_interval;

	std::string stringBuffer;

	double corruptionProbability;
	ns3::Ptr<ns3::UniformRandomVariable> m_rv;

	ns3::EventId actionEventId;

};

#endif /* SCRATCH_APPLICATIONS_PINGPONG_TCPFirmwareClient_H_ */
