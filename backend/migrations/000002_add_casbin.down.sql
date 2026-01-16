DELETE FROM casbin_rule WHERE v1 LIKE '/api/v1/feedback%' OR v1 LIKE '/api/v1/applications%' OR v1 = '/api/v1/statistics';
