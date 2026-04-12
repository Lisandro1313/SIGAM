-- Agregar estado PREPARADO al enum RemitoEstado (pre-borrador, sin artículos aún)
ALTER TYPE "RemitoEstado" ADD VALUE IF NOT EXISTS 'PREPARADO' BEFORE 'BORRADOR';
