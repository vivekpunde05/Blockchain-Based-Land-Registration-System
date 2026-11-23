import React, { Component } from 'react';
import Web3 from "web3";
import Land from "../artifacts/Land.json";
import getWeb3, { switchToGanache, connectWallet } from "../getWeb3";
import '../index.css';
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import { Spinner } from 'react-bootstrap';

// reactstrap components
import {
    Button,
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Row,
    Col,
    Alert,
    Badge,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Label,
    Input
} from "reactstrap";

import "../card.css";

class LIDashboard extends Component {
    constructor(props) {
        super(props);

        this.state = {
            LandInstance: undefined,
            account: null,
            web3: null,
            verified: false,
            inspectorAddress: "",
            usersCount: 0,
            landsCount: 0,
            onSaleCount: 0,
            soldCount: 0,
            pendingApprovalsCount: 0,
            transactionsCount: 0,
            pendingLands: [],
            recentTransactions: [],
            loading: true,
            networkId: null,
            loadError: null,
            showAdminAddress: false,
            copiedAddress: false,
            processingLandId: null,
            rejectModalOpen: false,
            selectedLandForReject: null,
            rejectionReason: '',
        };
    }

    toggleAdminAddress = () => {
        this.setState(prevState => ({ showAdminAddress: !prevState.showAdminAddress }));
    };

