using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.ServiceModel;
using System.ServiceModel.Channels;
using System.Text;

namespace SimulationBuilder
{
    [ServiceBehavior(InstanceContextMode = InstanceContextMode.Single)]
    public class SimulationHost : ISimulationHost
    {
        private Dictionary<string, string> baseArgs;
        private List<Dictionary<string, string>> combos;
        private string nssFolder; 

        private object lockObj = new object();

        private int curJob = 0;

        private int pendingJobs = 0;

        public SimulationHost(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos)
        {
            this.nssFolder = nssFolder;
            this.baseArgs = baseArgs;
            this.combos = combos;
        }

        public SimulationJob GetSimulationJob(string hostname)
        {
            lock (lockObj)
            {
                if (curJob >= combos.Count)
                    return null;
                else
                {
                  
                    Console.WriteLine("Simulation " + curJob + "/" + combos.Count + " claimed by " + hostname + ", currently " + (pendingJobs+1) + " jobs active");

                    var finalArguments = Merge(baseArgs, combos[curJob]);
                    var name = string.Join("", combos[curJob].Select(p => p.Key.Replace("--", "") + p.Value)).Replace("\"", "");
                    finalArguments["--NSSFile"] = "\"" + System.IO.Path.Combine(nssFolder, name + ".nss") + "\"";
                    finalArguments["--Name"] = "\"" + name + "\"";
                    // finalArguments["--VisualizerIP"] = "\"" + "\""; // no visualization 

                    var simJob = new SimulationJob()
                    {
                        Index = curJob,
                        TotalNrOfSimulations = combos.Count,
                        FinalArguments = finalArguments
                    };
                    curJob++;
                    pendingJobs++;
                    return simJob;
                }
            }
        }


        public void SimulationJobDone(string hostname, int index)
        {
            pendingJobs--;
            Console.WriteLine("Simulation " + index + "/" + combos.Count + " finished on " + hostname + ", currently " + pendingJobs + " jobs active" );
        }


        private static Dictionary<string, string> Merge(Dictionary<string, string> baseArgs, Dictionary<string, string> customArgs)
        {
            var dic = new Dictionary<string, string>(baseArgs);
            foreach (var pair in customArgs)
            {
                dic[pair.Key] = pair.Value;
            }
            return dic;
        }

    }
}
