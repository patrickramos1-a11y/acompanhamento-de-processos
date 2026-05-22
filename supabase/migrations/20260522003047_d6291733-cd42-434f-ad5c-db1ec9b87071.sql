DELETE FROM etapas WHERE tipo_processo_id IN (SELECT id FROM tipos_processo WHERE id::text LIKE '33333333-%');
DELETE FROM tipos_processo WHERE id::text LIKE '33333333-%';