    copyToClipboard = (text) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            this.setState({ copiedAddress: true });
            setTimeout(() => this.setState({ copiedAddress: false }), 2000);
        }
    };

    componentDidMount = async () => {
        try {
            const web3 = await getWeb3();

            let accounts = [];
            try {
                accounts = await web3.eth.getAccounts();
            } catch (e) {
                console.warn("Could not get accounts:", e);
            }

            const currentAddress = (await (web3.currentProvider && web3.currentProvider.selectedAddress)) || (accounts && accounts[0]);

            let networkId = null;
            try {
                networkId = await web3.eth.net.getId();
            } catch (e) {
                console.warn("Could not get networkId:", e);
            }

            const deployedNetwork = 
                Land.networks[networkId] || 
                Land.networks['5777'] || 
                Land.networks['1337'] || 
                Object.values(Land.networks || {})[0];

            if (!deployedNetwork || !deployedNetwork.address) {
                throw new Error("Smart contract address not found in build artifacts. Please deploy contracts to Ganache.");
            }

            const instance = new web3.eth.Contract(
                Land.abi,
                deployedNetwork.address,
            );

            // Direct local fallback Web3 instance for reading
            let localInstance = null;
            try {
                const localWeb3 = new Web3("http://127.0.0.1:7545");
                const contractAddr = (Land.networks['5777'] && Land.networks['5777'].address) || deployedNetwork.address;
                localInstance = new localWeb3.eth.Contract(Land.abi, contractAddr);
            } catch (localErr) {
                console.warn("Local Web3 fallback init error:", localErr);
            }

            let verified = false;
            if (sessionStorage.getItem('isAdminDefaultLoggedIn') === 'true') {
                verified = true;
            } else if (currentAddress) {
                try {
                    verified = await instance.methods.isLandInspector(currentAddress).call();
                } catch (verifyErr) {
                    if (localInstance) {
                        try {
                            verified = await localInstance.methods.isLandInspector(currentAddress).call();
                        } catch (fbErr) {
                            console.warn("Direct RPC isLandInspector check failed:", fbErr);
                        }
                    }
                }
            }

            // Fetch live counts
            let usersCount = 0;
            let landsCount = 0;
            let transactionsCount = 0;
            try {
                usersCount = parseInt(await instance.methods.getUsersCount().call() || 0);
                landsCount = parseInt(await instance.methods.getLandsCount().call() || 0);
                transactionsCount = parseInt(await instance.methods.getTransactionsCount().call() || 0);
            } catch (cntErr) {
                console.warn("Count fetch error:", cntErr);
            }

            // Fetch Lands Details for stats & pending approvals table
            let onSaleCount = 0;
            let soldCount = 0;
            let pendingApprovalsCount = 0;
            const pendingLands = [];

            for (let i = 1; i <= landsCount; i++) {
                try {
                    const isLandVerif = await instance.methods.isLandVerified(i).call();
                    const isLandRej = await instance.methods.isLandRejected(i).call();
                    const isOnSale = await instance.methods.isLandOnSale(i).call();
                    const isPaid = instance.methods.isPaid ? await instance.methods.isPaid(i).call() : false;

                    if (isPaid) {
                        soldCount++;
                    } else if (isLandVerif && isOnSale) {
                        onSaleCount++;
                    } else if (!isLandVerif && !isLandRej) {
                        pendingApprovalsCount++;

                        const owner = await instance.methods.getLandOwner(i).call();
                        const area = await instance.methods.getArea(i).call();
                        const city = await instance.methods.getCity(i).call();
                        const stateLoc = await instance.methods.getState(i).call();
                        const price = await instance.methods.getPrice(i).call();
                        const pid = await instance.methods.getPID(i).call();
                        const survey = await instance.methods.getSurveyNumber(i).call();
                        const doc = await instance.methods.getDocument(i).call();

                        let ownerName = 'Citizen';
                        try {
                            const profile = await instance.methods.UserMapping(owner).call();
                            if (profile && profile.name) ownerName = profile.name;
                        } catch (pe) {
                            // Ignore
                        }

                        pendingLands.push({
                            id: i,
                            owner,
                            ownerName,
                            area: parseInt(area) || 0,
                            city: city || 'N/A',
                            state: stateLoc || 'N/A',
                            price: parseInt(price) || 0,
                            pid: pid || 'N/A',
                            survey: survey || 'N/A',
                            doc,
                        });
                    }
                } catch (landErr) {
                    console.warn("Error processing land id", i, landErr);
                }
            }

            // Fetch Recent Transactions
            const recentTransactions = [];
            const txLimit = Math.min(transactionsCount, 5);
            for (let i = transactionsCount; i > transactionsCount - txLimit; i--) {
                try {
                    const record = await instance.methods.getTransactionRecord(i).call();
                    let amountEth = '0';
                    try {
                        amountEth = web3.utils.fromWei(record[4].toString(), 'ether');
                    } catch (we) {
                        amountEth = record[4].toString();
                    }

                    recentTransactions.push({
                        txId: record[0].toString(),
                        landId: record[1].toString(),
                        seller: record[2],
                        buyer: record[3],
                        amount: amountEth,
                        timestamp: parseInt(record[5]) > 0 ? new Date(parseInt(record[5]) * 1000).toLocaleDateString() : 'On-Chain',
                    });
                } catch (txErr) {
                    console.warn("Tx fetch error:", txErr);
                }
            }

            let inspectorAddress = "";
            try {
                inspectorAddress = await instance.methods.Land_Inspector().call();
            } catch (e) {
                console.warn(e);
            }

            this.setState({ 
                LandInstance: instance, 
                web3: web3, 
                account: currentAddress,
                networkId: networkId,
                verified: verified,
                inspectorAddress: inspectorAddress,
                usersCount,
                landsCount,
                onSaleCount,
                soldCount,
                pendingApprovalsCount,
                transactionsCount,
                pendingLands,
                recentTransactions,
                loading: false
            });

            // Listen for MetaMask account switches
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', () => window.location.reload());
                window.ethereum.on('chainChanged', () => window.location.reload());
            }

        } catch (error) {
            console.error("LIDashboard error:", error);
            this.setState({ loading: false, loadError: error.message });
        }
    };

    handleAcceptLand = async (landId) => {
        const { LandInstance, account } = this.state;
        if (!LandInstance || !account) return;

        try {
            this.setState({ processingLandId: landId });
            await LandInstance.methods.verifyLand(landId).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("Verify land error:", err);
            alert("Approval failed: Please ensure you are connected to the Land Inspector wallet in MetaMask.");
            this.setState({ processingLandId: null });
        }
    };

    openRejectModal = (land) => {
        this.setState({
            rejectModalOpen: true,
            selectedLandForReject: land,
            rejectionReason: 'Physical survey identification or revenue records could not be legally verified.'
        });
    };

    closeRejectModal = () => {
        this.setState({
            rejectModalOpen: false,
            selectedLandForReject: null,
            rejectionReason: ''
        });
    };

    handleConfirmReject = async () => {
        const { LandInstance, account, selectedLandForReject, rejectionReason } = this.state;
        if (!LandInstance || !account || !selectedLandForReject) return;

        try {
            this.setState({ processingLandId: selectedLandForReject.id, rejectModalOpen: false });
            await LandInstance.methods.rejectLand(selectedLandForReject.id, rejectionReason).send({
                from: account,
                gas: 2100000
            });
            window.location.reload();
        } catch (err) {
            console.error("Reject land error:", err);
            alert("Rejection failed: Please ensure you are connected to the Land Inspector wallet.");
            this.setState({ processingLandId: null });
        }
    };

    render() {
        const { 
            loading, 
            account, 
            verified, 
            inspectorAddress, 
            showAdminAddress, 
            copiedAddress,
            usersCount,
            landsCount,
            onSaleCount,
            soldCount,
            pendingApprovalsCount,
            transactionsCount,
            pendingLands,
            recentTransactions,
            processingLandId,
            rejectModalOpen,
            selectedLandForReject,
            rejectionReason,
            loadError
        } = this.state;

        if (loading) {
            return (
                <div className="content text-center" style={{ paddingTop: "100px" }}>
                    <Spinner animation="border" variant="primary" />
                    <p style={{ marginTop: "15px", color: "#aaa" }}>Loading Land Inspector Dashboard...</p>
                </div>
            );
        }

        return (
            <div className="content">
                {/* Error Banner if any */}
                {loadError && (
                    <Alert color="danger" style={{ borderRadius: "8px", marginBottom: "20px" }}>
                        <strong>⚠️ Notice:</strong> {loadError}. Local fallback data loaded where possible.
                    </Alert>
                )}

                {/* Authentication & Role Status Banner */}
                {verified ? (
                    <Alert 
                        color="success" 
                        style={{ 
                            borderRadius: "10px", 
                            marginBottom: "20px", 
                            background: "rgba(39, 174, 96, 0.12)",
                            border: "1px solid rgba(39, 174, 96, 0.3)",
                            padding: "12px 18px"
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <Badge color="success" style={{ padding: "8px 14px", fontSize: "13px", fontWeight: "700", borderRadius: "8px", letterSpacing: "0.5px" }}>
                                    ✓ VERIFIED ADMIN
                                </Badge>

                                <Button
                                    color="success"
                                    outline
                                    size="sm"
                                    onClick={this.toggleAdminAddress}
                                    style={{
                                        fontWeight: "600",
                                        fontSize: "12.5px",
                                        borderRadius: "8px",
                                        padding: "6px 14px",
                                        borderColor: "#27ae60",
                                        color: "#27ae60",
                                        backgroundColor: showAdminAddress ? "rgba(39, 174, 96, 0.15)" : "transparent",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <i className="fa fa-wallet" style={{ marginRight: "6px" }}></i>
                                    Admin Address {showAdminAddress ? "▲" : "▼"}
                                </Button>
                            </div>
                        </div>

                        {showAdminAddress && (
                            <div 
                                style={{ 
                                    marginTop: "12px", 
                                    padding: "10px 14px", 
                                    background: "#ffffff", 
                                    border: "1px solid rgba(39, 174, 96, 0.25)", 
                                    borderRadius: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: "10px"
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Admin Wallet Address:</span>
                                    <code style={{ fontSize: "13px", color: "#0f172a", fontWeight: "bold", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px" }}>
                                        {account}
                                    </code>
                                </div>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    onClick={() => this.copyToClipboard(account)}
                                    style={{ fontSize: "11px", fontWeight: "600", padding: "4px 10px", borderRadius: "6px" }}
                                >
                                    <i className="fa fa-copy" style={{ marginRight: "4px" }}></i>
                                    {copiedAddress ? "Copied!" : "Copy"}
                                </Button>
                            </div>
                        )}
                    </Alert>
                ) : (
                    <Alert color="warning" style={{ borderRadius: "8px", marginBottom: "20px" }}>
                        <div style={{ marginBottom: "8px" }}>
                            <strong>⚠️ Non-Inspector Wallet Detected:</strong> Currently viewing with <code>{account || "No wallet connected"}</code>.<br />
                            Official Land Inspector deployer wallet is: <code>{inspectorAddress || "Ganache Account 0"}</code> (Ganache Account 0).
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
                            <Button color="primary" size="sm" onClick={connectWallet} style={{ fontWeight: "bold" }}>
                                🦊 Switch to Account 0 in MetaMask
                            </Button>
                            <Button color="secondary" size="sm" onClick={switchToGanache} style={{ fontWeight: "bold" }}>
                                🔄 Switch Network to Ganache Local
                            </Button>
                            <Button href="/" color="dark" size="sm">
                                ← Return to Home Portal
                            </Button>
                        </div>
                    </Alert>
                )}

                {/* Comprehensive Live Metrics Section */}
                <Row style={{ marginBottom: "20px" }}>
                    {/* Total Users Present */}
                    <Col lg="2" md="4" sm="6">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <i className="fa fa-users" style={{ fontSize: "20px", color: "#2563eb" }}></i>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Registered</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: "#1d4ed8", marginTop: "8px" }}>{usersCount}</div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>Total Users Present</div>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Lands For Sale */}
                    <Col lg="2" md="4" sm="6">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <i className="fa fa-tags" style={{ fontSize: "20px", color: "#059669" }}></i>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#065f46", textTransform: "uppercase" }}>Active</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: "#059669", marginTop: "8px" }}>{onSaleCount}</div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#065f46" }}>Lands For Sale</div>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Lands Sold Already */}
                    <Col lg="2" md="4" sm="6">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <i className="fa fa-check-double" style={{ fontSize: "20px", color: "#0284c7" }}></i>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#075985", textTransform: "uppercase" }}>Completed</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: "#0284c7", marginTop: "8px" }}>{soldCount}</div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#075985" }}>Lands Sold Already</div>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Pending Land Approvals */}
                    <Col lg="2" md="4" sm="6">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <i className="fa fa-hourglass-half" style={{ fontSize: "20px", color: "#d97706" }}></i>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#92400e", textTransform: "uppercase" }}>Legal Review</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: "#d97706", marginTop: "8px" }}>{pendingApprovalsCount}</div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#92400e" }}>Pending Approvals</div>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Total Registered Lands */}
                    <Col lg="2" md="4" sm="6">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <i className="fa fa-layer-group" style={{ fontSize: "20px", color: "#4338ca" }}></i>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#3730a3", textTransform: "uppercase" }}>Registry</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: "#4338ca", marginTop: "8px" }}>{landsCount}</div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#3730a3" }}>All Land Records</div>
                            </CardBody>
                        </Card>
                    </Col>

                    {/* Total Transactions */}
                    <Col lg="2" md="4" sm="6">
                        <Card style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 4px 16px -2px rgba(15, 23, 42, 0.05)" }}>
                            <CardBody style={{ padding: "16px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <i className="fa fa-receipt" style={{ fontSize: "20px", color: "#e11d48" }}></i>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#9f1239", textTransform: "uppercase" }}>On-Chain</span>
                                </div>
                                <div style={{ fontSize: "26px", fontWeight: "800", color: "#e11d48", marginTop: "8px" }}>{transactionsCount}</div>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#9f1239" }}>Total Transactions</div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>



                {/* Pending Legal Approvals Table Directly on Dashboard */}
                <Card style={{ marginBottom: "25px" }}>
                    <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                            <CardTitle tag="h4" style={{ margin: 0, fontWeight: "800", color: "#0f172a" }}>
                                ⏳ Pending Legal Approvals (Awaiting Land Inspector Decision)
                            </CardTitle>
                            <p style={{ color: "#475569", fontSize: "13px", margin: "4px 0 0" }}>
                                When citizens register a property, it appears here. Verify that the survey number and documentation are legal before approving for sale.
                            </p>
                        </div>
                        <Button href="/LI/LandApprovals" size="sm" color="info" outline>
                            View All Land Records →
                        </Button>
                    </CardHeader>

                    <CardBody>
                        {pendingLands.length === 0 ? (
                            <div style={{ padding: "30px 20px", textAlign: "center", color: "#475569" }}>
                                <i className="fa fa-check-circle text-success" style={{ fontSize: "36px", marginBottom: "10px" }}></i>
                                <h5 style={{ color: "#0f172a", fontWeight: "700" }}>All registered lands are legally inspected and up to date!</h5>
                                <p style={{ fontSize: "13px", color: "#64748b" }}>Newly submitted properties will immediately appear here for your approval.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table className="tablesorter" style={{ verticalAlign: "middle" }}>
                                    <thead className="text-primary">
                                        <tr>
                                            <th>ID</th>
                                            <th>Owner</th>
                                            <th>Location</th>
                                            <th>Area (sq.ft)</th>
                                            <th>Price</th>
                                            <th>Survey #</th>
                                            <th>PID</th>
                                            <th>Legal Deed</th>
                                            <th className="text-right">Decision</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingLands.map((land) => (
                                            <tr key={land.id}>
                                                <td style={{ fontWeight: "bold", color: "#1d4ed8" }}>#{land.id}</td>
                                                <td>
                                                    <div style={{ fontWeight: "700", color: "#0f172a" }}>{land.ownerName}</div>
                                                    <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "2px 6px", borderRadius: "4px" }}>
                                                        {land.owner.substring(0, 6)}...{land.owner.substring(land.owner.length - 4)}
                                                    </code>
                                                </td>
                                                <td style={{ color: "#0f172a", fontWeight: "500" }}>{land.city}, {land.state}</td>
                                                <td style={{ color: "#0f172a" }}>{land.area.toLocaleString()}</td>
                                                <td style={{ fontWeight: "bold", color: "#059669" }}>{land.price} ETH</td>
                                                <td style={{ color: "#b45309", fontWeight: "700" }}>{land.survey}</td>
                                                <td style={{ color: "#0f172a", fontWeight: "600" }}>{land.pid}</td>
                                                <td>
                                                    {land.doc ? (
                                                        <a
                                                            href={`/view-document?cid=${land.doc}&type=Land&pid=${land.pid}&survey=${land.survey}&city=${encodeURIComponent(land.city)}&area=${land.area}&price=${land.price}&owner=${land.owner}&ownerName=${encodeURIComponent(land.ownerName)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline-info btn-sm"
                                                            style={{ fontSize: "11px", padding: "4px 8px" }}
                                                        >
                                                            <i className="fa fa-file-contract mr-1"></i> Inspect Deed
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted" style={{ fontSize: "11px" }}>No Document</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <div style={{ display: "inline-flex", gap: "6px" }}>
                                                        <Button
                                                            size="sm"
                                                            color="success"
                                                            disabled={!verified || processingLandId === land.id}
                                                            onClick={() => this.handleAcceptLand(land.id)}
                                                            style={{ fontSize: "11px", padding: "5px 12px", fontWeight: "bold" }}
                                                        >
                                                            {processingLandId === land.id ? "Processing..." : "✓ Accept & List"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            color="danger"
                                                            outline
                                                            disabled={!verified || processingLandId === land.id}
                                                            onClick={() => this.openRejectModal(land)}
                                                            style={{ fontSize: "11px", padding: "5px 8px" }}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Recent Transactions Table */}
                {recentTransactions.length > 0 && (
                    <Card>
                        <CardHeader style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <CardTitle tag="h4" style={{ margin: 0, fontWeight: "bold" }}>
                                ⚡ Recent Blockchain Land Sales
                            </CardTitle>
                            <Button href="/LI/TransactionInfo" size="sm" color="success" outline>
                                Full Transaction Ledger ({transactionsCount}) →
                            </Button>
                        </CardHeader>
                        <CardBody>
                            <div className="table-responsive">
                                <Table className="tablesorter" style={{ verticalAlign: "middle" }}>
                                    <thead className="text-primary">
                                        <tr>
                                            <th>Tx #</th>
                                            <th>Land #</th>
                                            <th>Seller (Previous Owner)</th>
                                            <th>Buyer (New Owner)</th>
                                            <th>Amount (ETH)</th>
                                            <th>Date</th>
                                            <th className="text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.map((tx) => (
                                            <tr key={tx.txId}>
                                                <td style={{ fontWeight: "bold", color: "#1d4ed8" }}>#{tx.txId}</td>
                                                <td><Badge color="info">Land #{tx.landId}</Badge></td>
                                                <td>
                                                    <code style={{ fontSize: "11px", color: "#1e293b", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "2px 6px", borderRadius: "4px" }}>
                                                        {tx.seller.substring(0, 8)}...{tx.seller.substring(tx.seller.length - 6)}
                                                    </code>
                                                </td>
                                                <td>
                                                    <code style={{ fontSize: "11px", color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: "4px" }}>
                                                        {tx.buyer.substring(0, 8)}...{tx.buyer.substring(tx.buyer.length - 6)}
                                                    </code>
                                                </td>
                                                <td style={{ fontWeight: "bold", color: "#b45309" }}>{tx.amount} ETH</td>
                                                <td style={{ fontSize: "12px", color: "#475569", fontWeight: "500" }}>{tx.timestamp}</td>
                                                <td className="text-right">
                                                    <Badge color="success">✓ Confirmed On-Chain</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* Reject Land Modal */}
                <Modal isOpen={rejectModalOpen} toggle={this.closeRejectModal} style={{ color: "#000" }}>
                    <ModalHeader toggle={this.closeRejectModal}>
                        <strong>Reject Land Registration #{selectedLandForReject && selectedLandForReject.id}</strong>
                    </ModalHeader>
                    <ModalBody>
                        <p style={{ fontSize: "13px", color: "#475569" }}>
                            Rejecting this land marks it as illegal/non-compliant and prevents it from being listed for public sale.
                        </p>
                        <FormGroup>
                            <Label for="modalRejectReason" style={{ fontWeight: "bold" }}>Reason for Rejection:</Label>
                            <Input
                                type="textarea"
                                id="modalRejectReason"
                                rows="3"
                                value={rejectionReason}
                                onChange={(e) => this.setState({ rejectionReason: e.target.value })}
                            />
                        </FormGroup>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={this.closeRejectModal}>Cancel</Button>
                        <Button color="danger" onClick={this.handleConfirmReject}>Confirm Rejection</Button>
                    </ModalFooter>
                </Modal>
            </div>
        );
    }
}

export default LIDashboard;
