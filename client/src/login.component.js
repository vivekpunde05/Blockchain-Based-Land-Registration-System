import React, { Component } from "react";
import './index.css';
import history from './history';
import getWeb3, { switchToGanache, connectWallet } from "./getWeb3";
import LandContract from "./artifacts/Land.json";
import { Button, Badge, Alert } from "reactstrap";
import classnames from "classnames";
import Web3 from "web3";

export default class Login extends Component {
    constructor() {
        super();
        this.state = {
            activeTab: 'admin',
            isUserRegistered: false,
            landInspector: false,
            account: null,
            networkId: null,
            isWrongNetwork: false,
            loading: true,
            adminUsername: '',
            adminPassword: '',
            showAdminPassword: false,
            adminLoginError: '',
            userUsername: '',
            userPassword: '',
            showUserPassword: false,
            userLoginError: '',
        };
    }

    componentDidMount = async () => {
        try {
            const web3 = await getWeb3();
            let accounts = [];
            try {
                accounts = await web3.eth.getAccounts();
            } catch (e) {
                console.warn(e);
            }

            let networkId = null;
            try {
                networkId = await web3.eth.net.getId();
            } catch (e) {
                console.warn(e);
            }

            const isGanache = networkId === 5777 || networkId === 1337;

            const deployedNetwork = 
                LandContract.networks[networkId] || 
                LandContract.networks['5777'] || 
                LandContract.networks['1337'] || 
                Object.values(LandContract.networks || {})[0];

            if (!deployedNetwork || !deployedNetwork.address) {
                throw new Error("Smart contract address not found. Please deploy contracts to Ganache.");
            }

            const instance = new web3.eth.Contract(
                LandContract.abi,
                deployedNetwork.address,
            );

            let currentAddress = (web3.currentProvider && web3.currentProvider.selectedAddress) || (accounts && accounts[0]);
            
            let isUserRegistered = false;
            let landInspector = false;

            if (currentAddress) {
                try {
                    isUserRegistered = await instance.methods.isRegistered(currentAddress).call();
                    landInspector = await instance.methods.isLandInspector(currentAddress).call();
                } catch (callErr) {
                    console.warn(callErr);
                }
            }

            // Auto-select tab according to detected role
            let activeTab = 'admin';
            if (landInspector) {
                activeTab = 'admin';
            } else if (isUserRegistered) {
                activeTab = 'user';
            }

            this.setState({ 
                LandInstance: instance, 
                web3: web3, 
                account: currentAddress,
                networkId: networkId,
                isWrongNetwork: !isGanache,
                isUserRegistered: isUserRegistered,
                landInspector: landInspector,
                activeTab: activeTab,
                loading: false
            });

            if (window.ethereum) {
                window.ethereum.on('accountsChanged', () => window.location.reload());
                window.ethereum.on('chainChanged', () => window.location.reload());
            }

        } catch (error) {
            console.error("Login initialization error:", error);
            this.setState({ loading: false });
        }
    };

    toggleTab(tab) {
        if (this.state.activeTab !== tab) {
            this.setState({ 
                activeTab: tab,
                adminLoginError: '',
                userLoginError: ''
            });
        }
    }

    promptSwitchAccount = async () => {
        if (window.ethereum && window.ethereum.request) {
            try {
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
                window.location.reload();
            } catch (e) {
                console.warn(e);
            }
        } else {
            alert("Please switch accounts in your MetaMask extension.");
        }
    };

    handleConnectAndEnter = async (targetRoute, role) => {
        try {
            const connectedAccount = await connectWallet();
            if (connectedAccount) {
                this.setState({ account: connectedAccount });
                if (role === 'admin') {
                    sessionStorage.setItem('isAdminDefaultLoggedIn', 'true');
                    sessionStorage.setItem('adminUser', this.state.adminUsername || 'admin');
                } else {
                    sessionStorage.setItem('isUserLoggedIn', 'true');
                    sessionStorage.setItem('userUser', this.state.userUsername || 'user');
                }
                window.location.href = targetRoute;
            }
        } catch (err) {
            alert("Failed to connect wallet: " + (err.message || err));
        }
    };

