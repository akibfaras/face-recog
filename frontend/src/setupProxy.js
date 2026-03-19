const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Use 127.0.0.1 instead of localhost to avoid IPv6 issues on Windows
  app.use(
    '/api/user',
    createProxyMiddleware({
      target: 'http://127.0.0.1:9001',
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/api/user': '' },
    })
  );

  app.use(
    '/api/attendance',
    createProxyMiddleware({
      target: 'http://127.0.0.1:9002',
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/api/attendance': '' },
    })
  );

  app.use(
    '/api/recognition',
    createProxyMiddleware({
      target: 'http://127.0.0.1:9003',
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/api/recognition': '' },
    })
  );
};
