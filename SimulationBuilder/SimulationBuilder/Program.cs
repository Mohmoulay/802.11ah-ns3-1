using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.ServiceModel;
using System.Text;
using RunTimeDebuggers.Helpers;

namespace SimulationBuilder
{
    class Program
    {

        static void Main(string[] args)
        {
            //if (System.Diagnostics.Debugger.IsAttached)
                //args = new string[] { "--slave", "http://localhost:12345/SimulationHost/" };
            if (args.Any(a => a.Contains("--slave")))
            {
                MainSlave(args);
            }
            else
                MainHost(args);
        }

        static void MainSlave(string[] args)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("USAGE: SimulationBuilder --slave hostWCFendpoint");
                return;
            }

            int maxParallel;
            if (!int.TryParse(ConfigurationManager.AppSettings["maxParallel"], out maxParallel))
                maxParallel = Environment.ProcessorCount;
            TaskFactory factory = new TaskFactory(maxParallel, System.Threading.ThreadPriority.Normal);

            for (int i = 0; i < maxParallel; i++)
            {
                factory.StartTask(() =>
                {
                    try
                    {
                        HostProxy.SimulationHostClient proxy = new HostProxy.SimulationHostClient("BasicHttpBinding_ISimulationHost", args[1]);
                        DateTime cur = DateTime.MinValue;
                        while (true)
                        {
                            if ((DateTime.UtcNow - cur).TotalSeconds > 10)
                            {
                                try
                                {
                                    var simJob = proxy.GetSimulationJob();
                                    if (simJob != null)
                                    {
                                        Console.WriteLine("Received simulation job " + simJob.Index + ", running simulation");
                                        RunSimulation(simJob.FinalArguments);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine("Error: " + ex.GetType().FullName + " - " + ex.Message);
                                }

                                cur = DateTime.UtcNow;
                            }
                            else
                                System.Threading.Thread.Sleep(25);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.Error.Write("Error: " + ex.GetType().FullName + " - " + ex.Message + Environment.NewLine + ex.StackTrace);
                    }
                }, () =>
                {

                });
            }
        }


        static void MainHost(string[] args)
        {
            if (args.Length < 3)
            {
                Console.WriteLine("USAGE: SimulationBuilder baseConfiguration buildConfiguration nssFolder");
                return;
            }

            string baseConfig = args[0];
            string buildConfig = args[1];
            string nssFolder = args[2];

            Console.WriteLine("Args: " + Environment.NewLine + string.Join(Environment.NewLine, args));

            if (!System.IO.File.Exists(baseConfig))
            {
                Console.Error.WriteLine("Base configuration file " + baseConfig + " not found");
                return;
            }

            if (!System.IO.File.Exists(buildConfig))
            {
                Console.Error.WriteLine("Build configuration file " + baseConfig + " not found");
                return;
            }

            //if (args.Any(a => a == "--host"))
            //{
            //    if (!System.IO.Directory.Exists(nssFolder))
            //    {
            //        Console.Error.WriteLine("Output nss folder " + nssFolder + " not found");
            //        return;
            //    }
            //}

            

            var baseArgs = GetArguments(baseConfig);

            var customArgs = GetArguments(buildConfig);

            Console.WriteLine("Building combinations");
            var combos = GetCombinations(customArgs, customArgs.Keys.ToList()).ToList();

            if (args.Any(a => a.Contains("--host")))
            {
                Console.WriteLine(combos.Count + " combinations build, hosting WCF");
                SimulationHost simhost = new SimulationHost(nssFolder, baseArgs, combos);
                ServiceHost host = new ServiceHost(simhost);
                host.Open();

                Console.Read();
            }
            else
            {
                RunCombinations(nssFolder, baseArgs, combos);
            }
        }

        private static void RunCombinations(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos)
        {
            int maxParallel;
            if (!int.TryParse(ConfigurationManager.AppSettings["maxParallel"], out maxParallel))
                maxParallel = Environment.ProcessorCount;
            TaskFactory factory = new TaskFactory(maxParallel, System.Threading.ThreadPriority.Normal);

            for (int idx = 0; idx < combos.Count; idx++)
            {
                var i = idx;
                factory.StartTask(() =>
                {
                    try
                    {
                        BuildSimulation(nssFolder, baseArgs, combos, i);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.Write("Error: " + ex.GetType().FullName + " - " + ex.Message + Environment.NewLine + ex.StackTrace);
                    }
                }, () =>
                {

                });
            }

            factory.WaitAll();
        }


        private static void BuildSimulation(string nssFolder, Dictionary<string, string> baseArgs, List<Dictionary<string, string>> combos, int i)
        {
            Console.WriteLine("Running simulation " + (i + 1) + "/" + combos.Count);


            var finalArguments = Merge(baseArgs, combos[i]);
            var name = string.Join("", combos[i].Select(p => p.Key.Replace("--", "") + p.Value)).Replace("\"", "");
            finalArguments["--NSSFile"] = "\"" + System.IO.Path.Combine(nssFolder, name + ".nss") + "\"";
            finalArguments["--Name"] = "\"" + name + "\"";
            // finalArguments["--VisualizerIP"] = "\"" + "\""; // no visualization 

            if (!System.IO.File.Exists(System.IO.Path.Combine(nssFolder, name + ".nss")))
            {
                Stopwatch sw = new Stopwatch();
                sw.Start();
                RunSimulation(finalArguments);
                sw.Stop();
                Console.WriteLine("Simulation " + (i + 1) + " took " + sw.ElapsedMilliseconds + "ms");
            }
            else
            {
                Console.WriteLine("Skipping simulation " + (i + 1) + " because the nss file was already present");
            }
        }

        private static void RunSimulation(Dictionary<string, string> args)
        {
            var argsStr = string.Join(" ", args.Select(p => p.Key + "=" + p.Value));

            ProcessStartInfo ps = new ProcessStartInfo()
            {
                FileName = ConfigurationManager.AppSettings["simulation"],
                Arguments = "\"" + argsStr.Replace("\"", "\\\"") + "\"",
                UseShellExecute = System.Environment.OSVersion.Platform == PlatformID.Unix ? false : true,
            };
            var proc = Process.Start(ps);
            if (proc != null)
            {
                proc.WaitForExit();
                proc.Dispose();
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

        private static IEnumerable<Dictionary<string, string>> GetCombinations(Dictionary<string, string> customArgs, List<string> keys, int i = 0)
        {
            if (i >= keys.Count)
            {
                yield return new Dictionary<string, string>();
                yield break;
            }

            var values = customArgs[keys[i]].Split(',');
            foreach (var val in values.Where(v => !string.IsNullOrEmpty(v)).Select(v => v.Replace("\"", "")))
            {

                var subCombinations = GetCombinations(customArgs, keys, i + 1);
                foreach (var subCombo in subCombinations)
                {
                    if (values.Contains("\""))
                        subCombo[keys[i]] = "\"" + val + "\"";
                    else
                        subCombo[keys[i]] = val;
                    yield return subCombo;
                }
            }
        }

        private static Dictionary<string, string> GetArguments(string file)
        {
            Dictionary<string, string> args = new Dictionary<string, string>();
            var lines = System.IO.File.ReadAllLines(file);
            foreach (var l in lines)
            {
                if (!string.IsNullOrWhiteSpace(l) && !l.Trim().StartsWith("#"))
                {
                    var parts = l.Split('=');
                    if (parts.Length >= 2)
                    {
                        string key = parts[0];
                        string value = l.Substring(key.Length + 1);
                        args[key] = value;
                    }
                }
            }
            return args;
        }
    }
}
