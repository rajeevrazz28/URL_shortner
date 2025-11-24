
import React, { useState } from 'react';
import { Copy, Link, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const App = () => {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const API_BASE_URL = 'http://localhost:5080';

  const validateUrl = (url) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const shortenUrl = async () => {    
    if (!longUrl.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(longUrl)) {
      setError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/create/longurl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ longUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setShortUrl(data.shortUrl);
        setSuccess(data.message || 'Short URL created successfully!');
      } else {
        setError(data.error || 'Failed to create short URL');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Network error. Please make sure the backend server is running on port 5080.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      shortenUrl();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openUrl = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const clearForm = () => {
    setLongUrl('');
    setShortUrl('');
    setError('');
    setSuccess('');
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-4">
            <Link className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">URL Shortener</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Transform long URLs into short, shareable links instantly
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-8">
              {/* Input Form */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="longUrl" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your long URL
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      id="longUrl"
                      value={longUrl}
                      onChange={(e) => setLongUrl(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="https://example.com/very/long/url/that/needs/shortening"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-gray-700"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={shortenUrl}
                    disabled={loading || !longUrl.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Shortening...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        Shorten URL
                      </>
                    )}
                  </button>
                  
                  {(shortUrl || error || longUrl) && (
                    <button
                      type="button"
                      onClick={clearForm}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Message & Result */}
              {success && shortUrl && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-green-800 font-medium">Success!</p>
                      <p className="text-green-700 text-sm mt-1">{success}</p>
                    </div>
                  </div>

                  {/* Short URL Result */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Your shortened URL:
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3">
                            <p className="text-blue-600 font-mono break-all">{shortUrl}</p>
                          </div>
                          <button
                            onClick={copyToClipboard}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center"
                            title="Copy to clipboard"
                          >
                            {copied ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openUrl(shortUrl)}
                            className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-200 flex items-center"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                        {copied && (
                          <p className="text-sm text-green-600 mt-2">✓ Copied to clipboard!</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Original URL:
                        </label>
                        <div className="bg-white border border-gray-300 rounded-lg px-4 py-3">
                          <p className="text-gray-700 break-all">{longUrl}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Link className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Fast & Reliable</h3>
              <p className="text-gray-600 text-sm">
                Lightning-fast URL shortening with reliable redirects
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Secure</h3>
              <p className="text-gray-600 text-sm">
                All URLs are validated and safely processed
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Copy className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Easy Sharing</h3>
              <p className="text-gray-600 text-sm">
                One-click copy and share your shortened URLs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;