/**
 * Aura Faucet Frontend with Multi-chain Support
 */

class AuraFaucet {
  constructor() {
    this.apiUrl = "http://localhost:8080/api";
    this.networks = {
      testnet: {
        name: "Testnet",
        endpoint: "http://localhost:8080/api",
        chainId: "aura-mvp-1",
      },
      devnet: {
        name: "Devnet",
        endpoint: "http://localhost:8081/api",
        chainId: "aura-devnet-1",
      },
    };
    this.currentNetwork = "testnet";
    this.powWorker = null;
    this.rateLimitTimer = null;
  }

  init() {
    this.attachEventListeners();
    this.loadStats();
    this.loadRecentTransactions();
    this.checkUserStatus();
  }

  attachEventListeners() {
    document
      .getElementById("networkSelect")
      ?.addEventListener("change", (e) => {
        this.switchNetwork(e.target.value);
      });

    document.getElementById("requestBtn")?.addEventListener("click", () => {
      this.requestTokens();
    });

    document.getElementById("addressInput")?.addEventListener("input", (e) => {
      this.validateAddress(e.target.value);
    });
  }

  switchNetwork(network) {
    if (this.networks[network]) {
      this.currentNetwork = network;
      this.apiUrl = this.networks[network].endpoint;
      this.showStatus(`Switched to ${this.networks[network].name}`, "info");
      this.loadStats();
      this.loadRecentTransactions();
    }
  }

  validateAddress(address) {
    const addressInput = document.getElementById("addressInput");
    const isValid = /^aura1[a-z0-9]{38,58}$/.test(address);

    if (address.length > 0) {
      if (isValid) {
        addressInput.classList.remove("invalid");
        addressInput.classList.add("valid");
      } else {
        addressInput.classList.remove("valid");
        addressInput.classList.add("invalid");
      }
    } else {
      addressInput.classList.remove("valid", "invalid");
    }

    return isValid;
  }

