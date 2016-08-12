

#ifndef SCRATCH_APPLICATIONS_PINGPONG_TCPSensorClient_H_
#define SCRATCH_APPLICATIONS_PINGPONG_TCPSensorClient_H_


#include "ns3/tcp-client.h"
#include "ns3/application.h"
#include "ns3/core-module.h"


class TCPSensorClient : public ns3::TcpClient {
public:
	TCPSensorClient();
	virtual ~TCPSensorClient();

	static ns3::TypeId GetTypeId (void);

protected:
	virtual void StartApplication(void);
	virtual void OnDataReceived();

private:
	void Action();

	ns3::Time m_interval;
	uint16_t packetSize;

};

#endif /* SCRATCH_APPLICATIONS_PINGPONG_TCPSensorClient_H_ */
