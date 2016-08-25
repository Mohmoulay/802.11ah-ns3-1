using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.Text;

namespace SimulationBuilder
{
    [ServiceContract]
    public interface ISimulationHost
    {
        [OperationContract]
        SimulationJob GetSimulationJob(string hostname);

        [OperationContract]
        void SimulationJobDone(string simulationBatchGUID, string hostname, int index, long elapsedTicks);

        [OperationContract]
        void SimulationJobFailed(string simulationBatchGUID, string hostname, int index, string error);
    }

    public class SimulationJob
    {
        public string SimulationBatchGUID { get; set; }

        public int Index { get; set; }

        public int TotalNrOfSimulations { get; set; }

        public Dictionary<string, string> FinalArguments { get; set; }
    }
}
