import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, TextField, Button, Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

// Logging Middleware for frontend (mock, adjust based on pre-test setup)
const logFrontend = (data) => {
  console.log('Frontend Log:', JSON.stringify(data));
};

// Shortener Page
const ShortenerPage = () => {
  const [urls, setUrls] = useState([{ url: '', validity: '', shortcode: '' }]);
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);

  const addUrlField = () => {
    if (urls.length < 5) {
      setUrls([...urls, { url: '', validity: '', shortcode: '' }]);
    }
  };

  const updateUrl = (index, field, value) => {
    const newUrls = [...urls];
    newUrls[index][field] = value;
    setUrls(newUrls);
  };

  const validateInputs = () => {
    const newErrors = urls.map((input, index) => {
      const error = {};
      if (!input.url || !/^https?:\/\/.*/.test(input.url)) {
        error.url = 'Valid URL required';
      }
      if (input.validity && (isNaN(input.validity) || input.validity <= 0)) {
        error.validity = 'Valid positive integer required';
      }
      return error;
    });
    setErrors(newErrors);
    return newErrors.every((err) => Object.keys(err).length === 0);
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;
    
    logFrontend({ action: 'submit_urls', data: urls });
    
    const promises = urls.map((input) =>
      axios.post('http://localhost:5000/shorturls', {
        url: input.url,
        validity: input.validity || 30,
        shortcode: input.shortcode || undefined,
      })
    );
    
    try {
      const responses = await Promise.all(promises);
      const newResults = responses.map((res) => res.data);
      setResults(newResults);
      logFrontend({ action: 'short_urls_created', data: newResults });
    } catch (error) {
      setErrors([{ general: 'Failed to create URLs' }]);
      logFrontend({ action: 'error', error: error.message });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>URL Shortener</Typography>
      {urls.map((input, index) => (
        <Box key={index} sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <TextField
            label="Original URL"
            value={input.url}
            onChange={(e) => updateUrl(index, 'url', e.target.value)}
            error={!!errors[index]?.url}
            helperText={errors[index]?.url}
            fullWidth
          />
          <TextField
            label="Validity (minutes)"
            type="number"
            value={input.validity}
            onChange={(e) => updateUrl(index, 'validity', e.target.value)}
            error={!!errors[index]?.validity}
            helperText={errors[index]?.validity}
            sx={{ width: '150px' }}
          />
          <TextField
            label="Custom Shortcode (optional)"
            value={input.shortcode}
            onChange={(e) => updateUrl(index, 'shortcode', e.target.value)}
            sx={{ width: '150px' }}
          />
        </Box>
      ))}
      <Button onClick={addUrlField} disabled={urls.length >= 5}>Add URL</Button>
      <Button onClick={handleSubmit} variant="contained" sx={{ ml: 2 }}>Shorten URLs</Button>
      {results.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Results</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Original URL</TableCell>
                <TableCell>Short URL</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>{urls[index].url}</TableCell>
                  <TableCell><a href={result.shortlink}>{result.shortlink}</a></TableCell>
                  <TableCell>{new Date(result.expiry).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button
                      component={Link}
                      to={`/stats/${result.shortlink.split('/').pop()}`}
                      variant="outlined"
                    >
                      View Stats
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
      {errors.some((err) => err.general) && (
        <Typography color="error">{errors.find((err) => err.general)?.general}</Typography>
      )}
    </Box>
  );
};

// Statistics Page
const StatsPage = () => {
  const { shortcode } = useParams();
  const [stats, setStats] = useState([]);
  
  const fetchStats = async (code) => {
    try {
      const response = await axios.get(`http://localhost:5000/shorturls/${code}`);
      return response.data;
    } catch (error) {
      logFrontend({ action: 'error_fetch_stats', error: error.message });
      return null;
    }
  };

  useEffect(() => {
    const fetchAllStats = async () => {
      try {
        let shortcodes = [];
        if (shortcode) {
          shortcodes = [shortcode];
        } else {
          const response = await axios.get('http://localhost:5000/shorturls/all');
          shortcodes = response.data.shortcodes;
        }
        const statsData = await Promise.all(shortcodes.map(fetchStats));
        setStats(statsData.filter((data) => data));
        logFrontend({ action: 'fetch_stats', data: statsData });
      } catch (error) {
        logFrontend({ action: 'error_fetch_stats', error: error.message });
        setStats([]);
      }
    };
    fetchAllStats();
  }, [shortcode]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>URL Statistics</Typography>
      {stats.length === 0 && <Typography>No statistics available.</Typography>}
      {stats.map((stat, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Short URL: <a href={stat.shortlink}>{stat.shortlink}</a></Typography>
          <Typography>Original URL: {stat.originalUrl}</Typography>
          <Typography>Created: {new Date(stat.createdAt).toLocaleString()}</Typography>
          <Typography>Expires: {new Date(stat.expiry).toLocaleString()}</Typography>
          <Typography>Total Clicks: {stat.totalClicks}</Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Referrer</TableCell>
                <TableCell>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stat.clickData.map((click, i) => (
                <TableRow key={i}>
                  <TableCell>{new Date(click.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{click.referrer}</TableCell>
                  <TableCell>{click.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ))}
    </Box>
  );
};

// Main App
const App = () => (
  <Router>
    <Container>
      <Box sx={{ mb: 2 }}>
        <Link to="/" style={{ marginRight: '20px' }}>Shortener</Link>
        <Link to="/stats">Statistics</Link>
      </Box>
      <Routes>
        <Route path="/" element={<ShortenerPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/stats/:shortcode" element={<StatsPage />} />
      </Routes>
    </Container>
  </Router>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);