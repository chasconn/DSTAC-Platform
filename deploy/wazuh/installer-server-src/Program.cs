using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.ServiceProcess;
using System.Text;
using System.Text.RegularExpressions;

namespace DstacEdrInstallerServer
{
    internal static class Program
    {
        // ===== Configuracion DSTAC =====
        private const string Manager = "2.25.183.242";
        private const string MsiUrl = "https://portal.dstac.cl/installers/wazuh-agent-4.14.5-1.msi";
        private const string ApiBase = "https://portal.dstac.cl/api/edr";
        // ================================

        private static string _enrollPass;
        private static string _edrKey;

        private static int Main(string[] args)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            string envPass = Environment.GetEnvironmentVariable("WAZUH_ENROLL_PASSWORD");
            _enrollPass = string.IsNullOrEmpty(envPass) ? "dc36d4d470f23469a0b8613dc62351a0" : envPass;
            string envKey = Environment.GetEnvironmentVariable("EDR_WEBHOOK_SECRET");
            _edrKey = string.IsNullOrEmpty(envKey) ? "e2080355efb4666a64a24288afe29172b5de93733c07373a" : envKey;

            string nombre = GetArg(args, "-Nombre");
            string empresa = GetArg(args, "-Empresa");
            string grupo = GetArg(args, "-Grupo");

            WriteColor("==============================================", ConsoleColor.Cyan);
            WriteColor("  DSTAC EDR - Instalador de agente (Windows Server)", ConsoleColor.Cyan);
            WriteColor("==============================================", ConsoleColor.Cyan);
            Console.WriteLine();

            if (string.IsNullOrEmpty(nombre))
            {
                Console.Write("Nombre para identificar este equipo [" + Environment.MachineName + "]: ");
                string resp = Console.ReadLine();
                nombre = string.IsNullOrEmpty(resp) ? Environment.MachineName : resp;
            }
            nombre = Regex.Replace(nombre, @"\s", "_");
            nombre = Regex.Replace(nombre, @"[^A-Za-z0-9_.-]", "");
            if (string.IsNullOrEmpty(nombre)) nombre = Environment.MachineName;

            if (string.IsNullOrEmpty(empresa))
            {
                List<string> slugs, names;
                LoadEmpresas(out slugs, out names);
                if (slugs.Count > 0)
                {
                    Console.WriteLine();
                    Console.WriteLine("Empresas disponibles:");
                    for (int i = 0; i < slugs.Count; i++) Console.WriteLine("  " + (i + 1) + ") " + names[i] + " (" + slugs[i] + ")");
                    Console.Write("Elige un numero o escribe el slug de la empresa: ");
                    string resp = Console.ReadLine();
                    int idx;
                    if (int.TryParse(resp, out idx) && idx >= 1 && idx <= slugs.Count) empresa = slugs[idx - 1];
                    else empresa = resp;
                }
                else
                {
                    Console.Write("No se pudo cargar la lista de empresas. Escribe el slug de la empresa: ");
                    empresa = Console.ReadLine();
                }
            }

            if (string.IsNullOrEmpty(empresa)) Die("Falta la empresa. No se puede continuar sin asignarla.");

            Console.WriteLine();
            Console.WriteLine("Equipo:  " + nombre);
            Console.WriteLine("Empresa: " + empresa);
            Console.WriteLine("Manager: " + Manager);
            if (!string.IsNullOrEmpty(grupo)) Console.WriteLine("Grupo:   " + grupo);
            Console.WriteLine();

