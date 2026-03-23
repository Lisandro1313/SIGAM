-- Cambio de valor de secretaria: 'CITA' → 'AC' (Asistencia Crítica)
-- Afecta todas las tablas que tienen el campo secretaria

UPDATE "Beneficiario"       SET secretaria = 'AC' WHERE secretaria = 'CITA';
UPDATE "Remito"             SET secretaria = 'AC' WHERE secretaria = 'CITA';
UPDATE "Articulo"           SET secretaria = 'AC' WHERE secretaria = 'CITA';
UPDATE "EntregaProgramada"  SET secretaria = 'AC' WHERE secretaria = 'CITA';
UPDATE "Tarea"              SET secretaria = 'AC' WHERE secretaria = 'CITA';
UPDATE "Programa"           SET secretaria = 'AC' WHERE secretaria = 'CITA';