  async requestTokens() {
    const address = document.getElementById("addressInput")?.value.trim();
    const amount = document.getElementById("amountSelect")?.value;
    const recaptchaResponse = grecaptcha?.getResponse();

    // Validation
    if (!address) {
      this.showStatus("Please enter an address", "error");
      return;
    }

    if (!this.validateAddress(address)) {
      this.showStatus("Invalid Aura address", "error");
      return;
    }

    if (!recaptchaResponse) {
      this.showStatus("Please complete the CAPTCHA", "error");
      return;
    }

    const requestBtn = document.getElementById("requestBtn");
    requestBtn.disabled = true;
    requestBtn.textContent = "Processing...";

    try {
      // Step 1: Get PoW challenge
      const challengeResponse = await fetch(`${this.apiUrl}/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!challengeResponse.ok) {
        throw new Error("Failed to get challenge");
      }

      const challengeData = await challengeResponse.json();

      // Step 2: Solve PoW
      const solution = await this.solvePoW(
        challengeData.challenge,
        challengeData.difficulty,
      );

      // Step 3: Request tokens
      const requestResponse = await fetch(`${this.apiUrl}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          amount: parseInt(amount),
          recaptcha: recaptchaResponse,
          pow_solution: solution,
          network: this.currentNetwork,
        }),
      });

      if (!requestResponse.ok) {
        const error = await requestResponse.json();
        throw new Error(error.error || "Request failed");
      }

      const result = await requestResponse.json();

      this.showStatus(
        `Success! Sent ${amount} AURA to ${address}. TX: ${result.tx_hash}`,
        "success",
      );

      // Reset form
      document.getElementById("addressInput").value = "";
      grecaptcha?.reset();

      // Reload data
      this.loadStats();
      this.loadRecentTransactions();
      this.checkUserStatus();
      this.startCooldownTimer();
    } catch (err) {
      this.showStatus(err.message, "error");
    } finally {
      requestBtn.disabled = false;
      requestBtn.textContent = "Request Tokens";
      this.hidePoWChallenge();
    }
  }

  async solvePoW(challenge, difficulty) {
    return new Promise((resolve, reject) => {
      this.showPoWChallenge();

      if (window.Worker) {
        // Use Web Worker for PoW
        this.powWorker = new Worker("pow-worker.js");

        this.powWorker.onmessage = (e) => {
          if (e.data.type === "solution") {
            resolve(e.data.solution);
            this.powWorker.terminate();
          } else if (e.data.type === "progress") {
            this.updatePoWProgress(e.data.progress);
          }
        };

        this.powWorker.onerror = (err) => {
          reject(new Error("PoW computation failed"));
          this.powWorker.terminate();
        };

        this.powWorker.postMessage({ challenge, difficulty });
      } else {
        // Fallback: solve in main thread (will block UI)
        const solution = this.computePoW(challenge, difficulty);
        resolve(solution);
      }
    });
  }

  computePoW(challenge, difficulty) {
    let nonce = 0;
    const target = "0".repeat(difficulty);

    while (true) {
      const attempt = challenge + nonce.toString();
      const hash = this.sha256(attempt);

      if (hash.startsWith(target)) {
        return nonce;
      }

      nonce++;

      if (nonce % 10000 === 0) {
        this.updatePoWProgress((nonce / 1000000) * 100);
      }
    }
  }

  sha256(message) {
    // Simple SHA-256 implementation
    // In production, use crypto.subtle.digest or a library
    return crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(message))
      .then((buffer) => {
        const hexCodes = [];
        const view = new DataView(buffer);
        for (let i = 0; i < view.byteLength; i += 4) {
          const value = view.getUint32(i);
          const stringValue = value.toString(16);
          const padding = "00000000";
          const paddedValue = (padding + stringValue).slice(-padding.length);
          hexCodes.push(paddedValue);
        }
        return hexCodes.join("");
      });
  }

  showPoWChallenge() {
    const powChallenge = document.getElementById("powChallenge");
    if (powChallenge) {
      powChallenge.style.display = "block";
    }
  }

  hidePoWChallenge() {
    const powChallenge = document.getElementById("powChallenge");
    if (powChallenge) {
      powChallenge.style.display = "none";
    }
  }

  updatePoWProgress(progress) {
    const progressBar = document.getElementById("powProgressBar");
    const status = document.getElementById("powStatus");

    if (progressBar) {
      progressBar.style.width = `${Math.min(progress, 100)}%`;
    }

    if (status) {
      status.textContent = `Computing proof of work... ${progress.toFixed(1)}%`;
    }
  }

  async loadStats() {
    try {
      const response = await fetch(`${this.apiUrl}/stats`);
      if (!response.ok) throw new Error("Failed to load stats");

      const data = await response.json();

      document.getElementById("totalDistributed").textContent =
        this.formatAmount(data.total_distributed || 0);
      document.getElementById("totalRequests").textContent = this.formatNumber(
        data.total_requests || 0,
      );
      document.getElementById("faucetBalance").textContent = this.formatAmount(
        data.faucet_balance || 0,
      );
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  async loadRecentTransactions() {
    try {
      const response = await fetch(`${this.apiUrl}/recent`);
      if (!response.ok) throw new Error("Failed to load transactions");

      const data = await response.json();
      const container = document.getElementById("recentTxs");

      if (!data.transactions || data.transactions.length === 0) {
        container.innerHTML = '<p class="empty">No recent transactions</p>';
        return;
      }

      container.innerHTML = data.transactions
        .map(
          (tx) => `
        <div class="tx-item">
          <div class="tx-address">${this.truncateAddress(tx.address)}</div>
          <div class="tx-details">
            <span class="tx-amount">${tx.amount} AURA</span>
            <span class="tx-time">${this.formatTime(tx.timestamp)}</span>
          </div>
        </div>
      `,
        )
        .join("");
    } catch (err) {
      console.error("Failed to load transactions:", err);
    }
  }

  async checkUserStatus() {
    const address = document.getElementById("addressInput")?.value.trim();
    if (!address || !this.validateAddress(address)) return;

    try {
      const response = await fetch(`${this.apiUrl}/status/${address}`);
      if (!response.ok) return;

      const data = await response.json();

      document.getElementById("requestsToday").textContent =
        data.requests_today || 0;
      document.getElementById("lastRequest").textContent = data.last_request
        ? this.formatTime(data.last_request)
        : "Never";

      if (data.next_available) {
        const nextTime = new Date(data.next_available);
        const now = new Date();

        if (nextTime > now) {
          document.getElementById("nextAvailable").textContent =
            this.formatTime(data.next_available);
          this.startCooldownTimer(nextTime - now);
        } else {
          document.getElementById("nextAvailable").textContent =
            "Available now";
        }
      }
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }

  startCooldownTimer(duration = 86400000) {
    // 24 hours default
    if (this.rateLimitTimer) {
      clearInterval(this.rateLimitTimer);
    }

    const endTime = Date.now() + duration;

    this.rateLimitTimer = setInterval(() => {
      const remaining = endTime - Date.now();

      if (remaining <= 0) {
        clearInterval(this.rateLimitTimer);
        document.getElementById("nextAvailable").textContent = "Available now";
        document.getElementById("requestBtn").disabled = false;
        return;
      }

      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);

      document.getElementById("nextAvailable").textContent =
        `${hours}h ${minutes}m`;
      document.getElementById("requestBtn").disabled = true;
    }, 1000);
  }

  showStatus(message, type = "info") {
    const statusEl = document.getElementById("statusMessage");
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = "block";

    setTimeout(() => {
      statusEl.style.display = "none";
    }, 5000);
  }

  formatAmount(amount) {
    return new Intl.NumberFormat().format(amount) + " AURA";
  }

  formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  }

  truncateAddress(address) {
    if (!address || address.length < 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }
}

// Initialize faucet
const faucet = new AuraFaucet();
document.addEventListener("DOMContentLoaded", () => faucet.init());
