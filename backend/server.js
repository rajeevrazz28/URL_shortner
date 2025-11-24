require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5080;
const MONGO_URI = process.env.MONGO_URI;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BACKEND_URL=process.env.BACKEND_URL;

// Middleware
app.use(cors({
  origin: [BASE_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with error handling
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    await initializeCounter();
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Base62 characters for encoding
const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Base62 encoding function
function encodeBase62(num) {
  if (num === 0) return BASE62_CHARS[0];
  
  let result = '';
  while (num > 0) {
    result = BASE62_CHARS[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}

// URL Schema
const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Counter Schema for generating unique IDs
const counterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: Number,
    default: 0
  }
});

const Url = mongoose.model('Url', urlSchema);
const Counter = mongoose.model('Counter', counterSchema);

// Initialize counter if it doesn't exist
async function initializeCounter() {
  try {
    const counter = await Counter.findOne({ name: 'urlId' });
    if (!counter) {
      await Counter.create({ name: 'urlId', value: 100000 });
      console.log('✅ Counter initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing counter:', error);
  }
}

// Get next counter value
async function getNextCounterValue() {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: 'urlId' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    return counter.value;
  } catch (error) {
    console.error('Error getting counter value:', error);
    throw error;
  }
}

// Validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// Validate short code format
function isValidShortCode(code) {
  return /^[a-zA-Z0-9]+$/.test(code) && code.length >= 1 && code.length <= 10;
}

// Health check endpoint - Place this first
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'URL Shortener API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Create short URL endpoint
app.post('/api/create/longurl', async (req, res) => {
  try {
    const { longUrl } = req.body;

    // Validate input
    if (!longUrl || typeof longUrl !== 'string') {
      return res.status(400).json({ 
        error: 'Long URL is required and must be a string',
        success: false 
      });
    }

    const trimmedUrl = longUrl.trim();
    
    // Validate URL format
    if (!isValidUrl(trimmedUrl)) {
      return res.status(400).json({ 
        error: 'Invalid URL format. Please include http:// or https://',
        success: false 
      });
    }

    // Check if URL already exists
    const existingUrl = await Url.findOne({ originalUrl: trimmedUrl });
    if (existingUrl) {
      return res.status(200).json({
        success: true,
        shortUrl: `${BACKEND_URL}/${existingUrl.shortCode}`,
        shortCode: existingUrl.shortCode,
        originalUrl: trimmedUrl,
        message: 'URL already exists'
      });
    }

    // Generate unique short code
    const counterId = await getNextCounterValue();
    const shortCode = encodeBase62(counterId);

    // Create new URL entry
    const newUrl = new Url({
      originalUrl: trimmedUrl,
      shortCode: shortCode,
    });

    await newUrl.save();

    res.status(201).json({
      success: true,
      shortUrl: `${BACKEND_URL}/${shortCode}`,
      shortCode: shortCode,
      originalUrl: trimmedUrl,
      message: 'Short URL created successfully'
    });

  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again.',
      success: false 
    });
  }
});

// Get URL information endpoint
app.get('/api/info/*', async (req, res) => {
  try {
    const shortCode = req.params[0]; // Use params[0] to get the wildcard match
    
    if (!shortCode || !isValidShortCode(shortCode)) {
      return res.status(400).json({ 
        error: 'Invalid short code format',
        success: false 
      });
    }
    
    const urlDoc = await Url.findOne({ shortCode });
    
    if (!urlDoc) {
      return res.status(404).json({ 
        error: 'Short URL not found',
        success: false 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        originalUrl: urlDoc.originalUrl,
        shortCode: urlDoc.shortCode,
        clicks: urlDoc.clicks,
        createdAt: urlDoc.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching URL info:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
});

// Catch all API routes that don't exist
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: `API endpoint ${req.originalUrl} not found`,
    success: false,
    availableEndpoints: [
      'POST /api/create/longurl',
      'GET /api/info/{shortCode}',
      'GET /api/health'
    ]
  });
});

// Short URL redirect handler - This should be last
app.get('/*', async (req, res) => {
  try {
    const shortCode = req.params[0]; // Use params[0] to get the wildcard match
    
    // Skip if it's an API route or empty
    if (!shortCode || shortCode.startsWith('api/') || shortCode === 'favicon.ico') {
      return res.status(404).json({ 
        error: 'Page not found',
        success: false 
      });
    }

    // Validate shortCode format
    if (!isValidShortCode(shortCode)) {
      return res.status(400).json({ 
        error: 'Invalid short code format',
        success: false 
      });
    }

    // Find URL by short code
    const urlDoc = await Url.findOne({ shortCode });

    if (!urlDoc) {
      return res.status(404).json({ 
        error: 'Short URL not found',
        success: false,
        shortCode: shortCode
      });
    }

    // Increment click count asynchronously
    Url.findByIdAndUpdate(urlDoc._id, { $inc: { clicks: 1 } }).catch(err => {
      console.error('Error updating click count:', err);
    });

    // Permanent redirect (301)
    console.log(`Redirecting ${shortCode} to ${urlDoc.originalUrl}`);
    res.status(301).redirect(urlDoc.originalUrl);

  } catch (error) {
    console.error('Error in redirect handler:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    success: false 
  });
});

// Database connection event handlers
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🗄️  Database: ${MONGO_URI.includes('mongodb+srv') ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();