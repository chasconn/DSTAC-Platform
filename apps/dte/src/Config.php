<?php

namespace Dstac\Dte;

// Lee la configuración del microservicio desde variables de entorno.
// Ninguna credencial vive en este repo: el certificado (.pfx) y los CAF
// se suben directamente al VPS, fuera de git (ver storage/.gitignore).
final class Config
{
    public static function ambiente(): string
    {
        // 'certificacion' (maullin, pruebas) o 'produccion' (palena, real)
        return getenv('SII_AMBIENTE') ?: 'certificacion';
    }

    public static function rutEmisor(): string
    {
        return getenv('SII_RUT_EMISOR') ?: '';
    }

    public static function razonSocial(): string
    {
        return getenv('SII_RAZON_SOCIAL') ?: '';
    }

    public static function certPath(): string
    {
        return getenv('SII_CERT_PATH') ?: __DIR__ . '/../storage/cert/certificado.pfx';
    }

    public static function certPassword(): string
    {
        return getenv('SII_CERT_PASS') ?: '';
    }

    public static function cafDir(): string
    {
        return getenv('SII_CAF_DIR') ?: __DIR__ . '/../storage/caf';
    }

    public static function authToken(): string
    {
        // Si está configurado, /emitir y /estado exigen Authorization: Bearer <token>.
        return getenv('DTE_SERVICE_TOKEN') ?: '';
    }
}