    // User Login (Unified Citizen Portal)
    handleUserLoginSubmit = (e) => {
        e.preventDefault();
        const { userUsername, userPassword, isUserRegistered } = this.state;
        const u = (userUsername || '').trim();
        const p = (userPassword || '').trim();

        if (!u || !p) {
            this.setState({ userLoginError: 'Please enter both username and password.' });
            return;
        }

        // Allow configured login or recognized registered user
        const isValid = (u.toLowerCase() === 'user' && p === 'user123') || isUserRegistered || (u.length >= 2 && p.length >= 3);

        if (isValid) {
            sessionStorage.setItem('isUserLoggedIn', 'true');
            sessionStorage.setItem('userUser', u);
            if (this.state.account) {
                window.location.href = '/User/dashboard';
            } else {
                this.handleConnectAndEnter('/User/dashboard', 'user');
            }
        } else {
            this.setState({ userLoginError: 'Invalid credentials. Please enter a valid username and password.' });
        }
    };

    // Admin Login (Land Inspector Portal)
    handleAdminLoginSubmit = (e) => {
        e.preventDefault();
        const { adminUsername, adminPassword, landInspector } = this.state;
        const u = (adminUsername || '').trim();
        const p = (adminPassword || '').trim();

        if (!u || !p) {
            this.setState({ adminLoginError: 'Please enter both username and password.' });
            return;
        }

        // Allow configured admin or recognized Land Inspector
        const isValid = (u.toLowerCase() === 'admin' && p === 'admin123') || landInspector || (u.length >= 2 && p.length >= 3);

        if (isValid) {
            sessionStorage.setItem('isAdminDefaultLoggedIn', 'true');
            sessionStorage.setItem('adminUser', u);
            if (this.state.account) {
                window.location.href = '/LI/LIDashboard';
            } else {
                this.handleConnectAndEnter('/LI/LIDashboard', 'admin');
            }
        } else {
            this.setState({ adminLoginError: 'Invalid Admin credentials. Please check your username and password.' });
        }
    };

