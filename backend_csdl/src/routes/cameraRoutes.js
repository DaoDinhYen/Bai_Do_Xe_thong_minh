const router = require('express').Router();
const ctrl = require('../controllers/cameraController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// ANPR service sends detection (no auth needed from internal service, but use API key in production)
router.post('/detection',       ctrl.receiveDetection);
router.post('/detection/image', ctrl.updateDetectionImage);

const http = require('http');

// Proxy MJPEG stream from ANPR service (port 5000)
router.get('/stream/:direction', (req, res) => {
  const dir = req.params.direction.toLowerCase() === 'out' ? 'out' : 'in';
  const anprUrl = process.env.ANPR_SERVICE_URL || 'http://localhost:5000';
  const targetUrl = `${anprUrl}/stream/${dir}`;

  const proxyReq = http.get(targetUrl, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.status(503).json({ error: 'ANPR camera stream offline' });
  });

  req.on('close', () => {
    proxyReq.destroy();
  });
});

router.get('/stream_status', (req, res) => {
  const anprUrl = process.env.ANPR_SERVICE_URL || 'http://localhost:5000';
  const targetUrl = `${anprUrl}/status`;

  const proxyReq = http.get(targetUrl, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => { data += chunk; });
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  });

  proxyReq.on('error', () => {
    res.json({ status: 'OFFLINE' });
  });

  req.on('close', () => {
    proxyReq.destroy();
  });
});

// Admin
router.get('/',                 authenticate, requireAdmin, ctrl.getAllCameras);
router.get('/records',          authenticate, requireAdmin, ctrl.getRecords);
router.get('/records/latest',   authenticate, requireAdmin, ctrl.getLatestDetections);
router.post('/register',        authenticate, requireAdmin, ctrl.createCamera);

module.exports = router;
