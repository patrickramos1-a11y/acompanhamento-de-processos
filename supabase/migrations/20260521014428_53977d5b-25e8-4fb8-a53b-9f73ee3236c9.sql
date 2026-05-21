DELETE FROM tramitacoes WHERE processo_id IN (SELECT id FROM processos WHERE empresa_id::text LIKE '22222222-%');
DELETE FROM processos WHERE empresa_id::text LIKE '22222222-%';
DELETE FROM empresas WHERE id::text LIKE '22222222-%';
DELETE FROM grupos_empresariais WHERE id::text LIKE '22222222-%';