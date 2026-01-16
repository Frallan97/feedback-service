-- Casbin authorization policies
INSERT INTO casbin_rule (ptype, v0, v1, v2) VALUES
    -- All authenticated users can view feedback
    ('p', 'user', '/api/v1/feedback', 'GET'),
    ('p', 'user', '/api/v1/feedback/*', 'GET'),
    ('p', 'user', '/api/v1/feedback/*/comments', '(GET)|(POST)'),

    -- Admin users can manage everything
    ('p', 'admin', '/api/v1/feedback', '(GET)|(POST)'),
    ('p', 'admin', '/api/v1/feedback/*', '(GET)|(PATCH)|(DELETE)'),
    ('p', 'admin', '/api/v1/applications', '(GET)|(POST)'),
    ('p', 'admin', '/api/v1/applications/*', '(GET)|(PATCH)|(DELETE)'),
    ('p', 'admin', '/api/v1/applications/*/categories', '(GET)|(POST)|(PATCH)|(DELETE)'),
    ('p', 'admin', '/api/v1/statistics', 'GET')
ON CONFLICT DO NOTHING;
