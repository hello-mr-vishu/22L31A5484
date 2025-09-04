// File: src/middleware/logger.js

const axios = require('axios');

// Valid values for stack, level, and package as per constraints
const VALID_STACKS = ['backend', 'frontend'];
const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const VALID_PACKAGES = [
  // Backend-only packages
  'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service',
  // Frontend-only packages
  'api', 'component', 'hook', 'page', 'state', 'style',
  // Shared packages
  'auth', 'config', 'middleware', 'utils'
];

// Configuration for the Test Server
const LOG_API_URL = 'http://20.244.56.144/evaluation-service/logs';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJ2aXNobnVyb25nYWxpMjFAZ21haWwuY29tIiwiZXhwIjoxNzU2OTY2OTcwLCJpYXQiOjE3NTY5NjYwNzAsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiJiNTJmNjYwNS1kYzQ4LTQxMDEtODQzMi04MDUyYjZmMTlhMTgiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJyLnZpc2hudSB2YXJkaGFuIiwic3ViIjoiNDc2YjUwMTYtMDNkZS00ZWJkLWE1OGQtZDkzNTJkNjNjYzgxIn0sImVtYWlsIjoidmlzaG51cm9uZ2FsaTIxQGdtYWlsLmNvbSIsIm5hbWUiOiJyLnZpc2hudSB2YXJkaGFuIiwicm9sbE5vIjoiMjJsMzFhNTQ4NCIsImFjY2Vzc0NvZGUiOiJZenVKZVUiLCJjbGllbnRJRCI6IjQ3NmI1MDE2LTAzZGUtNGViZC1hNThkLWQ5MzUyZDYzY2M4MSIsImNsaWVudFNlY3JldCI6Inl5ZVNtdnlHUHRZaFRQWFoifQ.GE-hccRX-fXocC3vtYxhQRwVhkt4g2QbYGqwYdQwv7I'; // Replace with token from /auth endpoint

// Reusable Log function
async function Log(stack, level, pkg, message) {
  try {
    // Validate inputs
    if (!VALID_STACKS.includes(stack)) {
      throw new Error(`Invalid stack: ${stack}. Must be one of ${VALID_STACKS.join(', ')}`);
    }
    if (!VALID_LEVELS.includes(level)) {
      throw new Error(`Invalid level: ${level}. Must be one of ${VALID_LEVELS.join(', ')}`);
    }
    if (!VALID_PACKAGES.includes(pkg)) {
      throw new Error(`Invalid package: ${pkg}. Must be one of ${VALID_PACKAGES.join(', ')}`);
    }
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }

    // Prepare request body
    const logData = {
      stack,
      level,
      package: pkg,
      message
    };

    // Make API call to the Test Server
    const response = await axios.post(LOG_API_URL, logData, {
      headers: {
        Authorization: AUTH_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    // Log success response
    console.log(`Log created successfully: ${response.data.logID}`);
  } catch (error) {
    // Handle errors gracefully
    if (error.isAxiosError) {
      console.error(`Failed to send log: ${error.response?.data?.message || error.message}`);
    } else {
      console.error(`Logging error: ${error.message}`);
    }
    // Fallback: log locally
    console.warn(`Local log: ${stack} | ${level} | ${pkg} | ${message}`);
  }
}

module.exports = Log;