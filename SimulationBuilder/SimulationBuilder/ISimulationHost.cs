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
        void SimulationJobDone(string hostname, int index);
    }

    public class SimulationJob
    {
        public int Index { get; set; }

        public int TotalNrOfSimulations { get; set; }

        public Dictionary<string, string> FinalArguments { get; set; }
    }
}
