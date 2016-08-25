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
        private string GUID;

        public SimulationHost(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos)
        {
            this.nssFolder = nssFolder;
            this.baseArgs = baseArgs;
            this.combos = combos;
            this.GUID = System.Guid.NewGuid().ToString();

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

                    pendingJobs++;
                    Console.WriteLine("Simulation " + curJob + "/" + combos.Count + " claimed by " + hostname + GetSuffix());

                    var finalArguments = Merge(baseArgs, combos[curJob]);
                    var name = string.Join("", combos[curJob].Select(p => p.Key.Replace("--", "") + p.Value)).Replace("\"", "");
                    finalArguments["--NSSFile"] = "\"" + System.IO.Path.Combine(nssFolder, name + ".nss") + "\"";
                    finalArguments["--Name"] = "\"" + name + "\"";
                    // finalArguments["--VisualizerIP"] = "\"" + "\""; // no visualization 

                    var simJob = new SimulationJob()
                    {
                        SimulationBatchGUID = GUID,
                        Index = curJob,
                        TotalNrOfSimulations = combos.Count,
                        FinalArguments = finalArguments
                    };



                    return simJob;
                }
            }
        }

        private string GetSuffix()
        {
            return ", currently " + pendingJobs + " jobs active. " + remainingJobs.Count + " remaining.";
        }


        public void SimulationJobDone(string simulationBatchGUID, string hostname, int index, long elapsedTicks)
        {
            lock (lockObj)
            {

                var ts = TimeSpan.FromTicks(elapsedTicks);
                if (simulationBatchGUID == GUID)
                {
                    pendingJobs--;
                    Console.WriteLine("Simulation " + index + "/" + combos.Count + " finished in " + ts.ToString() + " on " + hostname + GetSuffix());
                }
                else
                {
                    Console.WriteLine("Simulation " + index + " from previous batch finished in " + ts.ToString() + " on " + hostname + GetSuffix());
                }
            }
        }

        public void SimulationJobFailed(string simulationBatchGUID, string hostname, int index, string error)
        {
            lock (lockObj)
            {
                if (simulationBatchGUID == GUID)
                {
                    jobFailedCount[index]++;
                    pendingJobs--;
                    Console.WriteLine("Simulation " + index + "/" + combos.Count + " FAILED on " + hostname + ", error: " + error + GetSuffix());
                    if (jobFailedCount[index] > 10)
                    {
                        Console.WriteLine("Simulation " + index + " failed too many times, it will not be queued anymore.");
                    }
                    else
                    {
                        remainingJobs.Add(index);
                    }
                }
                else
                {
                    Console.WriteLine("Simulation " + index + " failed from a previous batch on " + hostname + ", error: " + error + GetSuffix());
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
