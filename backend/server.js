const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const app = express();
const port = 5000;

// In-memory store for URLs and analytics
const urlStore = {};
const analyticsStore = {};

// Logging Middleware
const loggingMiddleware = (req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers,
  };
  
  fs.appendFileSync('logs.txt', `${JSON.stringify(logEntry)}\n`);
  
  const originalSend = res.send;
  res.send = function (body) {
    fs.appendFileSync('logs.txt', `Response: ${JSON.stringify({ status: res.statusCode, body })}\n`);
    originalSend.call(this, body);
  };
  
  next();
};

app.use(cors());
app.use(express.json());
app.use(loggingMiddleware);

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener Microservice API', status: 'running' });
});

// Generate unique shortcode
const generateShortcode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return urlStore[code] ? generateShortcode() : code;
};

// Validate URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// POST /shorturls - Create Short URL
app.post('/shorturls', (req, res) => {
  const { url, validity = 30, shortcode } = req.body;
  
  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  if (validity <= 0) {
    return res.status(400).json({ error: 'Validity must be positive' });
  }
  
  const code = shortcode && !urlStore[shortcode] ? shortcode : generateShortcode();
  const expiry = new Date(Date.now() + validity * 60 * 1000).toISOString();
  
  urlStore[code] = {
    originalUrl: url,
    createdAt: new Date().toISOString(),
    expiry,
  };
  analyticsStore[code] = [];
  
  res.status(201).json({
    shortlink: `http://localhost:${port}/${code}`,
    expiry,
  });
});

// GET /:shortcode - Redirect and track click
app.get('/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const urlData = urlStore[shortcode];
  
  if (!urlData || new Date() > new Date(urlData.expiry)) {
    return res.status(404).json({ error: 'Short URL not found or expired' });
  }
  
  analyticsStore[shortcode].push({
    timestamp: new Date().toISOString(),
    referrer: req.get('Referrer') || 'Unknown',
    location: 'Unknown',
  });
  
  res.redirect(urlData.originalUrl);
});

// GET /shorturls/:shortcode - Retrieve Statistics
app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const urlData = urlStore[shortcode];
  
  if (!urlData) {
    return res.status(404).json({ error: 'Short URL not found' });
  }
  
  res.json({
    shortlink: `http://localhost:${port}/${shortcode}`,
    originalUrl: urlData.originalUrl,
    createdAt: urlData.createdAt,
    expiry: urlData.expiry,
    totalClicks: analyticsStore[shortcode]?.length || 0,
    clickData: analyticsStore[shortcode] || [],
  });
});

// GET /shorturls/all - List all shortcodes
app.get('/shorturls/all', (req, res) => {
  res.json({ shortcodes: Object.keys(urlStore) });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});