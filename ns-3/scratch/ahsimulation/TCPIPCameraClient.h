

#ifndef SCRATCH_APPLICATIONS_PINGPONG_TCPIPCameraClient_H_
#define SCRATCH_APPLICATIONS_PINGPONG_TCPIPCameraClient_H_


#include "ns3/tcp-client.h"
#include "ns3/application.h"
#include "ns3/core-module.h"


class TCPIPCameraClient : public ns3::TcpClient {
public:
	TCPIPCameraClient();
	virtual ~TCPIPCameraClient();

	static ns3::TypeId GetTypeId (void);

protected:
	virtual void StartApplication(void);
	virtual void OnDataReceived();

private:
	void Stream();
	void Action();

	ns3::Time m_interval;
	double m_motionProbability;
	ns3::Time m_motionDuration;
	int m_datarate;


	ns3::Time motionStartedOn;
	bool motionActive = false;

	ns3::Ptr<ns3::UniformRandomVariable> m_rv;

};

#endif /* SCRATCH_APPLICATIONS_PINGPONG_TCPIPCameraClient_H_ */