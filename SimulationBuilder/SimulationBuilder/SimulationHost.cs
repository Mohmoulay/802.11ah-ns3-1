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

        //    private int curJob = 0;

        private int pendingJobs = 0;
        private HashSet<int> remainingJobs = new HashSet<int>();
        private Dictionary<int, int> jobFailedCount = new Dictionary<int, int>();

        public SimulationHost(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos)
        {
            this.nssFolder = nssFolder;
            this.baseArgs = baseArgs;
            this.combos = combos;

            remainingJobs = new HashSet<int>(Enumerable.Range(0, combos.Count));
            jobFailedCount = remainingJobs.ToDictionary(p => p, p => 0);

        }

        public SimulationJob GetSimulationJob(string hostname)
        {
            lock (lockObj)
            {
                if (remainingJobs.Count == 0)
                    return null;
                else
                {
                    int curJob = remainingJobs.First();
                    remainingJobs.Remove(curJob);

                    Console.WriteLine("Simulation " + curJob + "/" + combos.Count + " claimed by " + hostname + ", currently " + (pendingJobs + 1) + " jobs active");

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


                    pendingJobs++;
                    return simJob;
                }
            }
        }


        public void SimulationJobDone(string hostname, int index)
        {
            lock (lockObj)
            {
                pendingJobs--;
                Console.WriteLine("Simulation " + index + "/" + combos.Count + " finished on " + hostname + ", currently " + pendingJobs + " jobs active");
            }
        }

        public void SimulationJobFailed(string hostname, int index, string error)
        {
            lock (lockObj)
            {
                jobFailedCount[index]++;
                pendingJobs--;
                Console.WriteLine("Simulation " + index + "/" + combos.Count + " FAILED on " + hostname + ", error: " + error + ", currently " + pendingJobs + " jobs active");
                if (jobFailedCount[index] > 10)
                {
                    Console.WriteLine("Simulation " + index + " failed too many times, it will not be queued anymore.");
                }
                else
                {
                    remainingJobs.Add(index);
                }
            }
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
