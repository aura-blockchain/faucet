// AURA Testnet Faucet - Frontend Application
// Handles UI interactions, API calls, and validation

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api/v1'
    : '/api/v1';

let captchaToken = null;

// State management
const state = {
    faucetInfo: null,
    recentTransactions: [],
    isLoading: false
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    prefillAddressFromQuery();
});

async function initializeApp() {
    await checkNetworkStatus();
    await loadFaucetInfo();
    await loadRecentTransactions();

    // Refresh data every 30 seconds
    setInterval(() => {
        loadFaucetInfo();
        loadRecentTransactions();
    }, 30000);
}

function setupEventListeners() {
    const form = document.getElementById('faucetForm');
    const addressInput = document.getElementById('address');

    form.addEventListener('submit', handleFormSubmit);
    addressInput.addEventListener('input', validateAddress);
}

function prefillAddressFromQuery() {
    const addressInput = document.getElementById('address');
    if (!addressInput) return;

    const params = new URLSearchParams(window.location.search);
    const address = params.get('address');
    if (address) {
        addressInput.value = address.trim();
        validateAddress();
    }
}

// Network status check
async function checkNetworkStatus() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();

        if (data.status === 'healthy') {
            statusDot.classList.remove('offline');
            statusText.textContent = 'Network Online';
        } else {
            statusDot.classList.add('offline');
            statusText.textContent = 'Network Issues';
        }
    } catch (error) {
        statusDot.classList.add('offline');
        statusText.textContent = 'Network Offline';
        console.error('Network status check failed:', error);
    }
}

// Load faucet information
async function loadFaucetInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/faucet/info`);
        const data = await response.json();

        state.faucetInfo = data;
        updateFaucetInfo(data);
    } catch (error) {
        console.error('Failed to load faucet info:', error);
        showError('Failed to load faucet information. Please refresh the page.');
    }
}

function updateFaucetInfo(data) {
    // Update faucet amount
    document.getElementById('faucetAmount').textContent = formatAmount(data.amount_per_request);

    // Update statistics
    document.getElementById('faucetBalance').textContent = formatAmount(data.balance);
    document.getElementById('totalDistributed').textContent = formatAmount(data.total_distributed);
    document.getElementById('uniqueRecipients').textContent = data.unique_recipients.toLocaleString();
    document.getElementById('last24h').textContent = data.requests_last_24h.toLocaleString();
}

// Load recent transactions
async function loadRecentTransactions() {
    const container = document.getElementById('recentTransactions');

    try {
        const response = await fetch(`${API_BASE_URL}/faucet/recent`);
        const data = await response.json();

        state.recentTransactions = data.transactions || [];

        if (state.recentTransactions.length === 0) {
            container.innerHTML = '<div class="loading">No recent transactions</div>';
            return;
        }

        container.innerHTML = state.recentTransactions.map(tx => `
            <div class="transaction-item">
                <div>
                    <div class="transaction-address">${truncateAddress(tx.recipient)}</div>
                    <div class="transaction-time">${formatTimeAgo(tx.timestamp)}</div>
                </div>
                <div class="transaction-amount">+${formatAmount(tx.amount)} AURA</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load recent transactions:', error);
        container.innerHTML = '<div class="loading">Failed to load transactions</div>';
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();

    if (state.isLoading) return;

    const address = document.getElementById('address').value.trim();
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    // Validate address
    if (!validateAddress()) {
        return;
    }

    // Check captcha
    if (!captchaToken) {
        showCaptchaError('Please complete the captcha verification');
        return;
    }

    // Hide previous alerts
    hideAlerts();

    // Show loading state
    state.isLoading = true;
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';

    try {
        const response = await fetch(`${API_BASE_URL}/faucet/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                address: address,
                captcha_token: captchaToken
            })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess(data);
            document.getElementById('faucetForm').reset();
            captchaToken = null;

            // Reset captcha
            if (window.turnstile) {
                turnstile.reset();
            }

            // Reload data
            await loadFaucetInfo();
            await loadRecentTransactions();
        } else {
            showError(data.error || 'Request failed. Please try again.');

            // Reset captcha on error
            if (window.turnstile) {
                turnstile.reset();
            }
            captchaToken = null;
        }
    } catch (error) {
        console.error('Request failed:', error);
        showError('Network error. Please check your connection and try again.');

        // Reset captcha on error
        if (window.turnstile) {
            turnstile.reset();
        }
        captchaToken = null;
    } finally {
        state.isLoading = false;
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Address validation
function validateAddress() {
    const addressInput = document.getElementById('address');
    const errorElement = document.getElementById('addressError');
    const address = addressInput.value.trim();

    // Check if address is empty
    if (!address) {
        errorElement.textContent = 'Address is required';
        errorElement.classList.add('show');
        return false;
    }

    // Check if address matches pattern (aura1 prefix for mainnet/testnet)
    const addressPattern = /^aura1[a-z0-9]{38,58}$/;
    if (!addressPattern.test(address)) {
        errorElement.textContent = 'Invalid AURA address format. Address must start with "aura1"';
        errorElement.classList.add('show');
        return false;
    }

    // Valid address
    errorElement.classList.remove('show');
    return true;
}

// Captcha callbacks
window.onCaptchaSuccess = function(token) {
    captchaToken = token;
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('captchaError').classList.remove('show');
};

window.onCaptchaExpired = function() {
    captchaToken = null;
    document.getElementById('submitBtn').disabled = true;
};

function showCaptchaError(message) {
    const errorElement = document.getElementById('captchaError');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// Alert display functions
function showSuccess(data) {
    const alert = document.getElementById('successAlert');
    const message = document.getElementById('successMessage');
    const txLink = document.getElementById('txLink');

    message.textContent = `Successfully sent ${formatAmount(data.amount)} AURA to ${truncateAddress(data.recipient)}`;

    if (data.tx_hash) {
        txLink.href = `https://explorer.aura-chain.com/tx/${data.tx_hash}`;
        txLink.style.display = 'inline-flex';
    } else {
        txLink.style.display = 'none';
    }

    alert.style.display = 'flex';

    // Auto-hide after 10 seconds
    setTimeout(() => {
        alert.style.display = 'none';
    }, 10000);
}

function showError(message) {
    const alert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.textContent = message;
    alert.style.display = 'flex';

    // Auto-hide after 8 seconds
    setTimeout(() => {
        alert.style.display = 'none';
    }, 8000);
}

function hideAlerts() {
    document.getElementById('successAlert').style.display = 'none';
    document.getElementById('errorAlert').style.display = 'none';
}

// Utility functions
const BASE_DENOM_FACTOR = 1_000_000;

function formatAmount(amount) {
    if (typeof amount === 'string') {
        amount = parseFloat(amount);
    }
    const normalized = Number.isFinite(amount) ? amount / BASE_DENOM_FACTOR : 0;
    return normalized.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6
    });
}

function truncateAddress(address) {
    if (!address || address.length < 20) return address;
    return `${address.substring(0, 10)}...${address.substring(address.length - 8)}`;
}

function formatTimeAgo(timestamp) {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
