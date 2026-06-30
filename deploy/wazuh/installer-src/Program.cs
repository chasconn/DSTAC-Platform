using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.ServiceProcess;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace DstacEdrInstaller
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            // Forzar TLS 1.2 ANTES de cualquier llamada HTTPS (carga de empresas,
            // descarga del MSI, registro). .NET Framework no siempre habilita TLS 1.2
            // por defecto segun el OS, y portal.dstac.cl solo acepta TLS 1.2+, lo que
            // causaba "No se puede crear un canal seguro SSL/TLS" en la primera llamada.
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        // ===== Configuracion DSTAC =====
        private const string Manager = "2.25.183.242";
        private const string MsiUrl = "https://portal.dstac.cl/installers/wazuh-agent-4.14.5-1.msi";
        private const string ApiBase = "https://portal.dstac.cl/api/edr";
        // ================================

        private readonly string _enrollPass;
        private readonly string _edrKey;
        private readonly Dictionary<string, string> _empresaMap = new Dictionary<string, string>();

        private PictureBox picLogo;
        private Label lblEyebrow, lblTitulo, lblSub, lblEmpresa, lblEmpresaEstado, lblNombre, lblLog;
        private ComboBox comboEmpresa;
        private TextBox txtNombre, txtLog;
        private Button btnInstalar;

        // Misma paleta que portal.dstac.cl/installers (fondo oscuro, acento morado DSTAC).
        private static readonly Color ColFondo = Color.FromArgb(5, 5, 8);
        private static readonly Color ColPanel = Color.FromArgb(12, 12, 22);
        private static readonly Color ColBorde = Color.FromArgb(31, 31, 42);
        private static readonly Color ColTexto = Color.White;
        private static readonly Color ColSub = Color.FromArgb(154, 160, 171);
        private static readonly Color ColAcento = Color.FromArgb(123, 77, 255);
        private static readonly Color ColAcentoClaro = Color.FromArgb(169, 139, 255);
        private static readonly Color ColAviso = Color.FromArgb(230, 120, 80);

        public MainForm()
        {
            string envPass = Environment.GetEnvironmentVariable("WAZUH_ENROLL_PASSWORD");
            _enrollPass = string.IsNullOrEmpty(envPass) ? "dc36d4d470f23469a0b8613dc62351a0" : envPass;
            string envKey = Environment.GetEnvironmentVariable("EDR_WEBHOOK_SECRET");
            _edrKey = string.IsNullOrEmpty(envKey) ? "e2080355efb4666a64a24288afe29172b5de93733c07373a" : envKey;

            BuildUi();
            this.Shown += delegate { Task.Run((Action)LoadEmpresas); };
        }

        // Carga el logo de DSTAC embebido como recurso del ensamblado (no depende de
        // ningun archivo externo ni de descargarlo por red).
        private static Image CargarLogo()
        {
            try
            {
                System.Reflection.Assembly asm = System.Reflection.Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("DstacEdrInstaller.logo.png"))
                {
                    if (s == null) return null;
                    return Image.FromStream(s);
                }
            }
            catch { return null; }
        }

        private void BuildUi()
        {
            this.Text = "DSTAC EDR - Instalador de agente";
            this.ClientSize = new Size(460, 560);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.AutoScaleMode = AutoScaleMode.None;
            this.Font = new Font("Segoe UI", 9);
            this.BackColor = ColFondo;

            Image logo = CargarLogo();
            if (logo != null)
            {
                picLogo = new PictureBox();
                picLogo.Image = logo;
                picLogo.SizeMode = PictureBoxSizeMode.Zoom;
                int alturaLogo = 34;
                int anchoLogo = (int)(logo.Width * (alturaLogo / (double)logo.Height));
                picLogo.Location = new Point(25, 24);
                picLogo.Size = new Size(anchoLogo, alturaLogo);
                this.Controls.Add(picLogo);
                try { this.Icon = Icon.FromHandle(((Bitmap)logo).GetHicon()); } catch { }
            }

            lblEyebrow = new Label();
            lblEyebrow.Text = "EDR · WAZUH";
            lblEyebrow.Font = new Font("Segoe UI", 7.5f, FontStyle.Bold);
            lblEyebrow.ForeColor = ColAcentoClaro;
            lblEyebrow.Location = new Point(25, 68);
            lblEyebrow.Size = new Size(200, 18);
            this.Controls.Add(lblEyebrow);

            lblTitulo = new Label();
            lblTitulo.Text = "Instalador de agente";
            lblTitulo.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            lblTitulo.ForeColor = ColTexto;
            lblTitulo.Location = new Point(25, 88);
            lblTitulo.Size = new Size(410, 32);
            this.Controls.Add(lblTitulo);

            lblSub = new Label();
            lblSub.Text = "Protege este equipo con DSTAC EDR en un par de pasos.";
            lblSub.Font = new Font("Segoe UI", 9);
            lblSub.Location = new Point(25, 122);
            lblSub.Size = new Size(410, 20);
            lblSub.ForeColor = ColSub;
            this.Controls.Add(lblSub);

            lblEmpresa = new Label();
            lblEmpresa.Text = "Empresa:";
            lblEmpresa.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblEmpresa.ForeColor = ColTexto;
            lblEmpresa.Location = new Point(25, 160);
            lblEmpresa.Size = new Size(200, 20);
            this.Controls.Add(lblEmpresa);

            comboEmpresa = new ComboBox();
            comboEmpresa.Location = new Point(25, 183);
            comboEmpresa.Size = new Size(410, 26);
            comboEmpresa.Font = new Font("Segoe UI", 10);
            comboEmpresa.DropDownStyle = ComboBoxStyle.DropDown;
            comboEmpresa.BackColor = Color.White;
            this.Controls.Add(comboEmpresa);

            lblEmpresaEstado = new Label();
            lblEmpresaEstado.Text = "Cargando lista de empresas...";
            lblEmpresaEstado.Font = new Font("Segoe UI", 8);
            lblEmpresaEstado.ForeColor = ColSub;
            lblEmpresaEstado.Location = new Point(25, 212);
            lblEmpresaEstado.Size = new Size(410, 32);
            this.Controls.Add(lblEmpresaEstado);

            lblNombre = new Label();
            lblNombre.Text = "Nombre para identificar este equipo:";
            lblNombre.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            lblNombre.ForeColor = ColTexto;
            lblNombre.Location = new Point(25, 252);
            lblNombre.Size = new Size(410, 20);
            this.Controls.Add(lblNombre);

            txtNombre = new TextBox();
            txtNombre.Location = new Point(25, 275);
            txtNombre.Size = new Size(410, 26);
            txtNombre.Font = new Font("Segoe UI", 10);
            txtNombre.BackColor = Color.White;
            txtNombre.Text = Environment.MachineName;
            this.Controls.Add(txtNombre);

            btnInstalar = new Button();
            btnInstalar.Text = "Instalar";
            btnInstalar.Location = new Point(25, 318);
            btnInstalar.Size = new Size(410, 42);
            btnInstalar.Font = new Font("Segoe UI", 11, FontStyle.Bold);
            btnInstalar.FlatStyle = FlatStyle.Flat;
            btnInstalar.BackColor = ColAcento;
            btnInstalar.ForeColor = Color.White;
            btnInstalar.FlatAppearance.BorderSize = 0;
            btnInstalar.FlatAppearance.MouseOverBackColor = ColAcentoClaro;
            btnInstalar.Click += BtnInstalar_Click;
            this.Controls.Add(btnInstalar);

            lblLog = new Label();
            lblLog.Text = "Detalle:";
            lblLog.Font = new Font("Segoe UI", 8, FontStyle.Bold);
            lblLog.ForeColor = ColSub;
            lblLog.Location = new Point(25, 372);
            lblLog.Size = new Size(200, 18);
            this.Controls.Add(lblLog);

            txtLog = new TextBox();
            txtLog.Location = new Point(25, 393);
            txtLog.Size = new Size(410, 145);
            txtLog.Multiline = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.ReadOnly = true;
            txtLog.Font = new Font("Consolas", 9);
            txtLog.BackColor = ColPanel;
            txtLog.ForeColor = Color.FromArgb(180, 220, 180);
            txtLog.BorderStyle = BorderStyle.FixedSingle;
            this.Controls.Add(txtLog);
        }

        private void Log(string msg)
        {
            if (this.InvokeRequired) { this.Invoke((Action)(() => Log(msg))); return; }
            txtLog.AppendText(msg + Environment.NewLine);
            txtLog.SelectionStart = txtLog.Text.Length;
            txtLog.ScrollToCaret();
        }

        private void SetEmpresaEstado(string texto, bool esError)
        {
            if (this.InvokeRequired) { this.Invoke((Action)(() => SetEmpresaEstado(texto, esError))); return; }
            lblEmpresaEstado.Text = texto;
            lblEmpresaEstado.ForeColor = esError ? ColAviso : ColSub;
        }

        private void Fail(string msg)
        {
            if (this.InvokeRequired) { this.Invoke((Action)(() => Fail(msg))); return; }
            Log("ERROR: " + msg);
            MessageBox.Show(msg, "DSTAC EDR - Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            btnInstalar.Enabled = true;
        }

        // Carga la lista de empresas activas desde el portal (slug+nombre) para
        // poblar el selector. Si falla, muestra el motivo real (no en silencio).
        private void LoadEmpresas()
        {
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

                List<string> slugs = new List<string>();
                List<string> names = new List<string>();
                foreach (Match m in Regex.Matches(body, "\"slug\":\"(?<v>[^\"]*)\""))  slugs.Add(m.Groups["v"].Value);
                foreach (Match m in Regex.Matches(body, "\"name\":\"(?<v>[^\"]*)\""))  names.Add(m.Groups["v"].Value);

                if (this.InvokeRequired) { this.Invoke((Action)(() => PopularEmpresas(slugs, names))); }
                else { PopularEmpresas(slugs, names); }
            }
            catch (Exception ex)
            {
                SetEmpresaEstado("No se pudo cargar la lista (" + ex.Message + "). Escribe el nombre/slug de la empresa.", true);
            }
        }

        private void PopularEmpresas(List<string> slugs, List<string> names)
        {
            int n = Math.Min(slugs.Count, names.Count);
            if (n == 0)
            {
                SetEmpresaEstado("No se pudo cargar la lista (respuesta vacia). Escribe el nombre/slug de la empresa.", true);
                return;
            }
            for (int i = 0; i < n; i++)
            {
                comboEmpresa.Items.Add(names[i]);
                _empresaMap[names[i]] = slugs[i];
            }
            comboEmpresa.SelectedIndex = 0;
            SetEmpresaEstado(n + " empresa(s) disponible(s).", false);
        }

        private void BtnInstalar_Click(object sender, EventArgs e)
        {
            btnInstalar.Enabled = false;
            txtLog.Clear();

            string nombreEquipo = txtNombre.Text.Trim();
            if (string.IsNullOrEmpty(nombreEquipo)) nombreEquipo = Environment.MachineName;
            nombreEquipo = Regex.Replace(nombreEquipo, @"\s", "_");
            nombreEquipo = Regex.Replace(nombreEquipo, @"[^A-Za-z0-9_.-]", "");
            if (string.IsNullOrEmpty(nombreEquipo)) nombreEquipo = Environment.MachineName;

            string empresaTexto = comboEmpresa.Text.Trim();
            string empresaSlug = null;
            if (_empresaMap.ContainsKey(empresaTexto)) empresaSlug = _empresaMap[empresaTexto];
            else if (!string.IsNullOrEmpty(empresaTexto)) empresaSlug = empresaTexto;

            if (string.IsNullOrEmpty(empresaSlug))
            {
                Fail("Selecciona o escribe una empresa valida.");
                return;
            }

            Task.Run(() => DoInstall(nombreEquipo, empresaSlug));
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

        private void DoInstall(string nombreEquipo, string empresaSlug)
        {
            try
            {
                Log("Equipo:  " + nombreEquipo);
                Log("Empresa: " + empresaSlug);
                Log("Manager: " + Manager);
                Log("");

                Log("Verificando conectividad...");
                foreach (int p in new[] { 1514, 1515 })
                {
                    if (TcpCheck(Manager, p, 4000)) Log("  puerto " + p + " alcanzable");
                    else throw new Exception("No se alcanza " + Manager + ":" + p + " - revisa el firewall de salida.");
                }

                string msi = Path.Combine(Path.GetTempPath(), "wazuh-agent-dstac.msi");
                Log("Descargando el agente (~6 MB)...");
                using (WebClient wc = new WebClient())
                {
                    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                    wc.DownloadFile(MsiUrl, msi);
                }
                Log("  descarga completa");

                Log("Instalando y enrolando (puede tardar 10-30s)...");
                string mArgs = "/i \"" + msi + "\" /q WAZUH_MANAGER=\"" + Manager + "\" WAZUH_REGISTRATION_PASSWORD=\"" + _enrollPass + "\" WAZUH_AGENT_NAME=\"" + nombreEquipo + "\"";
                System.Diagnostics.ProcessStartInfo psi = new System.Diagnostics.ProcessStartInfo("msiexec.exe", mArgs);
                psi.UseShellExecute = true;
                System.Diagnostics.Process proc = System.Diagnostics.Process.Start(psi);
                proc.WaitForExit();
                if (proc.ExitCode != 0) throw new Exception("La instalacion fallo (msiexec codigo " + proc.ExitCode + ").");
                Log("  msiexec OK");

                string conf = @"C:\Program Files (x86)\ossec-agent\ossec.conf";
                if (File.Exists(conf))
                {
                    string c = File.ReadAllText(conf);
                    if (!c.Contains("dstac_company"))
                    {
                        string label = "  <labels>\r\n    <label key=\"dstac_company\">" + empresaSlug + "</label>\r\n  </labels>\r\n</ossec_config>";
                        c = c.Replace("</ossec_config>", label);
                        File.WriteAllText(conf, c, Encoding.ASCII);
                    }
                }

                // Descubrimiento pasivo de red (tabla ARP, sin generar trafico): el panel
                // EDR del portal muestra TODOS los dispositivos de la red. Corre cada
                // minuto via wodle "command" (script PowerShell invocado por el agente).
                string scanDir = @"C:\Program Files (x86)\ossec-agent\active-response\bin";
                Directory.CreateDirectory(scanDir);
                string scanScript = Path.Combine(scanDir, "dstac-network-scan.ps1");
                string netscan =
                    "function Resolver-Nombre($ip) {\r\n" +
                    "  try { return ([System.Net.Dns]::GetHostEntry($ip)).HostName } catch { return $null }\r\n" +
                    "}\r\n" +
                    "function Es-BroadcastOMulticast($ip, $mac) {\r\n" +
                    "  if ($ip.EndsWith(\".255\")) { return $true }\r\n" +
                    "  $primerOcteto = [int]($ip.Split(\".\")[0])\r\n" +
                    "  if ($primerOcteto -ge 224 -and $primerOcteto -le 239) { return $true }\r\n" +
                    "  if ($mac -like \"01:00:5E:*\" -or $mac -like \"33:33:*\" -or $mac -eq \"FF:FF:FF:FF:FF:FF\") { return $true }\r\n" +
                    "  return $false\r\n" +
                    "}\r\n" +
                    "$items = @()\r\n" +
                    "try {\r\n" +
                    "  Get-NetNeighbor -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.LinkLayerAddress -match \"^[0-9a-fA-F]{2}(-[0-9a-fA-F]{2}){5}$\" } | ForEach-Object {\r\n" +
                    "    $mac = ($_.LinkLayerAddress -replace \"-\", \":\").ToUpper()\r\n" +
                    "    if (Es-BroadcastOMulticast $_.IPAddress $mac) { return }\r\n" +
                    "    $obj = [PSCustomObject]@{ ip = $_.IPAddress; mac = $mac }\r\n" +
                    "    $host_ = Resolver-Nombre $_.IPAddress\r\n" +
                    "    if ($host_) { $obj | Add-Member -NotePropertyName hostname -NotePropertyValue $host_ }\r\n" +
                    "    $items += $obj\r\n" +
                    "  }\r\n" +
                    "} catch {\r\n" +
                    "  arp -a | Select-String \"(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\s+([0-9a-fA-F-]{17})\" | ForEach-Object {\r\n" +
                    "    $ip = $_.Matches[0].Groups[1].Value\r\n" +
                    "    $mac = ($_.Matches[0].Groups[2].Value -replace \"-\", \":\").ToUpper()\r\n" +
                    "    if (Es-BroadcastOMulticast $ip $mac) { return }\r\n" +
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

                Log("Verificando el servicio...");
                ServiceController svc = FindService(new[] { "WazuhSvc", "Wazuh", "OssecSvc" });
                if (svc != null && svc.Status != ServiceControllerStatus.Running)
                {
                    try { svc.Start(); svc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(10)); }
                    catch { }
                    svc.Refresh();
                }
                if (svc == null) throw new Exception("No se encontro el servicio de Wazuh tras la instalacion.");
                if (svc.Status != ServiceControllerStatus.Running) throw new Exception("El servicio '" + svc.ServiceName + "' quedo en estado '" + svc.Status + "', no 'Running'.");
                Log("  servicio activo (" + svc.ServiceName + ": Running)");

                Log("Registrando en el portal...");
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
                            string json = "{\"wazuh_id\":\"" + JsonEscape(agentId) + "\",\"agent_name\":\"" + JsonEscape(nombreEquipo) + "\",\"agent_ip\":\"" + JsonEscape(ip) + "\",\"dstac_company\":\"" + JsonEscape(empresaSlug) + "\"}";
                            byte[] data = Encoding.UTF8.GetBytes(json);

                            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(ApiBase + "/agentes/registrar");
                            req.Method = "POST";
                            req.ContentType = "application/json";
                            req.Headers["x-edr-key"] = _edrKey;
                            req.Timeout = 10000;
                            req.ContentLength = data.Length;
                            using (Stream s = req.GetRequestStream()) { s.Write(data, 0, data.Length); }
                            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse()) { /* 200 esperado */ }
                            Log("  agente registrado en el portal");
                        }
                        else
                        {
                            Log("  aviso: no se pudo leer el ID del agente; aparecera al recibir su primera alerta");
                        }
                    }
                }
                catch (Exception ex2)
                {
                    Log("  aviso: no se pudo confirmar el registro en el portal (" + ex2.Message + ")");
                }

                Log("");
                Log("Listo. Agente '" + nombreEquipo + "' instalado y asignado a '" + empresaSlug + "'.");
                if (this.InvokeRequired)
                {
                    this.Invoke((Action)(() =>
                    {
                        MessageBox.Show("Instalacion completa.\n\nEl equipo '" + nombreEquipo + "' ya esta protegido por DSTAC EDR.", "DSTAC EDR", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        btnInstalar.Text = "Instalado";
                    }));
                }
            }
            catch (Exception ex)
            {
                Fail(ex.Message);
            }
        }

        private static ServiceController FindService(string[] names)
        {
            foreach (string n in names)
            {
                try
                {
                    ServiceController c = new ServiceController(n);
                    ServiceControllerStatus s = c.Status; // lanza si no existe
                    return c;
                }
                catch { }
            }
            return null;
        }
    }
}