            try
            {
                Console.WriteLine("Verificando conectividad...");
                foreach (int p in new[] { 1514, 1515 })
                {
                    if (TcpCheck(Manager, p, 4000)) WriteColor("  puerto " + p + " alcanzable", ConsoleColor.Green);
                    else Die("  No se alcanza " + Manager + ":" + p + " - revisa el firewall de salida (frecuente en servidores).");
                }

                string msi = Path.Combine(Path.GetTempPath(), "wazuh-agent-dstac.msi");
                Console.WriteLine("Descargando el agente (~6 MB)...");
                using (WebClient wc = new WebClient()) { wc.DownloadFile(MsiUrl, msi); }
                WriteColor("  descarga completa", ConsoleColor.Green);

                Console.WriteLine("Instalando y enrolando (puede tardar 10-30s)...");
                string mArgs = "/i \"" + msi + "\" /q WAZUH_MANAGER=\"" + Manager + "\" WAZUH_REGISTRATION_PASSWORD=\"" + _enrollPass + "\" WAZUH_AGENT_NAME=\"" + nombre + "\"";
                if (!string.IsNullOrEmpty(grupo)) mArgs += " WAZUH_AGENT_GROUP=\"" + grupo + "\"";
                System.Diagnostics.ProcessStartInfo psi = new System.Diagnostics.ProcessStartInfo("msiexec.exe", mArgs);
                psi.UseShellExecute = true;
                System.Diagnostics.Process proc = System.Diagnostics.Process.Start(psi);
                proc.WaitForExit();
                if (proc.ExitCode != 0) Die("La instalacion fallo (msiexec codigo " + proc.ExitCode + ").");
                WriteColor("  msiexec OK", ConsoleColor.Green);

                string conf = @"C:\Program Files (x86)\ossec-agent\ossec.conf";
                if (File.Exists(conf))
                {
                    string c = File.ReadAllText(conf);
                    if (!c.Contains("dstac_company"))
                    {
                        string label = "  <labels>\r\n    <label key=\"dstac_company\">" + empresa + "</label>\r\n  </labels>\r\n</ossec_config>";
                        c = c.Replace("</ossec_config>", label);
                        File.WriteAllText(conf, c, Encoding.ASCII);
                    }
                }

                string scanDir = @"C:\Program Files (x86)\ossec-agent\active-response\bin";
                Directory.CreateDirectory(scanDir);
                string scanScript = Path.Combine(scanDir, "dstac-network-scan.ps1");
                string netscan =
                    "function Resolver-Nombre($ip) {\r\n" +
                    "  try { return ([System.Net.Dns]::GetHostEntry($ip)).HostName } catch { return $null }\r\n" +
                    "}\r\n" +
                    "$items = @()\r\n" +
                    "try {\r\n" +
                    "  Get-NetNeighbor -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.LinkLayerAddress -match \"^[0-9a-fA-F]{2}(-[0-9a-fA-F]{2}){5}$\" } | ForEach-Object {\r\n" +
                    "    $mac = ($_.LinkLayerAddress -replace \"-\", \":\").ToUpper()\r\n" +
                    "    $obj = [PSCustomObject]@{ ip = $_.IPAddress; mac = $mac }\r\n" +
                    "    $host_ = Resolver-Nombre $_.IPAddress\r\n" +
                    "    if ($host_) { $obj | Add-Member -NotePropertyName hostname -NotePropertyValue $host_ }\r\n" +
                    "    $items += $obj\r\n" +
                    "  }\r\n" +
                    "} catch {\r\n" +
                    "  arp -a | Select-String \"(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\s+([0-9a-fA-F-]{17})\" | ForEach-Object {\r\n" +
                    "    $ip = $_.Matches[0].Groups[1].Value\r\n" +
                    "    $mac = ($_.Matches[0].Groups[2].Value -replace \"-\", \":\").ToUpper()\r\n" +
                    "    $obj = [PSCustomObject]@{ ip = $ip; mac = $mac }\r\n" +
                    "    $host_ = Resolver-Nombre $ip\r\n" +
                    "    if ($host_) { $obj | Add-Member -NotePropertyName hostname -NotePropertyValue $host_ }\r\n" +
                    "    $items += $obj\r\n" +
                    "  }\r\n" +
                    "}\r\n" +
                    "$json = if ($items) { ($items | ConvertTo-Json -Compress) } else { \"[]\" }\r\n" +
                    "Write-Output \"DSTAC_NETSCAN {`\"items`\":$json}\"\r\n";
                File.WriteAllText(scanScript, netscan, Encoding.ASCII);

                if (File.Exists(conf))
                {
                    string c = File.ReadAllText(conf);
                    if (!c.Contains("dstac_netscan"))
                    {
                        string wodle = "  <wodle name=\"command\">\r\n    <disabled>no</disabled>\r\n    <tag>dstac_netscan</tag>\r\n    <command>powershell.exe -ExecutionPolicy Bypass -File \"" + scanScript + "\"</command>\r\n    <interval>1m</interval>\r\n    <ignore_output>no</ignore_output>\r\n    <run_on_start>yes</run_on_start>\r\n    <timeout>45</timeout>\r\n  </wodle>\r\n</ossec_config>";
                        c = c.Replace("</ossec_config>", wodle);
                        File.WriteAllText(conf, c, Encoding.ASCII);
                    }
                }

                Console.WriteLine("Verificando el servicio...");
                ServiceController svc = FindService(new[] { "WazuhSvc", "Wazuh", "OssecSvc" });
                if (svc != null && svc.Status != ServiceControllerStatus.Running)
                {
                    try { svc.Start(); svc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(10)); }
                    catch { }
                    svc.Refresh();
                }
                if (svc == null) Die("No se encontro el servicio de Wazuh tras la instalacion (WazuhSvc/Wazuh/OssecSvc). Revisa manualmente.");
                if (svc.Status != ServiceControllerStatus.Running) Die("El servicio '" + svc.ServiceName + "' quedo en estado '" + svc.Status + "', no 'Running'.");
                WriteColor("  servicio activo (" + svc.ServiceName + ": Running)", ConsoleColor.Green);

