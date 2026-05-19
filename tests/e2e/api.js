/**
 * API Helper — thin wrapper around fetch for hitting the Taist MAPI.
 */

const config = require('./config');

class ApiClient {
  constructor(token = null) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.token = token;
  }

  /** Set the bearer token (after login/register) */
  setToken(token) {
    this.token = token;
    return this;
  }

  /** Core request method */
  async request(method, endpoint, data = null, opts = {}) {
    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
    const headers = {
      'apiKey': this.apiKey,
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const fetchOpts = { method, headers };

    if (data) {
      if (opts.multipart) {
        // For multipart/form-data (file uploads), let fetch set the boundary
        const formData = new FormData();
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        }
        fetchOpts.body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        fetchOpts.body = JSON.stringify(data);
      }
    }

    const res = await fetch(url, fetchOpts);
    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${method} ${endpoint} (${res.status}): ${text.slice(0, 300)}`);
    }

    return { status: res.status, body: json };
  }

  get(endpoint, params = {}) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const ep = qs ? `${endpoint}?${qs}` : endpoint;
    return this.request('GET', ep);
  }

  post(endpoint, data = {}, opts = {}) {
    return this.request('POST', endpoint, data, opts);
  }

  delete(endpoint, params = {}) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const ep = qs ? `${endpoint}?${qs}` : endpoint;
    return this.request('DELETE', ep);
  }
}

module.exports = { ApiClient };