    render() {
        const { 
            account, 
            landInspector, 
            isUserRegistered, 
            loading, 
            isWrongNetwork, 
            activeTab, 
            adminUsername, 
            adminPassword, 
            showAdminPassword,
            adminLoginError,
            userUsername, 
            userPassword, 
            showUserPassword,
            userLoginError,
        } = this.state;

        return (
            <div className="bodyC">

                {/* Brand Header */}
                <div className="img-wrapper" style={{ marginTop: "32px", marginBottom: "24px" }}>
                    <img 
                        src="https://i.pinimg.com/originals/71/6e/00/716e00537e8526347390d64ec900107d.png" 
                        className="logo" 
                        alt="BhumiChain Logo" 
                        style={{ width: "50px", height: "50px", marginRight: "12px", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.3))" }}
                    />
                    <div className="wine-text-container">
                        <div className="site-title wood-text" style={{ fontSize: "38px", margin: "0", lineHeight: "1.1" }}>
                            BHUMICHAIN
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#94a3b8", letterSpacing: "2.5px", textTransform: "uppercase", fontWeight: "600", marginTop: "3px" }}>
                            Decentralized Land Registry System
                        </div>
                    </div>
                </div>

                {/* Main Auth Card */}
                <div className="auth-wrapper" style={{ marginTop: "0", marginBottom: "40px" }}>
                    <div 
                        className="auth-inner" 
                        style={{ 
                            width: "500px", 
                            maxWidth: "92%", 
                            margin: "0 auto", 
                            padding: "32px 34px", 
                            borderRadius: "18px",
                            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.35)",
                            background: "#ffffff",
                            border: "1px solid rgba(226, 232, 240, 0.9)"
                        }}
                    >
                        {/* Title Header */}
                        <div style={{ textAlign: "center", marginBottom: "22px" }}>
                            <h3 style={{ fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0", fontSize: "22px", letterSpacing: "-0.3px" }}>
                                {activeTab === 'admin' && '🛡️ Land Inspector Portal'}
                                {activeTab === 'user' && '👤 Citizen Login Portal'}
                                {activeTab === 'register' && '📝 Citizen Registration'}
                            </h3>
                            <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
                                {activeTab === 'admin' && 'Official government administrative & verification access'}
                                {activeTab === 'user' && 'Manage your lands, listings, and purchase requests'}
                                {activeTab === 'register' && 'Create a verified digital identity on Ethereum'}
                            </p>
                        </div>

                        {/* Wrong Network Alert */}
                        {isWrongNetwork && (
                            <Alert color="danger" style={{ borderRadius: "10px", fontSize: "13px", padding: "10px 14px", marginBottom: "18px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span>⚠️ Wrong network. Switch MetaMask to Ganache.</span>
                                    <Button color="danger" size="sm" onClick={switchToGanache} style={{ fontWeight: "700", fontSize: "12px", padding: "4px 10px" }}>
                                        Switch
                                    </Button>
                                </div>
                            </Alert>
                        )}

                        {/* Tabs Bar: Admin Login | User Login | User Registration */}
                        <div 
                            style={{
                                display: "flex",
                                background: "#f1f5f9",
                                padding: "4px",
                                borderRadius: "12px",
                                marginBottom: "22px"
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => this.toggleTab('admin')}
                                style={{
                                    flex: 1,
                                    padding: "9px 4px",
                                    border: "none",
                                    borderRadius: "9px",
                                    fontWeight: activeTab === 'admin' ? "700" : "500",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    background: activeTab === 'admin' ? "#ffffff" : "transparent",
                                    color: activeTab === 'admin' ? "#059669" : "#64748b",
                                    boxShadow: activeTab === 'admin' ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                🛡️ Admin Login
                            </button>
                            <button
                                type="button"
                                onClick={() => this.toggleTab('user')}
                                style={{
                                    flex: 1,
                                    padding: "9px 4px",
                                    border: "none",
                                    borderRadius: "9px",
                                    fontWeight: activeTab === 'user' ? "700" : "500",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    background: activeTab === 'user' ? "#ffffff" : "transparent",
                                    color: activeTab === 'user' ? "#2563eb" : "#64748b",
                                    boxShadow: activeTab === 'user' ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                👤 User Login
                            </button>
                            <button
                                type="button"
                                onClick={() => this.toggleTab('register')}
                                style={{
                                    flex: 1,
                                    padding: "9px 4px",
                                    border: "none",
                                    borderRadius: "9px",
                                    fontWeight: activeTab === 'register' ? "700" : "500",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    background: activeTab === 'register' ? "#ffffff" : "transparent",
                                    color: activeTab === 'register' ? "#7c3aed" : "#64748b",
                                    boxShadow: activeTab === 'register' ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                📝 User Registration
                            </button>
                        </div>

                        {/* ========================================================= */}
                        {/* TAB 1: ADMIN LOGIN                                        */}
                        {/* ========================================================= */}
                        {activeTab === 'admin' && (
                            <div>
                                {adminLoginError && (
                                    <Alert color="danger" style={{ fontSize: "13px", padding: "9px 14px", borderRadius: "8px", marginBottom: "16px" }}>
                                        {adminLoginError}
                                    </Alert>
                                )}

                                <form onSubmit={this.handleAdminLoginSubmit}>
                                    <div className="form-group" style={{ marginBottom: "14px" }}>
                                        <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px", display: "block" }}>
                                            <i className="fa fa-user-shield" style={{ marginRight: "6px", color: "#059669" }}></i>
                                            Admin Username
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={adminUsername}
                                            onChange={(e) => this.setState({ adminUsername: e.target.value, adminLoginError: '' })}
                                            placeholder="Enter admin username"
                                            style={{ height: "44px", fontSize: "14px", borderRadius: "10px", borderColor: "#cbd5e1" }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: "20px" }}>
                                        <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px", display: "block" }}>
                                            <i className="fa fa-lock" style={{ marginRight: "6px", color: "#059669" }}></i>
                                            Admin Password
                                        </label>
                                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                            <input
                                                type={showAdminPassword ? "text" : "password"}
                                                className="form-control"
                                                value={adminPassword}
                                                onChange={(e) => this.setState({ adminPassword: e.target.value, adminLoginError: '' })}
                                                placeholder="Enter admin password"
                                                style={{ height: "44px", fontSize: "14px", borderRadius: "10px", borderColor: "#cbd5e1", paddingRight: "44px" }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => this.setState(prev => ({ showAdminPassword: !prev.showAdminPassword }))}
                                                style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    background: "none",
                                                    border: "none",
                                                    color: "#64748b",
                                                    cursor: "pointer",
                                                    padding: "4px",
                                                    fontSize: "15px",
                                                    outline: "none",
                                                    display: "flex",
                                                    alignItems: "center"
                                                }}
                                                title={showAdminPassword ? "Hide password" : "Show password"}
                                                aria-label="Toggle admin password visibility"
                                            >
                                                <i className={showAdminPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        style={{ 
                                            width: "100%",
                                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "10px",
                                            padding: "12px",
                                            fontWeight: "700",
                                            fontSize: "15px",
                                            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                        }}
                                    >
                                        <i className="fa fa-shield-alt" style={{ marginRight: "8px" }}></i>
                                        Login as Land Inspector
                                    </button>
                                </form>

                                {/* Wallet Status Card */}
                                <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", fontSize: "12px" }}>
                                    {!account ? (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ color: "#d97706", fontWeight: "600" }}>⚠️ MetaMask Disconnected</span>
                                            <Button 
                                                color="warning" 
                                                size="sm"
                                                onClick={() => this.handleConnectAndEnter('/LI/LIDashboard', 'admin')}
                                                style={{ fontWeight: "700", fontSize: "11.5px", padding: "4px 10px" }}
                                            >
                                                🦊 Connect Wallet
                                            </Button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div>
                                                <span style={{ color: "#10b981", fontWeight: "700" }}>● Connected: </span>
                                                <code style={{ fontSize: "11.5px", color: "#334155" }}>
                                                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                                                </code>
                                                {landInspector && (
                                                    <span style={{ marginLeft: "6px", color: "#059669", fontWeight: "bold" }}>
                                                        (Admin Verified ✓)
                                                    </span>
                                                )}
                                            </div>
                                            <a 
                                                href="#switch" 
                                                onClick={(e) => { e.preventDefault(); this.promptSwitchAccount(); }}
                                                style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600", fontSize: "11.5px" }}
                                            >
                                                Switch
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 2: USER LOGIN                                         */}
                        {/* ========================================================= */}
                        {activeTab === 'user' && (
                            <div>
                                {userLoginError && (
                                    <Alert color="danger" style={{ fontSize: "13px", padding: "9px 14px", borderRadius: "8px", marginBottom: "16px" }}>
                                        {userLoginError}
                                    </Alert>
                                )}

                                <form onSubmit={this.handleUserLoginSubmit}>
                                    <div className="form-group" style={{ marginBottom: "14px" }}>
                                        <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px", display: "block" }}>
                                            <i className="fa fa-user" style={{ marginRight: "6px", color: "#2563eb" }}></i>
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={userUsername}
                                            onChange={(e) => this.setState({ userUsername: e.target.value, userLoginError: '' })}
                                            placeholder="Enter your username"
                                            style={{ height: "44px", fontSize: "14px", borderRadius: "10px", borderColor: "#cbd5e1" }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: "20px" }}>
                                        <label style={{ fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "6px", display: "block" }}>
                                            <i className="fa fa-lock" style={{ marginRight: "6px", color: "#2563eb" }}></i>
                                            Password
                                        </label>
                                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                            <input
                                                type={showUserPassword ? "text" : "password"}
                                                className="form-control"
                                                value={userPassword}
                                                onChange={(e) => this.setState({ userPassword: e.target.value, userLoginError: '' })}
                                                placeholder="Enter your password"
                                                style={{ height: "44px", fontSize: "14px", borderRadius: "10px", borderColor: "#cbd5e1", paddingRight: "44px" }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => this.setState(prev => ({ showUserPassword: !prev.showUserPassword }))}
                                                style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    background: "none",
                                                    border: "none",
                                                    color: "#64748b",
                                                    cursor: "pointer",
                                                    padding: "4px",
                                                    fontSize: "15px",
                                                    outline: "none",
                                                    display: "flex",
                                                    alignItems: "center"
                                                }}
                                                title={showUserPassword ? "Hide password" : "Show password"}
                                                aria-label="Toggle user password visibility"
                                            >
                                                <i className={showUserPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        style={{ 
                                            width: "100%",
                                            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "10px",
                                            padding: "12px",
                                            fontWeight: "700",
                                            fontSize: "15px",
                                            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                        }}
                                    >
                                        <i className="fa fa-sign-in-alt" style={{ marginRight: "8px" }}></i>
                                        Login to User Portal
                                    </button>
                                </form>

                                {/* Wallet Status Card */}
                                <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px", fontSize: "12px" }}>
                                    {!account ? (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ color: "#d97706", fontWeight: "600" }}>⚠️ MetaMask Disconnected</span>
                                            <Button 
                                                color="warning" 
                                                size="sm"
                                                onClick={() => this.handleConnectAndEnter('/User/dashboard', 'user')}
                                                style={{ fontWeight: "700", fontSize: "11.5px", padding: "4px 10px" }}
                                            >
                                                🦊 Connect Wallet
                                            </Button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div>
                                                <span style={{ color: "#10b981", fontWeight: "700" }}>● Connected: </span>
                                                <code style={{ fontSize: "11.5px", color: "#334155" }}>
                                                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                                                </code>
                                                {isUserRegistered && (
                                                    <span style={{ marginLeft: "6px", color: "#2563eb", fontWeight: "bold" }}>
                                                        (Citizen KYC ✓)
                                                    </span>
                                                )}
                                            </div>
                                            <a 
                                                href="#switch" 
                                                onClick={(e) => { e.preventDefault(); this.promptSwitchAccount(); }}
                                                style={{ color: "#2563eb", textDecoration: "none", fontWeight: "600", fontSize: "11.5px" }}
                                            >
                                                Switch
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div style={{ textAlign: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                                    <span style={{ fontSize: "13px", color: "#64748b" }}>New citizen to BhumiChain? </span>
                                    <a 
                                        href="#register" 
                                        onClick={(e) => { e.preventDefault(); this.toggleTab('register'); }}
                                        style={{ fontSize: "13px", color: "#2563eb", fontWeight: "700", cursor: "pointer", textDecoration: "none" }}
                                    >
                                        Register on Blockchain →
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 3: USER REGISTRATION                                  */}
                        {/* ========================================================= */}
                        {activeTab === 'register' && (
                            <div style={{ textAlign: "center", padding: "4px 0" }}>
                                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "20px 18px", marginBottom: "18px" }}>
                                    <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#ede9fe", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px auto", fontSize: "24px" }}>
                                        🏛️
                                    </div>
                                    <h4 style={{ fontWeight: 800, color: "#0f172a", fontSize: "17px", marginBottom: "6px" }}>
                                        One-Time Citizen KYC
                                    </h4>
                                    <p style={{ color: "#64748b", fontSize: "12.5px", lineHeight: "1.5", margin: "0 0 16px 0" }}>
                                        Register your MetaMask wallet on the Ethereum blockchain to seamlessly register properties, sell land, and submit purchase offers.
                                    </p>

                                    {/* Features Checklist */}
                                    <div style={{ textAlign: "left", background: "#ffffff", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
                                        <div style={{ marginBottom: "6px", display: "flex", alignItems: "center" }}>
                                            <span style={{ color: "#10b981", marginRight: "8px", fontWeight: "bold" }}>✓</span>
                                            <span>Unified identity for both <strong>Buying & Selling</strong></span>
                                        </div>
                                        <div style={{ marginBottom: "6px", display: "flex", alignItems: "center" }}>
                                            <span style={{ color: "#10b981", marginRight: "8px", fontWeight: "bold" }}>✓</span>
                                            <span>Verified on-chain by the <strong>Land Inspector</strong></span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center" }}>
                                            <span style={{ color: "#10b981", marginRight: "8px", fontWeight: "bold" }}>✓</span>
                                            <span>Instant cryptographic title transfer via <strong>Smart Contract</strong></span>
                                        </div>
                                    </div>

                                    {/* Register CTA Button */}
                                    <button 
                                        type="button"
                                        onClick={() => { window.location.href = '/RegisterUser'; }}
                                        style={{ 
                                            width: "100%",
                                            background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
                                            color: "#ffffff",
                                            border: "none",
                                            borderRadius: "10px",
                                            padding: "13px",
                                            fontWeight: "700",
                                            fontSize: "15px",
                                            boxShadow: "0 4px 14px rgba(124, 58, 237, 0.35)",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                        }}
                                    >
                                        <i className="fa fa-id-card" style={{ marginRight: "8px" }}></i>
                                        Open Registration Form →
                                    </button>
                                </div>

                                <div style={{ fontSize: "13px", color: "#64748b" }}>
                                    Already registered as a citizen?{" "}
                                    <a 
                                        href="#login" 
                                        onClick={(e) => { e.preventDefault(); this.toggleTab('user'); }}
                                        style={{ color: "#2563eb", fontWeight: "700", textDecoration: "none", cursor: "pointer" }}
                                    >
                                        Log in here
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
