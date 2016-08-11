using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.Linq;
using System.Text;
using RunTimeDebuggers.Helpers;

namespace SimulationBuilder
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length < 3)
            {
                Console.WriteLine("USAGE: SimulationBuilder baseConfiguration buildConfiguration nssFolder");
                return;
            }

            string baseConfig = args[0];
            string buildConfig = args[1];
            string nssFolder = args[2];

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
            if (!System.IO.Directory.Exists(nssFolder))
            {
                Console.Error.WriteLine("Output nss folder " + nssFolder + " not found");
                return;
            }


            var baseArgs = GetArguments(baseConfig);

            var customArgs = GetArguments(buildConfig);

            var combos = GetCombinations(customArgs, customArgs.Keys.ToList()).ToList();

            //ParallelOptions pOptions = new ParallelOptions() { MaxDegreeOfParallelism = 12 };
            //Parallel.For(0, combos.Count, pOptions, i =>
            //{

            TaskFactory factory = new TaskFactory(Environment.ProcessorCount, System.Threading.ThreadPriority.Normal);

            for (int idx = 0; idx < combos.Count; idx++)
            {
                var i = idx;
                factory.StartTask(() =>
                {
                    try
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
                            Console.WriteLine("Simulation " + (i+1) + " took " + sw.ElapsedMilliseconds + "ms");
                        }
                        else
                        {
                            Console.WriteLine("Skipping simulation " + (i + 1) + " because the nss file was already present");
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

            factory.WaitAll();
            //});

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