                Console.WriteLine("Registrando en el portal...");
                try
                {
                    string clientKeys = @"C:\Program Files (x86)\ossec-agent\client.keys";
                    if (File.Exists(clientKeys))
                    {
                        string firstLine = File.ReadAllLines(clientKeys)[0];
                        string agentId = firstLine.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)[0];
                        if (Regex.IsMatch(agentId, "^[0-9]+$"))
                        {
                            string ip = "";
                            foreach (IPAddress a in Dns.GetHostAddresses(Dns.GetHostName()))
                            {
                                if (a.AddressFamily == AddressFamily.InterNetwork) { ip = a.ToString(); break; }
                            }
                            string json = "{\"wazuh_id\":\"" + JsonEscape(agentId) + "\",\"agent_name\":\"" + JsonEscape(nombre) + "\",\"agent_ip\":\"" + JsonEscape(ip) + "\",\"dstac_company\":\"" + JsonEscape(empresa) + "\"}";
                            byte[] data = Encoding.UTF8.GetBytes(json);

                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(ApiBase + "/agentes/registrar");
                            req.Method = "POST";
                            req.ContentType = "application/json";
                            req.Headers["x-edr-key"] = _edrKey;
                            req.Timeout = 10000;
                            req.ContentLength = data.Length;
                            using (Stream s = req.GetRequestStream()) { s.Write(data, 0, data.Length); }
                            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) { }
                            WriteColor("  agente registrado en el portal", ConsoleColor.Green);
                        }
                    }
                }
                catch (Exception ex2)
                {
                    Console.WriteLine("  aviso: no se pudo confirmar el registro en el portal (" + ex2.Message + ")");
                }

                Console.WriteLine();
                WriteColor("==============================================", ConsoleColor.Green);
                WriteColor("  Agente '" + nombre + "' instalado y activo, asignado a '" + empresa + "'", ConsoleColor.Green);
                WriteColor("==============================================", ConsoleColor.Green);
                return 0;
            }
            catch (Exception ex)
            {
                Die(ex.Message);
                return 1;
            }
        }

        private static string GetArg(string[] args, string name)
        {
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
            }
            return null;
        }

        private static void LoadEmpresas(out List<string> slugs, out List<string> names)
        {
            slugs = new List<string>();
            names = new List<string>();
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(ApiBase + "/empresas");
                req.Headers["x-edr-key"] = _edrKey;
                req.Timeout = 8000;
                string body;
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                using (StreamReader sr = new StreamReader(resp.GetResponseStream()))
                {
                    body = sr.ReadToEnd();
                }
                foreach (Match m in Regex.Matches(body, "\"slug\":\"(?<v>[^\"]*)\"")) slugs.Add(m.Groups["v"].Value);
                foreach (Match m in Regex.Matches(body, "\"name\":\"(?<v>[^\"]*)\"")) names.Add(m.Groups["v"].Value);
            }
            catch { }
        }

        private static bool TcpCheck(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient tcp = new TcpClient())
                {
                    IAsyncResult ar = tcp.BeginConnect(host, port, null, null);
                    bool ok = ar.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!ok) return false;
                    tcp.EndConnect(ar);
                    return tcp.Connected;
                }
            }
            catch { return false; }
        }

        private static string JsonEscape(string s)
        {
            if (s == null) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"");
        }

        private static ServiceController FindService(string[] names)
        {
            foreach (string n in names)
            {
                try
                {
                    ServiceController c = new ServiceController(n);
                    ServiceControllerStatus s = c.Status;
                    return c;
                }
                catch { }
            }
            return null;
        }

        private static void WriteColor(string msg, ConsoleColor color)
        {
            ConsoleColor prev = Console.ForegroundColor;
            Console.ForegroundColor = color;
            Console.WriteLine(msg);
            Console.ForegroundColor = prev;
        }

        private static void Die(string msg)
        {
            WriteColor(msg, ConsoleColor.Red);
            Console.WriteLine();
            WriteColor("Presiona ENTER para cerrar...", ConsoleColor.Yellow);
            Console.ReadLine();
            Environment.Exit(1);
        }
    }
}
