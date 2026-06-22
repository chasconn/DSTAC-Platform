<?php

namespace Dstac\Dte;

// Envoltorio sobre libredte/libredte-lib-core para timbrar y enviar un DTE
// al SII. Los métodos de la librería (carga de CAF, firma con el .pfx,
// armado del XML, envío SOAP) cambian entre versiones — sigue la
// documentación oficial (https://www.libredte.cl/docs) para completar el
// cuerpo de emitir(). Este esqueleto define el CONTRATO (entrada/salida)
// que espera apps/api/services/facturacion/dteClient.js, no la
// implementación interna de LibreDTE.
final class DteService
{
    /**
     * @param array $datos {
     *   tipo_dte: string,           // '33' factura, '39' boleta, etc.
     *   receptor: array{razon_social:string, rut:?string, giro:?string},
     *   items: array<array{descripcion:string, cantidad:int, precio_unitario:int}>,
     *   glosa: ?string,
     *   fecha_emision: string,      // 'YYYY-MM-DD'
     * }
     * @return array{folio:int, track_id:string, estado_sii:string, pdf_url:?string, xml_url:?string}
     */
    public function emitir(array $datos): array
    {
        if (!is_file(Config::certPath())) {
            throw new \RuntimeException('No se encontró el certificado digital en ' . Config::certPath() . '. Sube tu .pfx al VPS antes de emitir.');
        }
        if (!is_dir(Config::cafDir()) || count(glob(Config::cafDir() . '/*.xml')) === 0) {
            throw new \RuntimeException('No hay CAF (Código de Autorización de Folios) cargados en ' . Config::cafDir() . '. Descárgalos desde sii.cl para el tipo de documento ' . $datos['tipo_dte'] . '.');
        }

        // TODO (implementación real con libredte/libredte-lib-core):
        //   1. Cargar el CAF correspondiente al tipo_dte desde Config::cafDir().
        //   2. Armar el detalle del DTE (folio siguiente, receptor, ítems, IVA).
        //   3. Firmar el XML con el certificado (Config::certPath() + certPassword()).
        //   4. Enviar al SII (ambiente Config::ambiente()) y obtener el Track ID.
        //   5. Generar el PDF con representación impresa (timbre PDF417/TED).
        //   6. Devolver folio, track_id, estado_sii, pdf_url, xml_url.
        //
        // Mientras esto no esté implementado, se informa explícitamente en
        // vez de simular una emisión que no es válida ante el SII.
        throw new \RuntimeException('DteService::emitir() no está implementado todavía. Completa la integración con libredte/libredte-lib-core siguiendo https://www.libredte.cl/docs antes de usar este endpoint en producción.');
    }

    /**
     * Consulta el estado de un DTE ya enviado, por su Track ID.
     */
    public function estado(string $trackId): array
    {
        // TODO: usar el cliente de consulta de estado de LibreDTE / webservice
        // de consulta de estado del SII (QueryEstDte).
        throw new \RuntimeException('DteService::estado() no está implementado todavía.');
    }
}
