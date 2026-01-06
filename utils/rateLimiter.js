class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  canMakeRequest(userId) {
    const now = Date.now();
    
    if (!this.requests.has(userId)) {
      this.requests.set(userId, []);
    }

    const userRequests = this.requests.get(userId);
    
    // Remove expired requests
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );
    
    this.requests.set(userId, validRequests);

    // Check if user can make request
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add new request timestamp
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    
    return true;
  }

  getResetTime(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    if (userRequests.length === 0) {
      return 0;
    }

    const oldestRequest = Math.min(...userRequests);
    const resetTime = (oldestRequest + this.windowMs) - now;
    
    return Math.max(0, resetTime);
  }

  getRemainingRequests(userId) {
    const userRequests = this.requests.get(userId) || [];
    return Math.max(0, this.maxRequests - userRequests.length);
  }

  // Clean up old data periodically
  cleanup() {
    const now = Date.now();
    
    for (const [userId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        timestamp => now - timestamp < this.windowMs
      );
      
      if (validRequests.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, validRequests);
      }
    }
  }
}

module.exports = { RateLimiter };