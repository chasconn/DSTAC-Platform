// Clasificador best-effort de tipo de dispositivo a partir del prefijo OUI de
// la MAC (primeros 3 bytes = fabricante de la tarjeta de red). Es heurístico:
// identifica el FABRICANTE del chip de red, no el tipo de equipo en sí — por
// eso "tipo" es una aproximación (ej. Apple puede ser notebook, celular o
// tablet) y nunca se presenta como 100% certero en el panel.
const OUI = {
  // Routers / redes
  '00:1A:2B': ['Cisco', 'router'], 'B8:27:EB': ['Raspberry Pi Foundation', 'iot'],
  'DC:A6:32': ['Raspberry Pi Foundation', 'iot'], 'E4:5F:01': ['Raspberry Pi Foundation', 'iot'],
  '00:0C:42': ['Ubiquiti/Mikrotik', 'router'], '24:A4:3C': ['Ubiquiti', 'router'],
  'F4:F2:6D': ['Ubiquiti', 'router'], '00:1D:AA': ['TP-Link', 'router'],
  '50:C7:BF': ['TP-Link', 'router'], 'C4:E9:84': ['TP-Link', 'router'],
  '00:09:5B': ['Netgear', 'router'], 'A0:40:A0': ['Netgear', 'router'],
  '00:1F:33': ['Netgear', 'router'], '00:14:6C': ['Netgear', 'router'],
  '20:E5:2A': ['Huawei', 'router'], '00:E0:FC': ['Huawei', 'router'],
  // Impresoras
  '00:00:48': ['HP', 'impresora'], '3C:D9:2B': ['HP', 'impresora'], '94:57:A5': ['HP', 'impresora'],
  '00:1B:A9': ['Canon', 'impresora'], '00:80:77': ['Canon', 'impresora'],
  '00:00:85': ['Epson', 'impresora'], '64:EB:8C': ['Epson', 'impresora'],
  '00:00:74': ['Ricoh', 'impresora'], '00:26:73': ['Brother', 'impresora'],
  // Celulares / tablets
  'AC:37:43': ['Apple', 'movil'], '3C:15:C2': ['Apple', 'movil'], 'F0:18:98': ['Apple', 'movil'],
  '00:1B:63': ['Apple', 'movil'], '04:0C:CE': ['Apple', 'movil'], 'A4:5E:60': ['Apple', 'movil'],
  '5C:F9:38': ['Samsung', 'movil'], '8C:79:67': ['Samsung', 'movil'], '34:23:BA': ['Samsung', 'movil'],
  '00:12:47': ['Samsung', 'movil'], 'BC:14:85': ['Xiaomi', 'movil'], '64:09:80': ['Xiaomi', 'movil'],
  // Computadores
  'F4:5C:89': ['Dell', 'computador'], '00:14:22': ['Dell', 'computador'], '18:DB:F2': ['Dell', 'computador'],
  '00:21:9B': ['Lenovo', 'computador'], '54:EE:75': ['Lenovo', 'computador'],
  '00:25:00': ['Intel', 'computador'], 'F0:DE:F1': ['Intel', 'computador'],
  '00:50:56': ['VMware (máquina virtual)', 'virtual'], '08:00:27': ['VirtualBox (máquina virtual)', 'virtual'],
  '00:1C:42': ['Parallels (máquina virtual)', 'virtual'], '52:54:00': ['QEMU/KVM (máquina virtual)', 'virtual'],
  // IoT / domótica / asistentes
  '44:65:0D': ['Amazon (Echo/Fire)', 'iot'], '68:54:FD': ['Amazon (Echo/Fire)', 'iot'],
  'F0:EF:86': ['Google (Nest/Chromecast)', 'iot'], '6C:AD:F8': ['Google (Nest/Chromecast)', 'iot'],
  '2C:F4:32': ['Espressif (ESP32/ESP8266)', 'iot'], '24:6F:28': ['Espressif (ESP32/ESP8266)', 'iot'],
  'A4:CF:12': ['Espressif (ESP32/ESP8266)', 'iot'],
  // Cámaras de seguridad
  '00:12:43': ['Hikvision (cámara)', 'camara'], '4C:11:BF': ['Hikvision (cámara)', 'camara'],
  '00:18:AE': ['Dahua (cámara)', 'camara'],
}

function clasificar(mac) {
  const oui = (mac || '').toUpperCase().slice(0, 8)
  const hit = OUI[oui]
  if (hit) return { vendor: hit[0], tipo: hit[1] }
  return { vendor: null, tipo: 'desconocido' }
}

module.exports = { clasificar }
