<?php

require __DIR__ . '/../vendor/autoload.php';

use Dstac\Dte\Config;
use Dstac\Dte\DteService;

header('Content-Type: application/json; charset=utf-8');

function jsonInput(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function jsonOut(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// Autenticación simple por token compartido (DTE_SERVICE_TOKEN), si está configurado.
$token = Config::authToken();
if ($token !== '') {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header !== "Bearer {$token}") {
        jsonOut(['error' => 'No autorizado'], 401);
    }
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET' && $path === '/salud') {
        jsonOut(['ok' => true, 'ambiente' => Config::ambiente()]);
    }

    if ($method === 'POST' && $path === '/emitir') {
        $service = new DteService();
        jsonOut($service->emitir(jsonInput()));
    }

    if ($method === 'GET' && preg_match('#^/estado/([\w-]+)$#', $path, $m)) {
        $service = new DteService();
        jsonOut($service->estado($m[1]));
    }

    jsonOut(['error' => 'Ruta no encontrada'], 404);
} catch (\Throwable $e) {
    jsonOut(['error' => $e->getMessage()], 422);
}
